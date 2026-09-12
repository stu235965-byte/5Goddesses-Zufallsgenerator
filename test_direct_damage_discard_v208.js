global.window=global;
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
require('./5goddesses-datenbank.js');
require('./game-engine.js');
const E=global.G5Engine, DB=global.GODDESSES_DB.karten;
let pass=0,fail=0;
function ok(cond,msg){if(cond){pass++;console.log('PASS',msg)}else{fail++;console.error('FAIL',msg)}}
function card(name,stage=null){return DB.find(c=>c.name===name&&(stage===null||Number(c.stufe||1)===stage));}
function rt(c,owner=0){return {bild:c.bild,owner,stufe:Number(c.stufe||1),hearts:Number(c.herzen||0),physical:Number(c.physische_staerke||0),astral:Number(c.astrale_staerke||0),physicalShield:Number(c.physischer_schild||0),astralShield:Number(c.astraler_schild||0),honor:0,ready:true,faceDown:false,effectState:{},developmentStack:[c.bild],wonderCostCurrent:Number(c.wunder?.kosten_ehre??0),enteredTurn:0,attackedTurn:null,developedTurn:null,wonderTurn:null};}
function player(i){return {index:i,name:'P'+i,turnCount:2,honorGrantedTurn:null,hand:[],bezSlots:[null,null],equipment:[{weapon:null,shield:null,armor:null,helmet:null},{weapon:null,shield:null,armor:null,helmet:null}],azr:[null,null,null],primary:null,refuge:null,discard:[],stacks:{bezwingerinnen:[],astral:[],ruestkammer:[]},development:[]};}
function state(){return {version:2,players:[player(0),player(1)],activePlayer:0,startingPlayer:0,phaseIndex:4,sharedSecondary:null,voidZone:[],log:[],attack:null,roundSerial:10,pendingBezEffect:null,pendingDamage:null,pendingWonderDraw:null,pendingEquipment:null,pendingFieldCard:null,winner:null,firstTurn:false};}
function castFireball(s,target){const fire=card('ASTRAL-Feuerball');s.players[0].azr[0]=rt(fire,0);let r=E.startInstantAstralSpell(s,0,0);ok(r.ok&&r.pending,'ASTRAL-Feuerball startet');r=E.resolveNewAstralSpellTarget(s,String(target));return r;}
const targetCard=DB.find(c=>c.hauptattribut==='BEZWINGERIN'&&Number(c.stufe||1)===1&&Number(c.astraler_schild||0)===0);

{
 const s=state(),t=rt(targetCard,1);t.hearts=1;t.astralShield=0;t.physicalShield=0;s.players[1].bezSlots[0]=t;
 const r=castFireball(s,0);
 ok(r.ok,'tödlicher Feuerball wird aufgelöst');
 ok(s.players[1].bezSlots[0]===null,'Bezwingerin mit 0 Herzen wird sofort vom Feld entfernt');
 ok(s.players[1].discard.includes(targetCard.bild),'zerstörte Bezwingerin liegt sofort auf der Ablage');
}
{
 const s=state(),t=rt(targetCard,1);t.hearts=2;t.astralShield=0;t.physicalShield=0;s.players[1].bezSlots[0]=t;
 const r=castFireball(s,0);
 ok(r.ok,'nichttödlicher Feuerball wird aufgelöst');
 ok(s.players[1].bezSlots[0]===t&&t.hearts===1,'nichttödlicher Schaden lässt Ziel mit 1 Herz liegen');
 ok(!s.players[1].discard.includes(targetCard.bild),'nicht zerstörtes Ziel wird nicht abgelegt');
}
{
 const s=state(),t=rt(targetCard,1);t.hearts=1;t.astralShield=1;t.physicalShield=0;s.players[1].bezSlots[0]=t;
 let r=castFireball(s,0);
 ok(r.ok&&r.needsShieldChoice,'ASTRAL-Schild wird vor Herzen angeboten');
 const ch=E.currentShieldChoice(s); const src=ch?.sources?.[0];
 r=E.chooseShieldSource(s,src.source,src.kind);
 ok(r.ok,'Schildentscheidung wird aufgelöst');
 ok(s.players[1].bezSlots[0]===t&&t.hearts===1,'Schild verhindert tödlichen Herzschaden');
}
console.log(`v2.08 direkter Effektschaden: ${pass} PASS / ${fail} FAIL`);
process.exit(fail?1:0);
