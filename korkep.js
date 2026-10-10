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
    const mastheadTitle = masthead?.querySelector('h1');
    if (mastheadTitle) mastheadTitle.textContent = 'Mai hírek';
    const mastheadIntro = masthead?.querySelector('b');
    if (mastheadIntro) mastheadIntro.textContent = 'A legfontosabb történetek, több forrás nézőpontjából.';
    const editionLabel = masthead?.querySelector('.korkep-edition span');
    if (editionLabel) editionLabel.textContent = 'MAI ÁTTEKINTÉS';
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
    const themeTitle = document.querySelector('.tema-sav .ts-fej');
    if (themeTitle) {
      const label = themeTitle.childNodes;
      for (const node of label) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          node.textContent = 'A nap fő története';
          break;
        }
      }
    }
    document.querySelector('.nh-trending-host')?.classList.add('korkep-trending');

    // A Körképnek saját olvasási útja van: kiemelt ügy → mai válogatás → közös témák → rovatok.
    const content = document.getElementById('tartalom');
    const featureGrid = content?.querySelector('.foblokk');
    const dailySection = content?.querySelector('.nh-daily-spread');
    const latest = featureGrid?.querySelector('.jobb-sav');
    if (content && featureGrid) {
      if (dailySection && dailySection.parentElement !== content) content.insertBefore(dailySection, featureGrid);
      if (latest && latest.parentElement !== content) {
        const anchor = dailySection?.parentElement === content ? dailySection : featureGrid;
        anchor.insertAdjacentElement('afterend', latest);
      }
      featureGrid.querySelectorAll(':scope > div:empty').forEach(node => node.remove());
      if (!featureGrid.children.length) featureGrid.remove();
    }
  }

  if (typeof window.rajzol === 'function') {
    const render = window.rajzol;
    window.rajzol = function (...args) { const result = render.apply(this, args); decorate(); return result; };
  }
  document.addEventListener('DOMContentLoaded', decorate, { once:true });
  window.addEventListener('hashchange', decorate);
})();
