const fs=require('fs'),vm=require('vm');
const ctx={window:{},console,structuredClone};ctx.window.window=ctx.window;vm.createContext(ctx);
for(const f of ['5goddesses-datenbank.js','game-engine.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const E=ctx.window.G5Engine, db=ctx.window.GODDESSES_DB.karten;
let pass=0,fail=0;function t(n,c){if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n)}}
function img(name,area){const c=db.find(x=>x.name===name&&(!area||x.deck_bereich===area));if(!c)throw new Error(name);return c.bild}
const deck=ctx.window.G5Engine.decks()[0]; // only need shape? override with valid story deck not loaded unavailable
// Build minimal state manually for equip function.
const martha1=img('Die glorreiche Eroberin Martha Kaizer','bezwingerinnen');
const martha2=img('Die glorreiche Eroberin Martha Kaizer','entwicklung');
const helm=img('Glorreicher Helm Victores','ruestkammer');
const p={index:0,name:'Spieler',turnCount:2,hand:[helm],bezSlots:[{bild:martha2,owner:0,stufe:2,hearts:3,physicalShield:1,astralShield:1,physical:1,astral:0,ready:true,developmentStack:[martha1,martha2]},null],equipment:[{weapon:null,shield:null,armor:null,helmet:null},{weapon:null,shield:null,armor:null,helmet:null}],azr:[null,null,null],primary:null,refuge:null,discard:[],stacks:{bezwingerinnen:[],astral:[],ruestkammer:[]},development:[],recruitedThisTurn:false,drawDone:false};
const q={index:1,name:'KI',turnCount:1,hand:[],bezSlots:[null,null],equipment:[{weapon:null,shield:null,armor:null,helmet:null},{weapon:null,shield:null,armor:null,helmet:null}],azr:[null,null,null],primary:null,refuge:null,discard:[],stacks:{bezwingerinnen:[],astral:[],ruestkammer:[]},development:[],recruitedThisTurn:false,drawDone:false};
const s={players:[p,q],activePlayer:0,phaseIndex:4,roundSerial:2,sharedSecondary:null,azrLocks:[],log:[],pendingEquipment:null,pendingFieldCard:null,pendingWonderDraw:null,pendingRefugeStage2Choice:null,pendingBezEffect:null,pendingDamage:null,attack:null,winner:null,firstTurn:false};
t('Entwickelte Martha bleibt Bezwingerin',E.isBezwingerinRuntime(p.bezSlots[0])===true);
let r=E.equipFromHand(s,0,0,'helmet');
t('Glorreicher Helm kann an entwickelte Martha angelegt werden',r.ok===true);
t('Helm liegt danach korrekt im Helm-Slot',E.cardData(p.equipment[0].helmet)?.name==='Glorreicher Helm Victores');
t('Handkarte wird nach erfolgreichem Anlegen entfernt',p.hand.length===0);
console.log(`${pass} PASS / ${fail} FAIL`);if(fail)process.exit(1);
