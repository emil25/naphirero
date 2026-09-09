(() => {
const KEY='naphire-stories-v1';let saved;try{saved=JSON.parse(localStorage.getItem(KEY));if(!Array.isArray(saved?.stories))saved=null}catch{}
const store=new NHStories.Store(saved);let storageError=false;
let indexedInput=null;let articleIndex=new Map();
function rebuildIndex(){articleIndex=new Map();for(const story of store.data.stories)for(const h of story.articles)articleIndex.set(h.link,story)}
rebuildIndex();
const rawStems=stemek;const stemCache=new Map();
stemek=function(value){if(stemCache.has(value))return stemCache.get(value);const result=rawStems(value);if(stemCache.size>6000)stemCache.clear();stemCache.set(value,result);return result};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(store.data));storageError=false}catch{storageError=true}};
const esc=biztonsagos;const title=s=>s.articles[0]?.cim||'';const sources=s=>new Set(s.articles.map(h=>h.forras)).size;
const latest=s=>Math.max(...s.articles.map(h=>Date.parse(h.datum)));
const href=s=>'#tortenet='+s.id;
const link=h=>`<a href="${esc(h.link)}" target="_blank" rel="noopener noreferrer">${esc(h.forras)} ↗</a>`;
const sourceLine=h=>`${forrasIkonHTML(h)}<span><span>${esc(h.forras)} · ${new Date(h.datum).toLocaleString('hu-HU')}</span><h3>${esc(h.cim)}</h3>${link(h)}</span>`;
const excerpt=h=>String(h.lead||h.cim).replace(/The post[\s\S]*$/i,'').trim();
function route(){const m=location.hash.match(/^#tortenet=([\w-]+)$/);return m&&m[1]}
function sourceMarks(story,compact=true){
 const unique=[...new Map(story.articles.map(h=>[h.forras,h])).values()];
 const shown=compact?unique.slice(0,4):unique;
 return `<span class="story-source-marks" aria-label="Források: ${esc(unique.map(h=>h.forras).join(', '))}">${shown.map(h=>`<span class="story-source-mark" title="${esc(h.forras)}"><span class="story-source-icon"><span aria-hidden="true">${esc(h.forras.slice(0,2))}</span><img src="${esc(favicon(h.link))}" alt="" loading="lazy" decoding="async" width="20" height="20" onerror="this.hidden=true"></span><span>${esc(h.forras)}</span></span>`).join('')}${unique.length>shown.length?`<span class="story-source-more">+${unique.length-shown.length}</span>`:''}</span>`;
}
function earlierStories(story){
 const previous=NHStories.previousStories(story,store.data.stories);
 return `<section class="story-previous"><h2>Előzmények</h2><p class="story-note">Korábbi, témájukban kapcsolódó történetek. A kapcsolatot szövegegyezések jelzik; nem feltétlenül ugyanannak az eseménynek a korábbi fejleményei.</p>${previous.length?previous.map(s=>`<a class="story-related" href="${href(s)}"><time>${new Date(latest(s)).toLocaleDateString('hu-HU')}</time><strong>${esc(title(s))}</strong><small>${sources(s)} forrás · ${s.articles.length} cikk</small></a>`).join(''):'<p>Még nincs megfelelő korábbi történet a tárolt hírek között.</p>'}</section>`;
}
function renderOverview(mode){
 let list=store.data.stories.filter(s=>latest(s)>=Date.now()-48*3600000);
 if(mode==='kovetett')list=store.data.stories.filter(s=>store.data.following[s.id]!=null);
 else if(mode==='ora')list=list.filter(s=>latest(s)>=Date.now()-3600000);
 else list.sort((a,b)=>sources(b)-sources(a)||latest(b)-latest(a));
 if(mode!=='ajanlja')list.sort((a,b)=>latest(b)-latest(a));
 document.getElementById('tartalom').innerHTML=`<div class="story-page"><a class="story-back" href="#">← Főoldal</a><header class="story-hero"><h1>${mode==='ora'?'Utolsó óra':mode==='kovetett'?'Követett történetek':'NapHíre ajánlja'}</h1><p>${mode==='ajanlja'?'Az elmúlt 48 óra történetei, a források száma szerint.':mode==='kovetett'?'Ebben a böngészőben követett történetek.':'Az elmúlt 60 percben megjelent cikkek történetei.'}</p></header><nav class="story-nav"><a href="#tortenetek=ajanlja">NapHíre ajánlja</a><a href="#tortenetek=ora">Utolsó óra</a><a href="#tortenetek=kovetett">Követett</a></nav>${list.slice(0,40).map(s=>`<a class="story-open" href="${href(s)}"><span>${sources(s)} forrás · ${s.articles.length} cikk · ${idoOta(new Date(latest(s)))}${store.data.following[s.id]!=null&&store.data.following[s.id]<s.revision?' · ÚJ FEJLEMÉNY':''}</span><strong>${esc(title(s))}</strong>${sourceMarks(s)}</a>`).join('')||'<p style="padding:24px">Ebben a nézetben még nincs történet.</p>'}</div>`;
}
const overview=document.createElement('button');overview.type='button';overview.textContent='Történetek';overview.onclick=e=>{e.stopPropagation();location.hash='tortenetek=ajanlja'};document.querySelector('.rovatok-in').append(overview);
function renderStory(key){
 const s=store.get(key);const target=document.getElementById('tartalom');
 if(!s){target.innerHTML='<p>A történet ezen a böngészőn még nem érhető el. <a href="#">Vissza a főoldalra</a></p>';return}
 const articles=[...s.articles].sort((a,b)=>Date.parse(b.datum)-Date.parse(a.datum));
 const unique=[...new Map(articles.map(h=>[h.forras,h])).values()];const following=store.data.following[s.id]!=null;
 const fresh=following&&store.data.following[s.id]<s.revision;
 target.innerHTML=`<article class="story-page"><a href="#" class="story-back">← Főoldal</a><header class="story-hero"><span class="story-label">EGY TÖRTÉNET – TÖBB FORRÁS</span><h1>${esc(title(s))}</h1><p>${sources(s)} forrás · ${articles.length} kapcsolódó cikk · Legutóbbi cikk: ${idoOta(new Date(latest(s)))}</p><div class="story-publishers">${sourceMarks(s,false)}</div><button type="button" id="story-follow">${following?'Követés kikapcsolása':'Történet követése'}</button>${fresh?'<strong class="story-new">Új fejlemény érkezett</strong>':''}</header><nav class="story-nav"><a href="#story-what">Mi történt?</a><a href="#story-sources">Mit írnak róla?</a><a href="#story-changes">Mi változott?</a></nav><section id="story-what"><h2>Mi történt?</h2><p>${esc(excerpt(articles[0]))}</p><small>Forrásrészlet: ${link(articles[0])}</small></section><section><h2>Mi a legfontosabb?</h2><p class="story-note">A források kiemelt állításai, automatikusan kiválasztott RSS-részletekkel.</p><ul class="story-points">${unique.slice(0,5).map(h=>`<li>${esc(excerpt(h))} <small>${link(h)}</small></li>`).join('')}</ul></section><section><h2>Napi összkép · NapHíre AI</h2><p class="story-note">Az AI-elemzés még nincs bekötve. Közös tényállítást, fontossági értékelést és automatikus eltérésvizsgálatot ezért még nem készítünk.</p></section><section id="story-sources"><h2>Mit írnak róla?</h2><p class="story-note">Az ehhez az eseményhez kapcsolt cikkek. A korábbi, hasonló témájú híreket lent, az Előzmények között találod.</p>${articles.map(h=>`<div class="story-source">${sourceLine(h)}</div>`).join('')}</section><section><h2>Források szerint</h2>${unique.map(h=>`<div class="story-perspective">${forrasIkonHTML(h)}<span><h3>${esc(h.forras)}</h3><p>${esc(excerpt(h))}</p>${link(h)}</span></div>`).join('')}</section><section><h2>Eltérések</h2><p>A források közötti érdemi eltérések nincsenek automatikusan ellenőrizve. Ez nem jelenti azt, hogy minden forrás egyetért.</p></section><section id="story-changes"><h2>Mi változott?</h2><p>Az új cikkek a meglévő történethez kapcsolódnak. A lista a NapHíre által észlelt frissítéseket mutatja.</p><ol class="story-timeline">${s.events.slice(-20).reverse().map(e=>`<li><time>${new Date(e.at).toLocaleString('hu-HU')}</time><span>${esc(e.source||'Szerkesztés')} · ${esc(e.title)}</span></li>`).join('')}</ol></section>${earlierStories(s)}<details class="story-editor"><summary>Szerkesztői javítás · helyi előnézet</summary><p>Ezek a módosítások ebben a böngészőben tárolódnak. Éles szerkesztői jogosultságkezelés még nincs bekötve.</p><label>Összevonás ezzel a történettel<select id="story-merge-target">${store.data.stories.filter(o=>o!==s).map(o=>`<option value="${o.id}">${esc(title(o))}</option>`).join('')}</select></label><button id="story-merge">Összevonás</button><fieldset><legend>Külön történetbe helyezendő cikkek</legend>${articles.map((h,i)=>`<label><input type="checkbox" name="story-split" value="${i}"> ${esc(h.forras)} – ${esc(h.cim)}</label>`).join('')}</fieldset><button id="story-split">Kijelölt cikkek szétválasztása</button><p id="story-editor-status" role="status"></p></details>${storageError?'<p role="alert">A böngésző tárolója megtelt vagy nem elérhető. A változások nem mentődnek.</p>':''}</article>`;
 // A szekciónavigáció ne változtassa meg a történet útvonalát.
 target.querySelectorAll('.story-nav a').forEach(a=>a.onclick=e=>{e.preventDefault();target.querySelector(a.getAttribute('href')).scrollIntoView({behavior:'smooth'})});
 target.querySelector('#story-follow').onclick=()=>{if(following)delete store.data.following[s.id];else store.data.following[s.id]=s.revision;rebuildIndex();save();renderStory(s.id)};
 if(following){store.data.following[s.id]=s.revision;save()}
 target.querySelector('#story-merge').onclick=()=>{try{store.merge(s.id,target.querySelector('#story-merge-target').value);rebuildIndex();save();renderStory(s.id)}catch(e){target.querySelector('#story-editor-status').textContent=e.message}};
 target.querySelector('#story-split').onclick=()=>{try{const links=[...target.querySelectorAll('[name=story-split]:checked')].map(n=>articles[Number(n.value)].link);store.split(s.id,links);rebuildIndex();save();renderStory(s.id)}catch(e){target.querySelector('#story-editor-status').textContent=e.message}};
}
// Közös történetadatok a meglévő főoldali elemek számára.
nhSameEvent=(a,b)=>{
 const pair=[a.link,b.link].sort().join('|');
 if(store.data.blocked.includes(pair))return false;
 const one=articleIndex.get(a.link);
 if(one&&one===articleIndex.get(b.link))return true;
 return NHStories.match(a,b);
};
nhGroupStories=articles=>{
 const buckets=new Map();
 for(const h of articles){const s=articleIndex.get(h.link);const key=s?.id||h.link;if(!buckets.has(key))buckets.set(key,[]);if(!buckets.get(key).some(a=>a.link===h.link))buckets.get(key).push(h)}
 return [...buckets.values()];
};
for(const name of ['napTemajaHTML','erdelyTemaHTML']){
 const original=window[name];
 window[name]=function(topic){
  if(!topic?.fo)return original(topic);
  const supplied=[topic.fo,...(topic.osszes||topic.tobbi||[])];
  const stored=articleIndex.get(topic.fo.link)?.articles||[];
  const unique=new Map();
  for(const h of [...supplied,...stored])if(h?.link&&!unique.has(h.link))unique.set(h.link,{...h,datum:new Date(h.datum)});
 const current=[...unique.values()].sort((a,b)=>b.datum-a.datum);
 // Kézi szerkesztői kiemelésnél a megadott cikk maradjon a hero vezetője;
 // az újabb kapcsolódó cikkek a látható forráslistát frissítik.
 const newest=topic.rogzitett
  ? (current.find(h=>h.link===topic.fo.link)||topic.fo)
  : (current[0]||topic.fo);
  if(stored.length&&current.some(h=>!stored.some(saved=>saved.link===h.link))){
   const story=articleIndex.get(topic.fo.link);
   story.articles=current;
   rebuildIndex();
  }
  return original({...topic,fo:newest,osszes:current,tobbi:current.filter(h=>h.link!==newest.link),forrasDb:new Set(current.map(h=>h.forras)).size});
 };
}
const previous=rajzol;
rajzol=function(){
 if(indexedInput!==osszesHir){store.ingest(osszesHir);indexedInput=osszesHir;rebuildIndex();save();}
 if(route()){renderStory(route());return}
 const overviewMode=location.hash.match(/^#tortenetek=(ajanlja|ora|kovetett)$/);if(overviewMode){renderOverview(overviewMode[1]);return}
 previous();
 const root=document.getElementById('tartalom');
 for(const anchor of root.querySelectorAll('.ts-fo,.nh-story,.nh-event-main')){
  const url=anchor.getAttribute('href');if(!url)continue;
  const s=articleIndex.get(url);if(!s||sources(s)<2)continue;
  let host=anchor.closest('.tema-sav-in')||anchor.closest('.nh-event');
  if(!host){host=document.createElement('article');host.className=anchor.className+' nh-event';anchor.className='nh-event-main';anchor.replaceWith(host);host.append(anchor)}
  if(host.querySelector(`[data-story-open="${s.id}"]`))continue;
  const a=document.createElement('a');a.dataset.storyOpen=s.id;a.href=href(s);
  if(host.classList.contains('tema-sav-in')){
   a.className='story-open-inline';a.innerHTML='<span>Összkép megnyitása ↗</span>';
   const sourceHead=host.querySelector('.ts-masok-cim');
   (sourceHead||host.querySelector('.ts-masok')||host).append(a);
  }else if(host.classList.contains('nh-region-row')){
   a.className='story-open story-open-compact';a.innerHTML=`<span>${sources(s)} FORRÁS · ÖSSZKÉP ↗</span>`;host.append(a);
  }else{
   a.className='story-open';a.innerHTML=`<span>EGY TÖRTÉNET · ${sources(s)} forrás · ${s.articles.length} cikk</span>${sourceMarks(s)}<strong>Történet megnyitása ↗</strong>`;host.append(a);
  }
 }
};
// Egyetlen útvonalkezelő: a korábban regisztrált renderelők ne fussanak újra.
window.addEventListener('hashchange',event=>{
 event.stopImmediatePropagation();
 const hash=location.hash;
 if(!hash||hash==='#'||route()||hash.startsWith('#tortenetek=')||hash.startsWith('#cikk=')){
  rajzol();window.scrollTo({top:0,behavior:'instant'});
 }
},true);
document.addEventListener('click',event=>{
 const back=event.target.closest('.story-back');if(!back)return;
 event.preventDefault();event.stopImmediatePropagation();
 history.pushState(null,'',location.pathname+location.search);
 aktivRovat='mind';aktivForras=null;keresoSzo='';
 rajzol();window.scrollTo({top:0,behavior:'instant'});
},true);

const previousRovat=valtRovat;valtRovat=function(r){if(route()||location.hash.startsWith('#tortenetek='))history.replaceState(null,'',location.pathname);previousRovat(r)};
const previousRegio=valtRegio;valtRegio=function(r){if(route()||location.hash.startsWith('#tortenetek='))history.replaceState(null,'',location.pathname);previousRegio(r)};
if(!document.documentElement.classList.contains('nh-booting'))rajzol();
})();


