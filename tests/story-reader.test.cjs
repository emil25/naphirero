const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { NHStories } = require('../story-engine.js');
const now = Date.now();
const article = (source='Maszol', suffix='a') => ({link:`https://${source==='Maszol'?'maszol.ro':'kronika.ro'}/${suffix}`,forras:source,cim:'Erdélyi kórházfelújítási program indul több megyében',lead:'Kórházakat újítanak fel több erdélyi megyében.',datum:new Date(now).toISOString(),region:'erdely'});

test('Az első megtekintés és egy másik téma nem kap hamis frissülésjelzést', () => {
 const tracker=new NHStories.TopicTracker();
 assert.equal(tracker.observe('first',[article()],now),null);
 assert.equal(tracker.observe('other',[article('Krónika')],now+10),null);
 assert.equal(tracker.observe('first',[{...article(),datum:new Date(now+60000).toISOString(),kep:'https://maszol.ro/new.jpg'}],now+60000),null);
});
test('Új forrást, ugyanazon forrás új cikkét és szövegmódosítást külön követ', () => {
 const tracker=new NHStories.TopicTracker();tracker.observe('topic',[article()],now);
 let notice=tracker.observe('topic',[article(),article('Krónika')],now+1000);
 assert.deepEqual(notice.sources,['Krónika']);assert.equal(notice.added.length,1);assert.equal(notice.updated.length,0);
 notice=tracker.observe('topic',[article(),article('Krónika'),article('Maszol','b')],now+2000);
 assert.equal(notice.sources.length,1);assert.equal(notice.added.length,2);
 notice=tracker.observe('topic',[{...article(),lead:'Új döntés: három további kórházat is felújítanak.'}],now+3000);
 assert.equal(notice.updated.length,1);
 const reloaded=new NHStories.TopicTracker(JSON.parse(JSON.stringify(tracker.data)));
 assert.deepEqual(reloaded.observe('topic',[{...article(),lead:'Új döntés: három további kórházat is felújítanak.'}],now+4000),notice);
});
test('Elakadt forrás visszatérése és követőkód nem számít új cikknek', () => {
 const tracker=new NHStories.TopicTracker();tracker.observe('topic',[article(),article('Krónika')],now);
 assert.equal(tracker.observe('topic',[article()],now+1000),null);
 assert.equal(tracker.observe('topic',[article(),{...article('Krónika'),link:article('Krónika').link+'?fbclid=test&utm_source=facebook#top'}],now+2000),null);
 assert.equal(NHStories.canonicalLink('https://maszol.ro/cikk?id=2&utm_source=f'), 'https://maszol.ro/cikk?id=2');
});
test('A jelzés egy óra után lejár; a lejárt előzmény új alapállapot lesz', () => {
 const tracker=new NHStories.TopicTracker();tracker.observe('topic',[article()],now);
 tracker.observe('topic',[article(),article('Krónika')],now+1000);
 assert.equal(tracker.observe('topic',[article(),article('Krónika')],now+3601001),null);
 assert.equal(tracker.observe('topic',[article('Maszol','new')],now+8*86400000),null);
});
test('Az összefoglaló csak a megfelelő cikkhez/történethez kapcsolódik', () => {
 const settings={storySummaries:[{link:article().link+'?fbclid=xyz',text:'Szerkesztett magyar összefoglaló.'},{link:'https://maszol.ro/unrelated',text:'Másik hír.'}]};
 assert.equal(NHStories.summaryFor([article()],settings,article().link),'Szerkesztett magyar összefoglaló.');
 assert.equal(NHStories.summaryFor([article('Krónika')],settings),'');
 assert.equal(NHStories.canonicalLink('javascript:alert(1)'), '');
 assert.equal(NHStories.cleanExcerpt('<p>Tény &amp; részlet.</p> The post reklám first appeared on...'),'Tény & részlet.');
});

function readerHarness(articles,settings={}){
 const store=new NHStories.Store();store.ingest(articles);
 const target={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null};
 const storage=new Map([['naphire-stories-v1',JSON.stringify(store.data)]]);
 const context={NHStories,URL,console,Date,Map,Set,BEALLITASOK:settings,osszesHir:articles,stemek:()=>[],nhSameEvent:()=>false,nhGroupStories:()=>[],valtRovat(){},valtRegio(){},location:{hash:'',pathname:'/klasszikus',search:''},history:{pushState(){},replaceState(){}},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  biztonsagos:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  idoOta:()=> '1 perce',favicon:()=>'/icon.png',forrasIkonHTML:()=>'<span class="forras-ikon"></span>',
  napTemajaHTML:()=>'<div class="ts-racs"></div>',erdelyTemaHTML:()=>'<div class="ts-racs"></div>',rajzol(){},
  document:{getElementById:()=>target,createElement:()=>({}),querySelector:()=>({append(){}}),documentElement:{classList:{contains:()=>true}},addEventListener(){}},addEventListener(){}};
 context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../story-view.js'),'utf8'),context);
 return {context,target,store};
}
test('A cikkútvonal megtartja a kiválasztott címet; a források láthatók és a cím biztonságos', () => {
 const selected=article();const other={...article('Krónika'),cim:'Másik szerkesztőség címe',datum:new Date(now+60000).toISOString()};
 const {context,target}=readerHarness([selected,other]);
 context.cikkNezet(selected);
 assert.match(target.innerHTML,/<h1>Erdélyi kórházfelújítási program indul több megyében<\/h1>/);
 assert.match(target.innerHTML,/id="reader-sources"/);assert.doesNotMatch(target.innerHTML,/<details|NapHíre AI|Forrás preferencia/);
 context.cikkNezet({...selected,cim:'<script>alert(1)</script>'});
 assert.match(target.innerHTML,/<h1>&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/h1>/);
});
test('A többforrásos olvasó és a Nap témája tényleges új forrást mutat', () => {
 const first=article();const second={...article('Krónika'),datum:new Date(now+1000).toISOString()};
 const {context,target,store}=readerHarness([first,second],{storySummaries:[{link:first.link,text:'Első bekezdés.\n\nMásodik bekezdés.'}]});
 context.location.hash='#tortenet='+store.data.stories[0].id;context.rajzol();
 assert.match(target.innerHTML,/Ugyanerről írnak/);assert.match(target.innerHTML,/Eredeti cikk · Maszol/);assert.match(target.innerHTML,/Eredeti cikk · Krónika/);
 assert.match(target.innerHTML,/<p>Első bekezdés\.<\/p><p>Második bekezdés\.<\/p>/);
 let html=context.napTemajaHTML({fo:first,rogzitett:true,osszes:[first]});assert.doesNotMatch(html,/nh-topic-update/);
 html=context.napTemajaHTML({fo:first,rogzitett:true,osszes:[first,second]});assert.match(html,/\+1 új forrás/);assert.match(html,/1 új cikk/);
 assert.match(html,/Mi változott azóta\?/);assert.match(html,new RegExp('href="'+second.link+'"'));assert.match(html,/Új beszámoló/);
});
