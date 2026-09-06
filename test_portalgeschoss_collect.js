const fs=require('fs'),vm=require('vm'),path=require('path');
global.window=global;global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..','5goddesses-datenbank.js'),'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..','game-engine.js'),'utf8'));
const E=global.G5Engine,DB=global.GODDESSES_DB.karten,card=n=>DB.find(c=>c.name===n);
const rt=(n,o=0,fd=false)=>{const c=card(n);return {bild:c.bild,owner:o,ownerIndex:o,controllerIndex:o,stufe:c.stufe||1,hearts:c.herzen??0,physicalShield:c.physischer_schild??0,astralShield:c.astraler_schild??0,physical:c.physische_staerke??0,astral:c.astrale_staerke??0,honor:c.ehre??0,ready:true,enteredTurn:0,attackedTurn:null,effectRoundsRemaining:c.effekt_dauer_kr??null,effectDisabled:false,effectState:{},faceDown:fd,developmentStack:[c.bild]};};
const P=i=>({index:i,name:'P'+(i+1),turnCount:1,hand:[],bezSlots:[null,null],equipment:[{weapon:null,shield:null,armor:null,helmet:null},{weapon:null,shield:null,armor:null,helmet:null}],azr:[null,null,null],primary:null,refuge:null,discard:[],stacks:{bezwingerinnen:[],astral:[],ruestkammer:[]},development:[]});
const S=()=>({players:[P(0),P(1)],activePlayer:0,phaseIndex:5,sharedSecondary:null,log:[],attack:null,roundSerial:1,pendingBezEffect:null,pendingDamage:null,winner:null});
let pass=0,fail=0;const ok=(x,m='assert')=>{if(!x)throw Error(m)},eq=(a,b,m='neq')=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(`${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`)},t=(n,f)=>{try{f();console.log('PASS',n);pass++}catch(e){console.error('FAIL',n,'-',e.message);fail++}};
function setupAttack(target='Die ungezähmte Flamme Saphira',attackType='physical',attacker='Lebende Waffenbändigerin Keyla Dorn'){
  const s=S();s.players[0].bezSlots[0]=rt(attacker,0,false);s.players[1].bezSlots[0]=rt(target,1,false);s.players[1].azr[0]=rt('Portalgeschoss',1,true);
  const pr=E.prepareAttack(s,0,{type:'bez',slot:0},attackType);if(!pr.ok)throw Error(pr.msg);return s;
}
function activatePortal(s){return E.revealDefenderCard(s,0)}
function fight(s){let r=E.confirmAttack(s);if(!r.ok)throw Error(r.msg);r=E.resolveCombat(s);while(r.needsShieldChoice){const c=r.choice.sources[0];r=E.chooseShieldSource(s,c.source,c.kind);}return r;}

t('Portalgeschoss database metadata',()=>{const c=card('Portalgeschoss');ok(c.effekte.some(e=>e.engine_key==='portalgeschoss_reactive'));eq(c.effekt_symbol,'blitz');ok((c.nebenattribute||[]).includes('Portal'));ok((c.tags||[]).includes('instinkt'));ok(c.effekte.some(e=>e.instinkt===true));});
t('Cannot activate without announced opposing Bezwingerin attack and remains face-down',()=>{const s=S();s.players[1].azr[0]=rt('Portalgeschoss',1,true);const r=E.revealDefenderCard(s,0);ok(!r.ok);ok(s.players[1].azr[0]?.faceDown===true);ok(!s.players[1].discard.includes(card('Portalgeschoss').bild));});
t('Target must have at least 1 ASTRAL attack value',()=>{const s=setupAttack('Die Unbeugsame Heldin Jeanne d\'Arque');const r=activatePortal(s);ok(!r.ok);ok(s.players[1].azr[0]?.faceDown===true);});
t('Valid activation arms current combat and discards Portalgeschoss',()=>{const s=setupAttack();const r=activatePortal(s);ok(r.ok,r.msg);ok(Array.isArray(s.attack.portalgeschossEffects)&&s.attack.portalgeschossEffects.length===1);ok(!s.players[1].azr[0]);ok(s.players[1].discard.includes(card('Portalgeschoss').bild));});
t('Physical damage to marked target deals 1 ASTRAL damage to attacker',()=>{const s=setupAttack();ok(activatePortal(s).ok);const a=s.players[0].bezSlots[0],d=s.players[1].bezSlots[0],ah=a.hearts,dh=d.hearts;const r=fight(s);ok(r.ok,r.msg);eq(d.hearts,dh-1);eq(a.hearts,ah-1);});
t('Physical damage absorbed by shield still triggers Portalgeschoss',()=>{const s=setupAttack('Q.U.E.E.N.');ok(activatePortal(s).ok);const a=s.players[0].bezSlots[0],d=s.players[1].bezSlots[0],ah=a.hearts,dh=d.hearts,ps=d.physicalShield;const r=fight(s);ok(r.ok,r.msg);eq(d.hearts,dh);eq(d.physicalShield,ps-1);eq(a.hearts,ah-1);});
t('ASTRAL combat does not trigger Portalgeschoss',()=>{const s=setupAttack('Die ungezähmte Flamme Saphira','astral');ok(activatePortal(s).ok);const a=s.players[0].bezSlots[0],ah=a.hearts;const r=fight(s);ok(r.ok,r.msg);eq(a.hearts,ah-1,'only the normal ASTRAL counterattack should apply');});
t('If defender-first destroys attacker before physical hit, Portalgeschoss does not trigger',()=>{const s=setupAttack('Die ungezähmte Flamme Saphira','physical','Lebende Waffenbändigerin Keyla Dorn');const a=s.players[0].bezSlots[0],d=s.players[1].bezSlots[0];a.hearts=1;a.effectState.secondaryAttackActive=true;d.physical=1;ok(activatePortal(s).ok);const dh=d.hearts;const r=fight(s);ok(r.ok,r.msg);ok(!s.players[0].bezSlots[0],'attacker should be destroyed');eq(d.hearts,dh,'defender should not be hit');});
t('Portalgeschoss ASTRAL damage uses normal shield handling on attacker',()=>{const s=setupAttack();const a=s.players[0].bezSlots[0];a.astralShield=1;const ah=a.hearts;ok(activatePortal(s).ok);const r=fight(s);ok(r.ok,r.msg);eq(a.hearts,ah);eq(a.astralShield,0);});
console.log(`RESULT ${pass} PASS / ${fail} FAIL`);if(fail)process.exit(1);
