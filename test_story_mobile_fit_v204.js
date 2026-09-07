const fs=require('fs');
const b=fs.readFileSync('battlefield.js','utf8');
const i=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
let pass=0,fail=0;
function t(name,ok){console.log((ok?'PASS ':'FAIL ')+name); ok?pass++:fail++;}
const boss=b.match(/startBoss\([\s\S]*?return state;\n\s*}/)?.[0]||'';
const enc=b.match(/startEncounter=function[\s\S]*?return state;\n};/)?.[0]||'';
t('Boss story start performs delayed mobile refit', /setTimeout\(\(\)=>\{[\s\S]*resetMobileBattlefieldFit\(\);[\s\S]*scheduleMobileBattlefieldFit\(\);[\s\S]*},250\)/.test(boss));
t('Encounter story start performs delayed mobile refit', /setTimeout\(\(\)=>\{[\s\S]*resetMobileBattlefieldFit\(\);[\s\S]*scheduleMobileBattlefieldFit\(\);[\s\S]*},250\)/.test(enc));
t('Story starts still use normal AI scheduler', /scheduleAI\(\)/.test(boss) && /scheduleAI\(\)/.test(enc));
t('Battlefield build 2.04', /G5_BATTLEFIELD_BUILD='2\.04'/.test(b));
t('App version v2.04', />v2\.04</.test(i));
t('Service worker cache v115', /5goddesses-pwa-v115/.test(sw));
console.log(`TOTAL ${pass} PASS / ${fail} FAIL`); process.exit(fail?1:0);
