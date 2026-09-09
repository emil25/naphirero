
(function(){
  'use strict';
  var esc = typeof biztonsagos === 'function' ? biztonsagos : function(v){return String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});};
  var safeUrl = function(v){return esc(v || '#');};
  var articleAttr = function(h){return typeof dc === 'function' ? dc(h) : 'data-cikk="' + safeUrl(h.link) + '"';};
  var icon = function(h){return typeof forrasIkonHTML === 'function' ? forrasIkonHTML(h,'kicsi') : '<span class="v2-fallback-icon">' + esc(String(h.forras || 'N').slice(0,2).toUpperCase()) + '</span>';};
  var fresh = function(h){var t=new Date(h && h.datum).getTime();return !isFinite(t) || Date.now()-t < 7*24*3600000;};
  var photo = function(h,cls){return h && h.kep ? '<div class="v2-card-image ' + (cls || '') + '"><img src="' + safeUrl(h.kep) + '" alt="" loading="lazy" decoding="async" onerror="this.parentElement.hidden=true"></div>' : '<div class="v2-card-image ' + (cls || '') + '"></div>';};
  var meta = function(h){return '<span class="v2-meta">' + icon(h) + '<strong>' + esc(h.forras || 'NapHíre') + '</strong><span>·</span><span>' + (typeof idoOta === 'function' ? idoOta(new Date(h.datum)) : '') + '</span></span>';};
  var href = function(h,cls){return '<a class="' + (cls || '') + '" ' + articleAttr(h) + ' href="' + safeUrl(h.link) + '">';};
  var close = '</a>';
  var topicFor = function(items){
    var regio = typeof aktivRegio !== 'undefined' && aktivRegio === 'erdely' ? 'erdely' : 'magyar';
    var conf = regio === 'erdely' ? (typeof BEALLITASOK !== 'undefined' ? BEALLITASOK.kiemeltTemaErdely : null) : (typeof BEALLITASOK !== 'undefined' ? BEALLITASOK.kiemeltTema : null);
    var candidates = items.filter(function(h){return h.region === regio;});
    var t = null;
    if(conf && conf.aktiv && conf.cim && typeof temaRogzitettbol === 'function') t = temaRogzitettbol(conf,candidates,regio);
    if(!t && typeof napTemajaStabil === 'function') t = napTemajaStabil(candidates,regio,regio === 'erdely' ? 2 : 3,72);
    if(!t && candidates.length) t={fo:candidates[0],tobbi:candidates.slice(1,5),osszes:[candidates[0]].concat(candidates.slice(1,5)),forrasDb:1};
    if(!t) return null;
    var group = (t.osszes || [t.fo].concat(t.tobbi || [])).filter(Boolean).filter(fresh);
    var seen={}; group=group.filter(function(h){if(seen[h.link])return false;seen[h.link]=true;return true;});
    if(!group.length) return null;
    t.fo = group[0]; t.tobbi = group.slice(1,7); t.osszes=group; t.forrasDb=new Set(group.map(function(h){return h.forras;})).size;
    return t;
  };
  var sourceRows = function(t){
    if(!t) return '';
    return '<div class="v2-sources"><div class="v2-sources-head"><h2>Ugyanerről írnak</h2><span>' + t.forrasDb + ' forrás · ' + t.osszes.length + ' cikk</span></div><div class="v2-source-grid">' +
      t.osszes.slice(0,8).map(function(h){return href(h,'v2-source-row') + icon(h) + '<span><span class="v2-source-title">' + esc(h.cim) + '</span><span class="v2-source-meta">' + esc(h.forras) + ' · ' + (typeof idoOta === 'function' ? idoOta(new Date(h.datum)) : '') + '</span></span>' + close;}).join('') + '</div></div>';
  };
  var trendBlock = function(items){
    var rows=items.filter(fresh).slice(0,5);
    return '<section class="v2-rail-block"><div class="v2-rail-head"><h2>Mi pörög most?</h2><span>Források alapján</span></div>' +
      rows.map(function(h,i){return href(h,'v2-trend') + '<b class="v2-trend-num">0' + (i+1) + '</b><span><span class="v2-trend-title">' + esc(h.cim) + '</span><span class="v2-trend-meta">' + esc(h.forras) + ' · ' + (typeof idoOta === 'function' ? idoOta(new Date(h.datum)) : '') + '</span></span>' + close;}).join('') + '</section>';
  };
  var latestBlock = function(items){
    return '<section class="v2-latest"><div class="v2-rail-head"><h2>Legfrissebb</h2><span>Élő feed</span></div>' +
      items.slice(0,9).map(function(h){return href(h,'v2-latest-row') + '<span class="v2-latest-time">' + (typeof oraPerc === 'function' ? oraPerc(h.datum) : '') + '</span><span><span class="v2-latest-title">' + esc(h.cim) + '</span><span class="v2-latest-source">' + esc(h.forras) + '</span></span>' + close;}).join('') + '</section>';
  };
  var compact = function(h){
    return href(h,'v2-compact') + photo(h) + '<span>' + meta(h) + '<span class="v2-card-title">' + esc(h.cim) + '</span></span>' + close;
  };
  var section = function(title,kicker,items,kind){
    if(!items.length) return '';
    var lead=items[0], side=items.slice(1,5);
    var economy=kind === 'gazdasag' ? '<div class="v2-economy-strip"><span>Árak és bérek</span><span>Energia</span><span>Vállalatok</span><span>Közpénzek</span></div>' : '';
    return '<section class="v2-section v2-section--' + kind + '"><div class="v2-section-head"><div><p>' + esc(kicker) + '</p><h2>' + esc(title) + '</h2></div><p>' + items.length + ' válogatott történet</p></div>' + economy + '<div class="v2-section-grid">' +
      href(lead,'v2-lead-card') + photo(lead) + meta(lead) + '<span class="v2-card-title">' + esc(lead.cim) + '</span><span class="v2-card-lead">' + esc(lead.lead || '') + '</span>' + close +
      '<div class="v2-section-side">' + side.map(compact).join('') + '</div></div></section>';
  };
  var romanBlock = function(){
    if(typeof romanPressHTML !== 'function' || typeof romanNews === 'undefined' || !romanNews.length) return '';
    return '<section class="v2-roman"><span class="v2-kicker">ROMÁN SAJTÓ MAGYARUL</span><h2>Román lapszemle</h2><p>Mi foglalkoztatja ma a román sajtót?</p><div class="ro-press-layout">' + romanNews.slice(0,6).map(function(h,i){return href(h,'ro-press-story ' + (i===0?'ro-press-lead':'ro-press-row')) + photo(h) + '<div>' + meta(h) + '<h3>' + esc(h.huCim || h.cim) + '</h3></div>' + close;}).join('') + '</div><footer><span>Magyar összefoglaló · eredeti román cikk a történetoldalon</span><b>HotNews · G4Media · Digi24</b></footer></section>';
  };
  function renderV2(){
    if(!document.getElementById('tartalom')) return;
    if(location.hash.indexOf('#cikk=')===0 || location.hash.indexOf('#tortenet=')===0 || location.hash.indexOf('#roman=')===0) return;
    if(typeof szurtHirek !== 'function') return;
    var items=szurtHirek().filter(Boolean);
    if(!items.length){return;}
    var topic = (typeof aktivRovat === 'undefined' || aktivRovat === 'mind') && !aktivForras && !keresoSzo ? topicFor(items) : null;
    var topicLinks=new Set(topic ? topic.osszes.map(function(h){return h.link;}) : []);
    var clean=items.filter(function(h){return !topicLinks.has(h.link);});
    var sorted=clean.slice().sort(function(a,b){return new Date(b.datum)-new Date(a.datum);});
    if(typeof aktivRovat !== 'undefined' && aktivRovat === 'friss'){
      document.getElementById('tartalom').innerHTML='<div class="v2-layout"><div class="v2-main-column"><section class="v2-section"><div class="v2-section-head"><div><p>FOLYAMATOSAN ÉRKEZIK</p><h2>Legfrissebb</h2></div></div><div class="v2-section-side">' + sorted.slice(0,28).map(compact).join('') + '</div></section></div><aside class="v2-rail">' + latestBlock(sorted) + '</aside></div>';
      return;
    }
    var by = function(fn){return clean.filter(fn).sort(function(a,b){return new Date(b.datum)-new Date(a.datum);}).slice(0,7);};
    var erdely=by(function(h){return h.region==='erdely' && h.rovat!=='sport' && h.rovat!=='kultura' && h.rovat!=='gazdasag';});
    var magyar=by(function(h){return h.region==='magyar' && h.rovat!=='sport' && h.rovat!=='kultura' && h.rovat!=='gazdasag';});
    var gazdasag=by(function(h){return h.rovat==='gazdasag';});
    var sport=by(function(h){return h.rovat==='sport';});
    var kultura=by(function(h){return h.rovat==='kultura';});
    var vilag=by(function(h){return h.rovat==='vilag' || h.newsRegion==='world';});
    var hero='';
    if(topic){
      var heroTopic=topic.fo, heroImage=heroTopic.kep || (topic.tobbi.find(function(h){return h.kep;})||{}).kep;
      hero='<section class="v2-hero"><div class="v2-hero-media">' + (heroImage ? '<img src="' + safeUrl(heroImage) + '" alt="" fetchpriority="high">' : '') + '</div><div class="v2-hero-copy"><span class="v2-kicker">A NAP TÉMÁJA</span>' + href(heroTopic,'') + '<h1>' + esc(heroTopic.cim) + '</h1>' + close + '<p>' + esc(heroTopic.lead || '') + '</p><div class="v2-hero-foot"><span class="v2-meta"><strong>' + topic.forrasDb + ' forrás</strong><span>·</span><span>' + topic.osszes.length + ' cikk</span></span><a class="v2-open" href="#tortenet=' + encodeURIComponent(heroTopic.link) + '">Összkép</a></div></div>' + sourceRows(topic) + '</section>';
    }
    var first = sorted.slice(0,5);
    var html='<div class="v2-home">' + hero + '<div class="v2-layout"><div class="v2-main-column">' +
      section('Erdély','A fő tartalmi fókusz',erdely,'erdely') +
      section('Magyarország','Közélet és társadalom',magyar,'magyar') +
      section('Gazdaság','Döntések, árak, következmények',gazdasag,'gazdasag') +
      section('Sport','Pályán és azon túl',sport,'sport') +
      section('Kultúra','Alkotók, történetek, találkozások',kultura,'kultura') +
      (vilag.length ? section('Világ','A legfontosabb nemzetközi fejlemények',vilag,'vilag') : '') +
      romanBlock() + '</div><aside class="v2-rail">' + trendBlock(first) + latestBlock(sorted) + '</aside></div></div>';
    document.getElementById('tartalom').innerHTML=html;
    document.documentElement.classList.remove('nh-booting');
  }
  window.ujEditorialRender=renderV2;
  window.rajzol=renderV2;
  window.addEventListener('hashchange',function(){setTimeout(renderV2,0);});
  window.addEventListener('load',function(){setTimeout(renderV2,50);});
  setTimeout(renderV2,0);
})();
