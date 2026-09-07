const fs=require('fs');let p=0,f=0;const t=(n,c)=>{if(c){p++;console.log('PASS',n)}else{f++;console.log('FAIL',n)}};
const sw=fs.readFileSync('service-worker.js','utf8'),bf=fs.readFileSync('battlefield.js','utf8'),ge=fs.readFileSync('game-engine.js','utf8');
t('Cache v112',sw.includes("5goddesses-pwa-v112"));
t('Story assets cached',sw.includes('./story-mode.js')&&sw.includes('./story-weltkarte.png'));
t('Battlefield build 2.01',bf.includes("G5_BATTLEFIELD_BUILD='2.01'"));
t('Developed Bez recognition',ge.includes("c?.hauptattribut==='BEZWINGERIN'"));
console.log(`${p} PASS / ${f} FAIL`);if(f)process.exit(1);
