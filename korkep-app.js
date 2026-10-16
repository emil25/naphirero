/* =========================================================
   RSS-FORRÁSOK – itt bővítheted / cserélheted a csatornákat
   region: 'erdely' vagy 'magyar'
   ========================================================= */
/* Az "iranyzat" mező a sajtóelfogultsági monitorozáshoz kell:
   'kritikus' | 'centrista' | 'kormany' – tájékoztató jellegű, szabadon átírható besorolás.
   A "szin" a forrás pöttyének színe a cikknézet füleinél. */
const FORRASOK = [
  // Erdély – forrásonként több lehetséges RSS-cím, az első működőt használja
  { nev:'Maszol',     urls:['https://maszol.ro/rss','https://maszol.ro/rss.xml','https://maszol.ro/feed'], region:'erdely', iranyzat:'centrista', szin:'#1e9be0' },
  { nev:'Krónika',    urls:['https://kronikaonline.ro/rss/kronika_hirek.xml','https://kronikaonline.ro/rss'], region:'erdely', iranyzat:'kormany', szin:'#f2a007' },
  { nev:'Székelyhon', urls:['https://szekelyhon.ro/rss/szekelyhon_hirek.xml','https://szekelyhon.ro/rss'], region:'erdely', iranyzat:'kormany', szin:'#2f7fd6' },
  { nev:'Székelyhon Sport', urls:['https://szekelyhon.ro/rss/szekelyhon_sport.xml'], region:'erdely', rovat:'sport', iranyzat:'kormany', szin:'#146c9c' },
  { nev:'Transtelex', urls:['https://transtelex.ro/rss'], region:'erdely', iranyzat:'kritikus', szin:'#e0315f' },
  { nev:'3Szék',      urls:['https://www.3szek.ro/rss','https://www.3szek.ro/rss.xml','https://3szek.ro/rss'], region:'erdely', iranyzat:'centrista', szin:'#1f8fd1' },
  { nev:'Hargita Népe', urls:['https://hargitanepe.ro/feed/','https://hargitanepe.ro/feed','https://hargitanepe.ro/rss'], region:'erdely', iranyzat:'centrista', szin:'#2f7fd6' },
  { nev:'Marosvásárhelyi Rádió', urls:['https://www.marosvasarhelyiradio.ro/feed/','https://www.marosvasarhelyiradio.ro/rss/','https://www.marosvasarhelyiradio.ro/rss.xml'], region:'erdely', iranyzat:'centrista', szin:'#0f8f87' },
  // Magyarország
  { nev:'Telex',      urls:['https://telex.hu/rss'], region:'magyar', iranyzat:'kritikus', szin:'#0b7261' },
  { nev:'HVG',        urls:['https://hvg.hu/rss'], region:'magyar', iranyzat:'kritikus', szin:'#d43d17' },
  { nev:'24.hu',      urls:['https://24.hu/feed/'], region:'magyar', iranyzat:'centrista', szin:'#1e56c8' },
  { nev:'Index',      urls:['https://index.hu/24ora/rss/'], region:'magyar', iranyzat:'centrista', szin:'#e8b207' },
  { nev:'444',        urls:['https://444.hu/feed'], region:'magyar', iranyzat:'kritikus', szin:'#111111' },
  { nev:'Origo',      urls:['https://www.origo.hu/contentxml/rss20/origo_cikkek.xml','https://www.origo.hu/rss/origo.xml','https://www.origo.hu/rss'], region:'magyar', iranyzat:'kormany', szin:'#e07a1f' },
  { nev:'ATV',        urls:['https://www.atv.hu/rss','https://www.atv.hu/rss.xml','https://www.atv.hu/feed'], region:'magyar', iranyzat:'centrista', szin:'#d71920' },
];

/* Román lapszemle – ugyanazt a lekérő és RSS-feldolgozó motort használja,
   de külön tartalmi készletben marad, ezért nem keveredik az erdélyi és
   magyarországi főoldali válogatásba. */
const ROMAN_FORRASOK = [
  { nev:'HotNews', urls:['https://hotnews.ro/rss','https://rss.hotnews.ro'], region:'roman', iranyzat:'centrista', szin:'#d71920' },
  { nev:'G4Media', urls:['https://www.g4media.ro/feed/','https://www.g4media.ro/feed'], region:'roman', iranyzat:'centrista', szin:'#ef6c2f' },
  { nev:'Digi24',  urls:['https://www.digi24.ro/rss'], region:'roman', iranyzat:'centrista', szin:'#224fa3' },
];

/* A hírforrásokat a saját szerveroldali RSS-végpont közvetíti. */
const STRATEGIAK = [
  u => ({ url: `/api/rss?url=${encodeURIComponent(u)}`, tipus:'text' })
];

let osszesHir = [];
let aktivRovat = 'mind';
let aktivRegio = 'mind';
let aktivForras = null;
let keresoSzo = '';
let hibasForrasok = [];

/* ---------- Admin-beállítások betöltése (settings.json) ----------
   A honlap statikus fájl, nincs adatbázis – a szerkesztői beállításokat
   (bannerek, kiemelt téma, kikapcsolt források) egy külön settings.json fájl
   tárolja ugyanabban a mappában. Ezt az admin.html generálja, feltöltés után
   pedig MINDEN látogatónál érvényesül, mert egy valódi, szerveren lévő fájl. */
let BEALLITASOK = {
  theme: 'modern',
  tagline: 'A napi hírfigyelő · percről percre',
  banners: {
    fejlec: { kep:'', link:'' },
    tartalom: { kep:'', link:'' },
    oldalsav: { kep:'', link:'' }
  },
  kiemeltTema: { aktiv:false, cim:'', lead:'', kep:'', link:'', forras:'' },
  kiemeltTemaErdely: { aktiv:false, cim:'', lead:'', kep:'', link:'', forras:'' },
  forrasokKi: []
};
function fejlecBannerHTML(){
  const b = BEALLITASOK.banners.fejlec;
  if (!b || !b.kep) return '';
  return `<a class="fejlec-hirdetes" href="${biztonsagos(b.link || '#')}" target="_blank" rel="noopener">
    <img src="${biztonsagos(b.kep)}" alt="Hirdetés">
  </a>`;
}
async function betoltBeallitasok(){
  return NHHome.loadSettings();
}

/* ---------- Segédek ---------- */
function idoOta(datum){
  const mp = Math.floor((Date.now() - datum.getTime())/1000);
  if (mp < 60) return 'most';
  const perc = Math.floor(mp/60);
  if (perc < 60) return perc + ' perce';
  const ora = Math.floor(perc/60);
  if (ora < 24) return ora + ' órája';
  const nap = Math.floor(ora/24);
  if (nap === 1) return 'tegnap';
  return nap + ' napja';
}
function oraPerc(datum){
  return datum.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'});
}
function szovegTisztit(html){
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return (d.textContent || '').replace(/\s+/g,' ').trim();
}
function biztonsagos(s){
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ---------- RSS letöltés és feldolgozás ---------- */
async function leker(url, strategia){
  const p = strategia(url);
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), 4500);
  try{
    const valasz = await fetch(p.url, {signal: ctrl.signal});
    if (!valasz.ok) return null;
    if (p.tipus === 'rss2json'){
      const j = await valasz.json();
      if (j && j.status === 'ok' && Array.isArray(j.items) && j.items.length) return {mod:'json', adat:j};
      return null;
    }
    if (p.tipus === 'json'){
      const j = await valasz.json();
      if (j && j.contents && j.contents.includes('<')) return {mod:'xml', adat:j.contents};
      return null;
    }
    const szoveg = await valasz.text();
    if (szoveg && szoveg.trim().startsWith('<')) return {mod:'xml', adat:szoveg};
    return null;
  }catch(e){ return null; }
  finally{ clearTimeout(t); }
}

