const ALLOWED_HOSTS = new Set([
  'maszol.ro', 'www.maszol.ro', 'kronikaonline.ro', 'www.kronikaonline.ro', 'kronika.ro', 'www.kronika.ro',
  'szekelyhon.ro', 'www.szekelyhon.ro', 'transtelex.ro', 'www.transtelex.ro',
  '3szek.ro', 'www.3szek.ro', 'hargitanepe.ro', 'www.hargitanepe.ro',
  'telex.hu', 'www.telex.hu', 'hvg.hu', 'www.hvg.hu', '24.hu', 'www.24.hu',
  'index.hu', 'www.index.hu', '444.hu', 'www.444.hu', 'origo.hu', 'www.origo.hu',
  'youtube.com', 'www.youtube.com', 'szekelykonyhaeskert.ro', 'www.szekelykonyhaeskert.ro',
  'noileg.ro', 'www.noileg.ro'
]);

const MAX_REDIRECTS = 3;
const MAX_BYTES = 2 * 1024 * 1024;

function parseAllowedUrl(value) {
  let target;
  try { target = new URL(value); } catch { return null; }
  if (!['https:', 'http:'].includes(target.protocol)) return null;
  if (!ALLOWED_HOSTS.has(target.hostname.toLowerCase())) return null;
  target.username = '';
  target.password = '';
  target.hash = '';
  return target;
}

async function fetchFeed(initialUrl) {
  let target = initialUrl;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    let response;
    try {
      response = await fetch(target, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.2',
          'User-Agent': 'NapHire.ro RSS reader (+https://naphirero.vercel.app/)'
        }
      });
    } finally { clearTimeout(timeout); }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      const redirected = location ? parseAllowedUrl(new URL(location, target).toString()) : null;
      if (!redirected) throw new Error('Nem engedelyezett atiranyitas.');
      target = redirected;
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_BYTES) throw new Error('Tul nagy forras.');
    const body = await response.text();
    if (Buffer.byteLength(body, 'utf8') > MAX_BYTES) throw new Error('Tul nagy forras.');
    if (!body.trim().startsWith('<')) throw new Error('Nem XML forras.');
    return body;
  }
  throw new Error('Tul sok atiranyitas.');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Csak GET keres engedelyezett.' });
  }
  const rawUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  const target = parseAllowedUrl(rawUrl);
  if (!target) return res.status(400).json({ error: 'Ismeretlen vagy nem engedelyezett hirforras.' });

  try {
    const body = await fetchFeed(target);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(req.method === 'HEAD' ? '' : body);
  } catch (error) {
    const timedOut = error && error.name === 'AbortError';
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? 'A hirforras idotullepes miatt nem valaszolt.' : 'A hirforras atmenetileg nem erheto el.'
    });
  }
};

