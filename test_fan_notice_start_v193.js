const fs=require('fs');
const g=fs.readFileSync('generator.js','utf8');
let pass=0, fail=0;
function test(name,ok){ if(ok){console.log('PASS',name);pass++;}else{console.error('FAIL',name);fail++;}}
test('fan notice/music initialization runs at startup', /initialisiereFanHinweisUndMusik\(\);\s*aktualisiereStatus\(\);\s*ziehen\(\);/.test(g));
const show=(g.match(/function zeigeSeite\(name\)\{([\s\S]*?)\n\}/)||[])[1]||'';
test('page navigation does not reinitialize fan notice listeners', !show.includes('initialisiereFanHinweisUndMusik()'));
test('accept click confirms, hides notice, unlocks body and starts music', /accept\?\.addEventListener\('click',[\s\S]*?fanHinweisBestaetigt=true;[\s\S]*?notice\.hidden=true;[\s\S]*?classList\.remove\('fan-notice-open'\);[\s\S]*?starteHintergrundmusik\(\)/.test(g));
console.log(`${pass} PASS / ${fail} FAIL`); process.exit(fail?1:0);
