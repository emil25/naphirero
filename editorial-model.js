(function(root){
 const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function classify(h){
  let path='';try{path=decodeURIComponent(new URL(h.link).pathname)}catch{}
  const route=clean(path),tags=clean(h.kategoriak),title=clean(h.cim),text=tags+' '+route+' '+title;
  let geo=h.region==='erdely'?'erdely':h.region==='roman'?'roman':'magyar';
  if(geo!=='roman'&&(/\/(kulfold|vilag|world|international|kulpolitika)(\/|$)/.test(route)||/\b(kulfold|kulpolitika|vilagpolitika|nemzetkozi)\b/.test(tags)))geo='vilag';
  const domestic=/\b(erdely|szekely|romania|magyarorszag|budapest|kolozsvar|marosvasarhely|csikszereda|udvarhely|gyergyo|partium|gyor|debrecen|szolnok|orban|magyar peter)\w*/.test(title);
  if(geo!=='roman'&&!domestic&&/\b(lavrov|putyin|trump|zelenszkij|orosz|ukran|moszkva|kijev|nemetorszag|izrael|irani|kina|indonezia|amerikai|francia|parizs|berlin|kanada|eiffel)\w*/.test(title))geo='vilag';
  let section=null;
  // A forrás rovatútvonala erősebb jel, mint egy kiragadott szó a címben.
  if(/\/(sport|foci|sportok)(\/|$)/.test(route)||/\b(sport|labdarugas|kezilabda|kosarlabda|formula.?1)\b/.test(tags))section='sport';
  else if(/\/(gazdasag|g7|penz|uzlet)(\/|$)/.test(route)||/\b(gazdasag|penzugy|tozsde)\b/.test(tags))section='gazdasag';
  else if(/\/(velemeny|publicisztika|blog|allaspont)(\/|$)/.test(route)||/\b(velemeny|publicisztika|allaspont)\b/.test(tags)||/\b(tarca|jegyzet|kommentar)\w*/.test(title))section='velemeny';
  else if(/\/(tech|tudomany|tud-tech|techtud|technologia)(\/|$)/.test(route)||/\b(technologia|tudomany|mesterseges intelligencia)\b/.test(tags))section='tech';
  else if(/\/(eletmod|elet-stilus|egeszseg|gasztro|szepkilatas|mindekozben|cegauto)(\/|$)/.test(route)||/\b(eletmod|egeszseg|gasztronomia)\b/.test(tags))section='eletmod';
  else if(/\/(kultura|kultur|kult|film|szinhaz)(\/|$)/.test(route)||/\b(kultura|irodalom|szinhaz)\b/.test(tags))section='kultura';
  if(!section){
   if(/\b(fradi|ferencvaros|merkozes|golpassz|labdarugo|futball|bajnoksag|kezilabda|kosarlabda|dzsudos|forma.?1|leclerc|felmaraton|geoguessr)\w*/.test(title))section='sport';
   else if(/\b(inflacio|nyugdij|koltsegvetes|hitelkamat|beruhazas|minimalber|aramar|uzemanyag|euroarfolyam|volkswagen)\w*/.test(title))section='gazdasag';
   else if(/\b(mesterseges intelligencia|chatgpt|openai|okostelefon|szoftver|robotika|urkutatas)\b/.test(title))section='tech';
   else if(/\b(koncert|szinhaz|konyv|regeny|zongoramuvesz|filmrendezo|lemezek)\w*/.test(title))section='kultura';
   else if(/\b(etrend|recept|taplalkozas|tura|alvas|egeszseg)\w*/.test(title))section='eletmod';
  }
  return {geo,section};
 }
 root.NHEditorial={classify};
})(typeof module!=='undefined'?module.exports:window);
