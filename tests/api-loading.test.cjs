const test = require('node:test');
const assert = require('node:assert/strict');
const rss = require('../api/rss.js');
const settings = require('../api/settings.js');

function response() {
  return { code: 200, headers: {}, status(code) { this.code = code; return this; }, setHeader(name, value) { this.headers[name] = value; return this; },
    json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; }, end() { return this; } };
}
const originalFetch = global.fetch;
const oldEnv = { GITHUB_TOKEN: process.env.GITHUB_TOKEN, GITHUB_PAT: process.env.GITHUB_PAT, ADMIN_TOKEN: process.env.ADMIN_TOKEN };
test.afterEach(() => { global.fetch = originalFetch; for (const [key, value] of Object.entries(oldEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });

test('Román lapszemle, ATV és rádió forrása engedélyezett; idegen cél nem', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; return { ok: true, status: 200, headers: { get: () => null }, text: async () => '<rss></rss>' }; };
  for (const host of ['hotnews.ro', 'rss.hotnews.ro', 'www.g4media.ro', 'www.digi24.ro', 'www.atv.hu', 'www.marosvasarhelyiradio.ro']) {
    const res = response(); await rss({ method: 'GET', query: { url: 'https://' + host + '/feed' } }, res); assert.equal(res.code, 200);
  }
  const res = response(); await rss({ method: 'GET', query: { url: 'http://127.0.0.1/internal' } }, res);
  assert.equal(res.code, 400); assert.equal(calls, 6);
});

test('A proxy nem követ átirányítást ismeretlen forrásra', async () => {
  global.fetch = async () => ({ status: 302, headers: { get: () => 'http://127.0.0.1/internal' } });
  const res = response(); await rss({ method: 'GET', query: { url: 'https://maszol.ro/rss' } }, res); assert.equal(res.code, 502);
});

test('Elakadó RSS-törzs után is lejár a kiszolgáló időkerete', async () => {
  global.fetch = async (_, { signal }) => ({ ok: true, status: 200, headers: { get: () => null }, text: () => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('abort'), { name: 'AbortError' })), { once: true });
  }) });
  const res = response(); const start = Date.now();
  await rss({ method: 'GET', query: { url: 'https://maszol.ro/rss' } }, res);
  assert.equal(res.code, 504); assert.ok(Date.now() - start < 4500);
});

test('Elakadó beállításlekérés helyett jelölt helyi tartalék érkezik', async () => {
  process.env.GITHUB_TOKEN = 'test-only';
  global.fetch = async () => ({ ok: true, json: () => new Promise(() => {}) });
  const res = response(); const start = Date.now();
  await settings({ method: 'GET', headers: {} }, res);
  assert.equal(res.code, 200); assert.equal(res.headers['X-NapHire-Settings'], 'fallback');
  assert.ok(Date.now() - start < 2200); assert.ok(res.body.banners);
});

test('Admin mentés után a következő GET az új beállítást olvassa', async () => {
  process.env.GITHUB_TOKEN = 'test-only'; process.env.ADMIN_TOKEN = 'test-admin';
  let saved = { kiemeltTema: { aktiv: true, cim: 'Korábbi téma' } };
  global.fetch = async (_, options) => {
    if (options.method === 'PUT') {
      const payload = JSON.parse(options.body);
      assert.equal(payload.sha, 'old-sha');
      saved = JSON.parse(Buffer.from(payload.content, 'base64').toString('utf8'));
      return { ok: true, json: async () => ({ commit: { sha: 'new-sha' } }) };
    }
    return { ok: true, json: async () => ({ sha: 'old-sha', content: Buffer.from(JSON.stringify(saved)).toString('base64') }) };
  };
  const rejected = response(); await settings({ method: 'PUT', headers: {}, body: saved }, rejected); assert.equal(rejected.code, 401);
  const summary = { link: 'https://maszol.ro/teszt-cikk', text: 'Magyar szerkesztőségi összefoglaló.' };
  const res = response(); await settings({ method: 'PUT', headers: { 'x-admin-token': 'test-admin' }, body: { kiemeltTema: { aktiv: false }, storySummaries: [summary] } }, res);
  assert.equal(res.code, 200); assert.equal(res.body.commit, 'new-sha');
  const read = response(); await settings({ method: 'GET', headers: {} }, read);
  assert.equal(read.body.kiemeltTema.aktiv, false); assert.equal(read.headers['X-NapHire-Settings'], 'current');
  assert.deepEqual(read.body.storySummaries, [summary]);
});
