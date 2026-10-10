const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const runtime = require('../home-runtime.js');
const now = Date.now();
const article = (source = 'Maszol', link = 'https://maszol.ro/news/test') => ({ cim: 'Friss erdélyi történet több forrással', link, forras: source, datum: new Date(now).toISOString(), region: 'erdely' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('A gyorsan érkező fejléc után is megszakad az elakadó válasz', async () => {
  let signal;
  await assert.rejects(runtime.request('/rss', 'text', 25, async (_, options) => {
    signal = options.signal;
    return { ok: true, text: () => new Promise(() => {}) };
  }), /időkerete/);
  assert.equal(signal.aborted, true);
});

test('Nem jelennek meg régi, sérült vagy jövőbeli tartalékhírek', () => {
  const items = [article(), { ...article(), datum: '2026-09-01' }, { ...article(), datum: 'invalid' }, { ...article(), datum: new Date(now + 86400000).toISOString() }];
  const storage = { getItem: () => JSON.stringify({ hirek: items, mentveKor: now }) };
  assert.equal(runtime.readNewsCache(storage, now).hirek.length, 1);
  assert.equal(runtime.readNewsCache({ getItem: () => JSON.stringify({ hirek: [article()], mentveKor: now - 86400001 }) }, now), null);
  assert.equal(runtime.readNewsCache({ getItem() { throw Error('storage disabled'); } }, now), null);
});

test('Azonos című külön források megmaradnak; az elakadt forrás előzménye megmarad', () => {
  const sources = ['Maszol', 'Krónika', 'HVG'].map(nev => ({ nev }));
  const results = [{ status: 'fulfilled', value: [article()] }, { status: 'rejected' }, { status: 'fulfilled', value: [article('HVG', 'https://hvg.hu/egy-cikk')] }];
  const previous = [article('Krónika', 'https://kronika.ro/friss'), article('HVG', 'https://hvg.hu/regi')];
  const snapshot = runtime.mergeFeeds(sources, results, previous, [], now);
  assert.equal(snapshot.hirek.length, 3);
  assert.deepEqual(snapshot.retained, ['Krónika']);
  assert.equal(snapshot.hirek.some(h => h.link === 'https://hvg.hu/regi'), false);
  const disabled = runtime.mergeFeeds(sources, results, previous, ['Krónika', 'HVG'], now);
  assert.equal(disabled.hirek.length, 1);
});

function browserHarness(fetcher, cache = []) {
  const events = new Map(), renders = [], saved = new Map();
  saved.set('naphire_hir_gyorsitotar_v1', JSON.stringify({ hirek: cache, mentveKor: now }));
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { textContent: '', innerHTML: '', classList: { add() {}, remove() {} }, setAttribute() {} });
    return elements.get(id);
  };
  const rootClasses = new Set(['nh-booting']);
  const context = vm.createContext({
    console, setTimeout, clearTimeout, setInterval: () => 1, AbortController, URL, Date,
    fetch: fetcher,
    document: { hidden: false, documentElement: { dataset: {}, classList: { remove: (...names) => names.forEach(name => rootClasses.delete(name)) } },
      addEventListener: (name, fn) => events.set(name, fn), dispatchEvent() {}, querySelectorAll: () => [], getElementById: element },
    CustomEvent: class { constructor(type) { this.type = type; } },
    localStorage: { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) },
    BEALLITASOK: { forrasokKi: [], banners: {}, kiemeltTema: { aktiv: false }, tagline: 'NapHíre' },
    FORRASOK: [{ nev: 'Maszol', urls: ['https://maszol.ro/rss'] }],
    osszesHir: [], gyorsitotarKorabol: null, hibasForrasok: [], tartalekTipus: null,
    xmlFeldolgoz: () => [article()], kepUrlTisztit: x => x, rovatBesorol: () => 'erdely',
    rajzol: () => { renders.push({ title: context.BEALLITASOK.kiemeltTema.cim, count: context.osszesHir.length }); },
    renderForrasaink() {}, fejlecBannerHTML() { return ''; }, hirGyorsitotarMent() {}, videoSavFrissit() {}
  });
  context.window = context;
  vm.runInContext(fs.readFileSync(require.resolve('../home-runtime.js'), 'utf8'), context);
  return { context, events, renders, saved, elements, rootClasses };
}
const jsonResponse = body => ({ ok: true, headers: { get: () => 'current' }, json: async () => body });
const textResponse = () => ({ ok: true, text: async () => '<rss></rss>' });

