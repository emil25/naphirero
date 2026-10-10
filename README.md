# NapHíre.ro

Statikus hírportál saját RSS-közvetítővel és tartós szerkesztőségi mentéssel.

## A közzétett nézet

A `vercel.json` a `/` útvonalat a `/klasszikus` oldalra irányítja. A `/klasszikus` a `classic-editorial-previous.html` klasszikus címlapját szolgálja ki. A `/korkep` ugyanennek a gyors, közös hírbetöltésnek egy külön nevű és eltérő, világos editorial elrendezésű változata; a felső gombbal mindkét irányban át lehet váltani. Az `index.html`, az `uj.html` és a `legacy.html` továbbra is külön elérhető; egyik sem vált nézetet egy később érkező szerkesztőségi beállítás miatt.

Vercelen ennek a Git-repozitóriumnak a gyökere a projekt gyökere. Framework Preset: Other. Nincs külön build vagy output könyvtár.

## Betöltés

A három főoldal közös indítója a `home-runtime.js`. A választott oldal végleges renderelője a DOMContentLoaded előtt települ; az indító ezután indítja a beállítások és a hírforrások párhuzamos lekérését. Az első megjelenítés megvárja a beállításlekérést. A használható mentett hírkészletet is ugyanaz a végleges renderelő jeleníti meg. Ha a teljes új hírkészlet már megérkezett, a mentett készlet külön kirajzolása elmarad.

Egy forrásnak összesen 4,5 másodperce van, beleértve a tartalék RSS-címeit és a válasz teljes törzsét. A szerveroldali RSS-kérés 3,5 másodpercet kap az átirányításokkal és a válasz törzsével együtt. Nincs forrásonkénti mesterséges késleltetés vagy blokkolt külső proxypróbálgatás.

A beállításlekérés böngészőoldali kerete 2,2 másodperc; a szerver a GitHub-olvasásnak 1,4 másodpercet ad. Sikertelen GitHub-olvasásnál a csomagban lévő beállítások jelölt tartalékként érkeznek. A látogatónál meglévő, még érvényes utolsó sikeres beállítások ilyenkor elsőbbséget kapnak. Teljes hibánál újrapróbálható állapot jelenik meg.

A böngésző hírgyorsítótára legfeljebb 24 órás lehet; csak érvényes, legfeljebb 72 órás cikkeket használ. Sikertelen források korábbi cikkei megmaradhatnak, kikapcsolt források cikkei nem. Nincsenek beépített szeptemberi tartalékhírek. A gyorsítótár és a háttérfrissítés állapota a fejlécben látszik. Az ötpercenkénti automatikus és a kézi frissítés egy közös folyamatot használ.

Az `editorial-home.js` és a `classic-editorial-previous.js` a változatlan cikkösszehasonlítási szabályokhoz szükséges szöveges jellemzőket egy kirajzoláson belül újrahasznosítja. A gyorsítótár minden kirajzolás előtt törlődik, így egy szerkesztői módosítás nem kap régi összehasonlítási eredményt.

## Szerkesztőségi mentés

Az `admin.html` az `api/settings.js` végpontra ment. A `settings.json` a GitHub-repozitóriumba kerül; nincs kézi JSON-letöltés és feltöltés. Szükséges Vercel-környezeti változók: `ADMIN_TOKEN` és `GITHUB_TOKEN` vagy `GITHUB_PAT`. Opcionális beállítások: `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_SETTINGS_PATH`. Titkos értékeket ne tegyünk a repóba vagy a böngészőben letöltött beállításfájlba.

A GET mindig új GitHub-olvasást végez; egy sikeres mentés a következő olvasásnál látható. Az admin írásához továbbra is ellenőrzött admin kód szükséges.

Az „Összefoglalók” adminrészen eredeti cikklinkhez írható magyar szöveg. A `storySummaries` beállítás a többi adattal együtt mentődik; mentéskor az admin megőrzi a meglévő kiegészítő beállításokat és témakulcsszavakat is. A követőkódok nélküli cikklink alapján ugyanazon történet más forrásból megnyitott oldala is megkapja az összefoglalót. Szerkesztett szöveg nélkül jelölt RSS-forrásrészlet jelenik meg.

## Belső olvasóoldal és frissülések

