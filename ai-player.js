(()=>{
'use strict';
const E=()=>window.G5Engine;
const AI_INDEX=1;
function isAIPlayer(state,index=AI_INDEX){return !!state && Number(index)===AI_INDEX;}
function cardOfBild(b){return E().dbCard(b);}
function cardScore(c){
  if(!c)return -999;
  return Number(c.herzen||0)*4+Number(c.physische_staerke||0)*3+Number(c.astrale_staerke||0)*3+
    Number(c.physischer_schild||0)*2+Number(c.astraler_schild||0)*2+Number(c.ehre||0);
}
function runtimeThreat(state,playerIndex,slot){
  const r=state.players[playerIndex]?.bezSlots?.[slot];
  if(!r)return 0;
  const s=E().effectiveBezStats(state,playerIndex,slot);
  return Number(r.hearts||0)*2+Number(s?.physical||0)*3+Number(s?.astral||0)*3+Number(s?.physicalShield||0)+Number(s?.astralShield||0);
}
function chooseDrawStack(state){
  const p=E().active(state), nonempty=k=>(p.stacks?.[k]||[]).length>0;
  const handCards=p.hand.map(cardOfBild).filter(Boolean);
  const freeBez=(p.bezSlots||[]).filter(x=>!x).length;
  const handBez=handCards.filter(c=>c.deck_bereich==='bezwingerinnen').length;
  if(nonempty('bezwingerinnen') && (freeBez>0 || handBez===0))return 'bezwingerinnen';
  const handEq=handCards.some(c=>E().isEquipmentCard(c));
  if(nonempty('ruestkammer') && !handEq && p.bezSlots.some(Boolean))return 'ruestkammer';
  if(nonempty('astral'))return 'astral';
  if(nonempty('ruestkammer'))return 'ruestkammer';
  if(nonempty('bezwingerinnen'))return 'bezwingerinnen';
  return null;
}
function chooseRecruit(state){
  const p=E().active(state);
  if(p.recruitedThisTurn)return null;
  const free=[0,1].filter(i=>!p.bezSlots[i]); if(!free.length)return null;
  const candidates=p.hand.map((b,i)=>({i,c:cardOfBild(b)})).filter(x=>x.c?.deck_bereich==='bezwingerinnen');
  if(!candidates.length)return null;
  candidates.sort((a,b)=>cardScore(b.c)-cardScore(a.c));
  // Protect the refuge first: occupy the lane of the most dangerous opposing Bezwingerin.
  const enemy=state.players[1-p.index];
  let slot=free[0], bestThreat=-1;
  for(const s of free){const t=runtimeThreat(state,enemy.index,s);if(t>bestThreat){bestThreat=t;slot=s;}}
  return {handIndex:candidates[0].i,slot};
}
function chooseEquipment(state){
  const p=E().active(state);
  for(let hi=0;hi<p.hand.length;hi++){
    const c=cardOfBild(p.hand[hi]); if(!c||!E().isEquipmentCard(c))continue;
    const kind=E().equipmentKind(c); if(!kind)continue;
    const targets=[0,1].filter(s=>p.bezSlots[s]);
    targets.sort((a,b)=>runtimeThreat(state,p.index,b)-runtimeThreat(state,p.index,a));
    for(const s of targets){
      const slot=p.equipment?.[s]?.[kind];
      if(!slot)return {handIndex:hi,bezSlot:s,kind};
    }
  }
  return null;
}
function chooseField(state){
  const p=E().active(state);
  for(let hi=0;hi<p.hand.length;hi++){
    const c=cardOfBild(p.hand[hi]); if(!c)continue;
    const allowed=E().mornakAllowedAreas(c)||[];
    if(allowed.includes('primary') && !p.primary)return {handIndex:hi,area:'primary'};
    if(allowed.includes('secondary') && !state.sharedSecondary)return {handIndex:hi,area:'secondary'};
  }
  return null;
}
function chooseSetCard(state){
  const p=E().active(state),free=p.azr.map((r,i)=>r?null:i).filter(i=>i!==null);if(!free.length)return null;
  const cand=p.hand.map((b,i)=>({i,c:cardOfBild(b)})).filter(x=>['astral','ruestkammer'].includes(x.c?.deck_bereich));
  if(!cand.length)return null;
  // Instinkt cards are especially valuable face-down because they can protect the refuge in the opponent's turn.
  cand.sort((a,b)=>{
    const ai=(a.c.instinkt===true||a.c.effekte?.some(e=>e.instinkt===true))?1:0;
    const bi=(b.c.instinkt===true||b.c.effekte?.some(e=>e.instinkt===true))?1:0;
    return bi-ai;
  });
  return {handIndex:cand[0].i,slot:free[0]};
}
function sourceRuntime(state,src){
  const p=E().active(state);
  if(src==='refuge')return p.refuge;if(src==='primary')return p.primary;if(src==='secondary')return state.sharedSecondary;
  return p.bezSlots[Number(src)];
}
function sourceStrength(state,src,type){
  const p=E().active(state),r=sourceRuntime(state,src); if(!r)return 0;
  if(typeof src==='number')return Number(E().combatStrength(state,p.index,src,type,true)?.total||0);
  const c=E().cardData(r);return Number(type==='physical'?(r.physical??c?.physische_staerke??0):(r.astral??c?.astrale_staerke??0));
}
function targetRuntime(state,t){const o=E().opponent(state);if(t.type==='bez')return o.bezSlots[t.slot];if(t.type==='primary')return o.primary;if(t.type==='secondary')return state.sharedSecondary;return o.refuge;}
function targetDefense(r,type){if(!r)return 0;return Number(type==='physical'?r.physicalShield:r.astralShield)||0;}
function targetScore(state,src,t,type){
  const r=targetRuntime(state,t);if(!r)return -9999;
  const attack=sourceStrength(state,src,type), hp=Number(r.hearts||0), shield=targetDefense(r,type);
  let s=attack*12-shield*3;
  if(t.type==='refuge')s+=10000; // winning the game is the top offensive priority
  if(attack>=shield+hp)s+=2500; // prefer a guaranteed destruction
  if(t.type==='bez'){
    s+=runtimeThreat(state,E().opponent(state).index,t.slot)*8;
    // Enemy Bezwingerinnen in front of an exposed refuge lane are defensive priorities.
    if(Number(t.slot)===Number(src))s+=400;
  }
  if(t.type==='primary'||t.type==='secondary')s+=120;
  return s;
}
function chooseAttack(state){
  const p=E().active(state),sources=[];
  p.bezSlots.forEach((r,i)=>{if(E().canAttack(r,p))sources.push(i);});
  if(E().canRefugeAttack(state,p.index))sources.push('refuge');
  if(E().canAttack(p.primary,p))sources.push('primary');
  if(state.sharedSecondary?.owner===p.index&&E().canAttack(state.sharedSecondary,p))sources.push('secondary');
  let best=null;
  for(const src of sources){
    const targets=E().attackTargets(state,src)||[];
    for(const t of targets){
      for(const type of ['physical','astral']){
        const score=targetScore(state,src,t,type);
        if(!best||score>best.score)best={src,target:{type:t.type,slot:t.slot},type,score};
      }
    }
  }
  return best;
}
function chooseAIShield(state){
  const q=E().currentShieldChoice(state);if(!q||Number(q.playerIndex)!==AI_INDEX)return null;
  // Preserve base shields where possible; equipment/temporary shields are spent first.
  const order=['aufopferung','equipment','base','mornak'];
  return [...q.sources].sort((a,b)=>order.indexOf(a.source)-order.indexOf(b.source))[0]||null;
}
function step(state){
  if(!state||state.winner!==null||state.activePlayer!==AI_INDEX)return {acted:false,wait:true};
  const ph=E().currentPhase(state),p=E().active(state);
  if(state.pendingDamage){
    const shield=chooseAIShield(state);
    if(shield){const r=E().chooseShieldSource(state,shield.source,shield.kind);return {acted:true,msg:r.msg};}
    return {acted:false,wait:true};
  }
  if(state.pendingEquipment||state.pendingFieldCard||state.pendingWonderDraw||state.pendingRefugeStage2Choice||state.pendingBezEffect){
    // The first AI version deliberately avoids initiating complex effects that require extra choices.
    return {acted:false,wait:true,unsupported:true};
  }
  if(ph.id==='start'||ph.id==='supply_start')return {acted:true,msg:E().advancePhase(state).msg};
  if(ph.id==='honor')return {acted:true,msg:E().advancePhase(state).msg};
  if(ph.id==='draw'){
    if(!p.drawDone){const stack=chooseDrawStack(state);if(stack){const r=E().drawPhaseCard(state,stack);return {acted:true,msg:r.msg};}}
    return {acted:true,msg:E().advancePhase(state).msg};
  }
  if(ph.id==='supply'||ph.id==='resupply'){
    const rec=chooseRecruit(state);if(rec){const r=E().recruit(state,rec.handIndex,rec.slot);if(r.ok && !state.pendingBezEffect)return {acted:true,msg:r.msg};if(r.ok)return {acted:false,wait:true,unsupported:true,msg:r.msg};}
    const eq=chooseEquipment(state);if(eq){const r=E().equipFromHand(state,eq.handIndex,eq.bezSlot,eq.kind);if(r.ok && !r.needsShieldChoice)return {acted:true,msg:r.msg};}
    const field=chooseField(state);if(field){const r=E().playFieldFromHand(state,field.handIndex,field.area);if(r.ok && !state.pendingBezEffect)return {acted:true,msg:r.msg};}
    const set=chooseSetCard(state);if(set){const r=E().setFaceDown(state,set.handIndex,set.slot);if(r.ok)return {acted:true,msg:r.msg};}
    return {acted:true,msg:E().advancePhase(state).msg};
  }
  if(ph.id==='rush'){
    if(state.attack)return {acted:false,wait:true}; // human defender may react / confirm
    const a=chooseAttack(state);
    if(a){const r=E().prepareAttack(state,a.src,a.target,a.type);return {acted:r.ok,wait:r.ok,msg:r.msg};}
    return {acted:true,msg:E().advancePhase(state).msg};
  }
  if(ph.id==='combat'){
    if(state.attack){const r=E().resolveCombat(state);if(r.needsShieldChoice){const q=r.choice;if(Number(q?.playerIndex)!==AI_INDEX)return {acted:false,wait:true};const s=chooseAIShield(state);if(s){const rr=E().chooseShieldSource(state,s.source,s.kind);return {acted:true,msg:rr.msg};}}return {acted:r.ok,msg:r.msg};}
    const rr=E().returnToRush(state);if(rr.ok)return {acted:true,msg:rr.msg};
    return {acted:true,msg:E().advancePhase(state).msg};
  }
  if(ph.id==='end')return {acted:true,msg:E().advancePhase(state).msg};
  return {acted:true,msg:E().advancePhase(state).msg};
}
window.G5AI={AI_INDEX,isAIPlayer,chooseDrawStack,chooseRecruit,chooseAttack,targetScore,step};
})();
