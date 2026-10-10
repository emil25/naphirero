(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const TOKEN_KEY = 'naphire_admin_token';
  let current = null, busy = false;
  const labels = { quake: 'FÖLDRENGÉS', energy: 'ÁRAMÁR', news: 'FIGYELT ÜGY' };
  const regions = { erdely: 'Erdélyi sajtó', magyar: 'Magyarországi sajtó', mind: 'Erdély és Magyarország' };
  function element(tag, text, cls) { const node = document.createElement(tag); if (text != null) node.textContent = text; if (cls) node.className = cls; return node; }
  function time(value) { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleString('hu-HU', { timeZone: 'Europe/Bucharest', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Ismeretlen'; }
  function status(text, error = false) { $('status').textContent = text; $('status').dataset.error = String(error); }
  function token() { return $('assistant-token').value.trim(); }
  function setBusy(value) {
    busy = value;
    for (const id of ['connect', 'scan', 'save-rules', 'add-watch', 'auto']) $(id).disabled = value || (id !== 'connect' && !current);
    document.querySelectorAll('[data-review],[data-remove]').forEach(button => button.disabled = value);
    $('scan').textContent = value ? 'Ellenőrzés folyamatban…' : 'Források ellenőrzése';
  }
  async function request(action, payload = {}) {
    if (busy) return null;
    if (!token()) { status('Add meg az admin kódot.', true); $('assistant-token').focus(); return null; }
    setBusy(true);
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 22000);
    try {
      const options = { method: action ? 'POST' : 'GET', headers: { 'X-Admin-Token': token() }, cache: 'no-store', signal: controller.signal };
      if (action) { options.headers['Content-Type'] = 'application/json'; options.body = JSON.stringify({ action, ...payload }); }
      const response = await fetch('/api/editor-assistant', options), data = await response.json();
      if (!response.ok) throw new Error(data.error || 'A segéd nem elérhető.');
      try { sessionStorage.setItem(TOKEN_KEY, token()); } catch (_) {}
      current = data; render();
      if (data.localPreview) status('Helyi előnézet: valódi forrásadatok. A szabályok és az átnézések csak a helyi folyamatban maradnak meg; az élő oldalra nem mentünk.');
      else if (data.durable === false) status('Próbamód: az adatok lekérhetők, de a szerveroldali mentési kapcsolat nincs beállítva.', true);
      else if (action === 'scan') status(data.cached ? 'A legutóbbi ellenőrzés öt percen belül történt. A mentett eredményt mutatjuk.' : 'Ellenőrzés kész. A jelzések és az előzmény elmentve.');
      else status(action ? 'Elmentve. Másik böngészőből is visszaolvasható.' : 'A közösen mentett jelzések betöltve.');
      return data;
    } catch (e) { status(e.name === 'AbortError' ? 'A segéd nem válaszolt időben. Próbáld újra; a korábbi jelzések megmaradnak.' : e.message, true); return null; }
    finally { clearTimeout(timer); setBusy(false); }
  }
  function renderSignals() {
    const kind = $('filter').value, list = current?.signals || [];
    const visible = list.filter(item => kind === 'all' || (kind === 'open' ? !item.reviewed : item.kind === kind));
    const container = $('signals'); container.replaceChildren();
    if (!visible.length) {
      const unavailable = current?.sources?.some(source => source.status === 'error');
      container.append(element('p', !current?.checkedAt ? 'Indíts forrásellenőrzést. A segéd ezután mutat eseményeket és találatokat.' : unavailable ? 'Nincs megjeleníthető jelzés ebben a nézetben. Egyes források hibásak: ellenőrizd az állapotukat lent.' : kind === 'open' ? 'Nincs átnézésre váró jelzés a figyelt forrásokban és a beállított küszöbök mellett.' : 'Ebben a nézetben nincs jelzés.', 'empty'));
      return;
    }
    for (const item of visible) {
      const card = element('article', null, 'signal'); card.dataset.kind = item.kind;
      const body = element('div', null, 'signal-body'), meta = element('div', null, 'signal-meta');
      meta.append(element('span', labels[item.kind] || 'JELZÉS'), element('span', item.source));
      const change = item.reviewed ? ['Átnézve', 'reviewed'] : item.change === 'new' ? ['Új találat', 'new'] : item.change === 'updated' ? ['Módosult', 'updated'] : ['Első észlelés', 'baseline'];
      meta.append(element('span', change[0], 'badge ' + change[1]));
      if (item.watchLabel) meta.append(element('span', 'Ügy: ' + item.watchLabel));
      body.append(meta, element('h3', item.title), element('p', item.detail, 'signal-detail'));
      body.append(element('p', (item.kind === 'energy' ? 'Árnap: ' + item.publishedAt.slice(0, 10) : 'Forrásidő: ' + time(item.publishedAt)) + ' · Észlelve: ' + time(item.observedAt), 'signal-time'));
      const actions = element('div', null, 'signal-actions');
      let url; try { url = new URL(item.link); } catch (_) {}
      if (url?.protocol === 'https:' && !url.username && !url.password) { const link = element('a', 'Eredeti forrás megnyitása ↗'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link); }
      if (!item.reviewed) { const button = element('button', 'Átnéztem'); button.dataset.review = item.id; button.addEventListener('click', () => request('review', { id: item.id, fingerprint: item.fingerprint })); actions.append(button); }
      body.append(actions); card.append(element('div', null, 'stripe'), body); container.append(card);
    }
  }
  function render() {
    $('count-open').textContent = current.signals.filter(s => !s.reviewed).length;
    $('count-sources').textContent = current.sources.length ? current.sources.filter(s => s.status === 'ok').length + ' / ' + current.sources.length : '—';
    $('checked-at').textContent = current.checkedAt ? time(current.checkedAt) : 'Még nem történt';
    renderDigest(); renderEnergy();
    $('magnitude').value = current.rules.minMagnitude; $('price-percent').value = current.rules.pricePercent; $('price-absolute').value = current.rules.priceAbsolute;
    $('source-health').replaceChildren();
    if (!current.sources.length) $('source-health').append(element('p', 'Az első ellenőrzés után jelenik meg a forrásállapot.', 'muted'));
    for (const s of current.sources) {
      const row = element('div', null, 'source'); row.dataset.status = s.status;
      row.append(element('strong', (s.status === 'ok' ? '✓ ' : '! ') + s.name), element('small', s.status === 'ok' ? 'Elérhető · ' + (s.records || 0) + ' jelzés · ' + time(s.checkedAt) : s.message || 'Nem elérhető'));
      $('source-health').append(row);
    }
    $('watch-count').textContent = current.watches.length + ' / 12'; $('watches').replaceChildren();
    for (const watch of current.watches) {
      const row = element('div', null, 'watch'), copy = element('div');
      copy.append(element('strong', watch.label), element('small', regions[watch.region] + ' · ' + watch.keywords.join(' + ')));
      const remove = element('button', 'Követés vége'); remove.dataset.remove = watch.id;
      remove.addEventListener('click', () => request('configure', { rules: rules(), watches: current.watches.filter(w => w.id !== watch.id) }));
      row.append(copy, remove); $('watches').append(row);
    }
    renderSignals();
  }
  function rules() { return { minMagnitude: Number($('magnitude').value), pricePercent: Number($('price-percent').value), priceAbsolute: Number($('price-absolute').value) }; }
  function sourceLink(url, title) {
    try { const parsed = new URL(url); if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
      const link = element('a', title); link.href = parsed.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link;
    } catch (_) { return null; }
  }
  function renderDigest() {
    const container = $('digest'); container.replaceChildren();
    const region = $('inbox-region').value;
    const list = (current?.digest || []).filter(a => region === 'mind' || a.region === region).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    for (const article of list) {
      const link = sourceLink(article.link, article.title); if (!link) continue;
      const row = element('article', null, 'digest-item');
      row.append(element('small', article.source + ' · ' + time(article.publishedAt)), link);
      container.append(row);
    }
    if (!container.children.length) container.append(element('p', !current?.checkedAt ? 'A friss hírek lekérése még nem történt meg.' : 'Ebben a térségben nincs friss, olvasható RSS-cikk. A források állapotát lent ellenőrizheted.', 'empty'));
  }
  function renderEnergy() {
    const container = $('energy-overview'), price = current?.energy; container.hidden = !price; container.replaceChildren(); if (!price) return;
    const format = value => Number(value).toLocaleString('hu-HU', { maximumFractionDigits: 2 });
    container.append(element('p', 'MAGYAR NAGYKERESKEDELMI ÁRAMÁR · ' + price.day, 'eyebrow'), element('h2', format(price.average) + ' EUR/MWh'));
    container.append(element('p', 'Előző nap: ' + format(price.previousAverage) + ' EUR/MWh · Eltérés: ' + format(price.difference) + ' EUR/MWh' + (price.percent == null ? '' : ' (' + format(price.percent) + '%)') + '. Napi átlag, nem lakossági tarifa.', 'muted'));
    const link = sourceLink(price.link, 'Eredeti árdiagram ↗'); if (link) container.append(link);
  }
  async function connect() {
    if (await request()) { status('Friss hírek és változások ellenőrzése…'); await request('scan'); }
  }
  $('connect').addEventListener('click', connect);
  $('assistant-token').addEventListener('keydown', e => { if (e.key === 'Enter') connect(); });
  $('inbox-region').addEventListener('change', renderDigest);
  $('scan').addEventListener('click', () => request('scan'));
  $('filter').addEventListener('change', renderSignals);
  $('rules-form').addEventListener('submit', e => { e.preventDefault(); if (current) request('configure', { rules: rules(), watches: current.watches }); });
  $('watch-form').addEventListener('submit', async e => {
    e.preventDefault(); if (!current) return;
    const watch = { label: $('watch-label').value.trim(), region: $('watch-region').value, keywords: $('watch-keywords').value.split(',').map(k => k.trim()).filter(Boolean) };
    if (await request('configure', { rules: rules(), watches: [...current.watches, watch] })) $('watch-form').reset();
  });
  // No hidden-page work or public-homepage dependency. Check only after authentication.
  setInterval(() => { if (current && $('auto').checked && !document.hidden && !busy) request('scan'); }, 5 * 60000);
  try { $('assistant-token').value = sessionStorage.getItem(TOKEN_KEY) || ''; } catch (_) {}
  const preview = new URL(location.href).searchParams.get('fixture');
  if (preview === 'editor') $('fixture-note').hidden = false;
  if ((preview === 'editor' || preview === 'live') && ['127.0.0.1', 'localhost'].includes(location.hostname)) {
    (async () => {
      try {
        const response = await fetch('/__preview', { cache: 'no-store', signal: AbortSignal.timeout(3000) });
        if (!response.ok) return; const metadata = await response.json();
        if (metadata.mode !== preview || !metadata.token) return;
        $('assistant-token').value = metadata.token;
        $('fixture-note').hidden = false;
        if (preview === 'live') $('fixture-note').textContent = 'HELYI ELŐNÉZET · Valódi hírforrások; a mentések csak ebben a helyi folyamatban élnek.';
        await connect();
      } catch (_) { status('A helyi előnézet nem válaszolt. Ellenőrizd, hogy fut-e.', true); }
    })();
  }
})();