A `#cikk=` és a `#tortenet=` ugyanazt a világos olvasóoldalt használja. A cikkútvonal az olvasó által kiválasztott cikk címét tartja meg; a többforrásos történet a legutóbbi cikket vezeti. Az eredeti források, címeik, időpontjaik és linkjeik mindig látszanak. Az idővonal a cikkek megjelenési idejét mutatja, a szövegmódosítások mellett külön szerepel az észlelés időpontja. Nincs AI-elemzést vagy ellenőrzött forráskülönbséget ígérő üres panel.

A Nap témája jelzése az adott böngésző előzőleg látott történetéhez képest mutat új forrást, új cikket vagy módosult címet/részletet. Az első megtekintés alapállapotot rögzít. Dátum-, kép- vagy követőkód-változás nem számít frissítésnek; átmenetileg hiányzó forrás visszatérése sem. A jelzés egy órán át marad látható; az előzmény legfeljebb hét napig tárolódik. A történetkövetés és ez az előzmény böngészőnként működik, nem fiókok között szinkronizált. Az RSS-ben meg nem jelent változást ez a rendszer nem tudja észlelni.

## Külön szerkesztői segéd

Az admin fejlécében a **Szerkesztői segéd** link a `szerkesztoi-seged.html` oldalra vezet. Ugyanazt az `ADMIN_TOKEN` kódot használja. A főoldal sem ezt az oldalt, sem az API-ját nem tölti be. Ez saját NapHíre-implementáció a Crucix működési ötletei alapján; Crucix-kódot és annak kezelőfelületét nem tartalmazza.

Az USGS M2.5+ napi GeoJSON-adatából a 20,2–29,8 keleti hosszúság és 43,6–48,3 északi szélesség közötti térséget figyeli, alapértelmezés szerint M3,5-től. A befoglaló téglalap szomszédos területeket is érint: kizárólag a szolgáltató `Romania` helymegjelölése esetén írja, hogy Romániában; másként „Románia térségében”. Nem teljes helyi rengéskatalógus vagy hivatalos riasztás. Harminc percnél régebben generált adat, hiányzó magnitúdó/idő, jövőbeli vagy 24 óránál régebbi esemény nem ad jelzést.

