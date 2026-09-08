const fs=require('fs'),vm=require('vm'),path=require('path');
global.window=global;global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const root=__dirname;
for(const f of ['5goddesses-datenbank.js','game-engine.js','ai-player.js']) vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f});
const E=global.G5Engine,AI=global.G5AI,D=global.GODDESSES_DB.karten;let pass=0,fail=0;
function t(n,f){try{f();console.log('PASS',n);pass++}catch(e){console.error('FAIL',n,e.message);fail++;}}
function ok(x,m){if(!x)throw Error(m||'assert');}
function cardByName(n){const c=D.find(x=>x.name===n);if(!c)throw Error('Karte fehlt: '+n);return c;}
function rt(c,owner=1,fd=false){return{bild:c.bild,owner,stufe:c.stufe||1,hearts:c.herzen??2,physicalShield:c.physischer_schild??0,astralShield:c.astraler_schild??0,physical:c.physische_staerke??0,astral:c.astrale_staerke??0,honor:c.ehre??0,ready:true,enteredTurn:0,attackedTurn:null,developedTurn:null,wonderTurn:null,wonderCostCurrent:Number(c.wunder?.kosten_ehre||0),effectUsesRemaining:c.effekt_zaehler_max??null,effectRoundsRemaining:c.effekt_dauer_kr??null,effectUsedTurn:null,effectState:{},faceDown:fd,developmentStack:[c.bild]}}
function P(i){return{index:i,name:i?'KI-Gegner':'Spieler',turnCount:1,hand:[],bezSlots:[null,null],equipment:[{weapon:null,shield:null,armor:null,helmet:null},{weapon:null,shield:null,armor:null,helmet:null}],azr:[null,null,null],primary:null,refuge:null,discard:[],stacks:{bezwingerinnen:[],astral:[],ruestkammer:[]},development:[],recruitedThisTurn:false,drawDone:false}}
function S(){return{version:2,players:[P(0),P(1)],activePlayer:1,phaseIndex:4,roundSerial:4,sharedSecondary:null,azrLocks:[],log:[],pendingEquipment:null,pendingFieldCard:null,pendingWonderDraw:null,pendingRefugeStage2Choice:null,pendingBezEffect:null,pendingDamage:null,attack:null,winner:null,instinctWindowPassed:null,firstTurn:false}}
const bez=D.find(c=>c.hauptattribut==='BEZWINGERIN'&&c.deck_bereich==='bezwingerinnen');
const helmets=D.filter(c=>c.deck_bereich==='ruestkammer'&&E.equipmentKind(c)==='helmet');
if(helmets.length<2)throw Error('Für den Test werden zwei verschiedene Helme benötigt.');
const oldHelmet=helmets[0],newHelmet=helmets[1];
t('Vorbedingung: zwei verschiedene Helm-Karten vorhanden',()=>{ok(oldHelmet.bild!==newHelmet.bild);});
t('KI ersetzt bei pendingEquipment eine bereits belegte Ausrüstungsposition',()=>{
  const s=S(),p=s.players[1];
  p.bezSlots[0]=rt(bez,1);p.bezSlots[1]=rt(bez,1);
  p.equipment[0].helmet=rt(oldHelmet,1);p.equipment[1].helmet=rt(oldHelmet,1);
  p.azr[0]=rt(newHelmet,1,false);
  s.pendingEquipment={owner:1,azrSlot:0,kind:'helmet'};
  const before=p.discard.length;
  const r=AI.resolvePending(s);
  ok(r?.ok,'KI hat die offene Ausrüstung nicht angelegt');
  ok(s.pendingEquipment===null,'pendingEquipment blieb aktiv');
  ok(p.azr[0]===null,'AZR-Slot wurde nicht geleert');
  ok([p.equipment[0].helmet,p.equipment[1].helmet].some(x=>x?.bild===newHelmet.bild),'neuer Helm fehlt');
  ok(p.discard.length===before+1,'ersetzter Helm wurde nicht abgelegt');
  ok(p.discard.includes(oldHelmet.bild),'alter Helm liegt nicht im Ablagestapel');
});
t('KI bleibt nicht mehr im unsupported/pendingEquipment-Wartezustand hängen',()=>{
  const s=S(),p=s.players[1];
  p.bezSlots[0]=rt(bez,1);p.bezSlots[1]=rt(bez,1);
  p.equipment[0].helmet=rt(oldHelmet,1);p.equipment[1].helmet=rt(oldHelmet,1);
  p.azr[1]=rt(newHelmet,1,false);s.pendingEquipment={owner:1,azrSlot:1,kind:'helmet'};
  const r=AI.step(s);
  ok(r.acted===true,'AI.step meldet keine Aktion');
  ok(s.pendingEquipment===null,'AI.step ließ pendingEquipment offen');
});
t('Versionsmarker v2.06 / Cache v117 gesetzt',()=>{
  const idx=fs.readFileSync(path.join(root,'index.html'),'utf8'),bf=fs.readFileSync(path.join(root,'battlefield.js'),'utf8'),sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
  ok(idx.includes('v2.06'),'index nicht v2.06');ok(bf.includes("G5_BATTLEFIELD_BUILD='2.06'"),'Battlefield nicht 2.06');ok(sw.includes("5goddesses-pwa-v117"),'Cache nicht v117');
});
console.log(`RESULT ${pass} PASS / ${fail} FAIL`);if(fail)process.exit(1);
