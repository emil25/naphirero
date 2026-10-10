const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {NHStories}=require('../story-engine.js');
const {NHEditorial}=require('../editorial-model.js');
const source=fs.readFileSync(require.resolve('../rovat-design.js'),'utf8');
const classic=fs.readFileSync(require.resolve('../classic-editorial-previous.js'),'utf8');
const now=Date.now();
const article=(id,region='erdely',extra={})=>({cim:`Kórházfejlesztés indul ${id} térségében`,link:`https://maszol.ro/${id}`,forras:'Maszol',newsRegion:region,datum:new Date(now-3600000),...extra});
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mosaic(articles,all=articles){
 const code=source.slice(source.indexOf('(() => {',source.indexOf('/* Címlapi hírfolyam')),source.indexOf('/* NH_STORY_GROUPING_START'));
 const ctx={Date,Map,Set,osszesHir:all,nhSameEvent:NHStories.match,dc:()=>'',biztonsagos:escape,idoOta:()=> '1 órája',forrasIkonHTML:()=>'',document:{documentElement:{classList:{contains:()=>true}}},rajzol(){}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);
 const html=ctx.mozaikHTML(articles);return {html,links:[...(ctx.__nhDailyLinks||[])]};
}
test('A napi lista tiszteletben tartja a szerkesztői szűrést, és nem veszi vissza a kiemelt hírt',()=>{
 const allowed=article('szamos'),excluded=article('excluded','magyar',{forras:'HVG',cim:'A kiemelt választási ügy legfrissebb hírei'});
 const {links}=mosaic([allowed],[allowed,excluded]);assert.deepEqual(links,[allowed.link]);
});
test('A napi lista frissebb, értelmes címeket és valós darabszámot mutat üres képdoboz nélkül',()=>{
 const good=article('one'),old=article('old','erdely',{datum:new Date(now-25*3600000)}),future=article('future','erdely',{datum:new Date(now+3600000)}),emoji=article('emoji','erdely',{cim:'😂 📉 ➡️ 😭'});
 const {html,links}=mosaic([good,old,future,emoji]);assert.deepEqual(links,[good.link]);assert.match(html,/1 gyorsan átlátható történet/);assert.doesNotMatch(html,/nh-photo-fallback|nh-daily-river/);
});
test('Erdélyi hangsúly mellett magyarországi és világtörténet is bekerül; eltérő ügyek nem olvadnak össze',()=>{
 const items=[
  article('one','erdely',{cim:'Felújítják a szentegyházi mentőállomást'}),
  article('two','erdely',{cim:'Megnyílt a máramarosszigeti új határátkelő'}),
  article('three','erdely',{cim:'Kolozsvári magyar egyetemi ösztöndíjprogram indul'}),
  article('four','magyar',{cim:'Parlamenti döntés a magyar kórházi beruházásokról',forras:'HVG'}),
  article('five','vilag',{cim:'Nemzetközi energiaegyezményt írtak alá Európában',forras:'Telex'})
 ];
 const {links}=mosaic(items);assert.equal(links.length,5);for(const h of items)assert.ok(links.includes(h.link));
 const a=article('a','erdely',{cim:'Kolozsvári egyetem új ösztöndíjprogramot indít'}),b=article('b','erdely',{cim:'Kolozsvári egyetem bezárja az egyik kollégiumot'});
 assert.equal(mosaic([a,b]).links.length,2);
});
test('Az irodalmi Nobel-díj a kultúrába kerül, az útvonal erősebb marad a címszónál',()=>{
 assert.equal(NHEditorial.classify(article('nobel','erdely',{link:'https://transtelex.ro/karakter/konyvespolc/2026/10/08/nobel',cim:'Anne Carson kapta az irodalmi Nobel-díjat'})).section,'kultura');
 assert.equal(NHEditorial.classify(article('sport','magyar',{link:'https://hvg.hu/sport/a',cim:'A klub költségvetéséről döntöttek'})).section,'sport');
});
test('A Nap témájába közvetítő cikk sem húzhat be másik eseményt',()=>{
 const a=article('a','magyar'),b=article('b','magyar'),c=article('c','magyar');
 const pairs=new Set(['a:b','b:a','b:c','c:b']);
 const ctx={Date,Map,Set,osszesHir:[a,b,c],nhSameEvent:(x,y)=>x.link===y.link||pairs.has(x.link.split('/').pop()+':'+y.link.split('/').pop())};
 const begin=classic.indexOf('let topicInput=');const end=classic.indexOf('// A szerkesztő által rögzített',begin);
 vm.createContext(ctx);vm.runInContext(classic.slice(begin,end),ctx);
 const topic=ctx.napTemajaStabil([], 'magyar');assert.equal(topic.osszes.length,2);
});

function romanHarness(articles,translations){
 const target={innerHTML:''};const ctx={Date,Map,Set,AbortSignal,location:{hash:''},romanHTML:'',e:escape,normal:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),meaningfulTitle:()=>true,photo:()=>'',forrasIkonHTML:()=>'',idoOta:()=> '1 órája',nhSameEvent:NHStories.match,
  localStorage:{getItem:()=>null,setItem(){}},ROMAN_FORRASOK:[{nev:'Digi24'}],mediaBetolt:async()=>articles,history:{pushState(){},replaceState(){}},rajzol(){},
  fetch:async()=>({ok:true,json:async()=>({translations})}),
  document:{createElement:()=>({set innerHTML(v){this.value=v}}),getElementById:()=>target,querySelector:s=>s==='.foblokk'?{insertAdjacentHTML(_,html){ctx.romanHTML=html}}:null,addEventListener(){}},addEventListener(){},scrollTo(){}};
 ctx.window=ctx;vm.createContext(ctx);
 const start=classic.indexOf('const romanCacheKey=');const end=classic.indexOf(' const previous=rajzol;',start);
 vm.runInContext(classic.slice(start,end)+'\nwindow.romanTest={translateRomanTexts,refreshRomanPress,openRomanStory};',ctx);
 return {ctx,target};
}
test('A sikertelen vagy változatlan fordítás nem jelenik meg magyarként a lapszemlében',async()=>{
 const a=article('roman','roman',{forras:'Digi24',cim:'Guvernul aprobă bugetul pentru spitale'});
 const {ctx}=romanHarness([a],[a.cim]);await ctx.romanTest.refreshRomanPress();assert.equal(ctx.romanHTML,'');
});
test('A román történet megőrzi az eredeti címet és linket; másik ügy nem kerül a források közé',async()=>{
 const a=article('roman','roman',{forras:'Digi24',cim:'Guvernul aprobă bugetul pentru spitale',lead:'Investiții în spitale.'});
 const {ctx,target}=romanHarness([a],['A kormány jóváhagyta a kórházi költségvetést','Beruházások a kórházakban.']);
 await ctx.romanTest.refreshRomanPress();assert.match(ctx.romanHTML,/A kormány jóváhagyta/);
 await ctx.romanTest.openRomanStory(a);assert.match(target.innerHTML,/lang="ro"/);assert.match(target.innerHTML,/Guvernul aprobă bugetul pentru spitale/);assert.match(target.innerHTML,/Eredeti román cikk/);assert.match(target.innerHTML,/A FORRÁS BEVEZETŐJÉNEK FORDÍTÁSA/);
});
