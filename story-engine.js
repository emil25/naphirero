(function(root){
'use strict';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const stop=new Set('hogy nem egy meg mar csak most utan ellen miatt lehet lesz volt van ezt azt aki ami mert vagy meg sem mint szerint majd elott kozott alatt mondta kozolte magyar peter orban viktor donald trump putyin elnok kormany video foto'.split(' '));
const rawWords=s=>new Set(norm(s).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>3&&!stop.has(w)).map(w=>w.slice(0,7)));
const wordCache=new Map();
const words=s=>{if(wordCache.has(s))return wordCache.get(s);const result=rawWords(s);if(wordCache.size>8000)wordCache.clear();wordCache.set(s,result);return result};
const overlap=(a,b)=>[...a].filter(x=>b.has(x)).length;
function match(a,b){
 if(a.link===b.link)return true;
 if(Math.abs(Date.parse(a.datum)-Date.parse(b.datum))>48*3600000)return false;
 const x=words(a.cim),y=words(b.cim),shared=overlap(x,y);
 const fullA=words(a.cim+' '+(a.lead||'')),fullB=words(b.cim+' '+(b.lead||''));
 // Cselekvés + helyszín/szereplő együtt szükséges; puszta személynév nem elég.
 if(shared<3||shared/Math.max(1,Math.min(x.size,y.size))<.5)return false;
 const neg=s=>/\b(nem|cafol|cafolta|tagad)\b/.test(norm(s));
 if(neg(a.cim)!==neg(b.cim))return false;
 return overlap(fullA,fullB)/Math.max(1,Math.min(fullA.size,fullB.size))>=.35;
}
const id=link=>{let h=2166136261;for(const c of link)h=Math.imul(h^c.charCodeAt(0),16777619);return 't-'+(h>>>0).toString(36)};
class Store{
 constructor(data){this.data=data||{stories:[],blocked:[],following:{},aliases:{}};this.data.aliases ||= {};this.data.following ||= {};this.data.blocked ||= []}
 ingest(articles){
  const known=new Map();for(const s of this.data.stories)for(const h of s.articles)known.set(h.link,s);
  for(const article of articles){
   if(!article.link||!/^https?:\/\//.test(article.link)||!Number.isFinite(Date.parse(article.datum)))continue;
   const h={...article,datum:new Date(article.datum).toISOString()};
   let story=known.get(h.link);
   if(story){const old=story.articles.find(a=>a.link===h.link);if(old.cim!==h.cim||old.lead!==h.lead){story.events.push({at:new Date().toISOString(),type:'updated',source:h.forras,title:h.cim});story.revision++}Object.assign(old,h);continue}
   story=this.data.stories.find(s=>s.articles.every(a=>!this.data.blocked.includes([a.link,h.link].sort().join('|'))&&match(a,h)));
   if(!story){story={id:id(h.link),articles:[],events:[],revision:0};this.data.stories.push(story)}
   story.articles.push(h);known.set(h.link,story);story.revision++;story.events.push({at:new Date().toISOString(),type:'added',source:h.forras,title:h.cim});
  }
  return this.data.stories;
 }
 get(key){return this.data.stories.find(s=>s.id===(this.data.aliases[key]||key))}
 merge(a,b){const x=this.get(a),y=this.get(b);if(!x||!y||x===y)throw Error('Két külön történetet válassz.');x.articles.push(...y.articles.filter(h=>!x.articles.some(z=>z.link===h.link)));x.events.push(...y.events,{at:new Date().toISOString(),type:'merge',title:'Szerkesztői összevonás'});x.revision++;this.data.aliases[y.id]=x.id;for(const k in this.data.aliases)if(this.data.aliases[k]===y.id)this.data.aliases[k]=x.id;if(this.data.following[y.id]!=null)this.data.following[x.id]=0;this.data.stories=this.data.stories.filter(s=>s!==y);return x}
 split(key,links){const s=this.get(key);const moving=s.articles.filter(h=>links.includes(h.link));if(!moving.length||moving.length===s.articles.length)throw Error('Legalább egy cikk maradjon mindkét történetben.');const keep=s.articles.filter(h=>!links.includes(h.link));for(const a of keep)for(const b of moving)this.data.blocked.push([a.link,b.link].sort().join('|'));s.articles=keep;s.revision++;const n={id:id(moving[0].link)+'-'+Date.now().toString(36),articles:moving,revision:1,events:[{at:new Date().toISOString(),type:'split',title:'Szerkesztői szétválasztás'}]};s.events.push({at:new Date().toISOString(),type:'split',title:'Szerkesztői szétválasztás'});this.data.stories.push(n);return n}
}
function previousStories(current, stories, limit=4){
 const dates=current.articles.map(a=>Date.parse(a.datum));
 if(!dates.length||dates.some(t=>!Number.isFinite(t)))return [];
 const start=Math.min(...dates);
 const currentWords=new Set(current.articles.flatMap(a=>[...words(a.cim+' '+(a.lead||''))]));
 const candidates=[];
 for(const story of stories){
  if(story.id===current.id||!story.articles.length)continue;
  const times=story.articles.map(a=>Date.parse(a.datum));
  if(times.some(t=>!Number.isFinite(t)))continue;
  const end=Math.max(...times);
  // Előzmény csak teljes egészében korábbi történet lehet, legfeljebb 90 napos.
  if(end>=start||start-end>90*86400000)continue;
  if(story.articles.some(a=>current.articles.some(b=>a.link===b.link||match(a,b))))continue;
  const earlierWords=new Set(story.articles.flatMap(a=>[...words(a.cim+' '+(a.lead||''))]));
  const common=overlap(currentWords,earlierWords);
  const score=common/Math.max(1,Math.min(currentWords.size,earlierWords.size));
  if(common>=4&&score>=.45)candidates.push({story,score,end});
 }
 return candidates.sort((a,b)=>b.score-a.score||b.end-a.end).slice(0,limit).map(x=>x.story);
}
root.NHStories={Store,match,previousStories};
})(typeof module!=='undefined'?module.exports:window);
