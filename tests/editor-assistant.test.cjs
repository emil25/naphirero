const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../lib/editor-assistant.cjs');
const handler = require('../api/editor-assistant.js');
const settingsAPI = require('../api/settings.js');
const now = Date.parse('2026-10-08T12:00:00Z');
const watch = engine.config({ watches: [{ label: 'Kórházfelújítás', region: 'erdely', keywords: ['kórház', 'felújítás'] }] }).watches[0];
const feature = (id = 'test-quake', mag = 4.3) => ({ id, geometry: { coordinates: [26.5, 45.7, 100] }, properties: { mag, type: 'earthquake', time: now - 60000, place: 'Vrancea, Romania', url: 'https://earthquake.usgs.gov/earthquakes/eventpage/' + id } });
const quakes = features => ({ type: 'FeatureCollection', metadata: { generated: now }, features });
function prices(start = '2026-10-06T22:00:00Z', count = 48, first = 70, last = 110) {
  return { unit: 'EUR/MWh', license_info: 'CC BY 4.0 · SMARD.de', unix_seconds: Array.from({ length: count }, (_, i) => Date.parse(start) / 1000 + i * 3600), price: Array.from({ length: count }, (_, i) => i < 24 ? first : last) };
}
test('Földrengés: régió, idő, magnitúdó, valódi forrás és forrásfrissesség', () => {
  const outside = feature('outside'); outside.geometry.coordinates = [12, 45, 10];
  const nullMag = feature('null'); nullMag.properties.mag = null;
  const stale = feature('old'); stale.properties.time = now - 2 * 86400000;
  const injection = feature('bad'); injection.properties.url = 'javascript:alert(1)';
  const items = engine.earthquakeSignals(quakes([feature(), outside, feature('small', 2.9), nullMag, stale, injection]), engine.DEFAULTS, now);
  assert.equal(items.length, 1); assert.match(items[0].title, /4,3.*Romániában/); assert.equal(items[0].publishedAt, new Date(now - 60000).toISOString());
  const neighbour = feature('neighbour'); neighbour.properties.place = 'Bulgaria';
  assert.match(engine.earthquakeSignals(quakes([neighbour]), engine.DEFAULTS, now)[0].title, /Románia térségében/);
  assert.throws(() => engine.earthquakeSignals({ ...quakes([]), metadata: { generated: now - 3600000 } }, engine.DEFAULTS, now), /elavult/);
});
test('Áramár: két teljes nap, idővel súlyozott átlag, két küszöb, külön lakossági jelölés', () => {
  const result = engine.energySignal(prices(), engine.DEFAULTS, now);
  assert.equal(result.summary.average, 110); assert.equal(result.summary.previousAverage, 70); assert.equal(result.signals.length, 1);
  assert.match(result.signals[0].detail, /nem lakossági tarifa/); assert.equal(result.summary.day, '2026-10-08');
  assert.equal(engine.energySignal(prices(undefined, 48, 100, 105), engine.DEFAULTS, now).signals.length, 0);
  assert.equal(engine.energySignal(prices(undefined, 48, 3, 6), engine.DEFAULTS, now).signals.length, 0);
  const zero = engine.energySignal(prices(undefined, 48, 0, 15), engine.DEFAULTS, now); assert.equal(zero.summary.percent, null); assert.doesNotMatch(zero.signals[0].title, /Infinity|NaN/);
});
test('Hiányos, null árú, elavult és rossz mértékegységű ársor nem ad hamis jelzést', () => {
  const missing = prices(); missing.price[3] = null;
  assert.throws(() => engine.energySignal(missing, engine.DEFAULTS, now), /két teljes/);
  assert.throws(() => engine.energySignal(prices(undefined, 42), engine.DEFAULTS, now), /két teljes/);
  assert.throws(() => engine.energySignal({ ...prices(), unit: 'HUF/kWh' }, engine.DEFAULTS, now), /mértékegység/);
  assert.throws(() => engine.energySignal(prices('2026-10-02T22:00:00Z'), engine.DEFAULTS, now), /elavult/);
});
test('Óraátállítás: 25 órás nap teljes napi átlagként kezelhető', () => {
  const p = prices('2026-10-23T22:00:00Z', 49); const result = engine.energySignal(p, engine.DEFAULTS, Date.parse('2026-10-25T12:00:00Z'));
  assert.equal(result.summary.day, '2026-10-25'); assert.equal(result.summary.average, 110);
});
test('RSS/Atom: emojicím és idegen link kizárva; minden ügykulcsszó és megfelelő régió szükséges', () => {
  const src = engine.SOURCES[0];
  const xml = `<rss><channel><item><title><![CDATA[Kórházak felújítása indul Erdélyben &amp; új program]]></title><description>Új felújítási döntés.</description><link>https://maszol.ro/test?fbclid=x</link><pubDate>${new Date(now).toUTCString()}</pubDate></item><item><title>😂 😭 ✨</title><link>https://maszol.ro/emoji</link><pubDate>${new Date(now).toUTCString()}</pubDate></item><item><title>Kórházak felújítása külső oldalon</title><link>https://evil.test/attack</link><pubDate>${new Date(now).toUTCString()}</pubDate></item></channel></rss>`;
  const articles = engine.parseFeed(xml, src, now); assert.equal(articles.length, 1); assert.equal(articles[0].link, 'https://maszol.ro/test'); assert.match(articles[0].title, /& új/);
  assert.equal(engine.newsSignals(articles, [watch]).length, 1);
  assert.equal(engine.newsSignals([{ ...articles[0], title: 'Kórházba került a focista', lead: 'Sporthír.' }], [watch]).length, 0);
  assert.equal(engine.newsSignals([{ ...articles[0], region: 'magyar' }], [watch]).length, 0);
  const atom = `<feed><entry><title>Kórházak felújítása indul Erdélyben</title><link rel="alternate" href="https://maszol.ro/atom"/><updated>${new Date(now).toISOString()}</updated></entry></feed>`;
  assert.equal(engine.parseFeed(atom, src, now)[0].link, 'https://maszol.ro/atom');
});
test('Tartós alapállapot: első észlelés, új találat és érdemi módosulás külön; hibás forrás nem alapállapot', () => {
  const first = engine.earthquakeSignals(quakes([feature()]), engine.DEFAULTS, now)[0];
  const sources = [{ id: 'usgs', status: 'ok' }, { id: 'energy', status: 'error' }];
  let s = engine.reconcile({}, [first], sources, now); assert.equal(s.signals[0].change, 'baseline'); assert.equal(s.baselines.energy, undefined);
  s.reviewed[first.id] = first.fingerprint;
  s = engine.reconcile(s, [], [{ id: 'usgs', status: 'error' }], now + 1000); assert.equal(s.signals.length, 1);
  s = engine.reconcile(JSON.parse(JSON.stringify(s)), [first], sources, now + 2000); assert.equal(s.signals[0].change, 'baseline'); assert.equal(s.reviewed[first.id], first.fingerprint);
  const second = engine.earthquakeSignals(quakes([feature('new')]), engine.DEFAULTS, now)[0];
  s = engine.reconcile(s, [first, second], sources, now + 3000); assert.equal(s.signals.find(x => x.id === second.id).change, 'new');
  s = engine.reconcile(s, [{ ...first, fingerprint: 'changed', title: 'Módosult magnitúdó' }], sources, now + 4000); assert.equal(s.signals.find(x => x.id === first.id).change, 'updated'); assert.notEqual(s.reviewed[first.id], 'changed');
});
test('Forráslekérés teljes törzsre is időkorlátos, átirányítás és túl nagy adat elutasítva', async () => {
  const stalled = async () => ({ ok: true, status: 200, headers: { get: () => null }, text: () => new Promise(() => {}) });
  const started = Date.now(); await assert.rejects(engine.fetchBody(engine.SOURCES[0].urls[0], 'text', stalled, 30), /időtúllépés/); assert.ok(Date.now() - started < 500);
  const redirect = async () => ({ status: 302, headers: { get: () => 'http://127.0.0.1/secret' } });
  await assert.rejects(engine.fetchBody(engine.SOURCES[0].urls[0], 'text', redirect), /átirányítás/);
  await assert.rejects(engine.fetchBody('https://evil.test/data', 'json', stalled), /engedélyezett/);
});
const originalFetch = global.fetch;
const oldEnv = Object.fromEntries(['GITHUB_TOKEN', 'GITHUB_PAT', 'GITHUB_REPO', 'GITHUB_BRANCH', 'GITHUB_SETTINGS_PATH', 'ADMIN_TOKEN'].map(k => [k, process.env[k]]));
test.afterEach(() => { global.fetch = originalFetch; for (const [k, v] of Object.entries(oldEnv)) { if (v == null) delete process.env[k]; else process.env[k] = v; } });
function res() { return { code: 200, headers: {}, status(code) { this.code = code; return this; }, setHeader(k, v) { this.headers[k] = v; return this; }, json(body) { this.body = body; return this; } }; }
function storageMock(initial = {}, conflict = false) {
  process.env.GITHUB_TOKEN = 'fixture-only'; process.env.ADMIN_TOKEN = 'fixture-admin';
  let saved = structuredClone(initial), writes = 0;
  global.fetch = async (url, options = {}) => {
    assert.match(String(url), /^https:\/\/api\.github\.com\//);
    if (options.method === 'PUT') {
      if (conflict && writes++ === 0) { saved.tagline = 'Egyidejű másik szerkesztés'; return { ok: false, status: 409 }; }
      saved = JSON.parse(Buffer.from(JSON.parse(options.body).content, 'base64').toString('utf8')); return { ok: true, json: async () => ({}) };
    }
    return { ok: true, json: async () => ({ sha: 'fixture-sha', content: Buffer.from(JSON.stringify(saved)).toString('base64') }) };
  };
  return () => saved;
}
const req = body => ({ method: body ? 'POST' : 'GET', headers: { 'x-admin-token': 'fixture-admin' }, body });
test('Admin hitelesítés minden olvasásnál; idegen eredetű kérés nem írhat', async () => {
  storageMock(); global.fetch = async () => { throw new Error('Must not fetch'); };
  const a = res(); await handler({ method: 'GET', headers: {} }, a); assert.equal(a.code, 401);
  const b = res(); await handler({ ...req({ action: 'configure' }), headers: { 'x-admin-token': 'fixture-admin', origin: 'https://evil.test', host: 'naphirero.vercel.app' } }, b); assert.equal(b.code, 403);
});
test('Szabályok tartósan menthetők; konfliktus után az egyéb beállítások megmaradnak', async () => {
  const saved = storageMock({ tagline: 'NapHíre', banners: { unchanged: true }, storySummaries: [{ text: 'Maradjon' }] }, true);
  const r = res(); await handler(req({ action: 'configure', rules: engine.DEFAULTS, watches: [watch] }), r); assert.equal(r.code, 200);
  assert.equal(saved().tagline, 'Egyidejű másik szerkesztés'); assert.ok(saved().banners.unchanged); assert.equal(saved().storySummaries[0].text, 'Maradjon');
  const read = res(); await handler(req(), read); assert.equal(read.body.watches[0].label, watch.label);
});
test('Átnézés tartósan menthető; frissített jelzés régi nézetből nem nyugtázható', async () => {
  const signal = engine.earthquakeSignals(quakes([feature()]), engine.DEFAULTS, now)[0];
  const saved = storageMock({ editorAssistant: { signals: [signal] } });
  const bad = res(); await handler(req({ action: 'review', id: signal.id, fingerprint: 'old' }), bad); assert.equal(bad.code, 409);
  const r = res(); await handler(req({ action: 'review', id: signal.id, fingerprint: signal.fingerprint }), r); assert.equal(r.code, 200); assert.equal(saved().editorAssistant.reviewed[signal.id], signal.fingerprint);
  const read = res(); await handler(req(), read); assert.ok(read.body.signals[0].reviewed);
});
test('Régebbi általános adminmentés nem törli a segéd állapotát, a publikus settings nem tartalmazza', async () => {
  const assistant = { reviewed: { important: 'fingerprint' }, watches: [watch] };
  const saved = storageMock({ editorAssistant: assistant, tagline: 'Old' });
  const r = res(); await settingsAPI({ method: 'PUT', headers: { 'x-admin-token': 'fixture-admin' }, body: { tagline: 'New', editorAssistant: { reviewed: {} } } }, r); assert.equal(r.code, 200); assert.deepEqual(saved().editorAssistant, assistant);
  const read = res(); await settingsAPI({ method: 'GET', headers: {} }, read); assert.equal(read.body.tagline, 'New'); assert.equal(read.body.editorAssistant, undefined);
});
test('A gyűjtés külön kezeli a forráshibát, kikapcsolt forrást és valódi ügytalálatot', async () => {
  const fetched = [];
  const fetcher = async url => {
    fetched.push(String(url)); const host = new URL(url).hostname;
    if (host === 'api.energy-charts.info') return { ok: false, status: 503, headers: { get: () => null } };
    const body = host === 'earthquake.usgs.gov' ? JSON.stringify(quakes([feature()])) : `<rss><channel><item><title>Kórházak felújítása indul több erdélyi megyében</title><link>https://${host}/test</link><pubDate>${new Date(now).toUTCString()}</pubDate></item></channel></rss>`;
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => body };
  };
  const result = await engine.collect({ watches: [watch] }, { forrasokKi: ['Székelyhon'] }, fetcher, now);
  assert.equal(result.sources.find(s => s.id === 'energy').status, 'error'); assert.equal(result.sources.find(s => s.id === 'usgs').status, 'ok');
  assert.ok(result.candidates.some(s => s.kind === 'news')); assert.ok(result.candidates.some(s => s.kind === 'quake'));
  assert.ok(!fetched.some(url => /szekelyhon/.test(url))); assert.equal(result.sources.length, 9);
});
test('Ellenőrzés végigmegy a mentési útvonalon; ötperces friss eredmény nem kér le új adatot', async () => {
  const saved = storageMock({ tagline: 'Maradjon', editorAssistant: {} }); const githubFetch = global.fetch;
  let sourceCalls = 0;
  global.fetch = async (url, options) => {
    if (String(url).includes('api.github.com')) return githubFetch(url, options);
    sourceCalls++;
    const realtime = Date.now(); const body = String(url).includes('earthquake.usgs.gov') ? JSON.stringify({ ...quakes([feature()]), metadata: { generated: realtime }, features: [{ ...feature(), properties: { ...feature().properties, time: realtime - 60000 } }] }) : '{}';
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => body };
  };
  const scan = res(); await handler(req({ action: 'scan' }), scan); assert.equal(scan.code, 200); assert.ok(scan.body.durable); assert.equal(scan.body.signals[0].kind, 'quake');
  assert.equal(saved().tagline, 'Maradjon'); assert.equal(saved().editorAssistant.signals.length, 1); assert.equal(sourceCalls, 13);
  const cached = res(); await handler(req({ action: 'scan' }), cached); assert.equal(cached.code, 200); assert.ok(cached.body.cached); assert.equal(sourceCalls, 13);
});
test('Egy név vagy túl tág figyelés nem menthető; hibás szabály nem ír GitHubra', async () => {
  storageMock(); global.fetch = async () => { throw new Error('Must not write'); };
  const r = res(); await handler(req({ action: 'configure', rules: { minMagnitude: -1 }, watches: [] }), r); assert.equal(r.code, 400);
  assert.throws(() => engine.config({ watches: [{ label: 'Egy név', region: 'erdely', keywords: ['Hunor'] }] }), /2–5/);
});

