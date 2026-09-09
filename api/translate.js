const cache = new Map();

function translationParts(text, limit = 110) {
  if (text.length <= limit) return [text];
  const head = text.slice(0, limit);
  const preferred = [...head.matchAll(/\s(?:pentru|deoarece|fiindca|care|cand|dupa|inainte|iar|dar|si)\s/giu)]
    .filter(match => match.index > Math.floor(limit * .5)).pop();
  const cut = preferred ? preferred.index + 1 : Math.max(1, head.lastIndexOf(' '));
  return [text.slice(0, cut).trim(), ...translationParts(text.slice(cut).trim(), limit)];
}

async function translateRomanian(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 700);
  if (!clean) return '';
  if (cache.has(clean)) return cache.get(clean);
  const parts = translationParts(clean);
  if (parts.length > 1) {
    const translatedParts = [];
    for (const part of parts) translatedParts.push(await translateRomanian(part));
    const combined = translatedParts.join(' ').replace(/\s+/g, ' ').trim();
    cache.set(clean, combined);
    return combined;
  }
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', clean);
  url.searchParams.set('langpair', 'ro|hu');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json', 'User-Agent': 'NapHire.ro translation client' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const translated = String(data?.responseData?.translatedText || '').trim() || clean;
    cache.set(clean, translated);
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    return translated;
  } finally { clearTimeout(timeout); }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Csak POST keres engedelyezett.' });
  try {
    const texts = Array.isArray(req.body?.texts) ? req.body.texts.slice(0, 12) : [];
    const translations = await Promise.all(texts.map(text => translateRomanian(text).catch(() => String(text || ''))));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).json({ translations });
  } catch {
    return res.status(400).json({ error: 'A forditas nem sikerult.' });
  }
};
