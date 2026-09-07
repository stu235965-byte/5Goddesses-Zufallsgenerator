const fs=require('fs');
let pass=0,fail=0;
function test(name,ok){if(ok){console.log('PASS '+name);pass++;}else{console.error('FAIL '+name);fail++;}}
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('style.css','utf8');
const js=fs.readFileSync('generator.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
test('start screen loads with menu background enabled',/<body class="menu-background">/.test(html));
test('background is limited to home, generator, pool and deckbuilder pages',/\['home','generator','profil','decks'\]\.includes\(name\)/.test(js) && !/\['home','generator','profil','decks','game'\]/.test(js));
test('supplied background asset is styled and precached',css.includes('start-hintergrund.png') && sw.includes('./start-hintergrund.png') && fs.existsSync('start-hintergrund.png'));
console.log(`RESULT ${pass} PASS / ${fail} FAIL`);
process.exitCode=fail?1:0;
