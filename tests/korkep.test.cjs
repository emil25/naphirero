const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const config = JSON.parse(fs.readFileSync(require.resolve('../vercel.json'), 'utf8'));
const html = fs.readFileSync(require.resolve('../classic-editorial-previous.html'), 'utf8');
const css = fs.readFileSync(require.resolve('../korkep.css'), 'utf8');
const js = fs.readFileSync(require.resolve('../korkep.js'), 'utf8');

test('Körkép külön útvonalon nyílik, a klasszikus marad a címlap alapértelmezése', () => {
  assert.ok(config.rewrites.some(route => route.source === '/korkep' && route.destination === '/classic-editorial-previous.html'));
  assert.ok(config.rewrites.some(route => route.source === '/klasszikus' && route.destination === '/classic-editorial-previous.html'));
  assert.ok(config.redirects.some(route => route.source === '/' && route.destination === '/klasszikus'));
});

test('Körkép a közös híradatot használja, nem indít külön forrásletöltést', () => {
  assert.match(html, /href="\/korkep"[^>]*>Körkép</);
  assert.match(html, /korkep\.css/);
  assert.match(html, /korkep\.js/);
  assert.match(js, /location\.pathname[^;]*=== '\/korkep'/);
  assert.doesNotMatch(js, /fetch\s*\(/);
});

test('Körkép saját, mobilra igazodó, világos editorial elrendezést kap', () => {
  assert.match(css, /html\.nh-korkep body/);
  assert.match(css, /\.nh-daily-river/);
  assert.match(css, /\.nh-trending-host/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /\[hidden\]\{display:none!important\}/);
});

test('Körkép rövid, hírekre fókuszáló nyitást és erősebb színkontrasztot használ', () => {
  assert.match(js, /mastheadTitle\.textContent = 'Mai hírek'/);
  assert.match(js, /themeTitle/);
  assert.match(css, /\.korkep-masthead\{padding:0 clamp\(16px,4vw,48px\);background:#17645f\}/);
  assert.match(css, /main\{padding-top:17px;background:#fff\}/);
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
