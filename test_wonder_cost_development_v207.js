global.window=global;
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
require('./5goddesses-datenbank.js');
require('./game-engine.js');
const E=global.G5Engine, DB=global.GODDESSES_DB.karten;
let pass=0,fail=0;
function ok(cond,msg){if(!cond){fail++;console.error('FAIL',msg)}else pass++}
function cardByBild(b){return DB.find(c=>c.bild===b)}
function rt(c,owner=0){return {bild:c.bild,owner,stufe:Number(c.stufe||1),hearts:Number(c.herzen||0),physicalShield:Number(c.physischer_schild||0),astralShield:Number(c.astraler_schild||0),physical:Number(c.physische_staerke||0),astral:Number(c.astrale_staerke||0),honor:20,ready:true,enteredTurn:0,attackedTurn:null,developedTurn:null,wonderTurn:null,wonderCostCurrent:Number(c.wunder?.kosten_ehre??0),effectState:{},faceDown:false,developmentStack:[c.bild]};}
function baseState(stage1,stage2){const p0={index:0,name:'P0',turnCount:1,hand:[],bezSlots:[rt(stage1),null],equipment:[{weapon:null,shield:null,armor:null,helmet:null},{weapon:null,shield:null,armor:null,helmet:null}],azr:[null,null,null],primary:null,refuge:null,discard:[],stacks:{bezwingerinnen:[],astral:[],ruestkammer:[]},development:[stage2.bild]};const p1={index:1,name:'P1',turnCount:1,hand:[],bezSlots:[null,null],equipment:[{weapon:null,shield:null,armor:null,helmet:null},{weapon:null,shield:null,armor:null,helmet:null}],azr:[null,null,null],primary:null,refuge:null,discard:[],stacks:{bezwingerinnen:[],astral:[],ruestkammer:[]},development:[]};return {version:2,players:[p0,p1],activePlayer:0,phaseIndex:4,roundSerial:1,sharedSecondary:null,attack:null,pendingEquipment:null,pendingFieldCard:null,pendingDamage:null,pendingWonderDraw:null,pendingRefugeStage2Choice:null,pendingBezEffect:null,instinctWindowPassed:null,fragmentRewardQueue:[],log:[]};}
const stage2s=DB.filter(c=>c.hauptattribut==='BEZWINGERIN'&&Number(c.stufe)===2);
const aufstieg=DB.find(c=>c.name==='Aufstieg'&&c.deck_bereich==='astral');
for(const d of stage2s){
  const s1=cardByBild(d.grundkarte_bild); const expected=Number(d.wunder?.kosten_ehre??0);
  ok(!!s1,`${d.name}: Stufe 1 gefunden`);
  // Normal development; poison stale cost intentionally.
  let s=baseState(s1,d); s.players[0].bezSlots[0].wonderCostCurrent=99; s.players[0].bezSlots[0].effectState.zeitloseUnterwerfung={roundSerial:1,appliedReduction:2};
  let r=E.develop(s,'bez',0);
  ok(r.ok,`${d.name}: normale Entwicklung klappt (${r.msg||''})`);
  ok(s.players[0].bezSlots[0].wonderCostCurrent===expected,`${d.name}: normale Entwicklung Kosten ${expected}, ist ${s.players[0].bezSlots[0].wonderCostCurrent}`);
  ok(!s.players[0].bezSlots[0].effectState.zeitloseUnterwerfung,`${d.name}: alter temporärer Wunder-Rabatt entfernt`);
  // Aufstieg path.
  s=baseState(s1,d); s.players[0].bezSlots[0].wonderCostCurrent=77; s.players[0].bezSlots[0].effectState.zeitloseUnterwerfung={roundSerial:1,appliedReduction:1};
  s.players[0].azr[0]=rt(aufstieg,0); s.players[0].azr[0].honor=0;
  r=E.startInstantAstralSpell(s,0,0); ok(r.ok&&r.pending,`${d.name}: Aufstieg startet`);
  r=E.resolveNewAstralSpellTarget(s,'0'); ok(r.ok,`${d.name}: Aufstieg entwickelt (${r.msg||''})`);
  ok(s.players[0].bezSlots[0].wonderCostCurrent===expected,`${d.name}: Aufstieg Kosten ${expected}, ist ${s.players[0].bezSlots[0].wonderCostCurrent}`);
  ok(!s.players[0].bezSlots[0].effectState.zeitloseUnterwerfung,`${d.name}: Aufstieg entfernt alten temporären Rabatt`);
}
console.log(`v2.07 Wunderkosten-Entwicklung: ${pass} PASS / ${fail} FAIL`);
process.exit(fail?1:0);
