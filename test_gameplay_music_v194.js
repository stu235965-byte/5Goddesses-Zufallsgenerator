const fs=require('fs');
let pass=0,fail=0;
function test(name,ok){if(ok){console.log('PASS '+name);pass++;}else{console.error('FAIL '+name);fail++;}}
const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('generator.js','utf8');
const bf=fs.readFileSync('battlefield.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('separate looping gameplay audio exists', /<audio[^>]+id="gameplayMusic"[^>]+5goddesses-gameplay\.mp3[^>]+loop/.test(html) && fs.existsSync('5goddesses-gameplay.mp3'));
test('gameplay music is quieter than menu music', js.includes('const MENU_MUSIC_VOLUME=0.25') && js.includes('const GAMEPLAY_MUSIC_VOLUME=0.15'));
test('opening test battle setup does not immediately switch music', js.includes("if(name==='game')") && js.includes("if(shell && !shell.hidden)starteGameplayMusik();") && js.includes('else{\n      gameplayMusikModus=false;'));
test('new battle starts gameplay music after battlefield render', /render\('Gefecht gestartet[^\n]+\);\n\s*\/\/[^\n]*\n\s*window\.starteGameplayMusik\?\.\(\);/.test(bf));
test('resume starts gameplay music after battlefield render', /render\('Gespeichertes Gefecht fortgesetzt\.'\);\n\s*\/\/[^\n]*\n\s*window\.starteGameplayMusik\?\.\(\);/.test(bf));
test('return to setup restores menu music', bf.includes('window.beendeGameplayMusikUndStarteMenue?.();'));
test('single preference toggle controls current music mode', js.includes('if(gameplayMusikModus)starteGameplayMusik();') && js.includes('else starteHintergrundmusik();') && js.includes('stoppeAlleMusik(false);'));
test('gameplay audio is cached offline', sw.includes("5goddesses-pwa-v105") && sw.includes('./5goddesses-gameplay.mp3'));
test('future modes have shared gameplay hook prepared', js.includes('window.starteGameplayMusik=starteGameplayMusik') && js.includes('Tutorial und Storymode'));
console.log(`RESULT ${pass} PASS / ${fail} FAIL`);
process.exitCode=fail?1:0;
