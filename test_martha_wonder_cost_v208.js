global.window=global;
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
require('./5goddesses-datenbank.js');
require('./game-engine.js');
const E=global.G5Engine, DB=global.GODDESSES_DB.karten;
let pass=0,fail=0;function ok(cond,msg){if(cond){pass++;console.log('PASS',msg)}else{fail++;console.error('FAIL',msg)}}
function rt(c,owner=0){return {bild:c.bild,owner,stufe:Number(c.stufe||1),hearts:Number(c.herzen||0),physicalShield:Number(c.physischer_schild||0),astralShield:Number(c.astraler_schild||0),physical:Number(c.physische_staerke||0),astral:Number(c.astrale_staerke||0),honor:10,ready:true,enteredTurn:0,attackedTurn:null,developedTurn:null,wonderTurn:null,wonderCostCurrent:Number(c.wunder?.kosten_ehre??0),effectState:{},faceDown:false,developmentStack:[c.bild]};}
function baseState(s1,s2){const eq=()=>({weapon:null,shield:null,armor:null,helmet:null});const p0={index:0,name:'P0',turnCount:1,hand:[],bezSlots:[rt(s1),null],equipment:[eq(),eq()],azr:[null,null,null],primary:null,refuge:null,discard:[],stacks:{bezwingerinnen:[],astral:[],ruestkammer:[]},development:[s2.bild]};const p1={index:1,name:'P1',turnCount:1,hand:[],bezSlots:[null,null],equipment:[eq(),eq()],azr:[null,null,null],primary:null,refuge:null,discard:[],stacks:{bezwingerinnen:[],astral:[],ruestkammer:[]},development:[]};return {version:2,players:[p0,p1],activePlayer:0,phaseIndex:4,roundSerial:1,sharedSecondary:null,attack:null,pendingEquipment:null,pendingFieldCard:null,pendingDamage:null,pendingWonderDraw:null,pendingRefugeStage2Choice:null,pendingBezEffect:null,instinctWindowPassed:null,fragmentRewardQueue:[],log:[]};}
const stage2s=DB.filter(c=>c.hauptattribut==='BEZWINGERIN'&&Number(c.stufe)===2);
for(const d of stage2s){const s1=DB.find(c=>c.bild===d.grundkarte_bild);const s=baseState(s1,d);s.players[0].bezSlots[0].wonderCostCurrent=99;const r=E.develop(s,'bez',0);const expected=Number(d.wunder?.kosten_ehre??0);ok(r.ok,`${d.name}: Entwicklung erfolgreich`);ok(s.players[0].bezSlots[0].wonderCostCurrent===expected,`${d.name}: Stufe-2-Wunderkosten = ${expected}`);}
const m2=stage2s.find(c=>c.name==='Die glorreiche Eroberin Martha Kaizer');const m1=DB.find(c=>c.bild===m2.grundkarte_bild);
{
 const s=baseState(m1,m2);s.players[0].bezSlots[0].honor=5;let r=E.develop(s,'bez',0);ok(r.ok,'Martha: Entwicklung auf Stufe 2 erfolgreich');const martha=s.players[0].bezSlots[0];ok(martha.honor===3,'Martha bezahlt 2 Ehre für die Entwicklung und hat danach 3');ok(martha.wonderCostCurrent===3,'Martha Stufe 2 speichert 3 Ehre Wunderkosten');r=E.activateBezEffect(s,0);ok(r.ok,'Martha kann Wunder mit 3 Ehre aktivieren');ok(martha.honor===0,'Marthas Wunder zieht tatsächlich 3 Ehre ab');ok(martha.effectState.physicalImmune===true,'Marthas physische Immunität wird aktiviert');
}
{
 const s=baseState(m1,m2);s.players[0].bezSlots[0].honor=4;let r=E.develop(s,'bez',0);ok(r.ok,'Martha: zweite Entwicklung für Negativtest erfolgreich');const martha=s.players[0].bezSlots[0];ok(martha.honor===2,'Martha hat nach Entwicklung nur noch 2 Ehre');r=E.activateBezEffect(s,0);ok(!r.ok,'Marthas Wunder ist mit nur 2 Ehre gesperrt');ok(martha.honor===2,'bei gesperrtem Wunder wird keine Ehre verändert');
}
console.log(`v2.08 Stufe-2-Wunderkosten: ${pass} PASS / ${fail} FAIL`);process.exit(fail?1:0);
