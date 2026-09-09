/* Rovatmegjelenések. Az eredeti híradatok, cikklinkek és olvasónézet változatlanok. */
(() => {
  const originalSection = szekcioHTML;
  const configs = {
    A: ['erdely', 'Közelről', 'Erdély'],
    B: ['magyarorszag', 'Közélet és társadalom', 'Magyarország'],
    C: ['gazdasag', 'Döntések és következmények', 'Gazdaság'],
    D: ['sport', 'Pályán és azon túl', 'Sport'],
    E: ['kultura', 'Alkotók, történetek, találkozások', 'Kultúra']
  };
  const attr = h => `${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener noreferrer"`;
  const meta = h => `<span class="rd-meta">${forrasIkonHTML(h,'kicsi')}<b>${biztonsagos(h.forras)}</b><span>${idoOta(h.datum)}</span></span>`;
  const headline = (h, cls = '') => `<a class="rd-headline ${cls}" ${attr(h)}>${meta(h)}<h3>${biztonsagos(h.cim)}</h3><span class="rd-arrow" aria-hidden="true">↗</span></a>`;
  const picture = h => h.kep ? `<span class="rd-photo"><img src="${biztonsagos(h.kep)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.hidden=true"></span>` : '';
  const photoStory = (h, cls = '') => `<a class="rd-photo-story ${cls}" ${attr(h)}>${picture(h)}<span class="rd-story-copy">${meta(h)}<h3>${biztonsagos(h.cim)}</h3></span></a>`;
  const intro = h => {
    const value = String(h.lead || '').replace(/The post[\s\S]*$/i, '').trim();
    return value ? `<p>${biztonsagos(value.length > 235 ? value.slice(0, 232).replace(/\s+\S*$/, '') + '…' : value)}</p>` : '';
  };
  szekcioHTML = function(cim, osztaly, cikkek, variant) {
    if (!configs[variant]) return originalSection(cim, osztaly, cikkek, variant);
    if (!cikkek.length) return '';
    const [key, overline, name] = configs[variant];
    const unique = [...new Map(cikkek.filter(h => !(window.__nhDailyLinks && window.__nhDailyLinks.has(h.link))).map(h => [h.link, h])).values()];
    if (!unique.length) return '';
    const first = unique.find(h => h.kep) || unique[0];
    const rest = unique.filter(h => h !== first);
    const chapter = String(Object.keys(configs).indexOf(variant) + 1).padStart(2, '0');
    const header = `<header class="rd-header"><span class="rd-chapter-number" aria-hidden="true">${chapter}</span><div class="rd-title-block"><span class="rd-overline">${overline}</span><h2>${name}</h2></div><button type="button" class="rd-all" data-rd-rovat="${key}">Összes hír <span aria-hidden="true">↗</span></button></header>`;
    const lead = `<a class="rd-lead" ${attr(first)}>${picture(first)}<span class="rd-lead-copy">${meta(first)}<h3>${biztonsagos(first.cim)}</h3>${intro(first)}</span></a>`;
    let body;
    if (variant === 'A') {
      const stream=rest.slice(0,3),gallery=rest.slice(3,6),briefs=rest.slice(6,10);
      body = `<div class="rd-transylvania"><div class="rd-transylvania-top${stream.length?'':' rd-layout-solo'}">${lead}${stream.length?`<div class="rd-local-stream rd-items-${stream.length}">${stream.map(h => photoStory(h, 'rd-local-row')).join('')}</div>`:''}</div>${gallery.length?`<div class="rd-local-gallery rd-items-${gallery.length}">${gallery.map(h => photoStory(h)).join('')}</div>`:''}${briefs.length?`<div class="rd-local-briefs rd-items-${briefs.length}">${briefs.map(h => photoStory(h, 'rd-local-row')).join('')}</div>`:''}</div>`;
    } else if (variant === 'B') {
      const mosaic=rest.slice(0,4),bottom=rest.slice(4,8);
      body = `<div class="rd-hungary"><a class="rd-hungary-feature" ${attr(first)}><span class="rd-hungary-intro">${meta(first)}<h3>${biztonsagos(first.cim)}</h3>${intro(first)}<span class="rd-feature-arrow" aria-hidden="true">↗</span></span>${picture(first)}</a>${mosaic.length?`<div class="rd-hungary-mosaic rd-items-${mosaic.length}">${mosaic.map((h,i) => photoStory(h, 'rd-hungary-tile rd-hungary-tile-' + i)).join('')}</div>`:''}${bottom.length?`<div class="rd-hungary-bottom rd-items-${bottom.length}">${bottom.map(h => photoStory(h, 'rd-local-row')).join('')}</div>`:''}</div>`;
    } else if (variant === 'C') {
      body = `<div class="rd-money-layout${rest.length?'':' rd-layout-solo'}">${lead}${rest.length?`<div class="rd-money-river"><span class="rd-column-title">Gazdasági hírfigyelő</span>${rest.slice(0,6).map(h => `<div class="rd-number-row">${headline(h)}</div>`).join('')}</div>`:''}</div>`;
    } else if (variant === 'D') {
      const side=rest.slice(0,4),extra=rest.slice(4,7);
      body = `<div class="rd-sport-layout${side.length?'':' rd-layout-solo'}">${lead}${side.length?`<aside class="rd-sport-river"><span class="rd-column-title">A sportvilág hírei</span>${side.map(h => headline(h)).join('')}</aside>`:''}</div>${extra.length?`<div class="rd-sport-extra rd-items-${extra.length}">${extra.map(h => `<a ${attr(h)}>${picture(h)}<span>${meta(h)}<h3>${biztonsagos(h.cim)}</h3></span></a>`).join('')}</div>`:''}`;
    } else {
      const cultureRest=rest.slice(0,3);
      body = `<a class="rd-culture-layout rd-culture-feature${first.kep?'':' rd-layout-solo'}" ${attr(first)}>${picture(first)}<span class="rd-culture-copy"><span class="rd-overline">Kultúra közelről</span>${meta(first)}<h3>${biztonsagos(first.cim)}</h3>${intro(first)}<span class="rd-read">A történet tovább <span aria-hidden="true">↗</span></span></span></a>${cultureRest.length?`<div class="rd-culture-bottom rd-items-${cultureRest.length}">${cultureRest.map(h => photoStory(h, 'rd-culture-story')).join('')}</div>`:''}`;
    }
    return `<section id="rovat-${key}" class="rd-section rd-${key} rd-count-${Math.min(unique.length,11)}${unique.length === 1 ? ' rd-single' : ''}">${header}${body}</section>`;
  };
  document.addEventListener('click', e => {
    const button = e.target.closest('[data-rd-rovat]');
    if (!button) return;
    const key = button.dataset.rdRovat === 'magyarorszag' ? 'magyar' : button.dataset.rdRovat;
    const existing = document.querySelector(`#rovat-sav [data-rovat="${key}"],.rovat-sav [data-rovat="${key}"],[data-rovat="${key}"]`);
    if (existing) existing.click();
  });
  if (!document.documentElement.classList.contains('nh-booting')) rajzol();
})();

