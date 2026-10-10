(function (root) {
  'use strict';
  const NEWS_CACHE = 'naphire_hir_gyorsitotar_v1';
  const SETTINGS_CACHE = 'naphire_settings_v1';
  const DAY = 86400000;

  // Keep the deadline until the response body has arrived, not just its headers.
  async function request(url, type, timeout = 4500, fetcher = root.fetch.bind(root), onResponse = () => {}) {
    const controller = new AbortController();
    let timer;
    try {
      return await Promise.race([
        (async () => {
          const response = await fetcher(url, { signal: controller.signal, cache: type === 'json' ? 'no-store' : 'default' });
          if (!response.ok) throw new Error('HTTP ' + response.status);
          onResponse(response);
          return type === 'json' ? response.json() : response.text();
        })(),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error('A lekérés időkerete lejárt.'));
          }, timeout);
        })
      ]);
    } finally { clearTimeout(timer); }
  }

  function validArticles(articles, now = Date.now()) {
    if (!Array.isArray(articles)) return [];
    return articles.filter(h => h && typeof h.cim === 'string' && h.cim.trim()
      && /^https?:\/\//.test(h.link || '') && typeof h.forras === 'string'
      && Number.isFinite(Date.parse(h.datum)) && Date.parse(h.datum) <= now + 300000
      && now - Date.parse(h.datum) < 3 * DAY);
  }

  function readNewsCache(storage, now = Date.now()) {
    try {
      const saved = JSON.parse(storage.getItem(NEWS_CACHE));
      if (!saved || !Number.isFinite(saved.mentveKor) || now - saved.mentveKor >= DAY || saved.mentveKor > now + 300000) return null;
      const hirek = validArticles(saved.hirek, now).map(h => ({ ...h, datum: new Date(h.datum) }));
      return hirek.length ? { hirek, mentveKor: saved.mentveKor } : null;
    } catch { return null; }
  }

  function mergeFeeds(sources, results, previous, disabled = [], now = Date.now()) {
    const off = new Set(Array.isArray(disabled) ? disabled : []);
    const articles = [], failed = [], retained = [];
    let freshSources = 0;
    sources.forEach((source, index) => {
      if (off.has(source.nev)) return;
      const result = results[index];
      const fresh = result?.status === 'fulfilled' ? validArticles(result.value, now) : [];
      if (fresh.length) { articles.push(...fresh); freshSources++; }
      else {
        failed.push(source.nev);
        const cached = validArticles(previous, now).filter(h => h.forras === source.nev);
        if (cached.length) { articles.push(...cached); retained.push(source.nev); }
      }
    });
    const seen = new Set();
    const hirek = articles.filter(h => {
      if (seen.has(h.link)) return false;
      seen.add(h.link); return true;
    }).map(h => ({ ...h, datum: new Date(h.datum) })).sort((a, b) => b.datum - a.datum);
    return { hirek, failed, retained, freshSources };
  }

  async function loadSource(source, parse, preferred = new Map()) {
    const lastUrl = preferred.get(source.nev);
    const urls = [...new Set([lastUrl, ...source.urls].filter(Boolean))];
    const deadline = Date.now() + 4500;
    for (const url of urls) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      try {
        const xml = await request('/api/rss?url=' + encodeURIComponent(url), 'text', remaining);
        const articles = parse(xml, source);
        if (articles?.length) { preferred.set(source.nev, url); return articles; }
      } catch { /* Try another known feed URL within the same total deadline. */ }
    }
    throw new Error('A hírforrás átmenetileg nem elérhető.');
  }

  const api = { request, validArticles, readNewsCache, mergeFeeds, loadSource };
  if (typeof module !== 'undefined') { module.exports = api; return; }
  const preferred = new Map();
  let activeRefresh = null, settingsStale = false, firstRender = true;

  function storageRead(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
  function storageWrite(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ } }
  function applySettings(settings) {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return false;
    BEALLITASOK = { ...BEALLITASOK, ...settings,
      banners: { ...BEALLITASOK.banners, ...(settings.banners || {}) },
      kiemeltTema: { aktiv: false, cim: '', link: '', ...(settings.kiemeltTema || {}) },
      kiemeltTemaErdely: { aktiv: false, cim: '', link: '', ...(settings.kiemeltTemaErdely || {}) },
      forrasokKi: Array.isArray(settings.forrasokKi) ? settings.forrasokKi : []
    };
    document.querySelectorAll('.szlogen').forEach(el => { el.textContent = BEALLITASOK.tagline; });
    const banner = document.getElementById('fejlec-banner');
    if (banner) banner.innerHTML = fejlecBannerHTML();
    // The URL chooses the edition. Editorial settings must never redirect an open page.
    return true;
  }
  async function loadSettings() {
    settingsStale = false;
    try {
      const settings = await request('settings.json', 'json', 2200, root.fetch.bind(root), response => {
        settingsStale = response.headers.get('X-NapHire-Settings') === 'fallback';
      });
      const cached = storageRead(SETTINGS_CACHE);
      if (settingsStale && cached && Date.now() - cached.savedAt < DAY) {
        applySettings(cached.settings);
        return false;
      }
      if (!applySettings(settings)) throw new Error('Érvénytelen beállítás.');
      if (!settingsStale) storageWrite(SETTINGS_CACHE, { settings, savedAt: Date.now() });
      return true;
    } catch {
      const cached = storageRead(SETTINGS_CACHE);
      if (cached && Date.now() - cached.savedAt < DAY) applySettings(cached.settings);
      settingsStale = true;
      return false;
    }
  }

  function normalizeImage(value) {
    if (!value) return null;
    if (typeof kepUrlTisztit === 'function') return kepUrlTisztit(value);
    try { const url = new URL(value, location.href); return /^https?:$/.test(url.protocol) ? url.href : null; } catch { return null; }
  }

  function render() {
    if (osszesHir.length) {
      try { rajzol(); } catch (error) {
        console.error('NapHíre megjelenítés:', error);
        document.getElementById('tartalom').innerHTML = '<div class="nh-load-error" role="alert"><h1>A megjelenítés nem sikerült</h1><p>Frissítsd az oldalt az újrapróbáláshoz.</p></div>';
      }
    }
    else {
      const content = document.getElementById('tartalom');
      content.innerHTML = '<div class="nh-load-error" role="status"><h1>A hírek most nem érhetők el</h1><p>Próbáld újra a frissítést. Amint a források válaszolnak, itt jelennek meg a hírek.</p><button type="button" onclick="NHHome.refresh()">Újrapróbálom</button></div>';
    }
    window.__NH_EDITORIAL_READY__ = true;
    document.documentElement.classList.remove('nh-booting', 'nh-topic-syncing');
    if (firstRender) {
      firstRender = false;
      document.dispatchEvent(new CustomEvent('nh:home-ready'));
      setTimeout(() => videoSavFrissit(), 0);
    }
  }

  async function refreshOnce() {
    const button = document.getElementById('frissit-gomb');
    button?.classList.add('forog');
    button?.setAttribute('aria-busy', 'true');
    try {
      // Begin both operations together. Render only with settings and all settled feeds.
      const settingsPromise = loadSettings();
      let feedsDone = false;
      const feedsPromise = Promise.allSettled(FORRASOK.map(source => loadSource(source, xmlFeldolgoz, preferred))).then(results => { feedsDone = true; return results; });
      await settingsPromise;
      renderForrasaink();
      let cached = null;
      try { cached = readNewsCache(localStorage); } catch { /* Private browsing may disable storage. */ }
      const previous = osszesHir.length ? osszesHir : (cached?.hirek || []);
      const disabled = new Set(BEALLITASOK.forrasokKi);
      if (firstRender && previous.length && !feedsDone) {
        osszesHir = previous.filter(h => !disabled.has(h.forras)).map(h => ({ ...h, kep: normalizeImage(h.kep), rovat: h.rovat || rovatBesorol(h) }));
        gyorsitotarKorabol = cached?.mentveKor || Date.now();
        document.getElementById('frissitve').textContent = 'Mentett hírek · frissítés folyamatban';
        if (osszesHir.length) render();
      }
      const snapshot = mergeFeeds(FORRASOK, await feedsPromise, previous, BEALLITASOK.forrasokKi);
      osszesHir = snapshot.hirek.map(h => ({ ...h, kep: normalizeImage(h.kep), rovat: h.rovat || rovatBesorol(h) }));
      hibasForrasok = snapshot.failed;
      gyorsitotarKorabol = snapshot.retained.length ? (cached?.mentveKor || Date.now()) : null;
      if (typeof tartalekTipus !== 'undefined') tartalekTipus = snapshot.retained.length ? 'cache' : null;
      if (typeof temaValasztasTorol === 'function') { temaValasztasTorol('magyar'); temaValasztasTorol('erdely'); }
      // A failed refresh must not make an old cache look newly fetched.
      if (snapshot.freshSources && osszesHir.length) hirGyorsitotarMent(osszesHir);
      const time = new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
      document.getElementById('frissitve').textContent = snapshot.freshSources
        ? 'Források ellenőrizve: ' + time + (snapshot.retained.length ? ' · ' + snapshot.retained.length + ' korábbi forrás' : '') + (settingsStale ? ' · beállítások nem frissültek' : '')
        : 'A frissítés nem sikerült' + (osszesHir.length ? ' · mentett hírek' : '');
      render();
    } finally {
      button?.classList.remove('forog');
      button?.setAttribute('aria-busy', 'false');
    }
  }
  function refresh() {
    if (!activeRefresh) activeRefresh = refreshOnce().catch(error => {
      console.error('NapHíre betöltés:', error);
      render();
    }).finally(() => { activeRefresh = null; });
    return activeRefresh;
  }
  window.NHHome = { ...api, loadSettings, loadSource: source => loadSource(source, xmlFeldolgoz, preferred), refresh };
  document.addEventListener('DOMContentLoaded', () => {
    if (document.documentElement.dataset.nhLoadError || (document.documentElement.dataset.nhEdition !== 'legacy' && (!window.__NH_RENDERER_LOADED__ || !window.NHStories || !window.NHEditorial))) {
      document.getElementById('tartalom').innerHTML = '<div class="nh-load-error" role="alert"><h1>A megjelenítés nem töltődött be</h1><p>Frissítsd az oldalt az újrapróbáláshoz.</p></div>';
      document.documentElement.classList.remove('nh-booting', 'nh-topic-syncing');
      return;
    }
    refresh();
    setInterval(() => { if (!document.hidden) { refresh(); videoSavFrissit(); } }, 5 * 60 * 1000);
  }, { once: true });
})(typeof window !== 'undefined' ? window : globalThis);