function kepUrlTisztit(value){
  if (!value) return null;
  const raw = String(value).replace(/&amp;/g,'&').trim();
  try {
    const u = new URL(raw, location.href);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (/(youtube\.com|youtu\.be|vimeo\.com)$/.test(u.hostname)) return null;
    return u.href;
  } catch { return null; }
}
function kepKeres(item){
  const nodes = [...item.getElementsByTagName('*')];
  for (const el of nodes){
    const tag = el.localName;
    const url = el.getAttribute('url');
    const type = el.getAttribute('type') || '';
    if (!url || !['enclosure','content','thumbnail'].includes(tag)) continue;
    if (el.getAttribute('medium') === 'video' || /^video\//.test(type)) continue;
    if (tag !== 'thumbnail' && !/^image\//.test(type) && !/\.(jpe?g|png|webp|avif)(?:[?#]|$)/i.test(url)) continue;
    const valid = kepUrlTisztit(url);
    if (valid) return valid;
  }
  const encoded = item.getElementsByTagName('content:encoded')[0];
  const raw = (encoded?.textContent || '') + ' ' + (item.querySelector('description')?.textContent || '');
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  for (const img of doc.images){
    const valid = kepUrlTisztit(img.getAttribute('data-src') || img.getAttribute('src'));
    if (valid) return valid;
  }
  return null;
}

function xmlFeldolgoz(xmlSzoveg, forras){
  const doc = new DOMParser().parseFromString(xmlSzoveg, 'text/xml');
  if (doc.querySelector('parsererror')) return null;
  const elemek = [...doc.querySelectorAll('item, entry')].slice(0, 25);
  if (!elemek.length) return null;
  return elemek.map(item => {
    const cim = szovegTisztit(item.querySelector('title')?.textContent);
    let link = item.querySelector('link')?.textContent?.trim();
    if (!link) link = item.querySelector('link')?.getAttribute('href') || '#';
    const datumSzoveg = item.querySelector('pubDate')?.textContent
      || item.querySelector('published')?.textContent
      || item.querySelector('updated')?.textContent
      || item.getElementsByTagName('dc:date')[0]?.textContent;
    const datum = datumSzoveg ? new Date(datumSzoveg) : new Date();
    const lead = szovegTisztit(item.querySelector('description')?.textContent
      || item.querySelector('summary')?.textContent || '').slice(0, 320);
    const kategoriak = [...item.querySelectorAll('category')].map(c => c.textContent || '').join(' ');
    const h = {
      cim, link,
      datum: isNaN(datum) ? new Date() : datum,
      lead,
      kep: kepKeres(item),
      forras: forras.nev,
      region: forras.region,
      kategoriak
    };
    h.rovat = forras.rovat || rovatBesorol(h);
    return h;
  }).filter(h => h.cim);
}

function jsonFeldolgoz(j, forras){
  return j.items.slice(0, 25).map(item => {
    const datum = new Date((item.pubDate || '').replace(' ', 'T'));
    let kep = item.thumbnail || (item.enclosure && item.enclosure.link) || null;
    if (!kep && item.description){
      const m = item.description.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m) kep = m[1];
    }
    const h = {
      cim: szovegTisztit(item.title),
      link: item.link || '#',
      datum: isNaN(datum) ? new Date() : datum,
      lead: szovegTisztit(item.description || item.content || '').slice(0, 320),
      kep: kepUrlTisztit(kep),
      forras: forras.nev,
      region: forras.region,
      kategoriak: (item.categories || []).join(' ')
    };
    h.rovat = forras.rovat || rovatBesorol(h);
    return h;
  }).filter(h => h.cim);
}

async function forrasFeldolgoz(forras){
  return NHHome.loadSource(forras);
}

/* Mentett előzmény tartalék: ha az ingyenes proxyk épp mind akadoznak, ne üres hibaüzenet
   jelenjen meg, hanem az utoljára sikeresen betöltött hírek (jól látható jelzéssel, hogy nem élő adat) */
const HIR_GYORSITOTAR_KULCS = 'naphire_hir_gyorsitotar_v1';
let gyorsitotarKorabol = null; // ha a jelenlegi hírek a tartalékból jönnek, ide kerül az időbélyeg
let tartalekTipus = null;

function hirGyorsitotarMent(hirek){
  try{
    const konnyu = hirek.slice(0, 400).map(h => ({ ...h, datum: h.datum.toISOString() }));
    localStorage.setItem(HIR_GYORSITOTAR_KULCS, JSON.stringify({ hirek: konnyu, mentveKor: Date.now() }));
  }catch(e){ /* nincs elérhető tároló, nem gond */ }
}
function hirGyorsitotarBetolt(){
  try{
    const nyers = localStorage.getItem(HIR_GYORSITOTAR_KULCS);
    if (!nyers) return null;
    const adat = JSON.parse(nyers);
    return { hirek: adat.hirek.map(h => ({ ...h, kep: kepUrlTisztit(h.kep), datum: new Date(h.datum) })), mentveKor: adat.mentveKor };
  }catch(e){ return null; }
}

async function mindenHirBetolt(){
  return NHHome.refresh();
}

/* ---------- A nap témája: melyik hírt vette át a legtöbb portál? ---------- */
/* tematikus rovatba sorolás az RSS-kategóriák és a cím alapján */
/* a nap témájánál a közéleti hírek élveznek elsőbbséget a könnyed/bulváros témákkal szemben
   (pl. állatkerti kölyök-hírek, sztárpletykák) – nem zárjuk ki őket, csak hátrébb soroljuk,
   ha van legalább annyira felkapott közéleti alternatíva */
const PUHA_KULCSSZAVAK = ['kölyök','állatkert','cuki','aranyos','sztár','pletyka','esküvő',
  'vált el','válik','terhes','szülinap','ünnepelte','híresség','celeb','reality','love island',
  'álomesküvő','baba született','újszülött panda','panda','oroszlánkölyök','kutyakölyök',
  'cicák','kismacska'];
/* fontos közéleti/politikai kulcsszavak – ilyen témáknál kevesebb forrás is elég ahhoz,
   hogy "a nap témája" lehessen, mert ezek jellemzően gyorsabban válnak fontossá,
   mint ahány portál elsőre lehozza őket */
const KIEMELT_KOZELETI_KULCSSZAVAK = ['kormány','miniszterelnök','kormányfő','parlament',
  'országgyűlés','alaptörvény','alkotmány','választás','törvényjavaslat','államfő',
  'köztársasági elnök','ellenzék','koalíció','kormányváltás','tüntetés','sztrájk',
  'válság','háború','robbanás','merénylet','baleset','katasztrófa','halálos'];
function kiemeltKozeleti(h){
  const sz = (h.cim + ' ' + (h.lead||'')).toLowerCase();
  return KIEMELT_KOZELETI_KULCSSZAVAK.some(k => sz.includes(k));
}

function puhaHir(h){
  const sz = (h.cim + ' ' + (h.lead||'')).toLowerCase();
  return PUHA_KULCSSZAVAK.some(k => sz.includes(k));
}

/* Szerkesztett fontossági réteg a kezdőlaphoz. A percről percre nézet továbbra
   minden beérkező címet megmutat, a főoldali blokkok viszont a súlyosabb,
   képpel/lead-del rendelkező vagy több forrásban visszaköszönő hírekből épülnek. */
function fontossagPont(h, lista){
  let pont = 0;
  const kor = (Date.now() - h.datum.getTime()) / 3600000;
  if (kiemeltKozeleti(h)) pont += 5;
  if (h.kep) pont += 2;
  if ((h.lead || '').length >= 90) pont += 1;
  if (h.rovat === 'gazdasag' || h.rovat === 'sport' || h.rovat === 'kultura') pont += 1;
  if (kor < 12) pont += 2;
  else if (kor > 72) pont -= 2;
  if (puhaHir(h)) pont -= 8;
  if (Array.isArray(lista)){
    let masForras = 0;
    for (const masik of lista){
      if (masik !== h && masik.forras !== h.forras && ugyanazATema(h, masik)) masForras++;
    }
    pont += Math.min(masForras, 3) * 3;
  }
  return pont;
}
function fontosHirek(lista, limit){
  if (!lista.length) return [];
  const pontozott = lista.map(h => ({ h, pont:fontossagPont(h, lista) }))
    .sort((a,b) => b.pont - a.pont || b.h.datum - a.h.datum);
  const minimum = pontozott.some(x => x.pont >= 7) ? 7 : 4;
  const eros = pontozott.filter(x => x.pont >= minimum).map(x => x.h);
  // Legyen mindig használható főoldal gyengébb RSS-napon is, de ne engedjük
  // vissza az összes apró címet: legfeljebb 28 szerkesztett elem marad.
  return (eros.length >= 8 ? eros : pontozott.slice(0, 8).map(x => x.h))
    .slice(0, limit || 28);
}

const ROVAT_KULCSOK = {
  sport:    ['sport','foci','labdarúg','labdarúgás','bajnoks','bajnokság','liga','olimpia','meccs',' vb',' eb','forma-1','forma–1',' f1','kézilabda','kosárlabda','vízilabda','úszás','tenisz','edző','gól','válogatott','fradi','ferencváros','atlétika','sakk','hoki','jégkorong','döntő','negyeddöntő','elődöntő'],
  gazdasag: ['gazdaság','gazdasági','forint','lej','infláció','tőzsde','gdp','adó','adók','bérek','minimálbér','nyugdíj','beruházás','árak','drágul','olcsóbb','üzemanyag','benzin','energiaár','bank','hitel','kamat','mnb','euró','költségvetés','munkaerő','munkanélküli','vállalat','cégek','export','import','gázár','áram'],
  kultura:  ['kultúra','kulturális','film','mozi','színház','könyv','regény','koncert','zene','zenekar','fesztivál','kiállítás','múzeum','irodalom','irodalmi','művész','sorozat','opera','tánc','премьер','premier','díjat nyert','lemez','galéri']
};
function rovatBesorol(h){
  const sz = ((h.kategoriak || '') + ' ' + h.cim).toLowerCase();
  for (const rovat of Object.keys(ROVAT_KULCSOK))
    if (ROVAT_KULCSOK[rovat].some(k => sz.includes(k))) return rovat;
  return null;
}

const STOPSZAVAK = new Set(['hogy','nem','egy','meg','már','csak','most','után','ellen','miatt','lehet','lesz',
  'volt','van','vannak','ezt','azt','ez','az','aki','ami','amely','mert','vagy','még','sem','mint','között',
  'alatt','óta','szerint','majd','így','úgy','ha','de','is','és','minden','több','ennyi','ezek','azok','lett',
  'kell','kellett','kellene','akar','mondta','mondja','közölte','írta','írja','állítja','jelentette','miért',
  'bejelentés','bejelentést','bejelentette','bejelentett','tett','tesz','fontos','változás','változást','jön','váratlan','teljesen',
  'hogyan','ilyen','olyan','egyik','másik','való','miatt','után','előtt','ellen','videó','video','fotó',
  'fotók','fotókkal','galéria','friss','percről','percre','című','megye','megyei','megyében','megyés',
  'város','városi','városban','település','községben','ország','országos','románia','romániai',
  'magyarország','magyarországi','kormány','kormányzati','politikai','miniszter','miniszterelnök',
  'elnök','elnöke','párt','szeptember','augusztus','október','hétfő','kedden','szerdán','csütörtök']);

function stemek(cim){
  return [...new Set(cim.toLowerCase()
    .replace(/[„”"'’‚,.:;!?()\[\]{}«»–—/\\-]/g,' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPSZAVAK.has(w) && !/^\d+$/.test(w))
    .map(w => w.slice(0, 6)))];   // egyszerű "szótő": az első 6 karakter (ragozás miatt)
}

const kozosDb = (a, b) => { let k = 0; for (const s of a){ if (b.has(s)) k++; } return k; };

/* témafelismeréshez: a cím MELLETT a lead elejét is figyeljük – az erdélyi portálok
   gyakran teljesen más címmel írnak ugyanarról, de a leadben ugyanazok a kulcsszavak */
function temaStemek(h){
  return stemek(h.cim + ' ' + (h.lead || '').slice(0, 140));
}

/* Szigorú eseményazonosság: két általános háttérszó nem elég. Legalább két
   címbeli egyezés, vagy egy címbeli és további két leadbeli egyezés szükséges. */
function ugyanazATema(a, b){
  if (!a || !b) return false;
  const aCim = new Set(stemek(a.cim)), bCim = new Set(stemek(b.cim));
  const cimEgyezes = kozosDb(aCim, bCim);
  if (cimEgyezes >= 2) return true;
  const teljesEgyezes = kozosDb(new Set(temaStemek(a)), new Set(temaStemek(b)));
  return cimEgyezes >= 1 && teljesEgyezes >= 3;
}

function napTemaja(hirek, minForras, oraAblak){
  minForras = minForras || MIN_FORRAS_TEMA;
  oraAblak = oraAblak || 48;
  // csak a megadott időablakon belüli hírek számítanak
  const idobenFriss = hirek.filter(h => Date.now() - h.datum.getTime() < oraAblak*3600*1000);
  const erosFriss = idobenFriss.filter(h => !puhaHir(h) || kiemeltKozeleti(h));
  const friss = (erosFriss.length >= 4 ? erosFriss : idobenFriss).slice(0, 130);
  if (friss.length < 4) return null;
  const szoKeszlet = friss.map(h => new Set(temaStemek(h)));

  // horgonycikk keresése: az a cikk, amelynek a címével a legtöbb MÁS forrású cikk
  // egyezik KÖZVETLENÜL (legalább 2 közös szótő) – nincs láncolás, nincs témakeveredés
  let horgony = -1, legjobbPont = 0;
  for (let i = 0; i < friss.length; i++){
    const masForrasok = new Set();
    let talalat = 0;
    for (let j = 0; j < friss.length; j++){
      if (i === j) continue;
      if (ugyanazATema(friss[i], friss[j])){
        talalat++;
        if (friss[j].forras !== friss[i].forras) masForrasok.add(friss[j].forras);
      }
    }
    if (!masForrasok.size) continue; // legalább egy másik portálnak is írnia kellett róla
    const pont = masForrasok.size * 10 + talalat + (friss[i].kep ? 1 : 0)
      - (puhaHir(friss[i]) ? 9 : 0) + (kiemeltKozeleti(friss[i]) ? 13 : 0);
    if (pont > legjobbPont){ legjobbPont = pont; horgony = i; }
  }
  if (horgony < 0) return null;

  // a téma MAGSZAVAI: a horgonycikk azon szótövei, amelyek legalább 2 kapcsolódó
  // cikkben is előfordulnak – így egy „híd-cikk" mellékes szavai (pl. helyszín)
  // nem húzhatnak be oda nem tartozó híreket
  const jeloltek = [];
  for (let j = 0; j < friss.length; j++){
    if (j !== horgony && ugyanazATema(friss[horgony], friss[j])) jeloltek.push(j);
  }
  const mag = new Set();
  for (const s of szoKeszlet[horgony]){
    let db = 0;
    for (const j of jeloltek) if (szoKeszlet[j].has(s)) db++;
    if (db >= 2) mag.add(s);
  }
  const kulcsszavak = mag.size >= 2 ? mag : szoKeszlet[horgony];

  // A címhasonlóság önmagában kevés: a cikknek a több forrásban visszatérő
  // magszavakból is legalább kettőt hordoznia kell. Ez kiszűri az olyan
  // véletlen egyezéseket, mint két egymástól független „bejelentést tett” hír.
  const csoport = friss.filter((h, j) => {
    if (j === horgony) return true;
    if (!ugyanazATema(friss[horgony], h)) return false;
    const magEgyezes = kozosDb(kulcsszavak, new Set(temaStemek(h)));
    return magEgyezes >= Math.min(2, kulcsszavak.size);
  });
  const forrasDb = new Set(csoport.map(h => h.forras)).size;
  const kuszob = kiemeltKozeleti(friss[horgony]) ? Math.max(2, minForras - 1) : minForras;
  if (forrasDb < kuszob) return null;

  csoport.sort((a,b) => b.datum - a.datum);
  const fo = friss[horgony].kep ? friss[horgony] : (csoport.find(h => h.kep) || friss[horgony]);

  // a listában forrásonként csak egy cikk szerepeljen
  const latottForras = new Set([fo.forras]);
  const tobbi = csoport.filter(h => {
    if (h === fo || latottForras.has(h.forras)) return false;
    latottForras.add(h.forras);
    return true;
  }).slice(0, 5);
  return { fo, tobbi, osszes: csoport, forrasDb, kulcsszavak: [...kulcsszavak], pont: legjobbPont };
}

function favicon(link){
  try{
    const d = new URL(link).hostname;
    return `https://www.google.com/s2/favicons?domain=${d}&sz=32`;
  }catch(e){ return ''; }
}

/* A nap témája NEM frissül minden RSS-lekéréssel: a böngésző tárolójában (localStorage)
   megjegyzi a kiválasztott témát, és csak akkor cserél újat, ha lejárt az érvényessége
   (alapból napi 2x, 12 óránként), vagy a téma teljesen elapadt (már 2 forrás sem írja). */
const TEMA_FRISSITES_ORA = 12;
const MIN_FORRAS_TEMA = 3; // ennyi FÜGGETLEN forrásnak kell írnia róla, hogy „a nap témája" lehessen –
                            // ez zárja ki, hogy egy csak 2 portál által, visszatérően emlegetett
                            // apróbb (pl. sport-) hír beragadjon a helyére
function temaTarKulcs(nev){ return 'naphire_tema_' + nev; }
const TEMA_MEMORIA = {}; // munkamenet-szintű gyorstár – akkor is stabilan tart, ha a localStorage
                          // nem elérhető (pl. néhány böngésző file://-ként megnyitott lapnál blokkolja)
const TEMA_KIVALASZTAS = {}; // a már kirajzolt téma horgonya egy lapmegnyitás alatt nem cserélődik
function temaBetolt(nev){
  if (TEMA_MEMORIA[nev]) return TEMA_MEMORIA[nev];
  try{
    const nyers = localStorage.getItem(temaTarKulcs(nev));
    if (nyers) return (TEMA_MEMORIA[nev] = JSON.parse(nyers));
  }catch(e){ /* nincs elérhető tároló, marad a memóriabeli gyorstár */ }
  return null;
}
function temaMent(nev, adat){
  TEMA_MEMORIA[nev] = adat;
  try{ localStorage.setItem(temaTarKulcs(nev), JSON.stringify(adat)); }catch(e){ /* nincs elérhető tároló */ }
}
function temaValasztasTorol(nev){
  delete TEMA_MEMORIA[nev];
  delete TEMA_KIVALASZTAS[nev];
  try{ localStorage.removeItem(temaTarKulcs(nev)); }catch(e){ /* nincs elérhető tároló */ }
}
function napTemajaStabil(jelolt, nev, minForras, oraAblak){
  minForras = minForras || MIN_FORRAS_TEMA;
  const most = Date.now();
  const lapMemoria = TEMA_KIVALASZTAS[nev];
  if (lapMemoria && (most - lapMemoria.mentveKor) < TEMA_FRISSITES_ORA * 3600 * 1000){
    return lapMemoria.tema;
  }
  const mentett = temaBetolt(nev);
  const friss = napTemaja(jelolt, minForras, oraAblak); // az aktuálisan legfelkapottabb jelölt
  if (mentett && (most - mentett.mentveKor) < TEMA_FRISSITES_ORA * 3600 * 1000){
    const kulcsszavak = new Set(mentett.kulcsszavak);
    const mentettFo = jelolt.find(h => h.link === mentett.horgonyLink);
    const talalatok = jelolt.filter(h => mentettFo
      ? ugyanazATema(mentettFo, h)
      : kozosDb(kulcsszavak, new Set(temaStemek(h))) >= 3);
    const forrasDb = new Set(talalatok.map(h => h.forras)).size;
    // ha időközben egy EGYÉRTELMŰEN erősebb téma jött (magasabb pontszámú – ez figyelembe veszi
    // a forrásszámot ÉS azt is, ha közéleti súlyú, puha hírrel szemben), nem várjuk ki a 12 órát
    const erosebbJott = friss && friss.pont > (mentett.pont || 0) + 3;
    if (talalatok.length && forrasDb >= minForras && !erosebbJott){
      talalatok.sort((a, b) => b.datum - a.datum);
      const fo = talalatok.find(h => h.link === mentett.horgonyLink)
        || talalatok.find(h => h.kep) || talalatok[0];
      const latott = new Set([fo.forras]);
      const tobbi = talalatok.filter(h => {
        if (h === fo || latott.has(h.forras)) return false;
        latott.add(h.forras);
        return true;
      }).slice(0, 5);
      const tema = { fo, tobbi, osszes: talalatok, forrasDb, kulcsszavak: mentett.kulcsszavak };
      TEMA_KIVALASZTAS[nev] = { tema, mentveKor: mentett.mentveKor || most };
      return tema;
    }
    // a régi téma elapadt vagy erősebb jött – váltunk
  }
  if (friss){
    const tema = { fo: friss.fo, tobbi: friss.tobbi, osszes: friss.osszes || [friss.fo, ...friss.tobbi], forrasDb: friss.forrasDb, kulcsszavak: friss.kulcsszavak };
    TEMA_KIVALASZTAS[nev] = { tema, mentveKor: most };
    temaMent(nev, { horgonyLink: friss.fo.link, kulcsszavak: friss.kulcsszavak, pont: friss.pont, mentveKor: most });
    return tema;
  }
  return null;
}

/* admin által kézzel kiemelt téma – megkeresi hozzá az aktuális híranyagban a kapcsolódó
   cikkeket is (ugyanazzal a szótő-egyezéses logikával, mint az automatikus témafelismerés) */
function temaRogzitettbol(kiemelt, jelolt, regio){
  const fo = {
    cim: kiemelt.cim, lead: kiemelt.lead || '', kep: kiemelt.kep || '',
    link: kiemelt.link || '#', forras: kiemelt.forras || 'Szerkesztőség',
    datum: new Date(), region: regio || 'magyar'
  };
  // A kézzel kiemelt történet sem fagy be: az RSS-frissítésből érkező új cikkeket
  // a szerkesztői kulcsszavak és az eseményazonosság alapján ugyanahhoz a történethez kötjük.
  const szerkesztoiSzavak = Array.isArray(kiemelt.kulcsszavak) ? kiemelt.kulcsszavak.join(' ') : '';
  const temaKulcsok = new Set(stemek(`${kiemelt.cim || ''} ${szerkesztoiSzavak}`));
  const kapcsolodo = h => {
    if (!h || h.link === fo.link) return false;
    if (ugyanazATema(fo, h)) return true;
    const egyezes = kozosDb(temaKulcsok, new Set(temaStemek(h)));
    return egyezes >= 2;
  };
  const rssTalalatok = jelolt.filter(kapcsolodo);
  const kezzelHozzaadott = (Array.isArray(kiemelt.tovabbiCikkek) ? kiemelt.tovabbiCikkek : [])
    .filter(c => c && c.link && c.link !== fo.link)
    .map(c => ({
      cim: c.cim || 'Kapcsolódó cikk', lead: c.lead || '', kep: c.kep || '', link: c.link,
      forras: c.forras || 'Forrás', datum: new Date(c.datum || Date.now()), region: regio || 'magyar'
    }));
  const talalatok = [...new Map([...rssTalalatok, ...kezzelHozzaadott].map(h => [h.link, h])).values()]
    .sort((a, b) => b.datum - a.datum);
  const latott = new Set([fo.forras]);
  const tobbi = talalatok.filter(h => {
    if (latott.has(h.forras)) return false;
    latott.add(h.forras);
    return true;
  }).slice(0, 5);
  return { fo, tobbi, osszes: [fo, ...tobbi], forrasDb: 1 + tobbi.length };
}

function temaKepFallbackHTML(tema){
  const forras = String(tema?.fo?.forras || 'NapHíre').trim();
  const jel = forras.charAt(0).toUpperCase() || 'N';
  return `<div class="ts-kep-fallback"><strong>${biztonsagos(jel)}</strong><small>Fotó nem érhető el · ${biztonsagos(forras)}</small></div>`;
}

function forrasIkonHTML(h, osztaly = ''){
  const nev = String(h?.forras || 'NapHíre').trim();
  return `<span class="forras-ikon ${osztaly}" title="${biztonsagos(nev)}">
    <span aria-hidden="true">${biztonsagos(nev.slice(0, 2).toUpperCase())}</span>
    <img src="${biztonsagos(favicon(h?.link || 'https://naphire.ro'))}" alt="" loading="lazy" decoding="async" width="22" height="22" onerror="this.hidden=true">
  </span>`;
}

function temaForrasListaHTML(cikkek, cim = 'Hol jelent meg?'){
  if (!cikkek.length) return '';
  const rendezett = [...cikkek].sort((a,b) => new Date(b.datum) - new Date(a.datum));
  const portalforrasok = [...new Map(rendezett.map(h => [h.forras, h])).values()];
  return `<div class="ts-masok ts-masok-static">
    <div class="ts-masok-cim">
      <span>${biztonsagos(cim)}</span>
      <span class="ts-source-icons">${portalforrasok.slice(0, 6).map(h => forrasIkonHTML(h, 'kicsi')).join('')}${portalforrasok.length > 6 ? `<b>+${portalforrasok.length - 6}</b>` : ''}</span>
      <strong>${portalforrasok.length} forrás · ${rendezett.length} cikk</strong>
    </div>
    <div class="ts-source-grid">${rendezett.map(h => `
      <a ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener">
        ${forrasIkonHTML(h)}
        <span><span class="nt-cim">${biztonsagos(h.cim)}</span><span class="nt-meta">${biztonsagos(h.forras)} · ${idoOta(h.datum)}</span></span>
      </a>`).join('')}</div>
  </div>`;
}

function napTemajaHTML(tema){
  if (!tema) return '';
  const temaRegio = tema.fo && tema.fo.region === 'erdely' ? 'Erdély' : 'Magyarország';
  const kapcsolodok = [...new Map([tema.fo, ...(tema.osszes || tema.tobbi || [])].filter(Boolean).map(h => [h.link, h])).values()];
  const masok = kapcsolodok.filter(h => h.link !== tema.fo.link);
  const forrasok = [...new Map(kapcsolodok.map(h => [h.forras, h])).values()];
  const temaKep = tema.fo.kep || (masok.find(h => h.kep) || {}).kep || '';
  return `<section class="tema-sav">
    <div class="tema-sav-in">
      <div class="ts-fej">
        <span class="nap-ikon"></span> A nap témája
        <span class="alcim">· ${tema.forrasDb} portál írt róla</span>
      </div>
      <div class="ts-forrasok"><span class="ts-forras-label">Források:</span>${forrasok.map(h => `<span class="ts-forras-pill">${forrasIkonHTML(h, 'kicsi')} ${biztonsagos(h.forras)}</span>`).join('')}</div>
      <div class="ts-racs">
        <a class="ts-kep${temaKep ? '' : ' kep-hibas'}" ${dc(tema.fo)} href="${biztonsagos(tema.fo.link)}" target="_blank" rel="noopener">
          ${temaKep ? `<img src="${biztonsagos(temaKep)}" alt="" onerror="this.parentElement.classList.add('kep-hibas')">` : ''}${temaKepFallbackHTML(tema)}
        </a>
        <a class="ts-fo" ${dc(tema.fo)} href="${biztonsagos(tema.fo.link)}" target="_blank" rel="noopener">
          <div class="ts-fo-cimke">A nap fő híre · ${temaRegio}</div>
          ${forrasJelHTML(tema.fo, true)}
          <h2>${biztonsagos(tema.fo.cim)}</h2>
          <p>${biztonsagos(tema.fo.lead)}</p>
        </a>
        ${temaForrasListaHTML(kapcsolodok)}
      </div>
    </div>
  </section>`;
}

/* regionális témasáv: az erdélyi portálok közös felkapott témája */
function erdelyTemaHTML(tema){
  if (!tema) return '';
  const cimke = tema.egyedi ? 'Erdélyből' : `· ${tema.forrasDb} portál írt róla`;
  const listaCim = tema.egyedi ? 'További erdélyi hírek' : 'Így írták meg mások';
  const kapcsolodok = [...new Map([tema.fo, ...(tema.osszes || tema.tobbi || [])].filter(Boolean).map(h => [h.link, h])).values()];
  const masok = kapcsolodok.filter(h => h.link !== tema.fo.link);
  const forrasok = [...new Map(kapcsolodok.map(h => [h.forras, h])).values()];
  const temaKep = tema.fo.kep || (masok.find(h => h.kep) || {}).kep || '';
  return `<section class="tema-sav zold">
    <div class="tema-sav-in">
      <div class="ts-fej">
        <span class="ts-tick"></span> A nap témája
        <span class="regio-cimke">Erdély</span>
        <span class="alcim">${cimke}</span>
      </div>
      <div class="ts-forrasok"><span class="ts-forras-label">Források:</span>${forrasok.map(h => `<span class="ts-forras-pill">${forrasIkonHTML(h, 'kicsi')} ${biztonsagos(h.forras)}</span>`).join('')}</div>
      <div class="ts-racs">
        <a class="ts-kep${temaKep ? '' : ' kep-hibas'}" ${dc(tema.fo)} href="${biztonsagos(tema.fo.link)}" target="_blank" rel="noopener">
          ${temaKep ? `<img src="${biztonsagos(temaKep)}" alt="" onerror="this.parentElement.classList.add('kep-hibas')">` : ''}${temaKepFallbackHTML(tema)}
        </a>
        <a class="ts-fo" ${dc(tema.fo)} href="${biztonsagos(tema.fo.link)}" target="_blank" rel="noopener">
          <div class="ts-fo-cimke">A nap fő híre · Erdély</div>
          ${forrasJelHTML(tema.fo, true)}
          <h2>${biztonsagos(tema.fo.cim)}</h2>
          <p>${biztonsagos(tema.fo.lead)}</p>
        </a>
        ${temaForrasListaHTML(kapcsolodok, tema.egyedi ? listaCim : 'Hol jelent meg?')}
      </div>
    </div>
  </section>`;
}

/* ---------- Cikknézet: mélyreható sajtószemle-audit ---------- */
const IRANYZAT = {
  kritikus:  { chip:'ELLENZÉKI / KRITIKUS', sor:'Ellenzék / kritikus hang',    szin:'#e0315f' },
  centrista: { chip:'FÜGGETLEN / CENTRISTA', sor:'Centrista / semleges',       szin:'#8f9bb0' },
  kormany:   { chip:'KORMÁNYKÖZELI / JOBBOLDAL', sor:'Jobboldal / kormányfókusz', szin:'#2f7fd6' },
};
let rogzitettLink = null;      // a címlapra rögzített cikk (munkamenetre szól)
let aktHangok = [], aktHangIdx = 0;

const dc = h => `data-cikk="${encodeURIComponent(h.link)}"`;
function forrasAdat(nev){ return FORRASOK.find(f => f.nev === nev) || {}; }
function irany(h){ return forrasAdat(h.forras).iranyzat || 'centrista'; }
function cnIdo(d){
  const ma = new Date().toDateString() === d.toDateString();
  return oraPerc(d) + ' · ' + (ma ? 'MA' : d.toLocaleDateString('hu-HU',{month:'short',day:'numeric'}).toUpperCase());
}

/* ugyanarról az eseményről szóló cikkek – forrásonként a legfrissebb */
function kapcsolodoHangok(hir){
  const talalatok = osszesHir.filter(h => {
    if (h === hir || h.link === hir.link) return false;
    if (Math.abs(h.datum - hir.datum) > 72*3600*1000) return false;
    return ugyanazATema(hir, h);
  }).sort((a,b) => b.datum - a.datum);
  const latott = new Set([hir.forras]);
  const hangok = [hir];
  for (const h of talalatok){
    if (latott.has(h.forras)) continue;
    latott.add(h.forras);
    hangok.push(h);
    if (hangok.length >= 6) break;
  }
  return hangok;
}

function hangPanelHTML(){
  const h = aktHangok[aktHangIdx];
  const kulcs = irany(h);
  const fa = forrasAdat(h.forras);
  const szoveg = h.lead
    ? h.lead + (h.lead.length > 300 ? '…' : '')
    : `A(z) ${h.forras} saját feldolgozásában, „${h.cim}" címmel számolt be az eseményről.`;
  return `
    <div class="mp-panel-fej">
      <span class="forr-nev"><span class="pont" style="background:${fa.szin || '#999'}"></span>FORRÁS PREFERENCIA: ${biztonsagos(h.forras.toUpperCase())}</span>
      <span class="iranyzat-chip ${kulcs}">${IRANYZAT[kulcs].chip}</span>
    </div>
    <p class="mp-szoveg">${biztonsagos(szoveg)}</p>
    <a class="eredeti-gomb" href="${biztonsagos(h.link)}" target="_blank" rel="noopener">Eredeti sajtótermék megnyitása ➜</a>`;
}
function valtHang(i){
  aktHangIdx = i;
  document.getElementById('mp-panel').innerHTML = hangPanelHTML();
  document.querySelectorAll('.mp-fulek button, .hang-lista button').forEach((b, j) => b.classList.toggle('aktiv', j === i));
}
function rogzitCimlapon(gomb){
  rogzitettLink = aktHangok[0].link;
  gomb.classList.add('kesz');
  gomb.textContent = '✓ Rögzítve a címlapon';
}

function cikkNezet(hir){
  aktHangok = kapcsolodoHangok(hir);
  aktHangIdx = 0;
  const jelenIranyok = new Set(aktHangok.map(irany));
  const hianyzo = Object.keys(IRANYZAT).filter(k => !jelenIranyok.has(k));
  const vanVakfolt = hianyzo.length > 0;
  const elso = [...aktHangok].sort((a,b) => a.datum - b.datum)[0];

  // elfogultsági megoszlás a feldolgozó források alapján
  const db = { kritikus:0, centrista:0, kormany:0 };
  aktHangok.forEach(h => db[irany(h)]++);
  const szazalek = k => Math.round(db[k] / aktHangok.length * 100);

  // "AI editoriális" összefoglaló – a leadekből és a lefedettségből számolt pontok
  const pontok = [];
  const elsoMondat = ((hir.lead || '').split('. ')[0] || hir.cim).slice(0, 170);
  pontok.push(elsoMondat + (elsoMondat.endsWith('.') ? '' : '.'));
  if (aktHangok.length > 1)
    pontok.push(`A témát ${aktHangok.length} portál dolgozta fel (${aktHangok.map(h => h.forras).join(', ')}), egymástól eltérő narratív keretekben.`);
  pontok.push(vanVakfolt
    ? `A figyelt források lefedettsége részleges: ${hianyzo.map(k => IRANYZAT[k].sor.toLowerCase()).join(', ')} kategóriából most nincs kapcsolódó cikk.`
    : 'A témát több, eltérő szerkesztőségi hátterű forrás is feldolgozta.');
  const kapcsolodo = aktHangok.slice(1, 5);
  const idopontok = [...aktHangok].map((h, index) => ({h, index})).sort((a,b) => a.h.datum - b.h.datum);
  const idovonalHTML = aktHangok.length > 1 ? `
        <section class="cikk-panel cikk-idovonal">
          <div class="cikk-panel-cim"><h2>A történet idővonala</h2><span>${idopontok.length} frissítés</span></div>
          <div class="idovonal-lista">
            ${idopontok.map((item, i) => `<button class="idovonal-esemeny ${i===idopontok.length-1?'aktualis':''}" onclick="valtHang(${item.index})"><span class="idovonal-pont"></span><span class="idovonal-meta">${cnIdo(item.h.datum)}</span><span class="idovonal-cim">${biztonsagos(item.h.cim)}<span class="idovonal-forras">${biztonsagos(item.h.forras)}</span></span></button>`).join('')}
          </div>
        </section>` : '';

  const cel = document.getElementById('tartalom');
  cel.innerHTML = `
  <div class="cikkoldal">
    <div class="cn-fejlec">
      <a class="vissza" href="#" onclick="location.hash='';return false">← Vissza a címlapra</a>
      <span class="cikk-kontekstus">NapHíre · belső cikkoldal</span>
    </div>
    <article class="cikk-fo">
        <div class="cn-cimkek">
          <span class="rovat-jelveny ${hir.region==='erdely'?'zold':''}">${hir.region==='erdely'?'Erdély':'Magyarország'}</span>
          <span class="cn-ido">${cnIdo(hir.datum)}</span>
        </div>
        <h1>${biztonsagos(hir.cim)}</h1>
        ${hir.lead ? `<p class="cikk-dek">${biztonsagos(hir.lead)}</p>` : ''}
        <div class="cikk-hero">${hir.kep ? `<img src="${biztonsagos(hir.kep)}" alt="" onerror="this.parentElement.innerHTML='<span class=\'cikk-hero-fallback\'>NapHíre</span>'">` : `<span class="cikk-hero-fallback">NapHíre</span>`}</div>
        <div class="cikk-hero-alairas">Forrás: ${biztonsagos(hir.forras)} · ${cnIdo(hir.datum)}</div>
    </article>
    <div class="cikk-racs">
      <main>
        <section class="cikk-panel">
          <div class="cikk-panel-cim"><h2>Hol jelent meg még?</h2><span>${aktHangok.length} forrás</span></div>
          <div class="hang-lista">
            ${aktHangok.map((h, i) => `<button class="${i===0?'aktiv':''}" onclick="valtHang(${i})"><span class="pont" style="background:${forrasAdat(h.forras).szin || '#999'}"></span><span>${biztonsagos(h.forras)}</span><small>${cnIdo(h.datum)}</small></button>`).join('')}
          </div>
          <div class="mp-panel" id="mp-panel">${hangPanelHTML()}</div>
        </section>
        ${idovonalHTML}
      </main>
      <aside>
        <section class="cikk-oldalpanel"><h3>Szerkesztői összefoglaló</h3><ul>${pontok.map(p => `<li>${biztonsagos(p)}</li>`).join('')}</ul></section>
        <section class="cikk-oldalpanel"><h3>Kapcsolódó hírek</h3><div class="cikk-kapcsolodo">${(kapcsolodo.length ? kapcsolodo : [hir]).map(h => `<a ${dc(h)} href="${biztonsagos(h.link)}">${biztonsagos(h.cim)}</a>`).join('')}</div></section>
        <button class="rogzit-gomb" onclick="rogzitCimlapon(this)">★ Rögzítés a címlapon</button>
      </aside>
    </div>
  </div>`;
  window.scrollTo({top:0});
}

/* ---------- Megjelenítés ---------- */
/* körbeforgó kiválasztás: legfeljebb `maxPerForras` cikk kerülhet be egy forrásból,
   így a vegyes blokkokban sosem uralja el egyetlen portál a listát */
function forrasElosztva(lista, n, maxPerForras){
  const csoport = {};
  const sorrend = [];
  lista.forEach(h => {
    if (!csoport[h.forras]){ csoport[h.forras] = []; sorrend.push(h.forras); }
    csoport[h.forras].push(h);
  });
  const eredmeny = [];
  let vedelem = 200;
  while (eredmeny.length < n && vedelem--){
    let valtozott = false;
    for (const forras of sorrend){
      const sor = csoport[forras];
      const felhasznalva = eredmeny.filter(h => h.forras === forras).length;
      if (sor.length && felhasznalva < maxPerForras){
        eredmeny.push(sor.shift());
        valtozott = true;
        if (eredmeny.length >= n) break;
      }
    }
    if (!valtozott) break;
  }
  return eredmeny;
}

function szurtHirek(){
  let h = osszesHir;
  if (aktivRegio !== 'mind') h = h.filter(x => x.region === aktivRegio);
  if (aktivRovat === 'erdely') h = h.filter(x => x.region === 'erdely');
  if (aktivRovat === 'magyar') h = h.filter(x => x.region === 'magyar');
  if (['gazdasag','sport','kultura'].includes(aktivRovat)) h = h.filter(x => x.rovat === aktivRovat);
  if (aktivForras) h = h.filter(x => x.forras === aktivForras);
  if (keresoSzo) {
    const k = keresoSzo.toLowerCase();
    h = h.filter(x => x.cim.toLowerCase().includes(k) || x.lead.toLowerCase().includes(k));
  }
  return h;
}

function forrasJelHTML(h, vilagos){
  return `<span class="forras-jel" ${vilagos?'style="color:#dfe4ec"':''}>
    ${forrasIkonHTML(h, 'kicsi')}
    <span class="csik" style="background:${h.region==='erdely'?'var(--erdely)':'var(--magyar)'}"></span>
    ${biztonsagos(h.forras)} <span class="ido">· ${idoOta(h.datum)}</span>
  </span>`;
}

function kepHTML(h){
  if (!h.kep) return `<div class="kep" style="display:flex;align-items:center;justify-content:center;color:var(--ink-faint);font-family:'Archivo',sans-serif;font-weight:800;font-size:22px;letter-spacing:-.02em">nap<span style="color:var(--parazs)">híre</span></div>`;
  return `<div class="kep"><img src="${biztonsagos(h.kep)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`;
}

function kartyaHTML(h){
  return `<a class="kartya" ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener">
    ${kepHTML(h)}
    ${forrasJelHTML(h)}
    <h3>${biztonsagos(h.cim)}</h3>
    <p>${biztonsagos(h.lead)}</p>
  </a>`;
}

/* rovatblokk: 1 nagy cikk + kis képes sorok + kéthasábos címlista */
/* vegyes mozaik: négyféle kezelés keverve, hasábelválasztókkal */
function mzKepes(h){
  return `<a class="mz-kepes" ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener">
    ${kepHTML(h)}${forrasJelHTML(h)}<h3>${biztonsagos(h.cim)}</h3></a>`;
}
function mzSotet(h){
  return `<a class="mz-sotet" ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener">
    <span class="vonal"></span><h3>${biztonsagos(h.cim)}</h3>
    <span class="meta">${biztonsagos(h.forras)} · ${idoOta(h.datum)}</span></a>`;
}
function mzThumb(h){
  return `<a class="kis-sor" ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener">
    ${kepHTML(h)}<div>${forrasJelHTML(h)}<h4>${biztonsagos(h.cim)}</h4></div></a>`;
}
function mzCim(h){
  return `<a class="mz-cim" ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener">
    <span class="kocka ${h.region==='erdely'?'zold':'piros'}"></span>
    <span><span class="cs-cim">${biztonsagos(h.cim)}</span>
    <span class="cs-meta">${biztonsagos(h.forras)} · ${idoOta(h.datum)}</span></span></a>`;
}
function mozaikHTML(cikkek){
  const egyedi = [...new Map(cikkek.filter(Boolean).map(h => [h.link, h])).values()];
  if (egyedi.length < 6) return '';
  const foto = h => `<span class="mix-photo ${h.kep ? '' : 'mix-photo-fallback'}">${h.kep
    ? `<img src="${biztonsagos(h.kep)}" alt="" loading="lazy" onerror="this.closest('.mix-photo').classList.add('mix-photo-fallback');this.innerHTML='<b>${biztonsagos((h.forras || 'N').charAt(0))}</b>'">`
    : `<b>${biztonsagos((h.forras || 'N').charAt(0))}</b>`}</span>`;
  const meta = h => `<span class="mix-meta">${biztonsagos(h.forras)} · ${idoOta(h.datum)}</span>`;
  const kepes = (h, osztaly) => `<a class="mix-card ${osztaly}" ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener">
    ${foto(h)}<span class="mix-copy">${forrasJelHTML(h, true)}<h3>${biztonsagos(h.cim)}</h3>${meta(h)}</span></a>`;
  const lead = egyedi[0], accent = egyedi[1], visual = egyedi[2];
  const lista = egyedi.slice(3, 7), mini = egyedi.slice(7, 9), quote = egyedi[9];
  return `<section class="mix-block">
    <div class="mix-grid">
      ${kepes(lead,'mix-lead')}
      ${accent ? `<a class="mix-card mix-accent" ${dc(accent)} href="${biztonsagos(accent.link)}" target="_blank" rel="noopener"><span class="mix-copy"><h3>${biztonsagos(accent.cim)}</h3>${meta(accent)}</span></a>` : ''}
      ${visual ? kepes(visual,'mix-visual') : ''}
      ${lista.length ? `<div class="mix-list">${lista.map((h,i) => `<a ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener"><b>${String(i+1).padStart(2,'0')}</b><span><span class="mix-title">${biztonsagos(h.cim)}</span>${meta(h)}</span></a>`).join('')}</div>` : ''}
      ${mini.map((h,i) => kepes(h,`mix-mini${i ? ' mix-mini-alt' : ''}`)).join('')}
      ${quote ? `<a class="mix-card mix-quote" ${dc(quote)} href="${biztonsagos(quote.link)}" target="_blank" rel="noopener"><span class="mix-copy"><h3>${biztonsagos(quote.cim)}</h3>${meta(quote)}</span></a>` : ''}
    </div>
  </section>`;
}

function cimSorHTML(h){
  return `<a class="cim-sor" ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener">
    <span class="cs-cim">${biztonsagos(h.cim)}</span>
    <span class="cs-meta">${biztonsagos(h.forras)} · ${idoOta(h.datum)}</span></a>`;
}
function overlayHTML(h, extra){
  return `<a class="rs-fo ${extra||''}" ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener">
    ${h.kep ? `<img src="${biztonsagos(h.kep)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
    <div class="rs-fo-szoveg">${forrasJelHTML(h, true)}<h3>${biztonsagos(h.cim)}</h3></div></a>`;
}

/* minden rovat MÁS elrendezést kap (A–E változatok) */
function szekcioHTML(){ return ""; }

/* felkapott: az a cikk a legfelkapottabb, amelyről a legtöbb másik forrás is írt */
function felkapottTop(){
  const friss = osszesHir.slice(0, 60);
  const st = friss.map(h => new Set(stemek(h.cim)));
  const pont = friss.map((h, i) => {
    const f = new Set();
    for (let j = 0; j < friss.length; j++){
      if (i === j || friss[j].forras === h.forras) continue;
      let k = 0;
      for (const sz of st[i]) if (st[j].has(sz)){ k++; if (k >= 2){ f.add(friss[j].forras); break; } }
    }
    return f.size;
  });
  const sorrend = friss.map((_, i) => i).sort((a, b) => pont[b] - pont[a]);
  const valasztott = [];
  for (const i of sorrend){
    if (valasztott.length >= 5) break;
    let dupla = false;
    for (const v of valasztott){
      let k = 0;
      for (const sz of st[i]) if (st[v].has(sz)){ k++; if (k >= 2){ dupla = true; break; } }
      if (dupla) break;
    }
    if (!dupla) valasztott.push(i);
  }
  return valasztott.map(i => friss[i]);
}


/* az oldalsáv Legfrissebb listája pontosan a bal hasáb aljáig ér – nincs üres hely, nincs túllógás */
function kiegyenlitOldalsav(){
  const fb = document.querySelector('.foblokk');
  const sav = fb && fb.querySelector('.jobb-sav');
  const lista = sav && sav.querySelector('.ido-lista');
  if (!fb || !sav || !lista) return;
  if (!lista.dataset.teljes) lista.dataset.teljes = lista.innerHTML; // teljes lista elmentve
  lista.innerHTML = lista.dataset.teljes;                            // mindig innen indulunk újra
  if (window.innerWidth <= 1000) return;                             // mobilon nincs vágás
  const bal = fb.children[0];
  const cel = bal.getBoundingClientRect().bottom;
  const savAlja = () => {
    const utolso = sav.lastElementChild;
    return utolso ? utolso.getBoundingClientRect().bottom : 0;
  };
  let vedelem = 80;
  while (lista.children.length > 5 && savAlja() > cel + 6 && vedelem--){
    lista.removeChild(lista.lastElementChild);
  }
}
/* a bal hasáb méretét figyeljük: kép-betöltés vagy képhiba után is azonnal újraszámol */
let balFigyelo = null;
function figyeljBalHasab(){
  const fb = document.querySelector('.foblokk');
  if (balFigyelo) balFigyelo.disconnect();
  if (!fb || !fb.children[0] || typeof ResizeObserver === 'undefined') return;
  balFigyelo = new ResizeObserver(() => kiegyenlitOldalsav());
  balFigyelo.observe(fb.children[0]);
}
window.addEventListener('load', kiegyenlitOldalsav);
let meretezesIdozito = null;
window.addEventListener('resize', () => {
  clearTimeout(meretezesIdozito);
  meretezesIdozito = setTimeout(kiegyenlitOldalsav, 160);
});

function bannerHTML(kulcs, szoveg, oldalsavosCss, rejtsdHaUres){
  const b = BEALLITASOK.banners[kulcs];
  if (b && b.kep){
    return `<div class="banner-hely${oldalsavosCss?' oldalsavos':''}">
      <a href="${biztonsagos(b.link || '#')}" target="_blank" rel="noopener" style="display:block">
        <img src="${biztonsagos(b.kep)}" alt="Hirdetés" style="width:100%;height:auto;display:block">
      </a>
    </div>`;
  }
  if (rejtsdHaUres) return '';
  return `<div class="banner-hely${oldalsavosCss?' oldalsavos':''}"><div class="banner-hely-in">${szoveg}</div></div>`;
}

function rajzol(){
  const cel = document.getElementById('tartalom');
  const hirek = szurtHirek();

  // ha cikknézet van megnyitva (#cikk=...), azt rajzoljuk újra
  const utvonal = location.hash.match(/cikk=(.+)/);
  if (utvonal && osszesHir.length){
    const h = osszesHir.find(x => x.link === decodeURIComponent(utvonal[1]));
    if (h){ cikkNezet(h); return; }
  }

  if (!osszesHir.length){
    cel.innerHTML = `<div class="hiba-doboz"><strong>Nem sikerült hírt betölteni.</strong>
      Ha ezt a Claude beépített előnézetében látod, az blokkolja az internetelérést – töltsd le a fájlt,
      és nyisd meg közvetlenül a böngésződben, vagy töltsd fel egy tárhelyre. Ha ez már egy éles, feltöltött
      oldalon jelenik meg, akkor az ingyenes RSS-lekérő szolgáltatások épp egyszerre nem elérhetők (ez időnként
      előfordul, néhány percen belül általában helyreáll) – kattints fent a Frissítés gombra, vagy próbáld újra
      később.</div>`;
    return;
  }

  if (!hirek.length){
    cel.innerHTML = `<div class="hiba-doboz"><strong>Nincs találat.</strong> Próbálj más keresőszót vagy rovatot.</div>`;
    return;
  }

  let hibaHTML = '';
  let hibaSzoveg = '';
  if (gyorsitotarKorabol){
    if (tartalekTipus === 'static'){
      hibaSzoveg = 'az élő RSS-csatornák most lassan válaszolnak; az alábbi válogatás az eredeti szerkesztőségek legutóbb elérhető híreire mutat.';
    } else {
      const perc = Math.round((Date.now() - gyorsitotarKorabol) / 60000);
      const mikor = perc < 60 ? perc + ' perccel' : Math.round(perc/60) + ' órával';
      hibaSzoveg = `az élő csatornák átmenetileg nem válaszolnak, ezért a ${mikor} korábbi mentett hírek láthatók.`;
    }
  } else if (hibasForrasok.length){
    hibaSzoveg = `${hibasForrasok.length} csatorna átmenetileg nem frissül (${hibasForrasok.join(', ')}). A többi hírforrás működik.`;
  }
  hibaHTML = hibaSzoveg ? `<div class="hiba-sav"><div class="hiba-sav-in"><span class="forras-allapot-jel"></span><strong>Forrásállapot:</strong> ${hibaSzoveg}</div></div>` : '';
  const allapot = document.getElementById('lablec-allapot');
  if (allapot) allapot.innerHTML = hibaSzoveg ? `<div class="lablec-allapot-inner"><span class="forras-allapot-jel"></span><strong>Forrásállapot:</strong> ${hibaSzoveg}</div>` : '';

  // "Percről percre" nézet: csak időrendi lista
  if (aktivRovat === 'friss'){
    cel.innerHTML = hibaHTML + `
      <div class="szekcio-cim"><span class="jelzo"></span>Percről percre</div>
      <div class="doboz" style="border:1px solid var(--line)">
        <ul class="friss-lista" style="max-height:none">
          ${hirek.slice(0,60).map(h => `
            <li><a ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener">
              <span class="ido">${oraPerc(h.datum)}</span>
              <span><span class="cim">${biztonsagos(h.cim)}</span><br><span class="forr">${biztonsagos(h.forras)}</span></span>
            </a></li>`).join('')}
        </ul>
      </div>`;
    return;
  }

  const foNezet = aktivRovat==='mind' && !aktivForras && !keresoSzo;
  // A nap témája – csak a főoldali, szűretlen nézetben, és csak a magyarországi
  // portálok legfelkapottabb témája (az erdélyi témának külön sávja van lentebb)
  let tema = null;
  if (foNezet){
    const temaRegio = aktivRegio === 'erdely' ? 'erdely' : 'magyar';
    const temaBeallitas = temaRegio === 'erdely' ? BEALLITASOK.kiemeltTemaErdely : BEALLITASOK.kiemeltTema;
    const regioHirek = hirek.filter(h => h.region === temaRegio);
    tema = (temaBeallitas && temaBeallitas.aktiv && temaBeallitas.cim)
      ? temaRogzitettbol(temaBeallitas, regioHirek, temaRegio)
      : napTemajaStabil(regioHirek, temaRegio, temaRegio === 'erdely' ? 2 : 3, 72);
  }
  const temaLinkek = tema ? new Set([tema.fo.link, ...tema.tobbi.map(h => h.link)]) : new Set();
  // A főoldal csak szerkesztett fontossági készletből dolgozik; a teljes RSS
  // lista kizárólag a Percről percre nézetben marad látható.
  const foKeszlet = foNezet ? fontosHirek(hirek, 28) : hirek;
  const keszlet = foKeszlet.filter(h => !temaLinkek.has(h.link));

  const kepes = keszlet.filter(h => h.kep);
  const rogzitett = rogzitettLink ? keszlet.find(h => h.link === rogzitettLink) : null;
  const vezeto = rogzitett || kepes[0] || keszlet[0];
  let marad = keszlet.filter(h => h !== vezeto);

  // az erdélyi portálok közös felkapott témája – a saját sávjába kerül, máshol nem ismétlődik
  let temaErdely = null;
  if (aktivRegio === 'mind' && aktivRovat === 'mind' && !aktivForras && !keresoSzo){
    const erdelyJelolt = marad.filter(h => h.region === 'erdely');
    temaErdely = (BEALLITASOK.kiemeltTemaErdely && BEALLITASOK.kiemeltTemaErdely.aktiv && BEALLITASOK.kiemeltTemaErdely.cim)
      ? temaRogzitettbol(BEALLITASOK.kiemeltTemaErdely, erdelyJelolt, 'erdely')
      : napTemajaStabil(erdelyJelolt, 'erdely', 2, 72);
    if (!temaErdely && erdelyJelolt.length){
      // nincs olyan téma, amiről legalább 2 forrás írt – ilyenkor is mutassunk valamit,
      // a hero-sávhoz hasonlóan: a legfrissebb, képes erdélyi hír legyen a "nap témája"
      const fo = erdelyJelolt.find(h => h.kep) || erdelyJelolt[0];
      const tobbi = erdelyJelolt.filter(h => h !== fo).slice(0, 4);
      temaErdely = { fo, tobbi, forrasDb: 1, egyedi: true };
    }
    if (temaErdely){
      const tl = new Set([temaErdely.fo.link, ...temaErdely.tobbi.map(h => h.link)]);
      marad = marad.filter(h => !tl.has(h.link));
    }
  }

  const mozaik12 = forrasElosztva(marad, 12, 2);             // vegyes válogatás a lead alá – max 2 cikk/forrás
  const harom = mozaik12.filter(h => h.kep).slice(0, 3);     // a szűrt nézet ugyanebből dolgozik
  const gyors4 = mozaik12.filter(h => !harom.includes(h)).slice(0, 4);
  marad = marad.filter(h => !mozaik12.includes(h));

  // Először az ismétlésmentes maradékból építjük a rovatokat. Ha egy rovatot a
  // kiemelések szinte teljesen kiürítettek, az eredeti szerkesztett készletből
  // egészítjük ki – így frissítés után sem tűnnek el egész szekciók.
  const rovatLista = rovat => {
    const elsodleges = marad.filter(h => h.rovat === rovat);
    const tartalek = hirek.filter(h => h !== vezeto && !temaLinkek.has(h.link) && h.rovat === rovat);
    const egyedi = [...new Map([...elsodleges, ...tartalek].map(h => [h.link, h])).values()];
    return forrasElosztva(egyedi, 11, 3);
  };
  const gazdasagiak = rovatLista('gazdasag');
  const sportosok   = rovatLista('sport');
  const kulturasok  = rovatLista('kultura');
  const tematikus = new Set([...gazdasagiak, ...sportosok, ...kulturasok]);
  const regioPool = marad.filter(h => !tematikus.has(h));
  const regioLista = region => {
    const elsodleges = regioPool.filter(h => h.region === region);
    const tartalek = hirek.filter(h => h !== vezeto && !temaLinkek.has(h.link) && h.region === region);
    const egyedi = [...new Map([...elsodleges, ...tartalek].map(h => [h.link, h])).values()];
    return forrasElosztva(egyedi, 11, 3);
  };
  const erdelyiek = regioLista('erdely');
  const magyarok  = regioLista('magyar');
  const vegyesRacs = marad.slice(0, 12);

  const leadHTML = `
    <article class="lead">
      <a class="lead-kep" ${dc(vezeto)} href="${biztonsagos(vezeto.link)}" target="_blank" rel="noopener">
        ${vezeto.kep ? `<img src="${biztonsagos(vezeto.kep)}" alt="" onerror="this.remove()">` : ''}
      </a>
      <div>
        ${forrasJelHTML(vezeto)}
        <a ${dc(vezeto)} href="${biztonsagos(vezeto.link)}" target="_blank" rel="noopener"><h1>${biztonsagos(vezeto.cim)}</h1></a>
        <p>${biztonsagos(vezeto.lead)}</p>
      </div>
    </article>`;

  const sor3HTML = harom.length ? `
    <div class="sor3">
      ${harom.map(h => `
        <a class="sor-elem" ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener">
          ${kepHTML(h)}
          ${forrasJelHTML(h)}
          <h3>${biztonsagos(h.cim)}</h3>
        </a>`).join('')}
    </div>` : '';

  const gyorsHTML = gyors4.length ? `
    <div class="gyors-cimek">
      ${gyors4.map(h => `
        <a ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener">
          <span class="cs-cim">${biztonsagos(h.cim)}</span>
          <span class="cs-meta">${biztonsagos(h.forras)} · ${idoOta(h.datum)}</span>
        </a>`).join('')}
    </div>` : '';

  const jobbSavHirek = [...osszesHir].sort((a,b) => b.datum - a.datum).slice(0, foNezet ? 18 : 30);
  const jobbSav = `
    <aside class="jobb-sav">
      <div class="sav-cim"><span class="pont-elo"></span>Legfrissebb</div>
      <ul class="ido-lista">
        ${jobbSavHirek.map(h => `
          <li><a ${dc(h)} href="${biztonsagos(h.link)}" target="_blank" rel="noopener">
            <span class="ido">${oraPerc(h.datum)}</span>
            <span><span class="cim">${biztonsagos(h.cim)}</span><span class="forr">${biztonsagos(h.forras)}</span></span>
          </a></li>`).join('')}
      </ul>
      ${bannerHTML('oldalsav', 'Hirdetési hely<br>300×250', true)}
    </aside>`;

  if (foNezet){
    cel.innerHTML = napTemajaHTML(tema) + `
      <div class="foblokk">
        <div>${mozaikHTML(mozaik12)}</div>
        ${jobbSav}
      </div>
      ${bannerHTML('tartalom', 'Hirdetési hely · 728×90', false)}
      <div class="valaszto"></div>
      
      ${szekcioHTML('Erdély', 'zold tonal', erdelyiek, 'A')}
      <div class="valaszto"></div>
      ${szekcioHTML('Magyarország', 'piros', magyarok, 'B')}
      <div class="valaszto"></div>
      ${szekcioHTML('Gazdaság', 'arany tonal', gazdasagiak, 'C')}
      <div class="valaszto"></div>
      ${szekcioHTML('Sport', 'kek', sportosok, 'D')}
      <div class="valaszto"></div>
      ${szekcioHTML('Kultúra', 'lila tonal', kulturasok, 'E')}`;
    kiegyenlitOldalsav();
    figyeljBalHasab();
    setTimeout(kiegyenlitOldalsav, 400);
  } else {
    cel.innerHTML = hibaHTML + `
      <div class="foblokk">
        <div>
          ${leadHTML}${sor3HTML}
          <div class="szekcio-fej"><span class="tick"></span><h2>További hírek</h2></div>
          <div class="kartya-racs">${vegyesRacs.map(kartyaHTML).join('')}</div>
        </div>
        ${jobbSav}
      </div>`;
    kiegyenlitOldalsav();
    figyeljBalHasab();
    setTimeout(kiegyenlitOldalsav, 400);
  }
}

/* ---------- Vezérlés ---------- */
function regioGombokFrissit(){
  document.querySelectorAll('.regio-kapcsolo button').forEach(b =>
    b.classList.toggle('aktiv', b.dataset.regio === aktivRegio));
}
function valtRegio(regio){
  if (location.hash.includes('cikk=')) location.hash = '';
  aktivRegio = regio === 'erdely' || regio === 'magyar' ? regio : 'mind';
  aktivRovat = 'mind';
  aktivForras = null;
  keresoSzo = '';
  const kereso = document.getElementById('kereso-mezo');
  if (kereso) kereso.value = '';
  regioGombokFrissit();
  document.querySelectorAll('#rovat-sav button').forEach(b => b.classList.toggle('aktiv', b.dataset.rovat === 'mind'));
  window.scrollTo({top:0, behavior:'smooth'});
  rajzol();
}
function valtRovat(r){
  if (location.hash.includes('cikk=')) location.hash = ''; // cikknézetből vissza a listára
  aktivRovat = r;
  if (r === 'erdely' || r === 'magyar') aktivRegio = r;
  regioGombokFrissit();
  aktivForras = null;
  document.querySelectorAll('#rovat-sav button').forEach(b =>
    b.classList.toggle('aktiv', b.dataset.rovat === r));
  window.scrollTo({top:0, behavior:'smooth'});
  rajzol();
}
function valtForras(f){
  aktivForras = (aktivForras === f) ? null : f;
  aktivRovat = 'mind';
  rajzol();
  renderForrasaink();
  document.getElementById('tartalom').scrollIntoView({behavior:'smooth', block:'start'});
}
function renderForrasaink(){
  const cel = document.getElementById('forrasaink-lista');
  if (!cel) return;
  cel.innerHTML = FORRASOK.filter(f => !BEALLITASOK.forrasokKi.includes(f.nev)).map(f => `
    <button class="forras-pill ${aktivForras===f.nev?'aktiv':''}" onclick="valtForras('${f.nev.replace(/'/g,"\\'")}')">
      <span class="fp-ikon" style="background:${f.szin || '#999'}">${biztonsagos(f.nev.charAt(0))}</span>
      ${biztonsagos(f.nev)}
    </button>`).join('');
}
/* kattintás a cikkekre: belső sajtószemle-nézet nyílik (Ctrl/Cmd+katt: eredeti oldal új fülön) */
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-cikk]');
  if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
  e.preventDefault();
  location.hash = 'cikk=' + a.dataset.cikk;
});
window.addEventListener('hashchange', rajzol);
document.getElementById('rovat-sav').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b) valtRovat(b.dataset.rovat);
});
document.getElementById('kereso-mezo').addEventListener('input', e => {
  keresoSzo = e.target.value.trim();
  rajzol();
});
document.getElementById('frissit-gomb').addEventListener('click', () => NHHome.refresh());

/* ---------- Indítás ---------- */
document.getElementById('mai-datum').textContent =
  new Date().toLocaleDateString('hu-HU',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
document.getElementById('ev').textContent = new Date().getFullYear();

// A közös indító a végleges rendererek és a beállítások után rajzol.
