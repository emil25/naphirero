// NapHíre's own editorial helper. No Crucix source code is embedded here.
const { createHash } = require('node:crypto');
const { NHStories } = require('../story-engine.js');
const DAY = 86400000;
const SOURCES = [
  { id: 'maszol', name: 'Maszol', region: 'erdely', urls: ['https://maszol.ro/rss', 'https://maszol.ro/rss.xml'] },
  { id: 'kronika', name: 'Krónika', region: 'erdely', urls: ['https://kronikaonline.ro/rss/kronika_hirek.xml', 'https://kronikaonline.ro/rss'] },
  { id: 'szekelyhon', name: 'Székelyhon', region: 'erdely', urls: ['https://szekelyhon.ro/rss/szekelyhon_hirek.xml', 'https://szekelyhon.ro/rss'] },
  { id: 'transtelex', name: 'Transtelex', region: 'erdely', urls: ['https://transtelex.ro/rss'] },
  { id: 'telex', name: 'Telex', region: 'magyar', urls: ['https://telex.hu/rss'] },
  { id: 'hvg', name: 'HVG', region: 'magyar', urls: ['https://hvg.hu/rss'] },
  { id: '24hu', name: '24.hu', region: 'magyar', urls: ['https://24.hu/feed/'] },
  { id: 'index', name: 'Index', region: 'magyar', urls: ['https://index.hu/24ora/rss/'] }
];
const ALLOWED = new Set(['earthquake.usgs.gov', 'api.energy-charts.info', ...SOURCES.flatMap(s => s.urls.map(u => new URL(u).hostname)), 'kronika.ro', 'www.kronika.ro', 'www.kronikaonline.ro', 'www.maszol.ro', 'www.szekelyhon.ro', 'www.transtelex.ro', 'www.telex.hu', 'www.hvg.hu', 'www.24.hu', 'www.index.hu']);
const DEFAULTS = { minMagnitude: 3.5, pricePercent: 20, priceAbsolute: 10 };
const hash = value => createHash('sha256').update(String(value)).digest('hex').slice(0, 24);
const norm = value => NHStories.cleanExcerpt(String(value || '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const clean = value => NHStories.cleanExcerpt(String(value || '')).slice(0, 2000);
function safeUrl(value, allowed = ALLOWED) {
  try { const u = new URL(value); if (u.protocol !== 'https:' || u.username || u.password || !allowed.has(u.hostname.toLowerCase())) return ''; return NHStories.canonicalLink(u.href); } catch { return ''; }
}
function config(raw = {}) {
  const rules = { ...DEFAULTS, ...raw.rules };
  for (const [key, min, max] of [['minMagnitude', 2, 8], ['pricePercent', 5, 200], ['priceAbsolute', 1, 500]]) {
    if (!Number.isFinite(rules[key]) || rules[key] < min || rules[key] > max) throw new Error('Érvénytelen jelzési küszöb.');
  }
  if (!Array.isArray(raw.watches || []) || (raw.watches || []).length > 12) throw new Error('Legfeljebb 12 ügy követhető.');
  const watches = (raw.watches || []).map(w => {
    const label = clean(w.label).slice(0, 100);
    const keywords = [...new Set((Array.isArray(w.keywords) ? w.keywords : []).map(norm))];
    if (!label || keywords.length < 2 || keywords.length > 5 || keywords.some(k => k.length < 3 || k.length > 60) || !['erdely', 'magyar', 'mind'].includes(w.region)) throw new Error('Az ügyhöz cím, régió és 2–5 külön kulcsszó szükséges.');
    return { id: 'watch-' + hash(w.region + keywords.slice().sort().join('|')), label, keywords, region: w.region };
  });
  if (new Set(watches.map(w => w.id)).size !== watches.length) throw new Error('Ugyanazt az ügyet csak egyszer add meg.');
  return { rules, watches };
}
function state(raw = {}) {
  let prefs; try { prefs = config(raw); } catch { prefs = config(); }
  return { ...prefs, seen: raw.seen || {}, baselines: raw.baselines || {}, signals: Array.isArray(raw.signals) ? raw.signals.slice(0, 100) : [], reviewed: raw.reviewed || {}, sources: Array.isArray(raw.sources) ? raw.sources : [], checkedAt: raw.checkedAt || null, digest: Array.isArray(raw.digest) ? raw.digest.slice(0, 32) : [], energy: raw.energy || null };
}
function dateKey(ms, zone = 'Europe/Budapest') {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms)).map(p => [p.type, p.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function utcStamp(ms) { return new Date(ms).toISOString(); }
function earthquakeSignals(data, rules, now) {
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Érvénytelen földrengésadat.');
  const generated = Number(data.metadata?.generated);
  if (!Number.isFinite(generated) || now - generated > 30 * 60000 || generated > now + 5 * 60000) throw new Error('A földrengésforrás adata elavult.');
  return data.features.flatMap(f => {
    const p = f.properties || {}, c = f.geometry?.coordinates || [];
    const magnitude = p.mag, time = p.time, link = safeUrl(p.url, new Set(['earthquake.usgs.gov']));
    if (p.type !== 'earthquake' || !f.id || !Number.isFinite(magnitude) || !Number.isFinite(time) || magnitude < rules.minMagnitude || time < now - DAY || time > now || !link || c[0] < 20.2 || c[0] > 29.8 || c[1] < 43.6 || c[1] > 48.3 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) return [];
    const inRomania = /\bromania\b/i.test(p.place || '');
    const title = `${magnitude.toFixed(1).replace('.', ',')} magnitúdójú földrengés ${inRomania ? 'Romániában' : 'Románia térségében'}`;
    return [{ id: 'quake-' + hash(f.id), kind: 'quake', title, source: 'USGS', publishedAt: utcStamp(time), link,
      detail: `${clean(p.place)} · ${Number.isFinite(c[2]) ? c[2].toFixed(1).replace('.', ',') + ' km mélység' : 'ismeretlen mélység'}. A helymegjelölés a forrásból származik.`,
      fingerprint: hash([magnitude, time, c.join(','), clean(p.place)].join('|')), watchId: 'earthquakes' }];
  });
}
function energySignal(data, rules, now) {
  if (!Array.isArray(data?.unix_seconds) || !Array.isArray(data.price) || data.unix_seconds.length !== data.price.length || !/^(EUR|Euro)\s*\/\s*MWh$/i.test(data.unit || '')) throw new Error('Érvénytelen áramáradat vagy mértékegység.');
  const times = data.unix_seconds;
  const days = new Map();
  for (let i = 0; i < times.length; i++) {
    const t = times[i] * 1000, value = data.price[i];
    const duration = i + 1 < times.length ? times[i + 1] - times[i] : (times[i] - times[i - 1]);
    if (!Number.isFinite(t) || !Number.isFinite(duration) || duration < 900 || duration > 3600 || (i && times[i] <= times[i - 1])) continue;
    const key = dateKey(t), next = dateKey(t + duration * 1000 - 1);
    if (next !== key) continue;
    const d = days.get(key) || { total: 0, seconds: 0, start: t, end: t, missing: false };
    d.start = Math.min(d.start, t); d.end = Math.max(d.end, t + duration * 1000);
    if (!Number.isFinite(value)) d.missing = true;
    else { d.total += value * duration; d.seconds += duration; }
    days.set(key, d);
  }
  const today = dateKey(now), tomorrow = dateKey(now + DAY);
  const full = [...days].filter(([k, d]) => k <= tomorrow && !d.missing && d.seconds >= 23 * 3600 && d.seconds <= 25 * 3600 && dateKey(d.start - 1) !== k && dateKey(d.end) !== k && d.end - d.start === d.seconds * 1000).sort(([a], [b]) => a.localeCompare(b));
  if (full.length < 2) throw new Error('Nincs két teljes, összehasonlítható napi ársor.');
  const [newDay, current] = full.at(-1), [oldDay, previous] = full.at(-2);
  if (newDay < today || Math.round((Date.parse(newDay) - Date.parse(oldDay)) / DAY) !== 1) throw new Error('A napi ársor hiányos vagy elavult.');
  const average = current.total / current.seconds, before = previous.total / previous.seconds, difference = average - before;
  const percent = Math.abs(before) >= 1 ? difference / Math.abs(before) * 100 : null;
  const summary = { day: newDay, previousDay: oldDay, average, previousAverage: before, difference, percent, unit: 'EUR/MWh', license: clean(data.license_info), link: `https://energy-charts.info/charts/price_spot_market/chart.htm?l=en&c=HU&interval=day&day=${newDay}` };
  const significant = Math.abs(difference) >= rules.priceAbsolute && (percent === null || Math.abs(percent) >= rules.pricePercent);
  if (!significant) return { signals: [], summary };
  const pct = percent === null ? '' : ` (${percent > 0 ? '+' : ''}${percent.toFixed(1).replace('.', ',')}%)`;
  return { summary, signals: [{ id: 'energy-' + newDay, kind: 'energy', source: 'Energy-Charts / Bundesnetzagentur · SMARD.de', publishedAt: newDay + 'T00:00:00Z', watchId: 'energy',
    title: `Jelentősen ${difference > 0 ? 'nőtt' : 'csökkent'} a magyar nagykereskedelmi áramár${pct}`,
    detail: `${newDay}: ${average.toFixed(2)} EUR/MWh; ${oldDay}: ${before.toFixed(2)} EUR/MWh. Teljes napi, idővel súlyozott átlagok. Másnapi piaci ár, nem lakossági tarifa.`, link: summary.link,
    fingerprint: hash([newDay, oldDay, average.toFixed(3), before.toFixed(3)].join('|')) }] };
}
function parseFeed(xml, source, now) {
  if (!/<(?:rss|feed|rdf:RDF)\b/i.test(xml)) throw new Error('A hírforrás nem RSS/Atom adatot adott.');
  const tag = (block, name) => { const value = block.match(new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)</' + name + '>', 'i'))?.[1] || ''; return clean(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')); };
  const entries = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].slice(0, 120);
  if (!entries.length && /<(item|entry)\b/i.test(xml)) throw new Error('Hiányos RSS/Atom adat.');
  return entries.flatMap(([, , block]) => {
    const title = tag(block, 'title'), lead = tag(block, 'description') || tag(block, 'summary');
    const atomLink = [...block.matchAll(/<link\b([^>]*?)\/?\s*>/gi)].find(([, a]) => /href=/.test(a) && !/rel=["'](?:self|enclosure)["']/i.test(a))?.[1].match(/href=["']([^"']+)["']/i)?.[1];
    const link = safeUrl(tag(block, 'link') || clean(atomLink)), time = Date.parse(tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || tag(block, 'dc:date'));
    const titleText = norm(title);
    if (!link || !Number.isFinite(time) || time < now - 2 * DAY || time > now + 5 * 60000 || titleText.length < 15 || titleText.split(' ').filter(w => w.length > 2).length < 3) return [];
    return [{ title, lead, link, source: source.name, region: source.region, publishedAt: utcStamp(time) }];
  });
}
function newsSignals(articles, watches) {
  const signals = new Map();
  for (const watch of watches) for (const a of articles) {
    if (watch.region !== 'mind' && watch.region !== a.region) continue;
    const text = ' ' + norm(a.title + ' ' + a.lead) + ' ';
    // Every editor-entered keyword must match; no automatic event merging.
    const matches = watch.keywords.every(k => k.includes(' ') ? text.includes(' ' + k + ' ') : text.split(' ').some(word => k.length >= 5 ? word.startsWith(k) : word === k));
    if (!matches) continue;
    const id = 'news-' + hash(watch.id + a.link);
    signals.set(id, { id, kind: 'news', title: a.title, detail: clean(a.lead).slice(0, 650), source: a.source, link: a.link, publishedAt: a.publishedAt,
      watchId: watch.id, watchLabel: watch.label, fingerprint: hash(a.title + '|' + a.lead) });
  }
  return [...signals.values()];
}
function reconcile(rawState, candidates, sources, now, observations = {}) {
  const s = state(rawState), seen = { ...s.seen }, baselines = { ...s.baselines }, reviewed = { ...s.reviewed };
  const prior = new Map(s.signals.map(x => [x.id, x]));
  for (const item of candidates) {
    const old = seen[item.id];
    const change = !old ? (baselines[item.watchId] ? 'new' : 'baseline') : old.fingerprint !== item.fingerprint ? 'updated' : (prior.get(item.id)?.change || 'baseline');
    seen[item.id] = { fingerprint: item.fingerprint, at: now };
    prior.set(item.id, { ...item, change, observedAt: change === 'updated' || !old ? utcStamp(now) : prior.get(item.id)?.observedAt || utcStamp(now) });
  }
  // A failed source never establishes an empty baseline for a followed story.
  for (const w of s.watches) {
    const matching = SOURCES.filter(src => w.region === 'mind' || src.region === w.region).filter(src => sources.some(result => result.id === src.id));
    if (matching.length && matching.every(src => sources.find(result => result.id === src.id)?.status === 'ok')) baselines[w.id] = true;
  }
  for (const [id, sourceId] of [['earthquakes', 'usgs'], ['energy', 'energy']]) if (sources.find(src => src.id === sourceId)?.status === 'ok') baselines[id] = true;
  const activeWatches = new Set(['earthquakes', 'energy', ...s.watches.map(w => w.id)]);
  const signals = [...prior.values()].filter(x => activeWatches.has(x.watchId) && now - Date.parse(x.publishedAt) < 3 * DAY).sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt)).slice(0, 100);
  for (const id of Object.keys(seen)) if (now - seen[id].at > 7 * DAY) delete seen[id];
  for (const id of Object.keys(reviewed)) if (!seen[id]) delete reviewed[id];
  return { ...s, ...observations, seen: Object.fromEntries(Object.entries(seen).sort(([, a], [, b]) => b.at - a.at).slice(0, 500)), baselines, reviewed, signals, sources, checkedAt: utcStamp(now) };
}
async function fetchBody(url, type, fetcher = fetch, timeout = 4000) {
  const controller = new AbortController(); let timer;
  const work = (async () => {
    let target = safeUrl(url);
    if (!target) throw new Error('Nem engedélyezett adatforrás.');
    for (let n = 0; n < 3; n++) {
      const r = await fetcher(target, { redirect: 'manual', signal: controller.signal, headers: { Accept: type === 'json' ? 'application/json' : 'application/rss+xml, application/atom+xml, text/xml', 'User-Agent': 'NapHire editorial helper' } });
      if ([301, 302, 303, 307, 308].includes(r.status)) { target = safeUrl(new URL(r.headers.get('location'), target).href); if (!target) throw new Error('Nem engedélyezett átirányítás.'); continue; }
      if (!r.ok) throw new Error(r.status === 429 ? 'A forrás lekérési korlátja elérve; próbáld később.' : 'A forrás nem elérhető (HTTP ' + r.status + ').');
      if (Number(r.headers.get('content-length')) > 2 * 1024 * 1024) throw new Error('Túl nagy adatforrás.');
      let text = '';
      if (r.body?.getReader) {
        const reader = r.body.getReader(); let bytes = 0;
        const chunks = []; for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 2 * 1024 * 1024) { await reader.cancel(); throw new Error('Túl nagy adatforrás.'); } chunks.push(Buffer.from(value)); }
        text = Buffer.concat(chunks).toString('utf8');
      } else text = await r.text();
      if (Buffer.byteLength(text) > 2 * 1024 * 1024) throw new Error('Túl nagy adatforrás.');
      return type === 'json' ? JSON.parse(text) : text;
    }
    throw new Error('Túl sok átirányítás.');
  })();
  try { return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Az adatforrás időtúllépés miatt nem válaszolt.')); }, timeout); })]); }
  finally { clearTimeout(timer); }
}
async function collect(rawState, settings = {}, fetcher = fetch, now = Date.now()) {
  const prefs = state(rawState), sources = [], candidates = [], articles = []; let energy = null;
  const run = async (id, name, fn) => {
    try { const items = await fn(); candidates.push(...items); sources.push({ id, name, status: 'ok', checkedAt: utcStamp(now), records: items.length }); }
    catch (e) { sources.push({ id, name, status: 'error', checkedAt: utcStamp(now), message: e.message }); }
  };
  const tasks = [
    run('usgs', 'USGS · romániai térség', async () => earthquakeSignals(await fetchBody('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', 'json', fetcher), prefs.rules, now)),
    run('energy', 'Magyar áramár · Energy-Charts', async () => { const start = dateKey(now - 3 * DAY), end = dateKey(now + DAY); const result = energySignal(await fetchBody(`https://api.energy-charts.info/price?bzn=HU&start=${start}&end=${end}`, 'json', fetcher), prefs.rules, now); energy = result.summary; return result.signals; })
  ];
  {
    const disabled = new Set(settings.forrasokKi || []);
    for (const source of SOURCES.filter(src => !disabled.has(src.name))) tasks.push(run(source.id, source.name, async () => {
      const started = Date.now(); let last;
      for (const url of source.urls) {
        try {
          const remaining = 4000 - (Date.now() - started); if (remaining <= 0) break;
          const parsed = parseFeed(await fetchBody(url, 'text', fetcher, remaining), source, now);
          articles.push(...parsed); return newsSignals(parsed, prefs.watches);
        } catch (e) { last = e; }
      }
      throw last || new Error('A hírforrás nem válaszolt.');
    }));
  }
  await Promise.all(tasks);
  // Editorial inbox: freshest articles per publisher, independent of alert thresholds.
  // This is a reading queue, not an automatically verified ranking of importance.
  const digest = SOURCES.flatMap(source => articles.filter(a => a.source === source.name).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 4)).map(({ lead, ...article }) => article);
  return { candidates, sources: sources.sort((a, b) => a.id.localeCompare(b.id)), energy, digest };
}
module.exports = { DEFAULTS, SOURCES, config, state, hash, safeUrl, dateKey, earthquakeSignals, energySignal, parseFeed, newsSignals, reconcile, fetchBody, collect };
