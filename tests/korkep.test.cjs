const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const config = JSON.parse(fs.readFileSync(require.resolve('../vercel.json'), 'utf8'));
const html = fs.readFileSync(require.resolve('../classic-editorial-previous.html'), 'utf8');
const korkepHtml = fs.readFileSync(require.resolve('../korkep.html'), 'utf8');
const css = fs.readFileSync(require.resolve('../korkep.css'), 'utf8');
const js = fs.readFileSync(require.resolve('../korkep.js'), 'utf8');
const app = fs.readFileSync(require.resolve('../korkep-app.js'), 'utf8');
const editorial = fs.readFileSync(require.resolve('../classic-editorial-previous.js'), 'utf8');

test('Körkép külön útvonalon nyílik, a klasszikus marad a címlap alapértelmezése', () => {
  assert.ok(config.rewrites.some(route => route.source === '/korkep' && route.destination === '/korkep.html'));
  assert.ok(config.rewrites.some(route => route.source === '/klasszikus' && route.destination === '/classic-editorial-previous.html'));
  assert.ok(config.redirects.some(route => route.source === '/' && route.destination === '/klasszikus'));
});

test('Körkép külön HTML-oldalt használ, a klasszikus címlap megmarad', () => {
  assert.match(korkepHtml, /<html lang="hu" class="nh-korkep nh-booting">/);
  assert.match(korkepHtml, /korkep-app\.js/);
  assert.match(html, /classic-editorial-base\.css/);
  assert.equal((korkepHtml.match(/<style\b/g) || []).length, 0);
  assert.equal((html.match(/<style\b/g) || []).length, 0);
});

test('Körkép a közös híradatot használja, nem indít külön forrásletöltést', () => {
  assert.match(html, /href="\/korkep"[^>]*>Körkép</);
  assert.match(korkepHtml, /korkep\.css/);
  assert.match(korkepHtml, /korkep\.js/);
  assert.match(js, /location\.pathname[^;]*=== '\/korkep'/);
  assert.doesNotMatch(js, /fetch\s*\(/);
});

test('Körképből kikerültek a régi magazin- és VB-sáv maradványai', () => {
  assert.doesNotMatch(korkepHtml + app, /Nőileg|Székely Konyha|video-sav|VB 2026|vbPanelFrissit|Kísérleti editorial/);
  assert.match(app, /function szekcioHTML\(\)\{ return ""; \}/);
  assert.match(editorial, /const isKorkep=location\.pathname\.replace/);
  assert.match(editorial, /if\(!isKorkep\)culture\.insertAdjacentHTML/);
  assert.match(editorial, /if\(!isKorkep\)fetch\('magazine-selection\.json'/);
});

test('Körkép saját, mobilra igazodó, világos editorial elrendezést kap', () => {
  assert.match(css, /html\.nh-korkep body/);
  assert.match(css, /\.nh-daily-river/);
  assert.match(css, /\.nh-trending-host/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /header\.fo \.logo \.brand-name\{color:#173d45!important\}/);
  assert.match(css, /@media\(max-width:700px\)\{\s*html\.nh-korkep \.korkep-masthead-in\{align-items:flex-start;flex-direction:column/);
  assert.match(css, /\[hidden\]\{display:none!important\}/);
});

test('Körkép rövid, hírekre fókuszáló nyitást és erősebb színkontrasztot használ', () => {
  assert.match(js, /mastheadTitle\.textContent = 'Mai hírek'/);
  assert.match(js, /themeTitle/);
  assert.match(css, /\.korkep-masthead\{background:#f07861;padding-inline:clamp\(16px,4vw,48px\)\}/);
  assert.match(css, /main\{max-width:none;padding:0 clamp\(16px,4vw,48px\) 56px;background:#fff\}/);
});

test('A Körkép külön sorrendben rendezi a napi válogatást és a többforrásos trendeket', () => {
  assert.match(js, /insertBefore\(dailySection, featureGrid\)/);
  assert.match(js, /anchor\.insertAdjacentElement\('afterend', latest\)/);
  assert.match(css, /\.rd-erdely \.rd-transylvania-top/);
  assert.match(css, /\.rd-magyarorszag \.rd-hungary-feature/);
  assert.match(css, /\.rd-gazdasag \.rd-money-layout/);
  assert.match(css, /\.rd-sport \.rd-sport-layout/);
  assert.match(css, /\.rd-kultura \.rd-culture-layout/);
  assert.match(css, /clip-path:polygon/);
  assert.match(css, /\.nh-trending-host\{background:#173f49!important/);
  assert.match(css, /\.ro-press-river\{display:grid!important;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
});
