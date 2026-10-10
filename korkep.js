(() => {
  const switcher = document.querySelector('.premium-header-actions a');
  const isKorkep = location.pathname.replace(/\/+$/, '') === '/korkep';
  if (!isKorkep) {
    if (switcher) { switcher.href = '/korkep'; switcher.textContent = 'Körkép'; }
    return;
  }

  document.documentElement.classList.add('nh-korkep');
  document.title = 'NapHíre Körkép – fontos történetek több forrásból';
  if (switcher) { switcher.href = '/klasszikus'; switcher.textContent = 'Klasszikus'; switcher.title = 'Vissza a klasszikus főoldalhoz'; }

  function decorate() {
    const masthead = document.querySelector('.korkep-masthead');
    if (masthead) masthead.hidden = /^#(?:cikk|tortenet|roman)=/.test(location.hash);
    const date = document.getElementById('korkep-date');
    if (date) date.textContent = new Date().toLocaleDateString('hu-HU', { year:'numeric', month:'long', day:'numeric', weekday:'long' });

    const daily = document.querySelector('#vegyes-hirek');
    if (daily) {
      const eyebrow = daily.querySelector('.nh-eyebrow');
      const title = daily.querySelector('h2');
      if (eyebrow) eyebrow.textContent = 'MAI FONTOS ÜGYEK';
      if (title) title.textContent = 'Mai történetek';
    }
    document.querySelector('.tema-sav')?.classList.add('korkep-theme');
    document.querySelector('.nh-trending-host')?.classList.add('korkep-trending');
  }

  if (typeof window.rajzol === 'function') {
    const render = window.rajzol;
    window.rajzol = function (...args) { const result = render.apply(this, args); decorate(); return result; };
  }
  document.addEventListener('DOMContentLoaded', decorate, { once:true });
  window.addEventListener('hashchange', decorate);
})();
