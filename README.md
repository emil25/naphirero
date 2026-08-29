# NapHíre.ro

Statikus, reszponzív hírportál Vercel szerveroldali RSS-közvetítővel.

## Telepítés Vercelre

1. A projekt **Root Directory** beállítása legyen `naphire`.
2. Framework Preset: **Other**.
3. Build Command és Output Directory nem szükséges.
4. Telepítés után a `/rss?url=...` útvonalat a `vercel.json` az `/api/rss` függvényre irányítja.

Az RSS-végpont kizárólag az `api/rss.js` engedélyezési listájában szereplő híroldalakat éri el, legfeljebb 2 MB-os választ fogad, és ötperces CDN-gyorsítótárat használ.

## Szerkesztőségi beállítások

Az `admin.html` a `settings.json` fájlt állítja elő. A letöltött fájlt az `index.html` mellé kell feltölteni. A jelenleg nem működő RSS-csatornák a `forrasokKi` listában kikapcsolhatók anélkül, hogy a forrásdefiníciójuk elveszne.

## Fontos fájlok

- `index.html` – a portál felülete és hírmegjelenítése
- `api/rss.js` – biztonságos RSS-közvetítő és gyorsítótár
- `settings.json` – szerkesztőségi kiemelések, bannerek és aktív források
- `vercel.json` – útvonalak és biztonsági fejlécek
- `admin.html` – a szerkesztőségi beállítások kezelőfelülete

