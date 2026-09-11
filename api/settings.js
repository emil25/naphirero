const fs = require('node:fs/promises');
const path = require('node:path');

const MAX_SETTINGS_BYTES = 256 * 1024;
const DEFAULT_REPO = 'emil25/naphirero';
const DEFAULT_PATH = 'settings.json';

function json(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.json(body);
}
function githubConfig() {
  return { token: process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || '', repo: process.env.GITHUB_REPO || DEFAULT_REPO, branch: process.env.GITHUB_BRANCH || 'main', filePath: process.env.GITHUB_SETTINGS_PATH || DEFAULT_PATH };
}
function githubHeaders(token) {
  return { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'NapHire editorial admin' };
}
function localSettingsPath() { return path.join(process.cwd(), 'settings.json'); }
async function readLocalSettings() { try { return JSON.parse(await fs.readFile(localSettingsPath(), 'utf8')); } catch { return null; } }
async function githubFile(config) {
  const url = `https://api.github.com/repos/${config.repo}/contents/${config.filePath}?ref=${encodeURIComponent(config.branch)}`;
  const response = await fetch(url, { headers: githubHeaders(config.token) });
  if (!response.ok) throw Object.assign(new Error(`GitHub ${response.status}`), { status: response.status });
  return response.json();
}
function decodeGithubContent(content) { return JSON.parse(Buffer.from(String(content || '').replace(/\s+/g, ''), 'base64').toString('utf8')); }
async function readSettings(config) {
  if (!config.token) {
    const rawUrl = `https://raw.githubusercontent.com/${config.repo}/${encodeURIComponent(config.branch)}/${config.filePath.split('/').map(encodeURIComponent).join('/')}`;
    const rawResponse = await fetch(rawUrl, { headers: { Accept: 'application/json', 'User-Agent': 'NapHire settings reader' } }).catch(() => null);
    if (rawResponse && rawResponse.ok) { try { return await rawResponse.json(); } catch (_) {} }
    const local = await readLocalSettings();
    if (local) return local;
    throw Object.assign(new Error('A tartós mentés nincs beállítva.'), { status: 503 });
  }
  return decodeGithubContent((await githubFile(config)).content);
}
function suppliedAdminToken(req) { return String(req.headers['x-admin-token'] || req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim(); }
function validAdminToken(req) { const expected = String(process.env.ADMIN_TOKEN || '').trim(); return Boolean(expected && suppliedAdminToken(req) === expected); }

module.exports = async function handler(req, res) {
  const config = githubConfig();
  if (req.method === 'GET' || req.method === 'HEAD') {
    try { const settings = await readSettings(config); return req.method === 'HEAD' ? res.status(200).end() : json(res, 200, settings); }
    catch (error) { return json(res, error.status === 404 ? 404 : 503, { error: 'A szerveroldali beállítások jelenleg nem érhetők el.' }); }
  }
  if (req.method !== 'PUT') { res.setHeader('Allow', 'GET, HEAD, PUT'); return json(res, 405, { error: 'Csak a GET és a PUT engedélyezett.' }); }
  if (!validAdminToken(req)) return json(res, 401, { error: 'Helytelen vagy hiányzó admin kód.' });
  if (!config.token) return json(res, 503, { error: 'A GitHub mentési kapcsolat nincs beállítva.' });
  let settings = req.body;
  if (typeof settings === 'string') { try { settings = JSON.parse(settings); } catch { settings = null; } }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return json(res, 400, { error: 'Érvénytelen beállítási adat.' });
  const serialized = JSON.stringify(settings, null, 2) + '\n';
  if (Buffer.byteLength(serialized, 'utf8') > MAX_SETTINGS_BYTES) return json(res, 413, { error: 'A beállítási adat túl nagy.' });
  try {
    let sha;
    try { sha = (await githubFile(config)).sha; } catch (error) { if (error.status !== 404) throw error; }
    const url = `https://api.github.com/repos/${config.repo}/contents/${config.filePath}`;
    const payload = { message: 'Update editorial settings from NapHire admin', content: Buffer.from(serialized, 'utf8').toString('base64'), branch: config.branch };
    if (sha) payload.sha = sha;
    const response = await fetch(url, { method: 'PUT', headers: { ...githubHeaders(config.token), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw Object.assign(new Error(`GitHub ${response.status}`), { status: response.status });
    const result = await response.json();
    return json(res, 200, { ok: true, savedAt: new Date().toISOString(), commit: result.commit?.sha || null });
  } catch (error) { console.error('settings save failed', error); return json(res, 502, { error: 'A beállítások mentése nem sikerült.' }); }
};