/* Címlapi hírfolyam: önálló képes nyitás és tömör hírcsoportok. */
(() => {
  mozaikHTML = function(cikkek) {
    const source = (typeof osszesHir !== 'undefined' && Array.isArray(osszesHir) && osszesHir.length) ? osszesHir : cikkek;
    const items = [...new Map(source.filter(Boolean).map(h => [h.link,h])).values()]
      .sort((a,b) => new Date(b.datum) - new Date(a.datum));
    if (!items.length) return '';
    const link = h => `${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener"`;
    const meta = h => `<span class="nh-meta">${forrasIkonHTML(h,'kicsi')}<b>${biztonsagos(h.forras)}</b><span>· ${idoOta(h.datum)}</span></span>`;
    const photo = h => h.kep ? `<span class="nh-photo"><img src="${biztonsagos(h.kep)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.hidden=true"></span>` : '<span class="nh-photo nh-photo-fallback"></span>';
    const useful = items.filter(h => !/(mindekozben|celeb|reklam|apple-event|meghivo|eljegyzes|horoszkop|szorakozas|bulvar)/i.test(String(h.link||'')+' '+String(h.cim||'')));
    const erdelySources=/maszol|krónika|kronika|székelyhon|szekelyhon|transtelex|3szék|hargita népe|marosvásárhelyi rádió/i;
    const isErdely=h => (h.newsRegion||h.region)==='erdely' || erdelySources.test(String(h.forras||''));
    const isMagyar=h => (h.newsRegion||h.region)==='magyar';
    const wordCache=new Map(),relatedCache=new Map();
    const words=h => {if(!wordCache.has(h))wordCache.set(h,new Set(String(h.cim||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{5,}/g)||[]));return wordCache.get(h)};
    const overlap=(a,b) => {const aw=words(a),bw=words(b);let n=0;aw.forEach(w=>{if(bw.has(w))n++});return n};
    const sameStory=(a,b) => overlap(a,b)>=2;
    const relatedSources=h => {if(!relatedCache.has(h))relatedCache.set(h,new Set(useful.filter(x=>Math.abs(new Date(x.datum)-new Date(h.datum))<36*3600000&&sameStory(h,x)).map(x=>x.forras)).size);return relatedCache.get(h)};
    const score=h => relatedSources(h)*90 + (isErdely(h)?35:0) + (h.kep?8:0) + Math.max(0,36-(Date.now()-new Date(h.datum))/3600000);
    const ordered=[...useful].sort((a,b)=>score(b)-score(a)||new Date(b.datum)-new Date(a.datum));
    const chosen=[], seen=new Set();
    const addFrom=(pool,count) => {
      for(const h of pool){
        if(chosen.length>=5||count<=0)break;
        if(seen.has(h.link)||chosen.some(x=>sameStory(x,h)))continue;
        chosen.push(h);seen.add(h.link);count--;
      }
    };
    addFrom(ordered.filter(isErdely),3);
    addFrom(ordered.filter(isMagyar),1);
    addFrom(ordered,5-chosen.length);
    if(!chosen.length) return '';
    let lead=chosen.filter(isErdely).sort((a,b)=>score(b)-score(a)).find(h=>h.kep) || chosen.find(h=>h.kep) || chosen[0];
    const rest=chosen.filter(h=>h!==lead).slice(0,4);
    window.__nhDailyLinks = new Set(chosen.map(h=>h.link));
    return `<section class="nh-mixed nh-daily-spread" id="vegyes-hirek">
      <header class="nh-mixed-head"><div><span class="nh-eyebrow">A NAP FONTOS ÜGYEI</span><h2>Mai történetek</h2></div><span class="nh-mixed-tag">5 gyorsan átlátható hír</span></header>
      <div class="nh-daily-layout">
        <a class="nh-story nh-daily-lead" ${link(lead)}>${photo(lead)}<span class="nh-daily-shade"></span><span class="nh-copy"><b class="nh-daily-number">01</b>${meta(lead)}<h3>${biztonsagos(lead.cim)}</h3><p>${biztonsagos(String(lead.lead||'').slice(0,190))}</p></span></a>
        <div class="nh-daily-river">${rest.map((h,i)=>`<a class="nh-daily-card nh-daily-card-${i+2}" ${link(h)}>${photo(h)}<span class="nh-daily-shade"></span><span class="nh-copy"><b class="nh-daily-number">0${i+2}</b>${meta(h)}<h3>${biztonsagos(h.cim)}</h3></span></a>`).join('')}</div>
      </div>
    </section>`;
  };
  if (!document.documentElement.classList.contains('nh-booting')) rajzol();
})();