test('Sikertelen tartós mentés után a gyorsítótár nem állíthat sikeres mentést', async () => {
  delete require.cache[require.resolve('../api/editor-assistant.js')];
  const freshHandler = require('../api/editor-assistant.js');
  const saved = storageMock({ editorAssistant: {} }); const githubFetch = global.fetch;
  let writes = 0, sourceCalls = 0;
  global.fetch = async (url, options = {}) => {
    if (String(url).includes('api.github.com')) {
      if (options.method === 'PUT' && ++writes === 1) return { ok: false, status: 503 };
      return githubFetch(url, options);
    }
    sourceCalls++;
    const realtime = Date.now();
    const body = String(url).includes('earthquake.usgs.gov') ? JSON.stringify({ ...quakes([feature()]), metadata: { generated: realtime }, features: [{ ...feature(), properties: { ...feature().properties, time: realtime - 60000 } }] }) : '{}';
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => body };
  };
  const failed = res(); await freshHandler(req({ action: 'scan' }), failed); assert.equal(failed.code, 502);
  assert.equal(saved().editorAssistant.signals, undefined);
  const retried = res(); await freshHandler(req({ action: 'scan' }), retried);
  assert.equal(retried.code, 200); assert.ok(retried.body.durable); assert.equal(writes, 2); assert.equal(sourceCalls, 26);
  assert.equal(saved().editorAssistant.signals.length, 1);
});

test('A friss olvasólista és az áramár küszöb feletti jelzés és ügykövetés nélkül is látszik és visszaolvasható', async () => {
  const fetcher = async url => {
    const host = new URL(url).hostname;
    const body = host === 'earthquake.usgs.gov' ? JSON.stringify(quakes([])) : host === 'api.energy-charts.info' ? JSON.stringify(prices(undefined, 48, 100, 105)) : `<rss><channel><item><title>Friss szerkesztői hír a helyi forrásból</title><link>https://${host}/news</link><pubDate>${new Date(now).toUTCString()}</pubDate></item></channel></rss>`;
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => body };
  };
  const result = await engine.collect({}, {}, fetcher, now);
  assert.equal(result.candidates.length, 0); assert.equal(result.digest.length, 8);
  assert.equal(result.digest.filter(a => a.region === 'erdely').length, 4); assert.equal(result.energy.average, 105);
  const saved = engine.reconcile({}, result.candidates, result.sources, now, { digest: result.digest, energy: result.energy });
  const reloaded = engine.state(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(reloaded.digest, result.digest); assert.equal(reloaded.energy.average, 105);
});
