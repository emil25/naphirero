(function () {
  'use strict';

  const TOKEN_KEY = 'naphire_admin_token';

  function status(message, kind) {
    const box = document.getElementById('allapot-uzenet');
    if (!box) return;
    box.textContent = message;
    box.dataset.kind = kind || 'ok';
    box.classList.add('mutat');
    clearTimeout(box._timer);
    box._timer = setTimeout(() => box.classList.remove('mutat'), 7000);
  }

  function tokenField() {
    if (document.getElementById('admin-token')) return document.getElementById('admin-token');
    const wrap = document.createElement('div');
    wrap.className = 'admin-token-wrap';
    wrap.innerHTML = '<label for="admin-token">Admin kód</label><input id="admin-token" type="password" autocomplete="current-password" placeholder="A Vercelben beállított admin kód"><small>A kód csak ezen a böngészőn, munkamenetben marad meg.</small>';
    const actions = document.querySelector('.top-actions') || document.querySelector('.gombsor');
    if (actions) actions.prepend(wrap);
    const input = wrap.querySelector('input');
    try { input.value = sessionStorage.getItem(TOKEN_KEY) || ''; } catch (_) {}
    input.addEventListener('input', () => { try { sessionStorage.setItem(TOKEN_KEY, input.value); } catch (_) {} });
    return input;
  }

  function getToken() {
    const field = tokenField();
    const token = (field.value || '').trim();
    try { sessionStorage.setItem(TOKEN_KEY, token); } catch (_) {}
    return token;
  }

  function validate(data) {
    const missing = [];
    if (data.kiemeltTema?.aktiv && (!data.kiemeltTema.cim || !data.kiemeltTema.link)) missing.push('magyarországi téma');
    if (data.kiemeltTemaErdely?.aktiv && (!data.kiemeltTemaErdely.cim || !data.kiemeltTemaErdely.link)) missing.push('erdélyi téma');
    if (missing.length) {
      alert('A kézi ' + missing.join(' és ') + ' be van kapcsolva, de hiányzik a cím vagy a cikk linkje.');
      return false;
    }
    return true;
  }

  async function save() {
    const data = typeof window.beallitasokOsszeallit === 'function' ? window.beallitasokOsszeallit() : null;
    if (!data || !validate(data)) return;
    const token = getToken();
    if (!token) { status('Az éles mentéshez írd be az admin kódot.', 'error'); tokenField().focus(); return; }
    const button = document.querySelector('[data-server-save]');
    if (button) { button.disabled = true; button.textContent = 'Mentés folyamatban…'; }
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify(data),
        cache: 'no-store'
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error('Helytelen admin kód.');
      if (!response.ok) throw new Error(body.error || 'A mentés nem sikerült.');
      status('✓ Elmentve az oldalra · ' + new Date(body.savedAt || Date.now()).toLocaleTimeString('hu-HU'), 'ok');
    } catch (error) {
      status('Nem sikerült menteni: ' + error.message, 'error');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Mentés az oldalra'; }
    }
  }

  async function loadServerSettings() {
    try {
      const response = await fetch('/api/settings?ts=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (typeof window.beallitasokBetolt === 'function') window.beallitasokBetolt(data);
      if (typeof window.adminAllapotFrissit === 'function') window.adminAllapotFrissit();
      status('✓ Az éles beállítások betöltve', 'ok');
    } catch (_) {}
  }

  function init() {
    tokenField();
    const download = [...document.querySelectorAll('button')].find(button => /settings\.json letöltése/i.test(button.textContent || ''));
    if (download) {
      download.removeAttribute('onclick');
      download.dataset.serverSave = 'true';
      download.textContent = 'Mentés az oldalra';
      download.addEventListener('click', save);
    }
    const copy = document.querySelector('.export-copy small');
    if (copy) copy.textContent = 'A mentés közvetlenül az éles oldal beállításait frissíti.';
    const info = document.querySelector('.info-main') || document.querySelector('.info-sav');
    if (info) info.innerHTML = '<strong>Az admin közvetlenül az oldal beállításait menti.</strong>A változtatások nem letölthető fájlba kerülnek: a mentés után minden látogatónál az új beállítás jelenik meg. A mentéshez írd be a Vercelben beállított admin kódot.';
    document.querySelectorAll('.jegyzet').forEach(note => {
      if (/letöltött settings\.json/i.test(note.textContent || '')) note.textContent = 'A kiválasztott nézet a mentés után minden látogatónál érvénybe lép.';
    });
    const fileButton = [...document.querySelectorAll('button')].find(button => /Settings\.json betöltése/i.test(button.textContent || ''));
    if (fileButton) fileButton.remove();
    const file = document.getElementById('betolt-fajl');
    if (file) file.remove();
    const preview = [...document.querySelectorAll('button')].find(button => /JSON (ellenőrzése|előnézet)/i.test(button.textContent || ''));
    if (preview) preview.remove();
    const jsonBox = document.getElementById('json-doboz');
    if (jsonBox) jsonBox.remove();
    window.letoltSettings = save;
    window.piszkozatMent = function () { if (typeof window.adminAllapotFrissit === 'function') window.adminAllapotFrissit(); };
    loadServerSettings();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