/* NH_STORY_GROUPING_START — konzervatív, időablakos eseménycsoportosítás. */
function nhSameEvent(a, b) {
  if (!a || !b) return false;
  if (a.link === b.link) return true;
  const distance = Math.abs(new Date(a.datum) - new Date(b.datum));
  if (!Number.isFinite(distance) || distance > 48 * 3600000) return false;
  const generic = new Set(['magyar','péter','orbán','viktor','donald','trump','putyin','szerint','mondta','kormány','elnök']);
  const tokens = value => new Set(stemek(value || '').filter(t => !generic.has(t)));
  const x = tokens(a.cim), y = tokens(b.cim);
  const shared = [...x].filter(t => y.has(t)).length;
  if (shared < 3 || shared / Math.min(x.size, y.size) < .5) return false;
  const ax = tokens(a.cim + ' ' + (a.lead || '').slice(0,180));
  const bx = tokens(b.cim + ' ' + (b.lead || '').slice(0,180));
  const common = [...ax].filter(t => bx.has(t)).length;
  return common / Math.min(ax.size, bx.size) >= .35;
}
function nhGroupStories(articles) {
  const groups = [];
  const seen = new Set();
  for (const h of articles) {
    if (!h || !h.link || seen.has(h.link)) continue;
    seen.add(h.link);
    // Minden taghoz illeszkedjen: közvetítő cikk nem vonhat össze két eseményt.
    const group = groups.find(g => g.every(other => nhSameEvent(h, other)));
    if (group) group.push(h); else groups.push([h]);
  }
  return groups;
}
/* NH_STORY_GROUPING_END */
(() => {
  const originalMosaic = mozaikHTML;
  mozaikHTML = function(articles) {
    const groups = nhGroupStories(articles);
    const used = new Set(groups.flat().map(h => h.link));
    for (const h of osszesHir) {
      if (used.has(h.link)) continue;
      const group = groups.find(g => g.every(other => nhSameEvent(h,other)));
      if (group) { group.push(h); used.add(h.link); }
    }
    const representatives = groups.map(g => g.find(h => h.kep) || g[0]);
    const markup = document.createElement('template');
    markup.innerHTML = originalMosaic(representatives);
    for (const anchor of markup.content.querySelectorAll('.nh-story')) {
      const index = representatives.findIndex(h => h.link === anchor.getAttribute('href'));
      if (index < 0) continue;
      const group = groups[index];
      const sources = new Set(group.map(h => h.forras));
      if (group.length < 2) continue;
      const wrapper = document.createElement('article');
      wrapper.className = 'nh-event ' + anchor.className;
      anchor.className = 'nh-event-main';
      anchor.replaceWith(wrapper);
      wrapper.append(anchor);
      const details = document.createElement('details');
      details.className = 'nh-sources';
      const latest = group.reduce((a,b) => new Date(a.datum) > new Date(b.datum) ? a : b);
      const marks = [...new Map(group.map(h => [h.forras,h])).values()].slice(0,4).map(h => forrasIkonHTML(h,'kicsi')).join('');
      details.innerHTML = `<summary><span>Hol jelent meg?</span><span class="nh-source-icons">${marks}</span><b>${sources.size} forrás · ${group.length} cikk</b><span class="nh-expand" aria-hidden="true">+</span></summary><div class="nh-source-list"><p class="nh-source-update">Legutóbbi cikk: ${biztonsagos(idoOta(new Date(latest.datum)))}</p>${[...group].sort((a,b)=>new Date(b.datum)-new Date(a.datum)).map(h=>`<a href="${biztonsagos(h.link)}" target="_blank" rel="noopener noreferrer">${forrasIkonHTML(h)}<span><span class="nh-meta">${biztonsagos(h.forras)} · ${biztonsagos(idoOta(new Date(h.datum)))}</span><h4>${biztonsagos(h.cim)}</h4></span></a>`).join('')}</div>`;
      wrapper.append(details);
    }
    return markup.innerHTML;
  };
  if (!document.documentElement.classList.contains('nh-booting')) rajzol();
})();

