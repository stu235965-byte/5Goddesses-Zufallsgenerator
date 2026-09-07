const fs=require('fs');
let pass=0,fail=0;
function test(name,ok){if(ok){console.log('PASS '+name);pass++;}else{console.error('FAIL '+name);fail++;}}
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('style.css','utf8');
const js=fs.readFileSync('generator.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('fanmade notice is present on every document load',html.includes('id="fanNotice"') && html.includes('Fanmade-Projekt') && html.includes('Brombeerbart'));
test('rights notice names the respective creators and rights holders',html.includes('jeweiligen Urhebern und Rechteinhabern'));
test('notice has explicit continue button',html.includes('id="fanNoticeAccept"') && html.includes('Verstanden &amp; weiterspielen'));
test('background music asset is embedded as looping audio',/<audio[^>]+id="backgroundMusic"[^>]+5goddesses-intro\.mp3[^>]+loop/.test(html) && fs.existsSync('5goddesses-intro.mp3'));
test('music starts only after fan notice confirmation',js.includes('fanHinweisBestaetigt=true') && js.includes("accept?.addEventListener('click'") && js.includes('starteHintergrundmusik();'));
test('menu music persists through menu pages and test-battle setup',js.includes("return ['home','generator','profil','decks'].includes(name);") && js.includes("aktuelleSeite!=='game'") && js.includes('if(shell && !shell.hidden)starteGameplayMusik();'));
test('music preference toggle is persisted',html.includes('id="musicToggle"') && js.includes("const MUSIC_PREF_KEY='5goddesses_musik_aktiv_v1'") && js.includes('localStorage.setItem(MUSIC_PREF_KEY'));
test('music is available offline through service worker',sw.includes("5goddesses-pwa-v105") && sw.includes('./5goddesses-intro.mp3'));
console.log(`RESULT ${pass} PASS / ${fail} FAIL`);
process.exitCode=fail?1:0;
