(() => {
const KEY='naphire-stories-v1';let saved;try{saved=JSON.parse(localStorage.getItem(KEY));if(!Array.isArray(saved?.stories))saved=null}catch{}
const store=new NHStories.Store(saved);let storageError=false;
const TOPIC_KEY='naphire-topic-updates-v1';let topicSaved;
try{topicSaved=JSON.parse(localStorage.getItem(TOPIC_KEY))}catch{}
const topicTracker=new NHStories.TopicTracker(topicSaved);
const saveTopics=()=>{try{localStorage.setItem(TOPIC_KEY,JSON.stringify(topicTracker.data))}catch{}};
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
const excerpt=h=>NHStories.cleanExcerpt(h.lead||'');
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
const dateText=value=>{const date=new Date(value);return Number.isFinite(+date)?date.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Időpont nem elérhető'};
function renderReader(story,selected){
 const target=document.getElementById('tartalom');
 const unique=new Map();
 for(const h of [selected,...(story?.articles||[])]){const key=NHStories.canonicalLink(h?.link);if(key&&!unique.has(key))unique.set(key,h)}
 const articles=[...unique.values()].sort((a,b)=>Date.parse(b.datum)-Date.parse(a.datum));
 if(!articles.length)return;
 const publishers=new Set(articles.map(h=>h.forras)).size;
 const settings=typeof BEALLITASOK==='undefined'?{}:BEALLITASOK;
 let editorial=NHStories.summaryFor(articles,settings,selected.link);
 if(!editorial){const pin=[settings.kiemeltTema,settings.kiemeltTemaErdely].find(t=>t?.aktiv&&NHStories.canonicalLink(t.link)===NHStories.canonicalLink(selected.link));editorial=pin?.lead?.trim()||''}
 const summary=editorial||excerpt(selected);
 const image=selected.kep||(story?articles.find(h=>h.kep)?.kep:'');
 const following=story&&store.data.following[story.id]!=null;
 const region={erdely:'Erdély',magyar:'Magyarország',vilag:'Világ',roman:'Román lapszemle'}[selected.newsRegion||selected.region]||'NapHíre';
 const updates=(story?.events||[]).filter(event=>event.type==='updated').slice(-5).reverse();
 const sourceCards=articles.map(h=>`<article class="nh-reader-source">${forrasIkonHTML(h)}<div><div class="nh-reader-source-meta"><strong>${esc(h.forras)}</strong><time datetime="${esc(new Date(h.datum).toISOString())}">${esc(dateText(h.datum))}</time></div><h3><a href="${esc(NHStories.canonicalLink(h.link))}" target="_blank" rel="noopener noreferrer">${esc(h.cim)}</a></h3>${excerpt(h)?`<p>${esc(excerpt(h))}</p>`:''}<a class="nh-reader-original" href="${esc(NHStories.canonicalLink(h.link))}" target="_blank" rel="noopener noreferrer">Eredeti cikk · ${esc(h.forras)} ↗</a></div></article>`).join('');
 target.innerHTML=`<article class="nh-reader"><div class="nh-reader-top"><a href="#" class="nh-reader-back">← Vissza a főoldalra</a><span>NAP HÍRE · TÖBB NÉZŐPONT</span></div><header class="nh-reader-header"><div class="nh-reader-kicker"><span>${esc(region)}</span><span>${publishers} forrás · ${articles.length} cikk</span></div><h1>${esc(selected.cim)}</h1><div class="nh-reader-meta">${forrasIkonHTML(selected,'kicsi')}<strong>${esc(selected.forras)}</strong><time>${esc(dateText(selected.datum))}</time>${story?`<button type="button" id="story-follow" aria-pressed="${!!following}">${following?'✓ Követed ezt a történetet':'＋ Történet követése'}</button>`:''}</div></header>${image?`<figure class="nh-reader-photo"><img src="${esc(image)}" alt="" fetchpriority="high" decoding="async" onerror="this.closest('figure').remove()"><figcaption>Kép forrása: ${esc(selected.kep?selected.forras:articles.find(h=>h.kep)?.forras||selected.forras)}</figcaption></figure>`:''}<nav class="nh-reader-nav" aria-label="A történet részei"><a href="#reader-what">Mi történt?</a><a href="#reader-sources">${publishers>1?'Ugyanerről írnak':'Eredeti forrás'}</a><a href="#reader-timeline">Idővonal</a></nav><section class="nh-reader-summary" id="reader-what"><div><span class="nh-reader-eyebrow">A TÖRTÉNET RÖVIDEN</span><h2>Mi történt?</h2></div><div>${summary?summary.split(/\n\s*\n/).map(paragraph=>`<p>${esc(paragraph)}</p>`).join(''):'<p>Ehhez a cikkhez még nem érkezett rövid leírás. A részleteket az eredeti forrásnál olvashatod.</p>'}<small>${editorial?'Szerkesztőségi összefoglaló · NapHíre':`Forrásrészlet · ${esc(selected.forras)}`}</small></div></section><section id="reader-sources" class="nh-reader-sources"><div class="nh-reader-section-head"><div><span class="nh-reader-eyebrow">AZ EREDETI CIKKEK</span><h2>${publishers>1?'Ugyanerről írnak':'Eredeti forrás'}</h2></div><span>${publishers} forrás · ${articles.length} cikk</span></div><div class="nh-reader-source-grid">${sourceCards}</div></section><section id="reader-timeline" class="nh-reader-history"><div class="nh-reader-section-head"><div><span class="nh-reader-eyebrow">A MEGJELENÉSEK SORRENDJE</span><h2>A történet idővonala</h2></div></div><ol>${articles.map(h=>`<li><time>${esc(dateText(h.datum))}</time><div><span>${esc(h.forras)}</span><a href="${esc(NHStories.canonicalLink(h.link))}" target="_blank" rel="noopener noreferrer">${esc(h.cim)} ↗</a></div></li>`).join('')}</ol>${updates.length?`<div class="nh-reader-revisions"><h3>Módosult cikkek</h3>${updates.map(event=>`<p><strong>${esc(event.source)}</strong> · ${esc(event.title)}<small>NapHíre észlelte: ${esc(dateText(event.at))}</small></p>`).join('')}</div>`:''}</section><a href="#" class="nh-reader-back nh-reader-bottom">← Vissza a főoldalra</a>${storageError?'<p role="alert">A böngésző tárolója nem elérhető. A történetkövetés nem mentődik.</p>':''}</article>`;
 target.querySelectorAll('.nh-reader-nav a').forEach(a=>a.onclick=event=>{event.preventDefault();target.querySelector(a.getAttribute('href')).scrollIntoView({behavior:'smooth'})});
 const follow=target.querySelector('#story-follow');
 if(follow)follow.onclick=()=>{if(following)delete store.data.following[story.id];else store.data.following[story.id]=story.revision;save();renderReader(story,selected)};
 if(following){store.data.following[story.id]=story.revision;save()}
}
function renderStory(key){
 const story=store.get(key);
 if(!story){document.getElementById('tartalom').innerHTML='<div class="nh-reader"><p>A történet ezen a böngészőn még nem érhető el.</p><a class="nh-reader-back" href="#">← Vissza a főoldalra</a></div>';return}
 const selected=[...story.articles].sort((a,b)=>Date.parse(b.datum)-Date.parse(a.datum))[0];
 renderReader(story,selected);
}
// A főoldali cikk-kattintás és a történetlink ugyanazt az olvasóoldalt használja.
cikkNezet=function(article){renderReader(articleIndex.get(article.link),article)};
function topicUpdateHTML(notice,articles){
 if(!notice)return '';
 const labels=[];
 if(notice.sources.length)labels.push(`+${notice.sources.length} új forrás`);
 if(notice.added.length)labels.push(`${notice.added.length} új cikk`);
 if(notice.updated.length)labels.push(`${notice.updated.length} frissített cikk`);
 const added=new Set(notice.added);
 const links=new Set([...notice.added,...notice.updated]);
 const changed=articles.filter(h=>links.has(NHStories.canonicalLink(h.link)));
 const list=changed.map(h=>`<li><a href="${esc(NHStories.canonicalLink(h.link))}" target="_blank" rel="noopener noreferrer">${forrasIkonHTML(h,'kicsi')}<span><small>${esc(h.forras)} · ${added.has(NHStories.canonicalLink(h.link))?'Új beszámoló':'Módosult cím vagy bevezető'}</small><strong>${esc(h.cim)}</strong></span></a></li>`).join('');
 return `<section class="nh-topic-update" aria-label="A történet frissítései"><div class="nh-topic-update-head" role="status"><h3 class="nh-topic-update-label">Mi változott azóta?</h3><span>${labels.map(esc).join(' · ')}</span><small>Az előző megtekintésedhez képest · észlelve ${esc(new Date(notice.at).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}))}</small></div>${list?`<ul class="nh-topic-update-list">${list}</ul>`:''}<p class="nh-topic-update-note">A jelzés az új vagy módosult beszámolókat mutatja; önmagában nem jelent új fejleményt az ügyben.</p></section>`;
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
  const stored=topic.rogzitett ? [] : (articleIndex.get(topic.fo.link)?.articles||[]);
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
  const key=name+':'+(topic.rogzitett?NHStories.canonicalLink(topic.fo.link):(articleIndex.get(topic.fo.link)?.id||NHStories.canonicalLink(topic.fo.link)));
  const observed=current.map(h=>osszesHir.find(article=>article.link===h.link)||h);
  const notice=topicTracker.observe(key,observed);saveTopics();
  const html=original({...topic,fo:newest,osszes:current,tobbi:current.filter(h=>h.link!==newest.link),forrasDb:new Set(current.map(h=>h.forras)).size});
  return html.replace('<div class="ts-racs">',topicUpdateHTML(notice,observed)+'<div class="ts-racs">');
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
  if(host.matches('.nh-daily-lead,.nh-daily-card'))host.querySelector('.nh-sources')?.remove();
  if(host.querySelector(`[data-story-open="${s.id}"]`))continue;
  const a=document.createElement('a');a.dataset.storyOpen=s.id;a.href=href(s);
  if(host.classList.contains('tema-sav-in')){
   a.className='story-open-inline';a.innerHTML='<span>Összkép megnyitása ↗</span>';
   const sourceHead=host.querySelector('.ts-masok-cim');
   (sourceHead||host.querySelector('.ts-masok')||host).append(a);
  }else if(host.classList.contains('nh-region-row')){
   a.className='story-open story-open-compact';a.innerHTML=`<span>${sources(s)} FORRÁS · ÖSSZKÉP ↗</span>`;host.append(a);
  }else{
   a.className='story-open story-open-compact';a.innerHTML=`<strong>Ugyanerről írnak · ${sources(s)} forrás ↗</strong>`;host.append(a);
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
 const back=event.target.closest('.story-back,.nh-reader-back');if(!back)return;
 event.preventDefault();event.stopImmediatePropagation();
 history.pushState(null,'',location.pathname+location.search);
 aktivRovat='mind';aktivForras=null;keresoSzo='';
 rajzol();window.scrollTo({top:0,behavior:'instant'});
},true);

const previousRovat=valtRovat;valtRovat=function(r){if(route()||location.hash.startsWith('#tortenetek=')||location.hash.startsWith('#cikk='))history.replaceState(null,'',location.pathname+location.search);previousRovat(r)};
const previousRegio=valtRegio;valtRegio=function(r){if(route()||location.hash.startsWith('#tortenetek=')||location.hash.startsWith('#cikk='))history.replaceState(null,'',location.pathname+location.search);previousRegio(r)};
if(!document.documentElement.classList.contains('nh-booting'))rajzol();
})();