/* Napi áttekintő és többforrásos történetrangsor, kizárólag RSS-adatokból. */
(() => {
  let ranked = [];
  const dialog = document.createElement('dialog');
  dialog.className = 'nh-brief-dialog';
  dialog.setAttribute('aria-labelledby','nh-dialog-title');
  dialog.innerHTML = '<header class="nh-dialog-head"><h2 id="nh-dialog-title">Ma 5 percben</h2><button type="button" aria-label="Bezárás">×</button></header><div class="nh-brief-content"></div>';
  document.body.append(dialog);
  dialog.querySelector('button').addEventListener('click',()=>dialog.close());
  const button = document.createElement('button');
  button.className = 'nh-brief-button';button.type='button';button.textContent='Ma 5 percben';
  document.querySelector('.premium-header-actions').prepend(button);
  const safeLink = h => biztonsagos(h.link);
  const sourceCount = g => new Set(g.map(h=>h.forras)).size;
  function openBrief(groups, single=false){
    dialog.querySelector('h2').textContent = single ? 'Egy történet, több forrás' : 'Ma 5 percben';
    dialog.querySelector('.nh-brief-content').innerHTML = `<p class="nh-brief-note">${single ? 'Az eseményhez kapcsolt eredeti cikkek.' : 'Öt aktuális történet röviden. A leírások a megjelölt források RSS-bevezetői; nem AI-összefoglalók.'}</p>` + (groups.length ? groups.map((g,i)=>{
      const h=g[0];const lead=String(h.lead||'').replace(/The post[\s\S]*$/i,'').trim();
      return `<article class="nh-brief-item"><span class="nh-meta">${String(i+1).padStart(2,'0')} · ${sourceCount(g)} forrás · ${g.length} cikk</span><h3>${biztonsagos(h.cim)}</h3>${lead ? `<p>${biztonsagos(lead)}</p>`:''}<a href="${safeLink(h)}" target="_blank" rel="noopener noreferrer">${biztonsagos(h.forras)} · Eredeti cikk ↗</a>${g.length>1?`<details ${single?'open':''}><summary>Ugyanerről írnak</summary>${g.slice(1).map(other=>`<a href="${safeLink(other)}" target="_blank" rel="noopener noreferrer"><b>${biztonsagos(other.forras)}</b>${biztonsagos(other.cim)}</a>`).join('')}</details>`:''}</article>`;
    }).join('') : '<p>A friss történetek betöltése folyamatban van.</p>');
    if(!dialog.open)dialog.showModal();
  }
  button.addEventListener('click',()=>openBrief(ranked.slice(0,5)));
  const originalRender=rajzol;
  rajzol=function(){
    originalRender();
    const start=new Date();start.setHours(0,0,0,0);
    let recent=osszesHir.filter(h=>new Date(h.datum).getTime()>=start.getTime());
    if(recent.length<6)recent=osszesHir.filter(h=>Date.now()-new Date(h.datum).getTime()<=24*3600000);
    ranked=nhGroupStories([...recent].sort((a,b)=>b.datum-a.datum)).sort((a,b)=>sourceCount(b)-sourceCount(a)||b.length-a.length||b[0].datum-a[0].datum);
    const mosaic=document.querySelector('.nh-mixed');
    const mainBlock=document.querySelector('.foblokk');
    const host=document.querySelector('.nh-trending-host')||document.querySelector('.foblokk .jobb-sav');
    if(!mosaic||!mainBlock||!host)return;
    const featuredLinks=new Set([...document.querySelectorAll('.tema-sav a[href]')].map(a=>a.getAttribute('href')));
    const dailyLinks=window.__nhDailyLinks||new Set();
    const sidebarRanked=ranked.filter(g=>!g.some(h=>featuredLinks.has(h.link)||dailyLinks.has(h.link)));
    const erdelySources=/maszol|krónika|kronika|székelyhon|szekelyhon|transtelex|3szék|hargita népe|marosvásárhelyi rádió/i;
    const groupIsErdely=g=>g.some(h=>(h.newsRegion||h.region)==='erdely'||erdelySources.test(String(h.forras||'')));
    const groupIsMagyar=g=>g.some(h=>(h.newsRegion||h.region)==='magyar');
    const multi=sidebarRanked.filter(g=>sourceCount(g)>1);
    const trending=[], used=new Set();
    const takeOne=pool=>{const g=pool.find(x=>!used.has(x));if(g){trending.push(g);used.add(g);}};
    takeOne(multi.filter(groupIsErdely));
    takeOne(multi.filter(groupIsMagyar));
    takeOne(multi.filter(groupIsErdely));
    takeOne(multi);
    takeOne(multi.filter(groupIsErdely));
    [...multi,...sidebarRanked].forEach(g=>{if(trending.length<5&&!used.has(g)){trending.push(g);used.add(g);}});
    if(!trending.length)return;
    host.classList.add('nh-trending-host');
    host.innerHTML='<section class="nh-trending nh-trending-side"><header><span class="nh-trending-kicker">A mai sajtó közös témái</span><h2>Mi pörög ma?</h2><p>Forráslefedettség alapján</p></header><ol>'+trending.map((g,i)=>{const marks=[...new Map(g.map(h=>[h.forras,h])).values()].slice(0,3).map(h=>forrasIkonHTML(h,'kicsi')).join('');const visual=g.find(h=>h.kep)||g[0];const photo=visual.kep?`<span class="nh-trending-image"><img src="${biztonsagos(visual.kep)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.hidden=true"></span>`:'';return `<li><button type="button" data-story-rank="${i}">${photo}<span class="nh-trending-row"><span class="nh-rank">${String(i+1).padStart(2,'0')}</span><span class="nh-trending-copy"><strong>${biztonsagos(g[0].cim)}</strong><small><span class="nh-trending-sources">${marks}</span>${sourceCount(g)} forrás · ${g.length} cikk</small></span></span></button></li>`}).join('')+'</ol></section>';
    mainBlock.classList.add('nh-trending-layout');
    if(host.parentElement===mainBlock)mainBlock.insertAdjacentElement('afterend',host);
    const section=host.querySelector('.nh-trending');
    section.addEventListener('click',e=>{const target=e.target.closest('[data-story-rank]');if(target)openBrief([trending[Number(target.dataset.storyRank)]],true);});
  };
  if (!document.documentElement.classList.contains('nh-booting')) rajzol();
})();