test('A mentett hírek első kirajzolása is megvárja az aktuális kiemelést', async () => {
  let releaseSettings, releaseFeed;
  const harness = browserHarness(url => url === 'settings.json'
    ? new Promise(resolve => { releaseSettings = () => resolve(jsonResponse({ theme: 'classic', kiemeltTema: { aktiv: true, cim: 'A szerkesztő aktuális témája' } })); })
    : new Promise(resolve => { releaseFeed = () => resolve(textResponse()); }), [article()]);
  const pending = harness.context.NHHome.refresh();
  await delay(5);
  assert.equal(harness.renders.length, 0);
  assert.equal(harness.rootClasses.has('nh-booting'), true);
  releaseSettings(); await delay(5);
  assert.equal(harness.renders[0].title, 'A szerkesztő aktuális témája');
  assert.equal(harness.rootClasses.has('nh-booting'), false);
  releaseFeed(); await pending;
  assert.equal(harness.renders.every(render => render.title === 'A szerkesztő aktuális témája'), true);
});

test('Dupla frissítés nem indít új lekérési kört', async () => {
  let calls = 0;
  const harness = browserHarness(async url => { calls++; await delay(10); return url === 'settings.json' ? jsonResponse({ kiemeltTema: { aktiv: false } }) : textResponse(); });
  await Promise.all([harness.context.NHHome.refresh(), harness.context.NHHome.refresh()]);
  assert.equal(calls, 2);
  assert.equal(harness.renders.length, 1);
});

test('Teljes forráshiba után hibaállapot jelenik meg, nem szeptemberi hírek', async () => {
  const harness = browserHarness(async url => { if (url === 'settings.json') return jsonResponse({}); throw Error('offline'); });
  await harness.context.NHHome.refresh();
  assert.match(harness.elements.get('tartalom').innerHTML, /Újrapróbálom/);
  assert.equal(harness.renders.length, 0);
  assert.equal(harness.context.osszesHir.length, 0);
  assert.equal(harness.rootClasses.has('nh-booting'), false);
});

test('A renderelő hibáját nem fedi el a régi főoldal automatikus megjelenése', () => {
  const harness = browserHarness(async () => { throw Error('must not request'); });
  harness.events.get('DOMContentLoaded')();
  assert.match(harness.elements.get('tartalom').innerHTML, /megjelenítés nem töltődött/);
  assert.equal(harness.renders.length, 0);
});

test('A régi klasszikus saját képsegéd nélkül is megjeleníti a híreket', async () => {
  const harness = browserHarness(async url => url === 'settings.json' ? jsonResponse({}) : textResponse());
  delete harness.context.kepUrlTisztit;
  harness.context.document.documentElement.dataset.nhEdition = 'legacy';
  await harness.context.NHHome.refresh();
  assert.equal(harness.renders.length, 1);
  assert.equal(harness.context.osszesHir.length, 1);
  assert.equal(harness.context.osszesHir[0].kep, null);
});

test('Hírek kirajzolási hibája esetén sincs végtelen betöltés', async () => {
  const harness = browserHarness(async url => url === 'settings.json' ? jsonResponse({}) : textResponse());
  harness.context.console = { error() {} };
  harness.context.rajzol = () => { throw Error('renderer failed'); };
  await harness.context.NHHome.refresh();
  assert.match(harness.elements.get('tartalom').innerHTML, /megjelenítés nem sikerült/);
  assert.equal(harness.rootClasses.has('nh-booting'), false);
});
