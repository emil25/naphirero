const fs = require('node:fs/promises');
const path = require('node:path');
const { timingSafeEqual } = require('node:crypto');
const engine = require('../lib/editor-assistant.cjs');
const MAX_BYTES = 256 * 1024;
let pending = null;
let recent = null;
function meaningful(s) {
  return JSON.stringify({ ...s, checkedAt: null, sources: s.sources.map(({ checkedAt, ...source }) => source), seen: Object.fromEntries(Object.entries(s.seen).map(([id, value]) => [id, value.fingerprint])) });
}
const snapshot = s => ({ rules: s.rules, watches: s.watches, signals: s.signals.map(item => ({ ...item, reviewed: s.reviewed[item.id] === item.fingerprint })), sources: s.sources, checkedAt: s.checkedAt, digest: s.digest, energy: s.energy });
function reply(res, code, body) {
  res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(code).json(body);
}
function authorized(req) {
  const expected = Buffer.from(String(process.env.ADMIN_TOKEN || '').trim());
  const actual = Buffer.from(String(req.headers?.['x-admin-token'] || '').trim());
  return expected.length > 0 && expected.length === actual.length && timingSafeEqual(expected, actual);
}
function storage() {
  const repo = process.env.GITHUB_REPO || 'emil25/naphirero', branch = process.env.GITHUB_BRANCH || 'main', file = process.env.GITHUB_SETTINGS_PATH || 'settings.json';
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  const url = `https://api.github.com/repos/${repo}/contents/${file.split('/').map(encodeURIComponent).join('/')}`;
  return { token, branch, url, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'NapHire editorial helper' } };
}
async function github(url, options, timeout = 2500) {
  const controller = new AbortController(); let timer;
  try { return await Promise.race([(async () => {
    const r = await fetch(url, { ...options, signal: controller.signal });
    if (!r.ok) throw Object.assign(new Error('A tartós szerkesztői mentés nem elérhető.'), { status: r.status });
    const value = await r.json(); return value;
  })(), new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('A szerkesztői tárhely nem válaszolt időben.')); }, timeout); })]); }
  finally { clearTimeout(timer); }
}
async function read() {
  const c = storage();
  if (c.token) {
    const file = await github(c.url + '?ref=' + encodeURIComponent(c.branch), { headers: c.headers });
    return { settings: JSON.parse(Buffer.from(String(file.content || '').replace(/\s+/g, ''), 'base64').toString('utf8')), sha: file.sha, durable: true };
  }
  const settings = JSON.parse(await fs.readFile(path.join(process.cwd(), 'settings.json'), 'utf8'));
  return { settings, durable: false };
}
async function update(mutator) {
  const c = storage(); if (!c.token) throw Object.assign(new Error('A tartós mentéshez a meglévő GitHub mentési kapcsolat szükséges.'), { code: 503 });
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await read();
    const previous = engine.state(current.settings.editorAssistant), next = mutator(previous);
    // Avoid redeploy-triggering commits for an unchanged scan's clock alone.
    if (meaningful(previous) === meaningful(next)) return next;
    const serialized = JSON.stringify({ ...current.settings, editorAssistant: next }, null, 2) + '\n';
    if (Buffer.byteLength(serialized) > MAX_BYTES) throw Object.assign(new Error('Túl nagy szerkesztői adat. Csökkentsd a figyelt ügyek számát.'), { code: 413 });
    try {
      await github(c.url, { method: 'PUT', headers: { ...c.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Update NapHire editorial assistant', branch: c.branch, sha: current.sha, content: Buffer.from(serialized).toString('base64') }) }, 6500);
      return next;
    } catch (e) { if (![409, 422].includes(e.status) || attempt === 2) throw e; }
  }
}
async function scan(current) {
  const s = engine.state(current.settings.editorAssistant);
  if (s.checkedAt && Date.now() - Date.parse(s.checkedAt) < 5 * 60000) return { ...snapshot(s), durable: current.durable, cached: true };
  const key = JSON.stringify([s.rules, s.watches, current.settings.forrasokKi]);
  if (recent?.key === key && Date.now() - recent.at < 5 * 60000) {
    const { energy } = recent.result;
    // Keep the newest shared review state while reusing only the source observations.
    const fresh = engine.reconcile(s, recent.candidates, recent.sources, recent.at, { energy, digest: recent.result.digest });
    return { ...snapshot(fresh), energy, durable: current.durable, cached: true };
  }
  if (pending?.key === key) return pending.promise;
  const promise = (async () => {
    const result = await engine.collect(s, current.settings);
    const now = Date.now();
    if (!current.durable) {
      recent = { key, at: now, candidates: result.candidates, sources: result.sources, result };
      return { ...snapshot(engine.reconcile(s, result.candidates, result.sources, now, { energy: result.energy, digest: result.digest })), durable: false };
    }
    const saved = await update(latest => {
      if (JSON.stringify([latest.rules, latest.watches]) !== JSON.stringify([s.rules, s.watches])) throw Object.assign(new Error('Közben módosultak a figyelési szabályok. Indíts új ellenőrzést.'), { code: 409 });
      return engine.reconcile(latest, result.candidates, result.sources, now, { energy: result.energy, digest: result.digest });
    });
    recent = { key, at: now, candidates: result.candidates, sources: result.sources, result };
    return { ...snapshot(saved), energy: result.energy, durable: true };
  })();
  pending = { key, promise };
  try { return await promise; } finally { if (pending?.promise === promise) pending = null; }
}
module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return reply(res, 405, { error: 'Csak GET és POST engedélyezett.' }); }
  if (!authorized(req)) return reply(res, 401, { error: 'Írd be a helyes admin kódot.' });
  if (req.method === 'POST' && req.headers.origin) {
    let allowed = false; try { allowed = new URL(req.headers.origin).host === req.headers.host; } catch (_) {}
    if (!allowed) return reply(res, 403, { error: 'Idegen oldalról érkező kérés.' });
  }
  try {
    if (req.method === 'GET') { const current = await read(); return reply(res, 200, { ...snapshot(engine.state(current.settings.editorAssistant)), durable: current.durable }); }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return reply(res, 400, { error: 'Érvénytelen kérés.' }); } }
    if (!body || Buffer.byteLength(JSON.stringify(body)) > 16 * 1024) return reply(res, 400, { error: 'Érvénytelen vagy túl nagy kérés.' });
    if (body.action === 'scan') return reply(res, 200, await scan(await read()));
    if (body.action === 'configure') {
      let prefs; try { prefs = engine.config(body); } catch (e) { return reply(res, 400, { error: e.message }); }
      const saved = await update(latest => ({ ...latest, ...prefs, checkedAt: null }));
      return reply(res, 200, { ...snapshot(saved), durable: true, saved: true });
    }
    if (body.action === 'review') {
      const saved = await update(latest => {
        const item = latest.signals.find(item => item.id === body.id && item.fingerprint === body.fingerprint);
        if (!item) throw Object.assign(new Error('A jelzés közben frissült. Töltsd újra a listát.'), { code: 409 });
        return { ...latest, reviewed: { ...latest.reviewed, [item.id]: item.fingerprint } };
      });
      return reply(res, 200, { ...snapshot(saved), durable: true, saved: true });
    }
    return reply(res, 400, { error: 'Ismeretlen művelet.' });
  } catch (e) { return reply(res, e.code || 502, { error: e.message || 'A szerkesztői segéd jelenleg nem elérhető.' }); }
};
