global.window=global;global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};require('../5goddesses-datenbank.js');require('../game-engine.js');
const E=global.G5Engine, DB=global.GODDESSES_DB.karten, card=n=>DB.find(c=>c.name===n||c.name?.includes(n));let pass=0,fail=0;
function t(n,f){try{if(f()===false)throw Error('false');console.log('PASS',n);pass++}catch(e){console.log('FAIL',n,e.message);fail++}}
function rt(n,owner=0,faceDown=false){const c=card(n);return {bild:c.bild,owner,stufe:c.stufe||1,hearts:c.herzen||0,physical:c.physische_staerke||0,astral:c.astrale_staerke||0,physicalShield:c.physischer_schild||0,astralShield:c.astraler_schild||0,honor:0,ready:true,faceDown,effectState:{},developmentStack:[c.bild],wonderCostCurrent:Number(c.wunder?.kosten_ehre||0)}}
function S(){return {players:[0,1].map(i=>({index:i,name:'P'+i,turnCount:1,bezSlots:[null,null],equipment:[{weapon:null,shield:null,armor:null,helmet:null},{weapon:null,shield:null,armor:null,helmet:null}],azr:[null,null,null],hand:[],discard:[],development:[],stacks:{bezwingerinnen:[],astral:[],ruestkammer:[]},refuge:{honor:0},primary:null})),activePlayer:0,phaseIndex:4,roundSerial:7,sharedSecondary:null,firstTurn:false,startingPlayer:0,winner:null,log:[],azrLocks:[]}}

t('Begnadete Reflexe exposes own Bez target and resolves',()=>{const s=S();s.players[0].bezSlots[1]=rt('Saphira');s.players[0].azr[0]=rt('Begnadete Reflexe');let r=E.startInstantAstralSpell(s,0,0);if(!r.ok)return false;const ts=E.newAstralSpellTargets(s);if(ts.length!==1||ts[0].id!=='1')return false;r=E.resolveNewAstralSpellTarget(s,'1');return r.ok&&s.players[0].bezSlots[1].effectState.begnadeteReflexeRoundSerial===7&&!s.players[0].azr[0]});

t('Virus may only be played in secondary, not primary',()=>{const s=S();s.players[0].hand=[card('Wiederbelebungsapparatur Virus').bild];const bad=E.playFieldFromHand(s,0,'primary');if(bad.ok)return false;const good=E.playFieldFromHand(s,0,'secondary');return good.ok&&E.cardData(s.sharedSecondary)?.name==='Wiederbelebungsapparatur Virus'&&s.pendingBezEffect?.type==='virus_azr_slot'});

t('Virus offers free and face-down AZR zones and resolves selected lock',()=>{const s=S();s.players[0].hand=[card('Wiederbelebungsapparatur Virus').bild];s.players[1].azr[1]=rt('Zeitsprung',1,true);s.players[1].azr[2]=rt('Zeitsprung',1,false);const r=E.playFieldFromHand(s,0,'secondary');if(!r.ok)return false;const ids=E.newAstralSpellTargets(s).map(x=>x.id);if(!ids.includes('1:1')||ids.includes('1:2'))return false;const z=E.resolveNewAstralSpellTarget(s,'1:1');return z.ok&&s.azrLocks.some(x=>x.playerIndex===1&&x.slot===1)&&!s.pendingBezEffect});

t('Virus cannot be played if all AZR zones are open or already locked',()=>{const s=S();for(const p of s.players)for(let i=0;i<3;i++)p.azr[i]=rt('Zeitsprung',p.index,false);s.players[0].hand=[card('Wiederbelebungsapparatur Virus').bild];const r=E.playFieldFromHand(s,0,'secondary');return !r.ok&&s.players[0].hand.length===1&&!s.sharedSecondary});

t('Zeitsprung skips target next supply from supply_start',()=>{const s=S();s.players[0].azr[0]=rt('Zeitsprung');let r=E.startInstantAstralSpell(s,0,0);if(!r.ok||s.players[1].skipNextSupplyCount!==1)return false;s.activePlayer=1;s.phaseIndex=3;r=E.advancePhase(s);return r.ok&&E.currentPhase(s).id==='rush'&&s.players[1].skipNextSupplyCount===0});

t('Zeitsprung fallback releases a loaded state already sitting in skipped supply',()=>{const s=S();s.activePlayer=1;s.phaseIndex=4;s.players[1].skipNextSupplyCount=1;const r=E.advancePhase(s);return r.ok&&E.currentPhase(s).id==='rush'&&s.players[1].skipNextSupplyCount===0});

console.log(`RESULT ${pass} PASS / ${fail} FAIL`);process.exitCode=fail?1:0;
