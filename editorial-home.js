(() => {
 let input=null;const e=biztonsagos;
 const photo=h=>h.kep?`<span class="ed-photo"><img src="${e(h.kep)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.hidden=true"></span>`:'';
 const meta=h=>`<span class="ed-meta">${e(h.forras)} · ${idoOta(new Date(h.datum))}</span>`;
 const attrs=h=>`${dc(h)} href="${e(h.link)}" target="_blank" rel="noopener noreferrer"`;
 const card=(h,cls='',img=true)=>`<a class="ed-article ${cls}" ${attrs(h)}>${img?photo(h):''}<span>${meta(h)}<h3>${e(h.cim)}</h3></span></a>`;
 const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const meaningfulTitle=h=>{const t=normal(h?.cim).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();return t.length>=10&&/[a-z]{3}/.test(t)};
 const topicStop=new Set('hogy vagy mint szerint utan elott kozott miatt csak mar meg egy ezt azt lesz volt van nem magyar magyarorszag erdely hir friss'.split(' '));
 const topicTokens=h=>new Set(normal((h.cim||'')+' '+(h.kategoriak||'')).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>4&&!topicStop.has(w)).map(w=>w.slice(0,9)));
 const family=h=>{const s=normal((h.cim||'')+' '+(h.lead||''));for(const [key,re] of [['parlament',/parlament|orszaggyules|kepviselo|hazelnok|ules/],['iskola',/iskola|tanev|oktatas|diak|tanar/],['idojaras',/idojaras|hidegfront|kanikula|vihar|eso|havazas/],['valasztas',/valasztas|szavazas|exit poll|mandatum/],['ukrajna',/ukrajna|kijev|zelenszkij|orosz haboru/],['gazdasag',/inflacio|koltsegvetes|forint|uzemanyag|minimalber/]])if(re.test(s))return key;return ''};
 const related=(a,b)=>{if(nhSameEvent(a,b))return true;if(Math.abs(new Date(a.datum)-new Date(b.datum))>30*3600000)return false;const x=topicTokens(a),y=topicTokens(b),shared=[...x].filter(t=>y.has(t)).length;return shared>=2&&shared/Math.max(1,Math.min(x.size,y.size))>=.34};
 const samePlacementTopic=(a,b)=>related(a,b)||(family(a)&&family(a)===family(b));
 const distinct=list=>{const out=[];for(const h of list){if(!out.some(a=>nhSameEvent(a,h)))out.push(h)}return out};
 const sectionDistinct=list=>{const out=[];for(const h of list){if(!out.some(a=>samePlacementTopic(a,h)))out.push(h)}return out};
 const fresh=()=>osszesHir.filter(h=>Date.now()-new Date(h.datum)<72*3600000&&meaningfulTitle(h));
 const priority=h=> (/iskola|tanév|választás|költségvetés|beruházás|kórház|pedagógus|nyugdíj|közlekedés|felújított|polgármester/i.test(h.cim)?5:0)-(/roller|motoros baleset|hídon|járőrök|elesett|lottó/i.test(h.cim)?6:0)+(h.newsRegion==='erdely'?3:0)+(h.kep?1:0)+(!h.rovat?2:0)+Math.max(0,3-(Date.now()-new Date(h.datum))/3600000/8);
 const balanced=list=>{const per=new Map();return list.filter(h=>{const n=per.get(h.forras)||0;if(n>=3)return false;per.set(h.forras,n+1);return true})};
 let topicArticles=[];let usedArticles=[];
 const available=h=>!usedArticles.some(a=>a.link===h.link||samePlacementTopic(a,h));
 function claimHTML(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  const links=new Set([...doc.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')));
  usedArticles.push(...osszesHir.filter(h=>links.has(h.link)));
  return html;
 }

 const topicRenderer=napTemajaHTML;
 napTemajaHTML=function(topic){topicArticles=topic?[topic.fo,...(topic.osszes||topic.tobbi||[])]:[];return claimHTML(topicRenderer(topic).replace('A nap fő híre · Magyarország',topic?.fo?.newsRegion==='vilag'?'A nap fő híre · Világ':'A nap fő híre · Magyarország'))};
 const oldMosaic=mozaikHTML;
 mozaikHTML=function(){
  const shown=topicArticles.map(h=>h.link);
  const pool=fresh().filter(h=>h.newsRegion==='erdely'&&!['sport','kultura','tech','eletmod','velemeny'].includes(h.rovat)&&!shown.includes(h.link)&&!topicArticles.some(t=>nhSameEvent(t,h))&&!/horoszkóp|lottó|emoji/i.test(h.cim));
  const er=balanced(sectionDistinct(pool.filter(h=>h.newsRegion==='erdely').sort((a,b)=>priority(b)-priority(a))));
  const chosen=er.slice(0,7);
  return claimHTML(oldMosaic(distinct(chosen).filter(available)));
 };
 const originalSection=szekcioHTML;
 szekcioHTML=function(cim,cls,articles,variant){
  const region=variant==='A'?'erdely':variant==='B'?'magyar':null;
  const section={C:'gazdasag',D:'sport',E:'kultura'}[variant];
  const pool=fresh().filter(available).filter(h=>region?h.newsRegion===region&&!h.rovat:h.newsRegion!=='roman'&&h.rovat===section);
  return claimHTML(originalSection(cim,cls,balanced(sectionDistinct(pool.sort((a,b)=>priority(b)-priority(a)))).slice(0,11),variant));
 };
 function extra(key,name,subtitle,items){
  items=items.filter(available);
  const title=`<header class="ed-section-head"><span>${subtitle}</span><h2>${name}</h2></header>`;
  if(!items.length)return `<section class="ed-section ed-${key}" id="rovat-${key}">${title}<p class="ed-empty">Jelenleg nincs friss, biztosan ide sorolható cikk a beérkezett forrásokból.</p></section>`;
  let body;
  if(key==='vilag')body=`<div class="ed-world">${card(items[0],'ed-world-lead')}<div>${items.slice(1,5).map(h=>card(h,'ed-world-row')).join('')}</div></div>`;
  if(key==='tech')body=`<div class="ed-tech-grid">${items.slice(0,3).map((h,i)=>`<article><span class="ed-number">0${i+1}</span>${card(h,'',i===0)}</article>`).join('')}</div>`;
  if(key==='eletmod')body=`<div class="ed-life-grid">${items.slice(0,4).map(h=>card(h)).join('')}</div>`;
  if(key==='velemeny')body=`<div class="ed-opinion-grid">${items.slice(0,4).map(h=>`<article>${meta(h)}${h.author?`<p>${e(h.author)}</p>`:''}<a ${attrs(h)}><h3>${e(h.cim)}</h3></a></article>`).join('')}</div>`;
  return claimHTML(`<section class="ed-section ed-${key}" id="rovat-${key}">${title}${body}</section>`);
 }
 // Az automatikus Nap témája az aktuális forráslefedettségből választódik.
 let topicInput=null;let topicMinute=0;const topicCache=new Map();
 napTemajaStabil=function(jelolt,nev){
  if(topicInput!==osszesHir||topicMinute!==Math.floor(Date.now()/60000)){topicInput=osszesHir;topicMinute=Math.floor(Date.now()/60000);topicCache.clear()}
  if(topicCache.has(nev))return topicCache.get(nev);
  const now=Date.now();
  const start=new Date(now);start.setHours(0,0,0,0);
  let candidates=osszesHir.filter(h=>new Date(h.datum)>=start&&new Date(h.datum)<=now&&h.newsRegion===(nev==='erdely'?'erdely':'magyar'));
  if(candidates.length<6)candidates=osszesHir.filter(h=>now-new Date(h.datum)>=0&&now-new Date(h.datum)<=24*3600000&&h.newsRegion===(nev==='erdely'?'erdely':'magyar'));
  const raw=[];for(const h of [...candidates].sort((a,b)=>new Date(b.datum)-new Date(a.datum))){const g=raw.find(g=>g.some(x=>related(h,x)));if(g)g.push(h);else raw.push([h])}
  const groups=raw.map(g=>({articles:[...g].sort((a,b)=>new Date(b.datum)-new Date(a.datum)),sources:new Set(g.map(h=>h.forras)).size}));
  groups.sort((a,b)=>b.sources-a.sources||b.articles.length-a.articles.length||new Date(b.articles[0].datum)-new Date(a.articles[0].datum));
  const best=groups[0];const topic=best?{fo:best.articles[0],tobbi:best.articles.slice(1),osszes:best.articles,forrasDb:best.sources}:null;
  topicCache.set(nev,topic);return topic;
 };
 // A szerkesztő által rögzített téma elsőbbséget kap. A hozzá tartozó RSS-cikkeket
 // a teljes híranyagból keressük, mert egy erdélyi ügyet magyarországi vagy román
 // lapok is követhetnek. A megadott kulcsszavak segítenek az eltérő címeknél.
 temaRogzitettbol=function(kiemelt,jelolt,regio){
  const canonical=url=>String(url||'').split('#')[0].split('?')[0].replace(/\/$/,'');
  const all=osszesHir.filter(h=>h&&h.link&&meaningfulTitle(h));
  const exact=all.find(h=>canonical(h.link)===canonical(kiemelt.link));
  const fo={
   ...(exact||{}),
   cim:kiemelt.cim||(exact?.cim||''),
   lead:kiemelt.lead||(exact?.lead||''),
   kep:kiemelt.kep||(exact?.kep||''),
   link:kiemelt.link||(exact?.link||'#'),
   forras:kiemelt.forras||(exact?.forras||'Szerkesztőség'),
   datum:exact?.datum||new Date(),
   region:exact?.region||regio||'erdely',
   newsRegion:exact?.newsRegion||exact?.region||regio||'erdely'
  };
  const keywords=(kiemelt.kulcsszavak||[]).map(normal).filter(Boolean);
  const keywordMatch=h=>{
   if(!keywords.length)return false;
   const haystack=normal(`${h.cim||''} ${h.lead||''}`);
   return keywords.some(keyword=>haystack.includes(keyword));
  };
  const matches=all.filter(h=>canonical(h.link)!==canonical(fo.link)&&(related(fo,h)||keywordMatch(h)));
  const unique=[fo,...matches]
   .filter((h,index,list)=>list.findIndex(other=>canonical(other.link)===canonical(h.link))===index)
   .sort((a,b)=>new Date(b.datum)-new Date(a.datum));
  const tobbi=unique.filter(h=>canonical(h.link)!==canonical(fo.link)).slice(0,12);
  const osszes=[fo,...tobbi];
  return {fo,tobbi,osszes,forrasDb:new Set(osszes.map(h=>h.forras)).size,rogzitett:true};
 };
 document.querySelector('.header-live')?.remove();
 kiegyenlitOldalsav=()=>{};
 figyeljBalHasab=()=>{if(balFigyelo)balFigyelo.disconnect()};
 const renderSources=renderForrasaink;
 renderForrasaink=function(){renderSources();document.querySelectorAll('.forras-pill').forEach(button=>{
  const source=FORRASOK.find(f=>button.textContent.trim().endsWith(f.nev));if(!source?.urls?.[0])return;
  const icon=button.querySelector('.fp-ikon');if(icon)icon.innerHTML+=`<img src="${e(favicon(source.urls[0]))}" alt="" loading="lazy" decoding="async" width="22" height="22" onerror="this.hidden=true">`;
 })};
 renderForrasaink();
 const magazines={konyha:[],noileg:[]};
 const magazineCard=(h,i)=>`<a class="mg-story mg-story-${i}" href="${e(h.link)}" target="_blank" rel="noopener noreferrer">${photo(h)}<span class="mg-copy"><small>${h.link.includes('/recept/')?'RECEPT':'OLVASÓVÁLOGATÁS'}</small><h3>${e(h.cim)}</h3><span class="mg-read">Elolvasom ↗</span></span></a>`;
 function magazineHTML(){return `<div id="rovat-eletmod">${[['konyha','Székely Konyha és Kert','Ízek, történetek, otthon','https://szekelykonyhaeskert.ro/'],['noileg','Nőileg','Az erdélyi nők online portálja','https://noileg.ro/']].map(([key,title,sub,url])=>`<section class="mg-section mg-${key}"><header class="mg-heading"><div><small>${sub}</small><h2>${title}</h2></div><a href="${url}" target="_blank" rel="noopener noreferrer">A magazin összes cikke ↗</a></header><div class="mg-layout">${magazines[key].map(magazineCard).join('')}</div></section>`).join('')}</div>`}
 function updateMagazines(){const host=document.querySelector('#rovat-eletmod');if(host)host.outerHTML=magazineHTML()}
 async function refreshMagazineSources(){
  await Promise.allSettled([
   (async()=>{const r=await fetch('/rss?url='+encodeURIComponent('https://noileg.ro/rss/noileg.xml'),{signal:AbortSignal.timeout(7000)});if(!r.ok)return;const items=xmlFeldolgoz(await r.text(),{nev:'Nőileg',region:'erdely'}).filter(h=>h.link.startsWith('https://noileg.ro/')).slice(0,4);if(items.length){magazines.noileg=items;updateMagazines()}})(),
   (async()=>{const r=await fetch('/rss?url='+encodeURIComponent('https://szekelykonyhaeskert.ro/'),{signal:AbortSignal.timeout(7000)});if(!r.ok)return;const doc=new DOMParser().parseFromString(await r.text(),'text/html');const items=[...doc.querySelectorAll('h4 a[href^="/recept/"]')].slice(0,3).map(a=>{const box=a.parentElement.parentElement.querySelector('.photo-box');const img=box?.getAttribute('style')?.match(/url\(['"]?([^'"\)]+)/)?.[1];return {cim:a.textContent.trim(),link:new URL(a.getAttribute('href'),'https://szekelykonyhaeskert.ro/').href,kep:img?new URL(img,'https://szekelykonyhaeskert.ro/').href:''}});if(items.length){magazines.konyha=items;updateMagazines()}})()
  ]);
 }
 fetch('magazine-selection.json').then(r=>r.json()).then(data=>{Object.assign(magazines,data);updateMagazines()}).catch(()=>{}).finally(refreshMagazineSources);

 const romanCacheKey='naphire_roman_lapszemle_v4';
 let romanNews=[];let romanAll=[];
 try{romanNews=(JSON.parse(localStorage.getItem(romanCacheKey)||'[]')||[]).map(h=>({...h,datum:new Date(h.datum)})).filter(h=>h.cim&&h.link&&h.huCim);romanAll=[...romanNews]}catch{}
 const decodeTranslation=value=>{const box=document.createElement('textarea');box.innerHTML=String(value||'');return box.value};
 async function translateRomanTexts(texts){
  try{
   const response=await fetch('/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({texts:texts.slice(0,12)}),signal:AbortSignal.timeout(14000)});
   if(!response.ok)throw new Error('translation');
   const data=await response.json();return texts.map((text,index)=>decodeTranslation(data.translations?.[index]||text));
  }catch{return texts}
 }
 const romanId=h=>{let hash=2166136261;for(const char of String(h.link)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return 'r-'+(hash>>>0).toString(36)};
 const romanCard=(h,cls)=>`<a class="ro-press-story ${cls} ${h.kep?'has-photo':'no-photo'}" href="#roman=${romanId(h)}" data-roman-id="${romanId(h)}">${photo(h)}<span class="ro-press-copy">${forrasIkonHTML(h,'kicsi')}<span><small>${e(h.forras)} · ${idoOta(new Date(h.datum))} · automatikus fordítás</small><h3>${e(h.huCim||h.cim)}</h3></span></span></a>`;
 function romanPressHTML(){
  if(!romanNews.length)return '';
  const lead=romanNews.find(h=>h.kep)||romanNews[0];
  const side=romanNews.filter(h=>h!==lead).slice(0,5);
  return `<section class="ro-press" id="roman-lapszemle"><header class="ro-press-head"><div><span>A ROMÁN SAJTÓ MAGYARUL</span><h2>Román lapszemle</h2></div><p>Mi foglalkoztatja ma a román sajtót?</p></header><div class="ro-press-layout">${romanCard(lead,'ro-press-lead')}<div class="ro-press-river">${side.map(h=>romanCard(h,'ro-press-row')).join('')}</div></div><footer><span>Magyar gépi fordítás · az eredeti cikkek a történetoldalon</span><b>HotNews · G4Media · Digi24</b></footer></section>`;
 }
 function updateRomanPress(){document.querySelector('.ro-press')?.remove();const host=document.querySelector('.foblokk');if(host&&romanNews.length)host.insertAdjacentHTML('afterend',romanPressHTML())}
 async function openRomanStory(article){
  if(!article)return;
  const connected=romanAll.filter(h=>h.link!==article.link&&related(article,h));
  const group=[article,...connected].filter((h,index,list)=>list.findIndex(x=>x.link===h.link)===index).slice(0,8);
  const lead=String(article.lead||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,650);
  const translated=await translateRomanTexts([...group.map(h=>h.cim),lead||article.cim]);
  group.forEach((h,index)=>h.huCim=translated[index]||h.huCim||h.cim);
  const summary=translated[group.length]||article.huCim||article.cim;
  const sourceList=group.map(h=>`<article class="roman-source-item">${h.kep?photo(h):''}<div>${forrasIkonHTML(h,'kicsi')}<small>${e(h.forras)} · ${idoOta(new Date(h.datum))}</small><h3>${e(h.huCim||h.cim)}</h3><p>${e(h.cim)}</p><a href="${e(h.link)}" target="_blank" rel="noopener noreferrer">Eredeti román cikk ↗</a></div></article>`).join('');
  const sources=new Set(group.map(h=>h.forras)).size;
  document.getElementById('tartalom').innerHTML=`<main class="roman-story-page"><button class="roman-story-back" type="button">← Vissza a főoldalra</button><header class="roman-story-hero"><span>A ROMÁN SAJTÓ MAGYARUL · AUTOMATIKUS FORDÍTÁS</span><h1>${e(article.huCim||translated[0]||article.cim)}</h1><p>${sources} román forrás · ${group.length} eredeti cikk</p></header><section class="roman-story-summary"><span>EGY PERC ALATT</span><h2>Mi történt?</h2><p>${e(summary)}</p></section><section class="roman-story-sources"><span>AZ EREDETI BESZÁMOLÓK</span><h2>Román források</h2>${sourceList}</section></main>`;
  window.scrollTo({top:0,behavior:'smooth'});
 }
 document.addEventListener('click',event=>{
  const card=event.target.closest('[data-roman-id]');
  if(card){event.preventDefault();const article=romanAll.find(h=>romanId(h)===card.dataset.romanId);if(article){history.pushState(null,'',`#roman=${card.dataset.romanId}`);openRomanStory(article)}return}
  if(event.target.closest('.roman-story-back')){history.replaceState(null,'',location.pathname);rajzol();refreshRomanPress();window.scrollTo({top:0,behavior:'smooth'})}
 });
 window.addEventListener('popstate',()=>{if(!location.hash.startsWith('#roman=')){rajzol();refreshRomanPress()}});
 async function refreshRomanPress(){
  const items=await mediaBetolt(ROMAN_FORRASOK);
  if(!items.length)return;
  const recent=items.filter(h=>Date.now()-new Date(h.datum)<72*3600000);
  romanAll=recent.filter(meaningfulTitle);
  const romanPriority=h=>{
   const t=normal(h.cim);
   return (/guvern|presed|parlament|ministr|economie|buget|romania|roman\b|bucuresti|autoritat|justitie|educatie|sanatate|energie|marea neagra|anm\b|partid|psd\b|pnl\b|usr\b|aur\b/.test(t)?8:0)
    +(/formula.?1|fotbal|sport|champions league|meci|cursa|dacia|masin|auto|monden|vedet|machiaj|frumus|moda|retet|horoscop|serial|film/.test(t)?-9:0)
    +Math.max(0,3-(Date.now()-new Date(h.datum))/3600000/8);
  };
  const clusters=[];
  for(const article of [...romanAll].sort((a,b)=>new Date(b.datum)-new Date(a.datum))){const cluster=clusters.find(group=>group.some(item=>related(article,item)));if(cluster)cluster.push(article);else clusters.push([article])}
  const ranked=clusters.map(group=>{const sources=new Set(group.map(h=>h.forras)).size;const representative=group.find(h=>h.kep)||group[0];return {group,representative,score:sources*20+Math.max(...group.map(romanPriority))}}).sort((a,b)=>b.score-a.score||new Date(b.representative.datum)-new Date(a.representative.datum));
  const sourceUse=new Map();const chosenLinks=new Set();romanNews=[];
  const addRoman=item=>{if(!item||chosenLinks.has(item.representative.link))return;const source=item.representative.forras;const used=sourceUse.get(source)||0;if(used>=3)return;sourceUse.set(source,used+1);chosenLinks.add(item.representative.link);romanNews.push({...item.representative,_romanRank:item.score})};
  for(const source of ROMAN_FORRASOK){
   const match=ranked.find(item=>item.group.some(article=>article.forras===source.nev));
   const article=match?.group.filter(item=>item.forras===source.nev).sort((a,b)=>romanPriority(b)-romanPriority(a)||new Date(b.datum)-new Date(a.datum))[0];
   if(article)addRoman({representative:article,score:match.score+2});
  }
  for(const item of ranked){addRoman(item);if(romanNews.length===6)break}
  romanNews.sort((a,b)=>(b._romanRank||0)-(a._romanRank||0)||new Date(b.datum)-new Date(a.datum));
  if(!romanNews.length)return;
  const titles=await translateRomanTexts(romanNews.map(h=>h.cim));
  romanNews=romanNews.map((h,index)=>({...h,huCim:titles[index]||h.cim}));
  for(const translated of romanNews){const current=romanAll.find(h=>h.link===translated.link);if(current)current.huCim=translated.huCim}
  try{localStorage.setItem(romanCacheKey,JSON.stringify(romanNews.map(h=>({...h,datum:new Date(h.datum).toISOString()}))))}catch{}
  updateRomanPress();
  const requested=location.hash.match(/^#roman=(.+)$/)?.[1];if(requested){const article=romanAll.find(h=>romanId(h)===requested);if(article)openRomanStory(article)}
 }

 const previous=rajzol;
 rajzol=function(){
  if(input!==osszesHir){input=osszesHir;for(const h of osszesHir){const c=NHEditorial.classify(h);h.newsRegion=c.geo;h.rovat=c.section}}
  usedArticles=[];
  previous();
  if(!document.querySelector('.nh-mixed'))return;
  updateRomanPress();
  const culture=document.querySelector('#rovat-kultura');if(!culture)return;
  const pool=distinct(fresh());
  culture.insertAdjacentHTML('afterend',magazineHTML());
  const economy=document.querySelector('#rovat-gazdasag .rd-header');economy?.insertAdjacentHTML('afterend','<div class="ed-economy-topics"><span>Árak és bérek</span><span>Energia</span><span>Vállalatok</span><span>Közpénzek</span></div>');
  const sport=document.querySelector('#rovat-sport .rd-header');const scores=pool.filter(available).filter(h=>h.rovat==='sport'&&/\b\d{1,2}\s*[–:-]\s*\d{1,2}\b/.test(h.cim)).slice(0,3);
  if(scores.length)sport?.insertAdjacentHTML('afterend',`<div class="ed-scores"><span>A sporthírekben közölt eredmények</span>${scores.map(h=>`<a ${attrs(h)}>${e(h.cim)}</a>`).join('')}</div>`);
 };
 const nav=document.querySelector('.rovatok-in');for(const [key,name] of [['eletmod','Magazin']]){const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=ev=>{ev.stopPropagation();if(!document.querySelector('#rovat-'+key)){history.replaceState(null,'',location.pathname);valtRovat('mind')}document.querySelector('#rovat-'+key)?.scrollIntoView({behavior:'smooth'})};nav.append(b)}
 rajzol();
 refreshRomanPress();
 document.documentElement.classList.remove('nh-booting');
})();