A magyar árfigyelő a [Energy-Charts `/price` API](https://api.energy-charts.info/) HU másnapi piaci árait használja. Két egymást követő, teljes budapesti naptári nap idővel súlyozott EUR/MWh-átlagát hasonlítja, a 23/25 órás óraátállítási napokat is kezelve. Alapból legalább 20% és 10 EUR/MWh eltérés szükséges; nulla közeli alapnál az abszolút eltérés számít. Hiányos, null értékű, régi vagy más egységű adatot hibás/hiányos forrásként jelöl. Ez nem lakossági árváltozás. Adatfeltüntetés: Energy-Charts / Bundesnetzagentur · SMARD.de, CC BY 4.0; a szolgáltató aktuális licenc- és lekérési szabályai az API-oldalon találhatók.

Legfeljebb 12 szerkesztő által meghatározott ügy követhető. A címben/RSS-részletben az összes megadott 2–5 kulcsszónak egyeznie kell; nincs automatikus eseményösszevonás vagy AI-összefoglaló. A magyar és erdélyi források külön választhatók. Az adminban kikapcsolt forrásokat nem kéri le. A tisztán emoji címeket, idegen/nem HTTPS linkeket és 48 óránál régebbi cikkeket kizárja. Minden engedélyezett hírforrást lekér a friss szerkesztői olvasólistához: kiadónként legfeljebb négy cikket mutat, külön Erdély/Magyarország szűrővel. Ez nem fontossági rangsor és nem ügytalálat. A napi áramár külön is látható, akkor is, ha nem érte el a jelzési küszöböt. A lista és az ár a mentett állapotban is megmarad.

Az `api/editor-assistant.js` minden kérést admin kóddal véd. Az ügyek, küszöbök, első észlelések, jelzések és átnézési állapotok a GitHubban tárolt `settings.json` elkülönített `editorAssistant` mezőjébe mentődnek, a meglévő `GITHUB_TOKEN`/`GITHUB_PAT` kapcsolattal. Mentéskor a legújabb fájlt olvassa, csak ezt a mezőt módosítja, SHA-konfliktusnál újraolvassa. A normál admin mentése megőrzi ezt a mezőt; a publikus settings API nem küldi az olvasóknak. A GitHub-repozitórium láthatósága ettől nem változik. A jelzések nem kerülnek automatikusan a címlapra, és külső értesítést sem küld.

Az első sikeres ellenőrzés csendes alapállapot. Az új cikkek és érdemi módosulások külön jelzést kapnak, a frissült jelzés korábbi átnézése nem nyugtázza az új változatot. Sikertelen források korábbi eredményei legfeljebb három napig maradnak láthatók; a forráshiba látható. Új alapállapotot nem állít fel egy hiányzó hírforrás alapján.

Ez a kipróbálható első változat **kézi ellenőrzéssel**, illetve a megnyitott, látható segédben választható ötperces frissítéssel működik. A lap bezárása után nincs figyelés. Öt percnél frissebb ellenőrzést új lekérés helyett visszaad. Változatlan jelzésnél/forrásállapotnál pusztán az ellenőrzési időpont miatt nem készít commitot; az aktuális időt a megnyitott segéd mutatja, újranyitáskor a legutóbbi tartósan mentett állapot érkezik. Az érdemi GitHub mentés commitot készít, ezért a repóra kötött Vercel telepítést kiválthatja. Folyamatos, böngészőtől független működéshez külön ütemezett gyűjtő és adatbázis szükséges; ez itt nem lett beállítva. Mentési kapcsolat nélkül a lekérés jelölt próbaváltozat, nem tartós központi nyilvántartás.

Új ellenőrzés: `node --test tests/editor-assistant.test.cjs`. A tesztek helyettesített hálózatot használnak; az éles szolgáltatásokat és GitHubot nem módosítják.

Külön UI-próba: `node scripts/editor-assistant-preview.cjs 4214`, majd `http://127.0.0.1:4214/szerkesztoi-seged.html?fixture=editor`. Kód: `local-test-only`. A kiemelt tesztjelöléssel megnyitott előnézet valamennyi lekérést és mentést memóriában helyettesíti, a földrengés/hír/áradat kitalált. A `/__next` helyi próbaútvonal egy frissült rengést és új forráscikket ad; az éles API-ban ilyen útvonal nincs.

Valódi forrásokat olvasó helyi előnézet: `node scripts/editor-assistant-preview.cjs 4216 --live`, majd `http://127.0.0.1:4216/szerkesztoi-seged.html?fixture=live`. A helyi előnézet automatikusan belép és ellenőriz, a hírek és árak valódiak. A szerkesztői mentések kizárólag a helyi folyamat memóriájába kerülnek, újraindításkor elvesznek; GitHubra vagy az éles oldalra nem ír. A helyi próbakódot csak a kizárólag loopbacken figyelő előnézeti szerver adja át a `/__preview` útvonalon, amely az éles API-nak nem része. Az éles segédben adminbelépés után automatikusan indul az első ellenőrzés, nincs nyilvános automatikus bejelentkezés.

## Alapellenőrzések

Futtatás a repó gyökeréből, Node.js használatával:

```text
node tests/home-runtime.test.cjs
node tests/api-loading.test.cjs
node tests/story-reader.test.cjs
```

A tesztek ellenőrzik a válasz törzsének elakadását, a régi/hibás hírkészlet elutasítását, a források megőrzését és kikapcsolását, a beállítások előtti kirajzolás tilalmát, a párhuzamos kézi frissítések összevonását, a renderelési hibaállapotot, a régi klasszikus kompatibilitását, az RSS-engedélyezési listát és a tartós admin mentés utáni visszaolvasást. Az API-tesztek helyettesített hálózatot használnak, nem írnak az éles GitHub-repozitóriumba.

A történet- és olvasótesztek külön ellenőrzik a tényleges frissülést, a hamis jelzések elkerülését, a szerkesztett összefoglaló megfelelő társítását, a kiválasztott cikk címének megőrzését és a látható eredeti forrásokat. A történetcsoportosítás és a Nap témája rangsorolásának pontossága, valamint az érdemi forráskülönbségek elemzése külön fejlesztési terület.
