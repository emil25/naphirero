// Isolated UI fixture. All fetches, including GitHub writes, are replaced in memory.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const engine = require('../lib/editor-assistant.cjs');
const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || 4214);
const live = process.argv.includes('--live');
const sourceFetch = global.fetch;
process.chdir(root);
process.env.ADMIN_TOKEN = 'local-test-only'; process.env.GITHUB_TOKEN = 'local-test-only';
let phase = 0, version = 1;
let settings = { tagline: live ? 'Helyi forrásfigyelés' : 'Tesztadatok', banners: {}, storySummaries: [], editorAssistant: { watches: live ? [] : engine.config({ watches: [{ label: 'Erdélyi kórházfelújítás', region: 'erdely', keywords: ['kórház', 'felújítás'] }] }).watches } };
function priceFixture(now) {
  const day = engine.dateKey(now), midnight = Date.parse(day + 'T00:00:00Z');
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Budapest', hour: '2-digit', hourCycle: 'h23' }).format(midnight));
  const start = midnight - hour * 3600000 - 86400000;
  return { unit: 'EUR/MWh', license_info: 'CC BY 4.0 · SMARD.de', unix_seconds: Array.from({ length: 48 }, (_, i) => start / 1000 + i * 3600), price: Array.from({ length: 48 }, (_, i) => i < 24 ? 70 : 110) };
}
global.fetch = async (url, options = {}) => {
  const u = new URL(url), now = Date.now();
  if (u.hostname === 'api.github.com') {
    if (options.method === 'PUT') { const body = JSON.parse(options.body); if (body.sha !== String(version)) return { ok: false, status: 409 }; settings = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')); version++; return { ok: true, json: async () => ({ commit: { sha: 'fixture-' + version } }) }; }
    return { ok: true, json: async () => ({ sha: String(version), content: Buffer.from(JSON.stringify(settings)).toString('base64') }) };
  }
  if (live) return sourceFetch(url, options);
  let body;
  if (u.hostname === 'earthquake.usgs.gov') body = JSON.stringify({ type: 'FeatureCollection', metadata: { generated: now }, features: [{ id: 'test-vrancea', geometry: { coordinates: [26.5, 45.7, 102] }, properties: { type: 'earthquake', place: 'Vrancea, Romania', mag: phase ? 4.8 : 4.3, time: now - 3600000, url: 'https://earthquake.usgs.gov/earthquakes/eventpage/test-vrancea' } }] });
  else if (u.hostname === 'api.energy-charts.info') body = JSON.stringify(priceFixture(now));
  else {
    const matching = u.hostname === 'maszol.ro' || (phase && u.hostname.includes('kronika'));
    const title = matching ? 'Új kórházfelújítási program indul három erdélyi megyében' : 'Színházi bemutatóra készül a társulat';
    body = `<rss><channel><item><title>${title}</title><description>${matching ? 'A kórházak felújításának finanszírozásáról döntöttek. Tesztadat a szerkesztői segéd ellenőrzéséhez.' : 'Nem kapcsolódó tesztcikk.'}</description><link>https://${u.hostname}/napHire-teszt/kórház-program</link><pubDate>${new Date(now - 1800000).toUTCString()}</pubDate></item></channel></rss>`;
  }
  return { ok: true, status: 200, headers: { get: () => null }, text: async () => body };
};
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const u = new URL(req.url, `http://127.0.0.1:${port}`);
  const bridge = { status(code) { res.statusCode = code; return this; }, setHeader(k, v) { res.setHeader(k, v); return this; }, json(body) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(live ? { ...body, durable: false, localPreview: true } : body)); return this; }, end() { res.end(); } };
  try {
    if (u.pathname === '/__preview') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ mode: live ? 'live' : 'editor', token: 'local-test-only' })); }
    if (u.pathname === '/klasszikus' || u.pathname === '/admin.html') { res.statusCode = 302; res.setHeader('Location', 'https://naphirero.vercel.app' + u.pathname); return res.end(); }
    if (u.pathname === '/__next') { phase++; if (settings.editorAssistant) settings.editorAssistant.checkedAt = null; delete require.cache[require.resolve('../api/editor-assistant.js')]; return res.end('fixture advanced'); }
    if (u.pathname === '/api/editor-assistant' || u.pathname === '/api/settings') {
      if (req.method === 'POST' || req.method === 'PUT') { let body = ''; for await (const chunk of req) body += chunk; req.body = body; }
      return await require(u.pathname === '/api/settings' ? '../api/settings.js' : '../api/editor-assistant.js')(req, bridge);
    }
    const name = u.pathname === '/' ? 'szerkesztoi-seged.html' : decodeURIComponent(u.pathname.slice(1));
    const file = path.resolve(root, name); if (!file.startsWith(root + path.sep)) { res.statusCode = 403; return res.end(); }
    const data = await fs.readFile(file);
    res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' })[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch (e) { res.statusCode = 500; res.end(e.message); }
});
server.listen(port, '127.0.0.1', () => console.log(`Editorial helper LOCAL ONLY: http://127.0.0.1:${port}/szerkesztoi-seged.html?fixture=${live ? 'live' : 'editor'}`));
