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
