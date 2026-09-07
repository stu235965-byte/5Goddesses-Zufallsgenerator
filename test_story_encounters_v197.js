const fs=require('fs'),vm=require('vm');let c={window:{},structuredClone:global.structuredClone};vm.createContext(c);
vm.runInContext(fs.readFileSync('5goddesses-datenbank.js','utf8'),c);vm.runInContext(fs.readFileSync('story-encounter-decks.js','utf8'),c);
const S=c.window.G5STORY_ENCOUNTER_DECKS, K=c.window.GODDESSES_DB.karten, bosses=new Set(['Q.U.E.E.N.','Die brillante Magistratin Strikelyn','Stahlherz des Clans Skorpia Masako','Geißel der Galaxie Nemesis','Pharaonin der Zeit Thal Ziris','Die grausame Usurpatorin Baronesse Effrayer']);
let pass=0,fail=0;function ok(x,m){if(x){pass++;console.log('PASS',m)}else{fail++;console.error('FAIL',m)}}
const all=S.sequence();ok(all.length===21,'21 Zwischengegner hinterlegt');
for(let a=1;a<=5;a++)ok(S.forAct(a).length===[4,4,5,4,4][a-1],`Akt ${a}: richtige Anzahl`);
for(const d of all){ok(d.karten.zuflucht.length===1&&d.karten.bezwingerinnen.length===3&&d.karten.astral.length===5&&d.karten.ruestkammer.length===5&&d.karten.entwicklung.length===5,`${d.storyEncounterId}: 1/3/5/5/5`);let names=d.karten.bezwingerinnen.map(b=>K.find(k=>k.bild===b)?.name);ok(!names.some(n=>bosses.has(n)),`${d.storyEncounterId}: kein Boss im Bezwingerinnenstapel`);let classes=d.karten.bezwingerinnen.map(b=>K.find(k=>k.bild===b)?.klasse);ok(new Set(classes).size===3,`${d.storyEncounterId}: Klassen eindeutig`)}
console.log(`TOTAL ${pass} PASS / ${fail} FAIL`);process.exit(fail?1:0);
