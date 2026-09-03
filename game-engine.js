(() => {
'use strict';

const PHASES=[
  {id:'start',name:'Start der Kampfrunde',short:'Start KR'},
  {id:'honor',name:'Ehrungsphase',short:'EP'},
  {id:'draw',name:'Ziehphase',short:'ZP'},
  {id:'supply_start',name:'Anfang der Versorgungsphase',short:'AVP'},
  {id:'supply',name:'Versorgungsphase',short:'VP'},
  {id:'rush',name:'Ansturmphase',short:'AP'},
  {id:'combat',name:'Kampfphase',short:'KP'},
  {id:'resupply',name:'Nachschubphase',short:'NP'},
  {id:'end',name:'Ende der Kampfrunde',short:'Ende KR'}
];

function clone(v){return JSON.parse(JSON.stringify(v))}
function shuffle(a){
  const b=[...a];
  for(let i=b.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [b[i],b[j]]=[b[j],b[i]];
  }
  return b;
}
function dbCard(bild){
  return window.GODDESSES_DB?.karten?.find(k=>k.bild===bild)||null;
}
function decks(){
  try{
    const a=JSON.parse(localStorage.getItem('5goddesses_decks_v1')||'[]');
    return Array.isArray(a)?a:[];
  }catch(e){return []}
}
function validDeck(d){
  if(!d?.karten)return false;
  return d.karten.zuflucht?.length===1 &&
    d.karten.bezwingerinnen?.length===3 &&
    d.karten.astral?.length===5 &&
    d.karten.ruestkammer?.length===5 &&
    d.karten.entwicklung?.length===5;
}
function hasDeploymentDelay(c){
  if(!c)return false;
  const isRefuge =
    c.deck_bereich==='zuflucht' ||
    String(c.kartentyp||'').toLowerCase()==='zuflucht';
  const isDevelopment =
    c.entwicklungskarte===true ||
    String(c.deck_bereich||'').toLowerCase().includes('entwicklung');
  const hasHearts = c.herzen !== null && c.herzen !== undefined;
  return !isRefuge && !isDevelopment && hasHearts;
}
function makeRuntimeCard(bild,owner,enteredTurn=-1){
  const c=dbCard(bild);
  if(!c)return null;
  return {
    bild:c.bild,
    owner,
    stufe:c.stufe||1,
    hearts:c.herzen ?? 0,
    physicalShield:c.physischer_schild ?? 0,
    astralShield:c.astraler_schild ?? 0,
    physical:c.physische_staerke ?? 0,
    astral:c.astrale_staerke ?? 0,
    // Gedruckte Ehre ist die Startehre der Karte.
    // Sie ist bereits beim Ausspielen vorhanden – auch wenn die Karte
    // zunächst verdeckt gesetzt wird. Verdeckte Karten erhalten lediglich
    // keine zusätzliche Ehre aus der Ehrungsphase.
    honor:c.ehre ?? 0,
    ready:!hasDeploymentDelay(c),
    enteredTurn,
    attackedTurn:null,
    developedTurn:null,
    wonderTurn:null,
    wonderCostCurrent:Number(c.wunder?.kosten_ehre ?? 0),
    berserkerMarks:0,
    effectUsedTurn:null,
    effectUsesRemaining:(c.effekt_zaehler_max ?? null),
    effectRoundsRemaining:(c.effekt_dauer_kr ?? null),
    effectDisabled:false,
    effectState:{},
    faceDown:false,
    developmentStack:[c.bild]
  };
}
function playerFromDeck(deck,index){
  const k=deck.karten;
  return {
    index,
    name:`Spieler ${index+1}`,
    deckName:deck.name,
    turnCount:0,
    honorGrantedTurn:null,
    refuge:makeRuntimeCard(k.zuflucht[0],index,-1),
    stacks:{
      bezwingerinnen:shuffle(k.bezwingerinnen),
      astral:shuffle(k.astral),
      ruestkammer:shuffle(k.ruestkammer)
    },
    development:[...k.entwicklung],
    hand:[],
    bezSlots:[null,null],
    equipment:[
      {weapon:null,shield:null,armor:null,helmet:null},
      {weapon:null,shield:null,armor:null,helmet:null}
    ],
    azr:[null,null,null],
    primary:null,
    secondary:null,
    discard:[],
    recruitedThisTurn:false,
    drawDone:false
  };
}
function cardData(runtime){return runtime?dbCard(runtime.bild):null}
const EQUIPMENT_TYPE_TO_SLOT={
  'Waffe':'weapon',
  'Schild':'shield',
  'Rüstung':'armor',
  'Kopfschutz':'helmet'
};
function equipmentKind(c){
  if(!c || c.deck_bereich!=='ruestkammer')return null;
  return EQUIPMENT_TYPE_TO_SLOT[c.kartentyp]||null;
}
function isEquipmentCard(c){return !!equipmentKind(c)}
function fieldArea(c){
  const b=String(c?.bereich||'').trim().toLowerCase();
  if(b.includes('primär') || b.includes('primaer'))return 'primary';
  if(b.includes('sekundär') || b.includes('sekundaer'))return 'secondary';
  return null;
}
function equipmentLabel(kind){
  return ({weapon:'Waffe',shield:'Schild',armor:'Rüstung',helmet:'Kopfschutz'})[kind]||kind;
}
const EQUIPMENT_COMBAT_PROFILES={
  'Kristallharnisch':            {astralShield:1},
  'Legionsschild':               {physicalShield:1},
  'Legionsbrustpanzer':          {physicalShield:1},
  'Ubusa Brustpanzer':           {physicalShield:1,astralShield:1},
  'Die strahlende Krone Gloria': {physicalShield:1,astralShield:1},
  'Glorreicher Helm Victores':   {physicalShield:1},
  'Energieschild':               {astralShield:1},
  'Legionshelm':                 {physicalShield:1},
  'Leichte Robe':                {astralShield:1},
  'Holzschild':                  {physicalShield:1},
  'Goldener Dorn':               {physicalShield:1,attackPhysicalWhenAttacking:1},
  'Gedankenschleier Psythra':    {astralShield:1},
  'Chikaras Stahlherz':          {shieldChoice:true},
  'Die Abenddämmerung Hyde':     {tempAstral:1,untilNextSupply:true},
  'Die Morgenröte Jakyl':        {tempPhysical:1,untilNextSupply:true},
  'Instabiler Stab':             {tempAstral:1,untilNextSupply:true},
  'Steinschwert':                {tempPhysical:1,untilNextSupply:true}
};
function equipmentCombatProfile(runtimeOrCard){
  const c=runtimeOrCard?.bild
    ? (runtimeOrCard.name ? runtimeOrCard : cardData(runtimeOrCard))
    : runtimeOrCard;
  return EQUIPMENT_COMBAT_PROFILES[c?.name]||{};
}
function initializeEquipmentCombatState(r,p,choice=null){
  if(!r)return;
  const prof=equipmentCombatProfile(r);
  if(r.equipmentCombatInitialized!==true){
    r.physicalShield=prof.physicalShield||0;
    r.astralShield=prof.astralShield||0;
    r.tempPhysicalBonus=prof.tempPhysical||0;
    r.tempAstralBonus=prof.tempAstral||0;
    r.attackPhysicalWhenAttacking=prof.attackPhysicalWhenAttacking||0;
    r.attackAstralWhenAttacking=prof.attackAstralWhenAttacking||0;
    r.tempBonusExpiresTurn=prof.untilNextSupply ? p.turnCount+1 : null;
    r.equipmentCombatInitialized=true;
  }
  if(prof.shieldChoice && !r.shieldChoice){
    if(choice==='physical'){
      r.shieldChoice='physical';
      r.physicalShield=1;
      r.astralShield=0;
    }else if(choice==='astral'){
      r.shieldChoice='astral';
      r.physicalShield=0;
      r.astralShield=1;
    }
  }
}
function chooseEquipmentShieldBonus(state,bezSlot,kind,choice){
  const p=active(state);
  ensureEquipmentState(p);
  const r=p.equipment[bezSlot]?.[kind];
  if(!r)return {ok:false,msg:'Keine Ausrüstung vorhanden.'};
  const prof=equipmentCombatProfile(r);
  if(!prof.shieldChoice)return {ok:false,msg:'Diese Ausrüstung benötigt keine Schildauswahl.'};
  if(r.shieldChoice)return {ok:false,msg:'Der Schildtyp wurde bereits gewählt.'};
  if(!['physical','astral'].includes(choice))return {ok:false,msg:'Ungültiger Schildtyp.'};
  initializeEquipmentCombatState(r,p,choice);
  log(state,`${cardData(r)?.name||'Ausrüstung'} erhält 1 ${choice==='physical'?'physischen':'ASTRAL'} externen Schildpunkt.`);
  return {ok:true};
}
function expireEquipmentCombatBonuses(state,p){
  ensureEquipmentState(p);
  for(const eq of p.equipment){
    for(const kind of ['weapon','shield','armor','helmet']){
      const r=eq[kind];
      if(!r)continue;
      initializeEquipmentCombatState(r,p);
      if(r.tempBonusExpiresTurn!==null && r.tempBonusExpiresTurn!==undefined &&
         p.turnCount>=r.tempBonusExpiresTurn){
        if((r.tempPhysicalBonus||0)!==0 || (r.tempAstralBonus||0)!==0){
          log(state,`${cardData(r)?.name||'Ein Ausrüstungseffekt'}: der zeitlich begrenzte Stärkebonus endet.`);
        }
        r.tempPhysicalBonus=0;
        r.tempAstralBonus=0;
        r.tempBonusExpiresTurn=null;
      }
    }
  }
}
function equipmentStrengthBonus(state,playerIndex,bezSlot,type,isAttacking=false){
  const p=state.players[playerIndex];
  ensureEquipmentState(p);
  let total=0;
  for(const kind of ['weapon','shield','armor','helmet']){
    const r=p.equipment[bezSlot]?.[kind];
    if(!r)continue;
    initializeEquipmentCombatState(r,p);
    if(type==='physical'){
      total+=r.tempPhysicalBonus||0;
      if(isAttacking)total+=r.attackPhysicalWhenAttacking||0;
    }else{
      total+=r.tempAstralBonus||0;
      if(isAttacking)total+=r.attackAstralWhenAttacking||0;
    }
  }
  return total;
}
function combatStrength(state,playerIndex,bezSlot,type,isAttacking=false){
  const p=state.players[playerIndex],r=p.bezSlots[bezSlot];
  if(!r)return {base:0,equipment:0,total:0};
  const c=cardData(r);
  const base=type==='physical'
    ? ((r.physical ?? c?.physische_staerke ?? 0) + Number(r.effectState?.psiloPhysicalBonus||0))
    : (r.astral ?? c?.astrale_staerke ?? 0);
  const equipment=equipmentStrengthBonus(state,playerIndex,bezSlot,type,isAttacking);
  return {base,equipment,total:Math.max(0,base+equipment)};
}
function discardRuntime(p,r){
  if(!r)return;
  for(const img of r.developmentStack||[r.bild])p.discard.push(img);
}
function ensureEquipmentState(p){
  if(!Array.isArray(p.equipment))p.equipment=[];
  while(p.equipment.length<2)p.equipment.push(null);
  for(let i=0;i<2;i++){
    if(!p.equipment[i] || Array.isArray(p.equipment[i])){
      p.equipment[i]={weapon:null,shield:null,armor:null,helmet:null};
    }else{
      for(const k of ['weapon','shield','armor','helmet']){
        if(p.equipment[i][k]===undefined)p.equipment[i][k]=null;
      }
    }
  }
}
function log(state,text){
  state.log.unshift({
    at:new Date().toISOString(),
    turn:state.roundSerial,
    text
  });
  state.log=state.log.slice(0,150);
}
function drawFrom(state,playerIndex,stack){
  const p=state.players[playerIndex];
  if(!['bezwingerinnen','astral','ruestkammer'].includes(stack))return {ok:false,msg:'Ungültiger Stapel.'};
  if(!p.stacks[stack].length)return {ok:false,msg:'Dieser Stapel ist leer.'};
  const bild=p.stacks[stack].shift();
  p.hand.push(bild);
  log(state,`${p.name} zieht eine Karte vom ${stack==='bezwingerinnen'?'Bezwingerinnen':stack==='astral'?'ASTRAL':'Rüstkammer'}-Stapel.`);
  return {ok:true,bild};
}
function initialDraw(state){
  for(const p of state.players){
    for(const s of ['bezwingerinnen','astral','ruestkammer'])drawFrom(state,p.index,s);
    p.drawDone=false;
  }
  log(state,'Beide Spieler ziehen je eine Karte von jedem Hauptstapel. Die Starthand besteht aus 3 Karten.');
}
function startGame(deck1,deck2,startPlayer){
  const state={
    version:1,
    activePlayer:startPlayer,
    startingPlayer:startPlayer,
    phaseIndex:0,
    roundSerial:1,
    firstTurn:true,
    winner:null,
    attack:null,
    pendingEquipment:null,
    pendingFieldCard:null,
    pendingDamage:null,
    pendingWonderDraw:null,
    pendingRefugeStage2Choice:null,
    sharedPrimary:null,
    players:[playerFromDeck(deck1,0),playerFromDeck(deck2,1)],
    log:[]
  };
  // Im Gefecht startet jede Zuflucht mit 4 Herzen.
  state.players.forEach(p=>p.refuge.hearts=4);
  initialDraw(state);
  log(state,`${state.players[startPlayer].name} beginnt das Gefecht.`);
  return state;
}
function active(state){return state.players[state.activePlayer]}
function opponent(state){return state.players[1-state.activePlayer]}
function currentPhase(state){return PHASES[state.phaseIndex]}

function honorEligible(runtime,p){
  if(!runtime)return false;
  const c=cardData(runtime);
  // Für die Ehrungsphase zählt ausschließlich, ob die Karte ein Herz-Attribut
  // besitzt. Auch ein gedruckter Herz-Wert von 0 zählt.
  return c?.herzen !== null && c?.herzen !== undefined;
}
function honorCardsOfPlayer(state,p){
  const cards=[
    p.refuge,
    ...p.bezSlots,
    p.secondary,
    // Verdeckte AZR-Karten erhalten keine Ehre.
    ...p.azr.filter(r=>r && !r.faceDown),
    state.sharedPrimary?.owner===p.index ? state.sharedPrimary : null
  ];
  return cards.filter(Boolean);
}
function grantHonor(state){
  const p=active(state);

  // Schutz gegen doppelte Vergabe innerhalb derselben eigenen Kampfrunde.
  if(p.honorGrantedTurn===p.turnCount)return 0;

  let n=0;
  const changes=[];
  for(const r of honorCardsOfPlayer(state,p)){
    if(honorEligible(r,p)){
      const before=Number(r.honor ?? 0);
      r.honor=before+1;
      changes.push(`${cardData(r)?.name||'Karte'} ${before}→${r.honor}`);
      n++;
    }
  }

  p.honorGrantedTurn=p.turnCount;
  log(state,n
    ?`${p.name}: Ehrungsphase +1 je Karte (${changes.join(', ')}). Ausgegebene Ehre wird nicht wiederhergestellt.`
    :`${p.name} hat derzeit keine Karte mit Herzanzahl, die Ehre erhält.`);
  return n;
}
function readyEligibleBez(state,slot){
  const p=active(state),r=p.bezSlots[slot];
  return !!r && !r.ready && p.turnCount>r.enteredTurn && !(r.effectState?.delayLockedUntilSupply);
}
function readyBez(state,slot){
  if(!readyEligibleBez(state,slot))return {ok:false,msg:'Diese Bezwingerin kann noch nicht einsatzbereit gemacht werden.'};
  const p=active(state);
  p.bezSlots[slot].ready=true;
  log(state,`${p.name} macht ${cardData(p.bezSlots[slot])?.name||'eine Bezwingerin'} einsatzbereit.`);
  return {ok:true};
}
function recruit(state,handIndex,slot){
  const p=active(state);
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Rekrutieren ist nur in Versorgungs- oder Nachschubphase möglich.'};
  if(p.recruitedThisTurn)return {ok:false,msg:'In dieser Kampfrunde wurde bereits eine Bezwingerin rekrutiert.'};
  if(p.bezSlots[slot])return {ok:false,msg:'Dieser Bezwingerinnenbereich ist bereits belegt.'};
  const bild=p.hand[handIndex],c=dbCard(bild);
  if(!c || c.deck_bereich!=='bezwingerinnen')return {ok:false,msg:'Diese Handkarte ist keine Bezwingerin.'};
  p.hand.splice(handIndex,1);
  const r=makeRuntimeCard(bild,p.index,p.turnCount);
  r.ready=false;
  p.bezSlots[slot]=r;
  p.recruitedThisTurn=true;
  log(state,`${p.name} rekrutiert ${c.name} in Bereich ${slot+1}.`);
  resolveBezOnPlay(state,p,slot,r,c);
  return {ok:true};
}

function opposingBez(state,p,slot){return state.players[1-p.index]?.bezSlots?.[slot]||null}
function countOwnAzrCards(p){return (p.azr||[]).filter(Boolean).length}
function resolveBezOnPlay(state,p,slot,r,c){
  const key=c?.effekte?.[0]?.engine_key;
  if(key==='arcadia'&&(r.effectRoundsRemaining===null||r.effectRoundsRemaining===undefined)){r.effectRoundsRemaining=3;r.effectDisabled=false;}
  const opp=opposingBez(state,p,slot);
  if(key==='shield'){
    const targets=p.bezSlots.map((x,i)=>x&&i!==slot?i:null).filter(i=>i!==null);
    if(targets.length)state.pendingBezEffect={type:'shield',sourcePlayer:p.index,sourceSlot:slot};
    else log(state,`${c.name}: keine andere eigene Bezwingerin als Ziel vorhanden.`);
  }else if(key==='death'){
    r.effectState=r.effectState||{};
    r.effectState.primaryAttackUses=1;
    r.effectState.primaryAttackActive=false;
    log(state,`${c.name}: 1 einmaliger Primärangriff wurde gespeichert.`);
  }else if(key==='queen'){
    const targets=(p.stacks?.bezwingerinnen||[]).map((bild,i)=>({bild,i,c:dbCard(bild)}))
      .filter(x=>['Z.E.R.O. ATK','Z.E.R.O. ASTRAL'].includes(x.c?.name));
    if(targets.length)state.pendingBezEffect={type:'queen_search',sourcePlayer:p.index,sourceSlot:slot};
    else log(state,`${c.name}: weder Z.E.R.O. ATK noch Z.E.R.O. ASTRAL im Bezwingerinnen-Stapel gefunden.`);
  }else if(key==='martha'){
    if(!opp || (opp.hearts??0)<=(r.hearts??0)){r.honor=(r.honor||0)+1;log(state,`${c.name}: Ausspieleffekt → +1 Ehre.`)}
  }else if(key==='keyla'){
    const matches=(p.stacks?.ruestkammer||[]).map((bild,i)=>({bild,i,c:dbCard(bild)}))
      .filter(x=>x.c?.kartentyp==='Reliquie' && String(x.c?.untertyp||'').toLowerCase()==='astralfragment');
    if(matches.length){
      state.pendingBezEffect={type:'keyla_search',sourcePlayer:p.index,sourceSlot:slot};
      log(state,`${c.name}: passende ASTRALFRAGMENT-Reliquien im Rüstkammer-Stapel gefunden.`);
    }else log(state,`${c.name}: keine passende ASTRALFRAGMENT-Reliquie im Rüstkammer-Stapel.`);
  }else if(key==='keyla2'){
    state.pendingBezEffect={type:'keyla2_choice',sourcePlayer:p.index,sourceSlot:slot};
    log(state,`${c.name}: Wähle eine der drei Aktionen.`);
  }else if(key==='menia'){
    ensureEquipmentState(p);
    const occupied=!!p.equipment?.[slot]?.weapon;
    const matches=(p.stacks?.ruestkammer||[]).map((bild,i)=>({bild,i,c:dbCard(bild)}))
      .filter(x=>String(x.c?.untertyp||'').toLowerCase()==='dolch');
    if(!occupied && matches.length){
      state.pendingBezEffect={type:'menia_dagger',sourcePlayer:p.index,sourceSlot:slot};
      log(state,`${c.name}: passende Dolche im Rüstkammer-Stapel gefunden.`);
    }else if(occupied){
      log(state,`${c.name}: Dolchsuche nicht möglich, da der Waffenplatz bereits belegt ist.`);
    }else{
      log(state,`${c.name}: Kein Dolch im Rüstkammer-Stapel gefunden.`);
    }
  }else if(key==='effrayer'){
    const other=p.bezSlots.find((x,i)=>i!==slot&&x&&isVengeresseCard(cardData(x)));
    if(other){other.honor=Number(other.honor||0)+1;log(state,`${c.name}: ${cardData(other)?.name||'andere Vengeresse'} erhält +1 Ehre.`)}
  }else if(key==='amelia' && opp){opp.astralShield=Math.max(0,(opp.astralShield||0)-1);log(state,`${c.name}: Gegenüber verliert bis zu 1 ASTRAL-Schild.`)}
  else if(key==='mira'){
    const targets=state.players[1-p.index].bezSlots.map((x,i)=>x?i:null).filter(i=>i!==null);
    if(targets.length)state.pendingBezEffect={type:'mira',sourcePlayer:p.index,sourceSlot:slot};
    else log(state,`${c.name}: Keine gegnerische Bezwingerin als Ziel vorhanden.`);
  }
  else if(key==='lilith' && opp){opp.honor=(opp.honor||0)-1;log(state,`${c.name}: Gegenüber verliert 1 Ehre.`)}
  else if(key==='trix'){
    const n=countOwnAzrCards(p); const add=n>=3?2:n>=2?1:0; r.honor=(r.honor||0)+add;if(add)log(state,`${c.name}: ${n} eigene AZR-Karten → +${add} Ehre.`)
  }else if(key==='alice'){
    r.effectState=r.effectState||{};r.effectState.counterDodgeUses=1;r.effectState.counterDodgeActive=false;log(state,`${c.name}: einmaliges Ausweichen gespeichert.`);
  }else if(key==='lilith'){
    const oi=oppositeBezSlot(slot),t=state.players[1-p.index].bezSlots?.[oi];
    if(t){t.honor=Number(t.honor||0)-1;log(state,`${c.name}: ${cardData(t)?.name||'gegnerische Bezwingerin'} verliert 1 Ehre (${t.honor}).`);}else log(state,`${c.name}: keine gegnerische Bezwingerin direkt gegenüber.`);
  }else if(key==='baronesse'){
    const other=p.bezSlots.find((x,i)=>i!==slot&&x&&isVengeresseCard(cardData(x)));
    if(other){
      r.honor=Number(r.honor||0)+1;
      log(state,`${c.name}: Eine andere eigene Vengeresse liegt bereits aus → Baronesse erhält +1 Ehre.`);
    }
  }else if(key==='skorpia'){
    const n=countOwnAzrCards(p);
    if(n>=2){
      if(n>=3){r.honor=(r.honor||0)+1;log(state,`${c.name}: 3 eigene AZR-Karten → +1 Ehre.`);}
      state.pendingBezEffect={type:'skorpia_shield',sourcePlayer:p.index,sourceSlot:slot};
    }
  }else if(key==='thal'){
    const targets=thalZirisStage1Targets(state,p.index);
    if(targets.length)state.pendingBezEffect={type:'thal1',sourcePlayer:p.index,sourceSlot:slot};
    else log(state,`${c.name}: keine gültige eigene Karte mit aktiver Kampfrundendauer.`);
  }else if(key==='calypso'){r.ready=true;r.effectState.noRefugeAttackTurn=p.turnCount;log(state,`${c.name}: keine Einsatzverzögerung; Zuflucht ist in dieser KR kein Angriffsziel.`)}
  else if(key==='talisia2'){
    const targets=state.players[1-p.index].bezSlots.map((x,i)=>x&&((x.astralShield||0)>0)?i:null).filter(i=>i!==null);
    if(targets.length)state.pendingBezEffect={type:'talisia2',sourcePlayer:p.index,sourceSlot:slot};
    else log(state,`${c.name}: Kein gültiges gegnerisches Ziel mit ASTRAL-Schild vorhanden.`);
  }else if(key){log(state,`${c.name}: Ausspieleffekt „${c.effekt_text||key}“ ist erfasst; falls eine Ziel-/Suchauswahl nötig ist, wird er über die Effektsteuerung abgewickelt.`)}
}
function bezEffectInfo(state,slot){
 const p=active(state),r=p.bezSlots[slot];if(!r)return null;const c=cardData(r);if(!c)return null;
 return {symbol:c.effekt_symbol||'none',text:c.effekt_text||'',cost:Number(c.wunder?.kosten_ehre||0),usesRemaining:r.effectUsesRemaining,roundsRemaining:r.effectRoundsRemaining,disabled:!!r.effectDisabled,usedThisTurn:r.effectUsedTurn===p.turnCount,wonderUsed:r.wonderTurn===p.turnCount};
}
function activateBezEffect(state,slot,choice=null){
 const p=active(state),r=p.bezSlots[slot];if(!r)return {ok:false,msg:'Keine Bezwingerin in diesem Bereich.'};
 const c=cardData(r),sym=c?.effekt_symbol||'none',key=c?.effekte?.[0]?.engine_key;
 if(r.effectDisabled||sym==='none'||sym==='permanent'||sym==='duration'||sym==='on_play')return {ok:false,msg:'Dieser Effekt wird nicht manuell auf diese Weise aktiviert.'};

 // Thal Ziris Stufe 2: Kosten werden erst nach Zielwahl berechnet,
 // weil eine eigene Zielkarte 1 zusätzliche Ehre kostet.
 if(sym==='wonder' && key==='talisia1')return startTalisia1Wonder(state,slot);
 if(sym==='wonder' && key==='thal2'){
   if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Wunder können nur in VP oder NP gewirkt werden.'};
   if(r.wonderTurn===p.turnCount)return {ok:false,msg:'Dieses Wunder wurde in dieser Kampfrunde bereits gewirkt.'};
   if((r.honor||0)<2)return {ok:false,msg:'Benötigt mindestens 2 Ehre.'};
   const targets=thalZirisTargets(state);
   if(!targets.length)return {ok:false,msg:'Es gibt keine gültige Karte mit aktiver Kampfrundendauer.'};
   state.pendingBezEffect={type:'thal2',sourcePlayer:p.index,sourceSlot:slot};
   return {ok:true,pending:true,msg:'Thal Ziris: Wähle eine eigene oder gegnerische Karte mit Kampfrundendauer.'};
 }

 // Oberwelt-Wunder mit Zielauswahl: Kosten werden erst nach gültiger Zielwahl bezahlt.
 if(sym==='wonder' && key==='zahira')return startZahiraWonder(state,slot);
 if(sym==='wonder' && key==='cassandra')return startCassandraWonder(state,slot);
 if(sym==='wonder' && key==='psilo')return startPsiloWonder(state,slot);
 if(sym==='wonder' && key==='queen2')return startQueen2Wonder(state,slot);
 if(sym==='wonder' && key==='nemesis')return startNemesisWonder(state,slot);
 if(sym==='wonder' && key==='lilou2')return startLilou2Wonder(state,slot);
 if(sym==='wonder' && key==='baronesse2')return startBaronesse2Wonder(state,slot);

 // Bei normalen Effekten erst Validität prüfen, dann Ressourcen verbrauchen.
 if(key==='serinith'){
   if(!((choice==='astral_to_physical' && r.astralShield>=1)||(choice==='physical_to_astral' && r.physicalShield>=1)))
     return {ok:false,msg:'Wähle eine gültige Schild-Umwandlung.'};
 }else if(key==='evelyn'){
   if((r.berserkerMarks||0)<3)return {ok:false,msg:'Evelyn benötigt 3 Berserkermarken.'};
 }else if(key==='trix2'){
   if(!((choice==='astral_to_physical' && r.astral>=1)||(choice==='physical_to_astral' && r.physical>=1)))
     return {ok:false,msg:'Wähle eine gültige Stärke-Umwandlung.'};
 }

 if(sym==='wonder'){
   if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Wunder können nur in VP oder NP gewirkt werden.'};
   if(r.wonderTurn===p.turnCount)return {ok:false,msg:'Dieses Wunder wurde in dieser Kampfrunde bereits gewirkt.'};
   const cost=Number(r.wonderCostCurrent ?? c.wunder?.kosten_ehre ?? 0);if((r.honor||0)<cost)return {ok:false,msg:`Benötigt ${cost} Ehre.`};
   r.honor-=cost;r.wonderTurn=p.turnCount;
 }else if(sym==='charges'){
   if(r.effectUsedTurn===p.turnCount)return {ok:false,msg:'Dieser Effekt wurde in dieser Kampfrunde bereits aktiviert.'};
   if((r.effectUsesRemaining??0)<=0)return {ok:false,msg:'Keine Zählermarken mehr vorhanden.'};
   r.effectUsesRemaining--;r.effectUsedTurn=p.turnCount;
 }

 if(key==='serinith'){
   if(choice==='astral_to_physical'){r.astralShield--;r.physicalShield++;}
   else {r.physicalShield--;r.astralShield++;}
 }else if(key==='evelyn'){r.berserkerMarks-=3;r.hearts+=1;}
 else if(key==='saphira2'){r.astral=(r.astral||0)+1;r.wonderCostCurrent=Number(r.wonderCostCurrent ?? c.wunder?.kosten_ehre ?? 4)+1;}
 else if(key==='trix2'){
   if(choice==='astral_to_physical'){r.astral--;r.physical++;}
   else {r.physical--;r.astral++;}
 }else if(key==='martha2'){
   r.effectRoundsRemaining=Number(c.wunder?.dauer_kr||1);
   r.effectDisabled=false;
   r.effectState=r.effectState||{};
   r.effectState.physicalImmune=true;
   log(state,`${c.name}: physischer Schaden wird für ${r.effectRoundsRemaining} Kampfrunde ignoriert.`);
 }else {log(state,`${c.name}: Effekt aktiviert. Ziel-/Such-/Tokenauflösung muss entsprechend dem Kartentext ausgeführt werden.`);return {ok:true,manual:true,msg:`${c.name}: ${c.effekt_text}`};}
 log(state,`${c.name}: Effekt aktiviert.`);return {ok:true,msg:`Effekt von ${c.name} ausgeführt.`};
}

function allRuntimeCards(state){
 const out=[];
 state.players.forEach((p,pi)=>{
   if(p.refuge)out.push({playerIndex:pi,zone:'refuge',slot:null,r:p.refuge});
   p.bezSlots.forEach((r,i)=>{if(r)out.push({playerIndex:pi,zone:'bez',slot:i,r})});
   p.azr.forEach((r,i)=>{if(r&&!r.faceDown)out.push({playerIndex:pi,zone:'azr',slot:i,r})});
   if(p.secondary)out.push({playerIndex:pi,zone:'secondary',slot:null,r:p.secondary});
   (p.equipment||[]).forEach((eq,bi)=>['weapon','shield','armor','helmet'].forEach(kind=>{
     if(eq?.[kind])out.push({playerIndex:pi,zone:'equipment',slot:bi,kind,r:eq[kind]});
   }));
 });
 if(state.sharedPrimary)out.push({playerIndex:state.sharedPrimary.owner,zone:'primary',slot:null,r:state.sharedPrimary});
 return out;
}


function oppositeBezSlot(slot){return Number(slot)===0?1:0}
function currentBaseHearts(runtime){const c=cardData(runtime);return Number(runtime?.effectState?.baseHeartsOverride ?? c?.herzen ?? runtime?.hearts ?? 0)}
function isVengeresseCard(c){return String(c?.untertyp||'').toLowerCase()==='vengeresse'||(c?.tags||[]).some(t=>String(t).toLowerCase()==='vengeresse')||(c?.nebenattribute||[]).some(t=>String(t).toLowerCase()==='vengeresse')}
function ownSubtypeCount(p,subtype,excludeSlot=null){return (p.bezSlots||[]).filter((r,i)=>r&&i!==excludeSlot&&(String(subtype).toLowerCase()==='vengeresse'?isVengeresseCard(cardData(r)):String(cardData(r)?.untertyp||'').toLowerCase()===String(subtype).toLowerCase())).length}
function firstEnemyBezFightUsed(state,playerIndex){const p=state.players[playerIndex];return (p.bezSlots||[]).some(r=>r&&r.attackedTurn===p.turnCount)}
function activeArcadiaConstraint(state,attackerPlayerIndex){
  const opp=state.players[1-attackerPlayerIndex];
  for(let i=0;i<(opp.bezSlots||[]).length;i++){const r=opp.bezSlots[i],c=cardData(r);if(r&&c?.effekte?.some(e=>e.engine_key==='arcadia')&&!r.effectDisabled&&Number(r.effectRoundsRemaining)>0)return {slot:i,r,c};}
  return null;
}
function activateAliceDodge(state,slot){
  const p=active(state),r=p.bezSlots[slot],c=cardData(r);
  if(currentPhase(state).id!=='supply')return {ok:false,msg:'Alice kann ihren Effekt nur in der Versorgungsphase aktivieren.'};
  if(c?.effekte?.[0]?.engine_key!=='alice')return {ok:false,msg:'Diese Bezwingerin besitzt Alices Effekt nicht.'};
  r.effectState=r.effectState||{};
  if((r.effectState.counterDodgeUses||0)<=0)return {ok:false,msg:'Alices einmaliges Ausweichen wurde bereits verbraucht.'};
  r.effectState.counterDodgeUses--;r.effectState.counterDodgeActive=true;r.effectState.counterDodgeActivatedTurn=p.turnCount;
  log(state,`${c.name}: Ausweichen gegen den nächsten Gegenangriff dieser Kampfrunde aktiviert.`);
  return {ok:true,msg:'Alices Ausweichen aktiviert.'};
}
function expireAliceDodge(state){for(const p of state.players)for(const r of p.bezSlots||[])if(r?.effectState?.counterDodgeActive){r.effectState.counterDodgeActive=false;log(state,`${cardData(r)?.name||'Alice'}: aktiviertes Ausweichen verfällt am Ende der Kampfrunde.`);}}
function expireBaronesse2Arm(state){
  const p=active(state);
  for(const r of p.bezSlots||[]){
    if(r?.effectState?.baronesse2Armed){
      r.effectState.baronesse2Armed=false;
      log(state,`${cardData(r)?.name||'Baronesse'}: ungenutzter Wunder-Bonus verfällt am Ende der Kampfrunde.`);
    }
  }
}
function lilou2Targets(state,playerIndex){
  const p=state.players[playerIndex];
  return (p.discard||[]).map((entry,i)=>{const bild=typeof entry==='string'?entry:entry?.bild,c=dbCard(bild);return c?.deck_bereich==='bezwingerinnen'&&Number(c?.stufe)===1?{id:String(i),name:c.name,bild}:null}).filter(Boolean);
}
function matchingDevelopmentsForBase(baseBild){return DB.filter(c=>c.deck_bereich==='entwicklung'&&c.grundkarte_bild===baseBild)}
function startLilou2Wonder(state,slot){
  const p=active(state),r=p.bezSlots[slot],c=cardData(r);
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Wunder können nur in VP oder NP gewirkt werden.'};
  if(r.wonderTurn===p.turnCount)return {ok:false,msg:'Dieses Wunder wurde in dieser Kampfrunde bereits gewirkt.'};
  if(!(p.bezSlots||[]).some(x=>!x))return {ok:false,msg:'Keine freie Bezwingerinnen-Feldposition.'};
  if(!lilou2Targets(state,p.index).length)return {ok:false,msg:'Keine Bezwingerin der Stufe 1 in deiner Ablage.'};
  const cost=Number(r.wonderCostCurrent??c?.wunder?.kosten_ehre??3);if((r.honor||0)<cost)return {ok:false,msg:`Lilou benötigt ${cost} Ehre.`};
  state.pendingBezEffect={type:'lilou2_discard',sourcePlayer:p.index,sourceSlot:slot};return {ok:true,pending:true,msg:'Wähle eine Bezwingerin der Stufe 1 aus deiner Ablage.'};
}
function resolveLilou2Discard(state,index){
  const pend=state.pendingBezEffect;if(!pend||pend.type!=='lilou2_discard')return {ok:false,msg:'Keine Lilou-Auswahl aktiv.'};
  const p=state.players[pend.sourcePlayer],src=p.bezSlots[pend.sourceSlot],i=Number(index),entry=p.discard?.[i],bild=typeof entry==='string'?entry:entry?.bild,c=dbCard(bild);
  if(!src||!entry||c?.deck_bereich!=='bezwingerinnen'||Number(c?.stufe)!==1)return {ok:false,msg:'Ungültige Stufe-1-Bezwingerin.'};
  const free=(p.bezSlots||[]).map((x,j)=>!x?j:null).filter(j=>j!==null);if(!free.length)return {ok:false,msg:'Keine freie Bezwingerinnen-Feldposition mehr.'};
  const cost=Number(src.wonderCostCurrent??cardData(src)?.wunder?.kosten_ehre??3);if((src.honor||0)<cost)return {ok:false,msg:'Lilou besitzt nicht mehr genügend Ehre.'};
  src.honor-=cost;src.wonderTurn=p.turnCount;src.wonderCostCurrent=cost+1;p.discard.splice(i,1);
  const r=makeRuntimeCard(bild,p.index,p.turnCount);r.hearts=2;r.physical=0;r.honor=0;r.ready=false;r.effectState=r.effectState||{};r.effectState.baseHeartsOverride=2;r.effectState.basePhysicalOverride=0;r.effectState.baseHonorOverride=0;
  p.bezSlots[free[0]]=r;
  const devs=matchingDevelopmentsForBase(bild);
  const di=(p.discard||[]).findIndex(e=>{const b=typeof e==='string'?e:e?.bild;return devs.some(d=>d.bild===b)});
  if(di>=0){const de=p.discard.splice(di,1)[0],devBild=typeof de==='string'?de:de?.bild;if(devBild)p.development.push(devBild);}
  state.pendingBezEffect=null;log(state,`${c.name} wurde durch Lilou wiederbelebt. Basis: Herzen 2, physische Stärke 0, Ehre 0. Nächste Wunderkosten ${src.wonderCostCurrent}.`);
  return {ok:true,msg:`${c.name} wiederbelebt. Nächste Lilou-Wunderkosten: ${src.wonderCostCurrent} Ehre.`};
}
function startBaronesse2Wonder(state,slot){
  const p=active(state),r=p.bezSlots[slot],c=cardData(r);
  if(!['supply','resupply'].includes(currentPhase(state).id))
    return {ok:false,msg:'Baronesse kann ihr Wunder nur in VP oder NP wirken.'};
  if(r.wonderTurn===p.turnCount)return {ok:false,msg:'Dieses Wunder wurde in dieser Kampfrunde bereits gewirkt.'};
  const cost=Number(r.wonderCostCurrent??c?.wunder?.kosten_ehre??2);
  if((r.honor||0)<cost)return {ok:false,msg:`Baronesse benötigt ${cost} Ehre.`};
  r.honor-=cost;
  r.wonderTurn=p.turnCount;
  r.effectState=r.effectState||{};
  r.effectState.baronesse2Armed=true;
  r.effectState.baronesse2ArmedTurn=p.turnCount;
  log(state,`${c.name}: Wunder für ${cost} Ehre aktiviert. +1 physische Stärke beim nächsten passenden Angriff dieser KR.`);
  return {ok:true,msg:`Baronesse-Wunder aktiviert (${cost} Ehre bezahlt).`};
}
function baronesse2CanBuff(state,attackerSlot,target){
  const p=active(state),r=p.bezSlots[attackerSlot],c=cardData(r),d=target?.type==='bez'?opponent(state).bezSlots[target.slot]:null;
  return c?.effekte?.[0]?.engine_key==='baronesse2'&&currentPhase(state).id==='rush'&&!!d&&Number(d.hearts)<currentBaseHearts(d);
}
function thalZirisStage1Targets(state,playerIndex){
 return allRuntimeCards(state).filter(x=>x.playerIndex===playerIndex && x.r?.effectRoundsRemaining!==null && x.r?.effectRoundsRemaining!==undefined && !x.r.effectDisabled)
   .filter(x=>!(x.zone==='equipment' && x.kind==='weapon'))
   .map(x=>({id:`${x.playerIndex}|${x.zone}|${x.slot??''}|${x.kind||''}`,name:cardData(x.r)?.name||'Karte',roundsRemaining:x.r.effectRoundsRemaining}));
}
function resolveThalZirisStage1(state,targetId,delta){
 const pend=state.pendingBezEffect;if(!pend||pend.type!=='thal1')return {ok:false,msg:'Keine Thal-Ziris-Ausspieleffekt-Auswahl aktiv.'};
 const t=allRuntimeCards(state).find(x=>`${x.playerIndex}|${x.zone}|${x.slot??''}|${x.kind||''}`===targetId);
 if(!t||t.playerIndex!==pend.sourcePlayer||t.r.effectRoundsRemaining===null||t.r.effectRoundsRemaining===undefined)return {ok:false,msg:'Ungültiges eigenes Ziel.'};
 if(t.zone==='equipment'&&t.kind==='weapon')return {ok:false,msg:'Eigene Waffen sind ausgeschlossen.'};
 if(![-1,1].includes(Number(delta)))return {ok:false,msg:'Nur +1 oder −1 ist erlaubt.'};
 t.r.effectRoundsRemaining=Math.max(0,Number(t.r.effectRoundsRemaining)+Number(delta));
 state.pendingBezEffect=null;
 log(state,`Thal Ziris: ${cardData(t.r)?.name} → Kampfrundendauer ${t.r.effectRoundsRemaining}.`);
 if(t.r.effectRoundsRemaining===0)expireTimedFieldCardNow(state,t);
 return {ok:true,msg:`Kampfrundendauer auf ${t.r.effectRoundsRemaining} geändert.`};
}
function isMornak(c){return c?.name==='Mornak - Brut'}
function isMornakCard(c){return isMornak(c)||c?.effekte?.some?.(e=>e.engine_key==='mornak_brut')}
function mornakAllowedAreas(c){return isMornakCard(c)?['primary','secondary','azr']:(fieldArea(c)?[fieldArea(c)]:['azr'])}
function ownMornakLocations(state,playerIndex){
 const p=state.players[playerIndex],out=[];
 if(state.sharedPrimary && (state.sharedPrimary.controllerIndex??state.sharedPrimary.ownerIndex??state.sharedPrimary.owner)===playerIndex && isMornak(cardData(state.sharedPrimary)))out.push({zone:'primary',r:state.sharedPrimary});
 if(p.secondary && isMornak(cardData(p.secondary)))out.push({zone:'secondary',r:p.secondary});
 (p.azr||[]).forEach((r,i)=>{if(r&&isMornak(cardData(r))&&(r.controllerIndex??playerIndex)===playerIndex)out.push({zone:'azr',slot:i,r});});
 for(const op of state.players)(op.azr||[]).forEach((r,i)=>{if(r&&isMornak(cardData(r))&&r.controllerIndex===playerIndex&&!out.some(x=>x.r===r))out.push({zone:'enemy_azr',hostPlayer:op.index,slot:i,r});});
 return out;
}
function mornakTokenTargets(state,controllerIndex,allowEnemyAzr=false){
 const p=state.players[controllerIndex],out=[];
 if(!state.sharedPrimary)out.push({id:'primary',name:'Eigener PRIMÄR-Bereich'});
 if(!p.secondary)out.push({id:'secondary',name:'Eigener SEKUNDÄR-Bereich'});
 (p.azr||[]).forEach((r,i)=>{if(!r)out.push({id:`azr:${i}`,name:`Eigene ASTRAL-/Rüstkammer-Zone ${i+1}`})});
 if(allowEnemyAzr){
   const e=state.players[1-controllerIndex];
   (e.azr||[]).forEach((r,i)=>{if(!r)out.push({id:`enemyazr:${i}`,name:`Gegnerische ASTRAL-/Rüstkammer-Zone ${i+1} (unter deiner Kontrolle)`})});
 }
 return out;
}
function createMornakTokenRuntime(state,controllerIndex){
 const c=window.GODDESSES_DB?.karten?.find(x=>x.name==='Mornak - Brut');if(!c)return null;
 const r=makeRuntimeCard(c.bild,controllerIndex,state.players[controllerIndex].turnCount);
 r.faceDown=false;r.isToken=true;r.controllerIndex=controllerIndex;r.ownerIndex=controllerIndex;r.ready=true;
 return r;
}
function resolveMornakTokenPlacement(state,id){
 const pend=state.pendingBezEffect;if(!pend||pend.type!=='mornak_token_place')return {ok:false,msg:'Keine Mornak-Brut-Tokenplatzierung aktiv.'};
 const ctrl=pend.sourcePlayer,p=state.players[ctrl],r=createMornakTokenRuntime(state,ctrl);if(!r)return {ok:false,msg:'Mornak-Brut konnte nicht gefunden werden.'};
 const valid=mornakTokenTargets(state,ctrl,!!pend.allowEnemyAzr).some(t=>t.id===id);if(!valid)return {ok:false,msg:'Dieser Bereich ist nicht mehr frei.'};
 if(id==='primary')state.sharedPrimary=r;
 else if(id==='secondary')p.secondary=r;
 else if(String(id).startsWith('azr:'))p.azr[Number(String(id).split(':')[1])]=r;
 else if(String(id).startsWith('enemyazr:'))state.players[1-ctrl].azr[Number(String(id).split(':')[1])]=r;
 else return {ok:false,msg:'Ungültiger Bereich.'};
 state.pendingBezEffect=null;log(state,`Mornak-Brut TOKEN wurde in ${id} erzeugt.`);
 return {ok:true,msg:'Mornak-Brut-Token erzeugt und platziert.'};
}
function startMornakTokenPlacement(state,controllerIndex,allowEnemyAzr=false,source=''){
 const targets=mornakTokenTargets(state,controllerIndex,allowEnemyAzr);
 if(!targets.length){log(state,`${source||'Token-Effekt'}: kein freier Bereich für Mornak-Brut.`);return false;}
 state.pendingBezEffect={type:'mornak_token_place',sourcePlayer:controllerIndex,allowEnemyAzr:!!allowEnemyAzr,source};
 return true;
}
function startNemesisWonder(state,slot){
 const p=active(state),r=p.bezSlots[slot];
 if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Wunder können nur in VP oder NP gewirkt werden.'};
 if(r.wonderTurn===p.turnCount)return {ok:false,msg:'Dieses Wunder wurde in dieser Kampfrunde bereits gewirkt.'};
 const cost=ownMornakLocations(state,p.index).length?2:3;
 if((r.honor||0)<cost)return {ok:false,msg:`Nemesis benötigt ${cost} Ehre.`};
 const targets=mornakTokenTargets(state,p.index,false);if(!targets.length)return {ok:false,msg:'Kein freier Bereich für einen Mornak-Brut-Token.'};
 r.honor-=cost;r.wonderTurn=p.turnCount;
 state.pendingBezEffect={type:'mornak_token_place',sourcePlayer:p.index,allowEnemyAzr:false,source:'Nemesis'};
 log(state,`Nemesis wirkt ihr Wunder für ${cost} Ehre.`);
 return {ok:true,pending:true,msg:'Wähle einen freien Bereich für den Mornak-Brut-Token.'};
}
function expireTimedFieldCardNow(state,x){
 const c=cardData(x.r);
 if(c?.effekte?.some(e=>e.engine_key==='fluestern_brut')){
   destroyFieldRuntime(state,x,'nach Ablauf der eigenen Kampfrundendauer zerstört');
   return;
 }
 if(isAstralFragment(c)){destroyFieldRuntime(state,x,'nach Ablauf der Kampfrundendauer zerstört');startNextFragmentReward(state);return;}
 x.r.effectDisabled=true;
}
function thalZirisTargets(state){
 const source=state.pendingBezEffect?.sourcePlayer ?? state.activePlayer;
 return allRuntimeCards(state).filter(x=>{
   if(x.r.effectRoundsRemaining===null||x.r.effectRoundsRemaining===undefined||x.r.effectDisabled)return false;
   // Stufe-2-Text: nur EIGENE Waffen sind ausgeschlossen.
   if(x.playerIndex===source && x.zone==='equipment' && x.kind==='weapon')return false;
   return true;
 }).map((x,i)=>({id:`${x.playerIndex}|${x.zone}|${x.slot??''}|${x.kind||''}`,playerIndex:x.playerIndex,zone:x.zone,slot:x.slot,kind:x.kind||null,name:cardData(x.r)?.name||'Karte',roundsRemaining:x.r.effectRoundsRemaining,own:x.playerIndex===source}));
}
function findThalTarget(state,id){
 return allRuntimeCards(state).find(x=>`${x.playerIndex}|${x.zone}|${x.slot??''}|${x.kind||''}`===id)||null;
}
function resolveThalZiris(state,targetId,delta){
 const pend=state.pendingBezEffect;if(!pend||pend.type!=='thal2')return {ok:false,msg:'Keine Thal-Ziris-Auswahl aktiv.'};
 if(delta!==1&&delta!==-1)return {ok:false,msg:'Ungültige Änderung der Kampfrundendauer.'};
 const p=state.players[pend.sourcePlayer],src=p?.bezSlots?.[pend.sourceSlot],c=cardData(src);
 if(!src||c?.effekte?.[0]?.engine_key!=='thal2'){state.pendingBezEffect=null;return {ok:false,msg:'Thal Ziris ist nicht mehr auf dem Spielfeld.'};}
 const target=findThalTarget(state,targetId);
 if(!target||target.r.effectRoundsRemaining===null||target.r.effectRoundsRemaining===undefined||target.r.effectDisabled)
   return {ok:false,msg:'Dieses Ziel besitzt keine aktive Kampfrundendauer.'};
 if(target.playerIndex===pend.sourcePlayer && target.zone==='equipment' && target.kind==='weapon')
   return {ok:false,msg:'Eigene Waffen können von diesem Wunder nicht gewählt werden.'};
 const own=target.playerIndex===pend.sourcePlayer;
 const cost=2+(own?1:0);
 if((src.honor||0)<cost)return {ok:false,msg:`Für dieses Ziel werden ${cost} Ehre benötigt.`};
 src.honor-=cost;src.wonderTurn=p.turnCount;
 target.r.effectRoundsRemaining=Math.max(0,(target.r.effectRoundsRemaining||0)+delta);
 if(target.r.effectRoundsRemaining<=0){target.r.effectRoundsRemaining=0;target.r.effectDisabled=true;}
 state.pendingBezEffect=null;
 const direction=delta>0?'erhöht':'verringert';
 log(state,`${c.name}: Kampfrundendauer von ${cardData(target.r)?.name||'Karte'} um 1 ${direction} (${target.r.effectRoundsRemaining} verbleibend). Kosten: ${cost} Ehre.`);
 return {ok:true,msg:`Kampfrundendauer um 1 ${direction}. Noch ${target.r.effectRoundsRemaining} Kampfrunde(n).`};
}
function cancelPendingBezEffect(state){state.pendingBezEffect=null;return {ok:true,msg:'Effektauswahl abgebrochen.'};}





function startQueen2Wonder(state,slot){
  const p=active(state),r=p.bezSlots[slot],c=cardData(r);
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Wunder können nur in VP oder NP gewirkt werden.'};
  if(r.wonderTurn===p.turnCount)return {ok:false,msg:'Dieses Wunder wurde in dieser Kampfrunde bereits gewirkt.'};
  const cost=Number(r.wonderCostCurrent ?? c?.wunder?.kosten_ehre ?? 2);
  if((r.honor||0)<cost)return {ok:false,msg:`Q.U.E.E.N. benötigt ${cost} Ehre.`};
  const targets=queenDiscardTargets(state,p.index);
  if(!targets.length)return {ok:false,msg:'Weder Z.E.R.O. ATK noch Z.E.R.O. ASTRAL liegt in deiner Ablage.'};
  state.pendingBezEffect={type:'queen2_discard',sourcePlayer:p.index,sourceSlot:slot};
  return {ok:true,pending:true,msg:'Wähle Z.E.R.O. ATK oder Z.E.R.O. ASTRAL aus deiner Ablage.'};
}
function queenStackTargets(state,playerIndex){
  const p=state.players[playerIndex];
  return (p.stacks?.bezwingerinnen||[]).map((bild,i)=>({bild,i,c:dbCard(bild)}))
    .filter(x=>['Z.E.R.O. ATK','Z.E.R.O. ASTRAL'].includes(x.c?.name))
    .map(x=>({id:String(x.i),name:x.c.name}));
}
function resolveQueenSearch(state,index){
  const pend=state.pendingBezEffect;if(!pend||pend.type!=='queen_search')return {ok:false,msg:'Keine Q.U.E.E.N.-Suche aktiv.'};
  const p=state.players[pend.sourcePlayer],i=Number(index),bild=p.stacks?.bezwingerinnen?.[i],c=dbCard(bild);
  if(!bild||!['Z.E.R.O. ATK','Z.E.R.O. ASTRAL'].includes(c?.name))return {ok:false,msg:'Diese Karte ist kein gültiges Z.E.R.O.-Ziel mehr.'};
  p.stacks.bezwingerinnen.splice(i,1);p.hand.push(bild);state.pendingBezEffect=null;
  log(state,`${c.name} wurde aus dem Bezwingerinnen-Stapel auf die Hand genommen. Der Stapel wurde nicht gemischt.`);
  return {ok:true,msg:`${c.name} auf die Hand genommen.`};
}
function queenDiscardTargets(state,playerIndex){
  const p=state.players[playerIndex];
  return (p.discard||[]).map((entry,i)=>{
    const bild=typeof entry==='string'?entry:entry?.bild,c=dbCard(bild);
    return ['Z.E.R.O. ATK','Z.E.R.O. ASTRAL'].includes(c?.name)?{id:String(i),name:c.name}:null;
  }).filter(Boolean);
}
function resolveQueen2Discard(state,index){
  const pend=state.pendingBezEffect;if(!pend||pend.type!=='queen2_discard')return {ok:false,msg:'Keine Q.U.E.E.N.-Ablageauswahl aktiv.'};
  const p=state.players[pend.sourcePlayer],src=p.bezSlots[pend.sourceSlot],i=Number(index),entry=p.discard?.[i];
  const bild=typeof entry==='string'?entry:entry?.bild,c=dbCard(bild);
  if(!src||!entry||!['Z.E.R.O. ATK','Z.E.R.O. ASTRAL'].includes(c?.name))return {ok:false,msg:'Ungültiges Z.E.R.O.-Ziel.'};
  const cost=Number(src.wonderCostCurrent ?? cardData(src)?.wunder?.kosten_ehre ?? 2);
  if((src.honor||0)<cost)return {ok:false,msg:'Q.U.E.E.N. besitzt nicht mehr genügend Ehre.'};
  src.honor-=cost;src.wonderTurn=p.turnCount;src.wonderCostCurrent=cost+1;
  p.discard.splice(i,1);p.hand.push(bild);state.pendingBezEffect=null;
  log(state,`${c.name} wurde aus der Ablage auf die Hand genommen. Q.U.E.E.N.s nächste Wunderkosten: ${src.wonderCostCurrent} Ehre.`);
  return {ok:true,msg:`${c.name} auf die Hand genommen. Nächste Wunderkosten: ${src.wonderCostCurrent} Ehre.`};
}
function activateDeathPrimaryAttack(state,slot){
  const p=active(state),r=p.bezSlots[slot],c=cardData(r);
  if(currentPhase(state).id!=='rush')return {ok:false,msg:'D.E.A.T.H.s Primärangriff muss in der Ansturmphase aktiviert werden.'};
  if(c?.effekte?.[0]?.engine_key!=='death')return {ok:false,msg:'Diese Bezwingerin besitzt D.E.A.T.H.s Primärangriff nicht.'};
  r.effectState=r.effectState||{};
  if((r.effectState.primaryAttackUses||0)<=0)return {ok:false,msg:'Der einmalige Primärangriff wurde bereits verbraucht.'};
  if(r.effectState.primaryAttackActive)return {ok:false,msg:'Der Primärangriff ist bereits aktiviert.'};
  r.effectState.primaryAttackUses--;
  r.effectState.primaryAttackActive=true;
  r.effectState.primaryAttackActivatedTurn=p.turnCount;
  log(state,`${c.name}: Primärangriff für den nächsten Kampf dieser Kampfrunde aktiviert.`);
  return {ok:true,msg:'Primärangriff aktiviert.'};
}
function hasPrimaryAttack(r){return !!r?.effectState?.primaryAttackActive}
function hasSecondaryAttack(r){return !!r?.effectState?.secondaryAttackActive}
function combatTiming(attacker,defender){
  const aP=hasPrimaryAttack(attacker),aS=hasSecondaryAttack(attacker);
  const dP=hasPrimaryAttack(defender),dS=hasSecondaryAttack(defender);
  const attackerFirst=(aP&&!aS)||(dS&&!dP);
  const defenderFirst=(aS&&!aP)||(dP&&!dS);
  if(attackerFirst===defenderFirst)return 'simultaneous';
  return attackerFirst?'attacker_first':'defender_first';
}
function expireDeathPrimaryAttack(state){
  for(const p of state.players)for(const r of p.bezSlots||[]){
    if(r?.effectState?.primaryAttackActive){
      r.effectState.primaryAttackActive=false;
      log(state,`${cardData(r)?.name||'Primärangriff'}: aktivierter Primärangriff verfällt am Ende der Kampfrunde.`);
    }
  }
}
function policeTaxRequired(state,attackerPlayerIndex){
  const enemy=state.players[1-attackerPlayerIndex];
  return enemy?.bezSlots?.some(r=>r&&cardData(r)?.effekte?.[0]?.engine_key==='zero_police');
}
function applyPoliceAttackTax(state,attackerPlayer,attacker){
  if(!policeTaxRequired(state,attackerPlayer.index))return {ok:true};
  if(attackerPlayer.policeTaxTurn===attackerPlayer.turnCount)return {ok:true};
  if((attacker.honor||0)<1)return {ok:false,msg:'Z.E.R.O. P.O.L.I.C.E.: Die erste angreifende gegnerische Bezwingerin benötigt 1 Ehre.'};
  attacker.honor--;attackerPlayer.policeTaxTurn=attackerPlayer.turnCount;
  log(state,`Z.E.R.O. P.O.L.I.C.E.: ${cardData(attacker)?.name} zahlt 1 Ehre für den ersten Bezwingerinnen-Angriff dieser Kampfrunde.`);
  return {ok:true};
}
function isCreatureCard(c){
  if(!c)return false;
  return c.kreatur===true ||
    String(c.kartentyp||'').toLowerCase()==='kreatur' ||
    String(c.untertyp||'').toLowerCase()==='kreatur';
}
function startPsiloWonder(state,slot){
  const p=active(state),r=p.bezSlots[slot];
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Wunder können nur in VP oder NP gewirkt werden.'};
  if(r.wonderTurn===p.turnCount)return {ok:false,msg:'Dieses Wunder wurde in dieser Kampfrunde bereits gewirkt.'};
  const cost=Number(r.wonderCostCurrent ?? cardData(r)?.wunder?.kosten_ehre ?? 2);
  if((r.honor||0)<cost)return {ok:false,msg:`Psilo benötigt ${cost} Ehre.`};
  const targets=allRuntimeCards(state).filter(x=>isCreatureCard(cardData(x.r)));
  if(!targets.length)return {ok:false,msg:'Es liegt keine offene KREATUR als Ziel auf dem Spielfeld.'};
  state.pendingBezEffect={type:'psilo',sourcePlayer:p.index,sourceSlot:slot};
  return {ok:true,pending:true,msg:'Wähle eine offene KREATUR für +1 physische Stärke für einen Kampf.'};
}
function psiloTargets(state){
  return allRuntimeCards(state).filter(x=>isCreatureCard(cardData(x.r))).map(x=>({
    id:`${x.playerIndex}|${x.zone}|${x.slot??''}|${x.kind||''}`,
    name:cardData(x.r)?.name||'Kreatur',
    own:x.playerIndex===state.pendingBezEffect?.sourcePlayer
  }));
}
function resolvePsiloTarget(state,id){
  const pend=state.pendingBezEffect;if(!pend||pend.type!=='psilo')return {ok:false,msg:'Keine Psilo-Auswahl aktiv.'};
  const p=state.players[pend.sourcePlayer],src=p.bezSlots[pend.sourceSlot];
  if(!src)return {ok:false,msg:'Psilo ist nicht mehr vorhanden.'};
  const target=allRuntimeCards(state).find(x=>`${x.playerIndex}|${x.zone}|${x.slot??''}|${x.kind||''}`===id);
  if(!target||!isCreatureCard(cardData(target.r)))return {ok:false,msg:'Ungültige Kreatur.'};
  const cost=Number(src.wonderCostCurrent ?? cardData(src)?.wunder?.kosten_ehre ?? 2);
  if((src.honor||0)<cost)return {ok:false,msg:'Psilo besitzt nicht mehr genügend Ehre.'};
  src.honor-=cost;src.wonderTurn=p.turnCount;
  target.r.effectState=target.r.effectState||{};
  target.r.effectState.psiloPhysicalBonus=Number(target.r.effectState.psiloPhysicalBonus||0)+1;
  state.pendingBezEffect=null;
  log(state,`${cardData(target.r)?.name}: Psilo-Bonus jetzt +${target.r.effectState.psiloPhysicalBonus} physische Stärke für den nächsten Kampf dieser KREATUR.`);
  return {ok:true,msg:`Psilos Bonus wurde gestapelt: +${target.r.effectState.psiloPhysicalBonus} physische Stärke bis zum nächsten Kampf.`};
}
function expirePsiloBonuses(state){
  // Psilos Bonus besitzt keine Kampfrundendauer. Er bleibt auch über mehrere
  // Kampfrunden erhalten und wird ausschließlich durch den nächsten Kampf
  // der gewählten KREATUR verbraucht.
}
function consumePsiloBonus(runtime){
  if(!runtime?.effectState?.psiloPhysicalBonus)return 0;
  const n=Number(runtime.effectState.psiloPhysicalBonus||0);
  delete runtime.effectState.psiloPhysicalBonus;
  delete runtime.effectState.psiloBonusRoundSerial;
  return n;
}
function isAstralFragment(c){
  return c?.kartentyp==='Reliquie' && String(c?.untertyp||'').toLowerCase()==='astralfragment';
}
function keylaSearchTargets(state,playerIndex){
  const p=state.players[playerIndex];
  return (p.stacks?.ruestkammer||[]).map((bild,i)=>({bild,i,c:dbCard(bild)}))
    .filter(x=>isAstralFragment(x.c))
    .map(x=>({id:String(x.i),name:x.c?.name||'ASTRALFRAGMENT'}));
}
function resolveKeylaSearch(state,index){
  const pend=state.pendingBezEffect;
  if(!pend||!['keyla_search','keyla2_search'].includes(pend.type))return {ok:false,msg:'Keine Keyla-Suche aktiv.'};
  const p=state.players[pend.sourcePlayer],i=Number(index),bild=p.stacks?.ruestkammer?.[i],c=dbCard(bild);
  if(!bild||!isAstralFragment(c))return {ok:false,msg:'Diese Karte ist keine passende ASTRALFRAGMENT-Reliquie mehr.'};
  p.stacks.ruestkammer.splice(i,1);p.hand.push(bild);state.pendingBezEffect=null;
  log(state,`${c.name} wurde aus dem Rüstkammer-Stapel auf die Hand genommen. Der Stapel wurde nicht gemischt.`);
  return {ok:true,msg:`${c.name} auf die Hand genommen.`};
}
function keyla2DestroyTargets(state){
  return allRuntimeCards(state).filter(x=>cardData(x.r)?.kartentyp==='Reliquie').map(x=>({
    id:`${x.playerIndex}|${x.zone}|${x.slot??''}|${x.kind||''}`,
    name:cardData(x.r)?.name||'Reliquie',
    own:x.playerIndex===state.pendingBezEffect?.sourcePlayer
  }));
}
function keyla2DiscardTargets(state,playerIndex){
  const p=state.players[playerIndex];
  return (p.discard||[]).map((r,i)=>{
    const bild=typeof r==='string'?r:r?.bild;
    const c=dbCard(bild);
    return isAstralFragment(c)?{id:String(i),name:c.name}:null;
  }).filter(Boolean);
}
function removeRuntimeFromZone(state,target){
  const p=state.players[target.playerIndex];
  if(target.zone==='azr')p.azr[target.slot]=null;
  else if(target.zone==='secondary')p.secondary=null;
  else if(target.zone==='primary')state.sharedPrimary=null;
  else if(target.zone==='equipment' && p.equipment?.[target.slot])p.equipment[target.slot][target.kind]=null;
  else return false;
  return true;
}
function queueFragmentReward(state,ownerIndex,cardRuntime){
  const c=cardData(cardRuntime),reward=c?.effekte?.[0]?.on_destroy_reward;
  if(!reward)return;
  state.fragmentRewardQueue=state.fragmentRewardQueue||[];
  state.fragmentRewardQueue.push({ownerIndex,cardName:c.name,reward});
  startNextFragmentReward(state);
}
function startNextFragmentReward(state){
  if(state.pendingBezEffect || !state.fragmentRewardQueue?.length)return;
  const next=state.fragmentRewardQueue.shift(),p=state.players[next.ownerIndex];
  if(!p?.bezSlots?.some(Boolean)){
    log(state,`${next.cardName}: Zerstörungseffekt hat keine eigene Bezwingerin als gültiges Ziel.`);
    return startNextFragmentReward(state);
  }
  state.pendingBezEffect={type:'fragment_reward',sourcePlayer:next.ownerIndex,reward:next.reward,cardName:next.cardName};
}
function destroyFieldRuntime(state,target,reason='zerstört'){
  const r=target.r,p=state.players[target.playerIndex],c=cardData(r);
  if(!removeRuntimeFromZone(state,target))return {ok:false,msg:'Diese Karte kann aus ihrer Zone nicht zerstört werden.'};
  p.discard.push(r);
  log(state,`${c?.name||'Karte'} wird ${reason} und auf die Ablage gelegt.`);
  if(isAstralFragment(c))queueFragmentReward(state,target.playerIndex,r);
  if(c?.effekte?.some(e=>e.engine_key==='fluestern_brut')){
    startMornakTokenPlacement(state,r.controllerIndex??target.playerIndex,true,'Flüstern der Brut');
  }
  return {ok:true,msg:`${c?.name||'Reliquie'} wurde zerstört.`};
}
function resolveKeyla2Choice(state,choice){
  const pend=state.pendingBezEffect;if(!pend||pend.type!=='keyla2_choice')return {ok:false,msg:'Keine Keyla-Auswahl aktiv.'};
  const p=state.players[pend.sourcePlayer];
  if(choice==='destroy'){
    const targets=keyla2DestroyTargets(state);
    if(!targets.length){state.pendingBezEffect=null;return {ok:false,msg:'Keine offene Reliquie zum Zerstören vorhanden.'};}
    state.pendingBezEffect={...pend,type:'keyla2_destroy'};return {ok:true,pending:true,msg:'Wähle eine offene Reliquie.'};
  }
  if(choice==='search'){
    const targets=keylaSearchTargets(state,pend.sourcePlayer);
    if(!targets.length){state.pendingBezEffect=null;return {ok:false,msg:'Keine ASTRALFRAGMENT-Reliquie im Rüstkammer-Stapel.'};}
    state.pendingBezEffect={...pend,type:'keyla2_search'};return {ok:true,pending:true,msg:'Wähle eine ASTRALFRAGMENT-Reliquie aus dem Rüstkammer-Stapel.'};
  }
  if(choice==='discard'){
    const targets=keyla2DiscardTargets(state,pend.sourcePlayer);
    if(!targets.length){state.pendingBezEffect=null;return {ok:false,msg:'Keine ASTRALFRAGMENT-Reliquie in der eigenen Ablage.'};}
    state.pendingBezEffect={...pend,type:'keyla2_discard'};return {ok:true,pending:true,msg:'Wähle eine ASTRALFRAGMENT-Reliquie aus deiner Ablage.'};
  }
  return {ok:false,msg:'Ungültige Keyla-Aktion.'};
}
function resolveKeyla2Destroy(state,id){
  const pend=state.pendingBezEffect;if(!pend||pend.type!=='keyla2_destroy')return {ok:false,msg:'Keine Reliquien-Zerstörung aktiv.'};
  const target=allRuntimeCards(state).find(x=>`${x.playerIndex}|${x.zone}|${x.slot??''}|${x.kind||''}`===id);
  if(!target||cardData(target.r)?.kartentyp!=='Reliquie')return {ok:false,msg:'Ungültige Reliquie.'};
  state.pendingBezEffect=null;
  const rr=destroyFieldRuntime(state,target,'durch Keyla zerstört');
  startNextFragmentReward(state);
  return rr;
}
function resolveKeyla2Discard(state,index){
  const pend=state.pendingBezEffect;if(!pend||pend.type!=='keyla2_discard')return {ok:false,msg:'Keine Ablageauswahl aktiv.'};
  const p=state.players[pend.sourcePlayer],i=Number(index),entry=p.discard?.[i],bild=typeof entry==='string'?entry:entry?.bild,c=dbCard(bild);
  if(!entry||!isAstralFragment(c))return {ok:false,msg:'Ungültige ASTRALFRAGMENT-Reliquie.'};
  p.discard.splice(i,1);p.hand.push(bild);state.pendingBezEffect=null;
  return {ok:true,msg:`${c.name} wurde aus der Ablage auf die Hand genommen.`};
}
function fragmentRewardTargets(state){
  const pend=state.pendingBezEffect;if(!pend||pend.type!=='fragment_reward')return [];
  return state.players[pend.sourcePlayer].bezSlots.map((r,i)=>r?{id:String(i),name:cardData(r)?.name||'Bezwingerin'}:null).filter(Boolean);
}
function resolveFragmentReward(state,id){
  const pend=state.pendingBezEffect;if(!pend||pend.type!=='fragment_reward')return {ok:false,msg:'Kein ASTRALFRAGMENT-Zerstörungseffekt aktiv.'};
  const p=state.players[pend.sourcePlayer],t=p.bezSlots[Number(id)];if(!t)return {ok:false,msg:'Ungültige eigene Bezwingerin.'};
  const rw=pend.reward||{};
  if(rw.hearts)t.hearts=(t.hearts||0)+rw.hearts;
  if(rw.honor)t.honor=(t.honor||0)+rw.honor;
  if(rw.physicalShield)t.physicalShield=(t.physicalShield||0)+rw.physicalShield;
  if(rw.astralShield)t.astralShield=(t.astralShield||0)+rw.astralShield;
  log(state,`${pend.cardName}: Zerstörungseffekt auf ${cardData(t)?.name} angewandt.`);
  state.pendingBezEffect=null;startNextFragmentReward(state);
  return {ok:true,msg:'ASTRALFRAGMENT-Zerstörungseffekt ausgeführt.'};
}
function runtimeControllerIndex(x){return Number(x?.r?.controllerIndex ?? x?.r?.owner ?? x?.playerIndex)}
function tickFieldDurations(state){
  const targets=allRuntimeCards(state).filter(x=>
    x.zone!=='bez' &&
    x.r?.effectRoundsRemaining!==null &&
    x.r?.effectRoundsRemaining!==undefined &&
    !x.r.effectDisabled &&
    runtimeControllerIndex(x)===state.activePlayer
  );
  for(const x of targets){
    x.r.effectRoundsRemaining--;
    if(x.r.effectRoundsRemaining<=0){
      x.r.effectRoundsRemaining=0;
      expireTimedFieldCardNow(state,x);
    }
  }
  startNextFragmentReward(state);
}
function awardEvelynBerserkerMarks(state,attackSnapshot){
  if(!attackSnapshot)return;
  const refs=[];
  const ap=state.players[attackSnapshot.attackerPlayer];
  if(attackSnapshot.attackerKind==='bez'){
    const r=ap?.bezSlots?.[attackSnapshot.attackerSlot];if(r)refs.push(r);
  }
  if(attackSnapshot.targetType==='bez'){
    const dp=state.players[attackSnapshot.defenderPlayer];
    const r=dp?.bezSlots?.[attackSnapshot.defenderSlot];if(r)refs.push(r);
  }
  const seen=new Set();
  refs.forEach(r=>{
    if(seen.has(r))return;seen.add(r);
    if(cardData(r)?.effekte?.some(e=>e.engine_key==='evelyn_berserker')){
      r.berserkerMarks=(r.berserkerMarks||0)+1;
      log(state,`${cardData(r).name}: +1 Berserkermarke am Ende der Kampfphase (${r.berserkerMarks}).`);
    }
  });
}
function startZahiraWonder(state,slot){
  const p=active(state),r=p.bezSlots[slot];
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Wunder können nur in VP oder NP gewirkt werden.'};
  if(r.wonderTurn===p.turnCount)return {ok:false,msg:'Dieses Wunder wurde in dieser Kampfrunde bereits gewirkt.'};
  if((r.honor||0)<1)return {ok:false,msg:'Zahira benötigt 1 Ehre.'};
  if(!p.bezSlots.some((x,i)=>x&&i!==slot))return {ok:false,msg:'Es gibt keine andere eigene Bezwingerin als Ziel.'};
  state.pendingBezEffect={type:'zahira',sourcePlayer:p.index,sourceSlot:slot};
  return {ok:true,pending:true,msg:'Wähle eine andere eigene Bezwingerin für +1 Ehre.'};
}
function startCassandraWonder(state,slot){
  const p=active(state),r=p.bezSlots[slot];
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Wunder können nur in VP oder NP gewirkt werden.'};
  if(r.wonderTurn===p.turnCount)return {ok:false,msg:'Dieses Wunder wurde in dieser Kampfrunde bereits gewirkt.'};
  if((r.honor||0)<3)return {ok:false,msg:'Cassandra benötigt 3 Ehre.'};
  state.pendingBezEffect={type:'cassandra',sourcePlayer:p.index,sourceSlot:slot};
  return {ok:true,pending:true,msg:'Wähle eine eigene Bezwingerin für +1 Herz.'};
}
function meniaDaggerTargets(state){
  const pend=state.pendingBezEffect;if(!pend||pend.type!=='menia_dagger')return [];
  const p=state.players[pend.sourcePlayer];
  return (p.stacks?.ruestkammer||[]).map((bild,i)=>({bild,i,c:dbCard(bild)}))
    .filter(x=>String(x.c?.untertyp||'').toLowerCase()==='dolch')
    .map(x=>({id:String(x.i),name:x.c?.name||'Dolch',bild:x.bild}));
}
function resolveMeniaDagger(state,index){
  const pend=state.pendingBezEffect;if(!pend||pend.type!=='menia_dagger')return {ok:false,msg:'Keine Menia-Dolchsuche aktiv.'};
  const p=state.players[pend.sourcePlayer],menia=p.bezSlots[pend.sourceSlot];
  if(!menia){state.pendingBezEffect=null;return {ok:false,msg:'Menia ist nicht mehr auf dem Spielfeld.'};}
  ensureEquipmentState(p);
  if(p.equipment?.[pend.sourceSlot]?.weapon){state.pendingBezEffect=null;return {ok:false,msg:'Menias Waffenplatz ist nicht mehr frei.'};}
  const i=Number(index),bild=p.stacks?.ruestkammer?.[i],c=dbCard(bild);
  if(!bild||String(c?.untertyp||'').toLowerCase()!=='dolch')return {ok:false,msg:'Dieser Dolch befindet sich nicht mehr an der erwarteten Position im Stapel.'};
  p.stacks.ruestkammer.splice(i,1);
  const r=makeRuntimeCard(bild,p.index,p.turnCount);
  r.effectState=r.effectState||{};r.effectState.permanentMeniaDagger=true;
  const rr=equipRuntimeToBez(state,p,r,pend.sourceSlot,'weapon');
  if(!rr.ok){p.stacks.ruestkammer.splice(i,0,bild);return rr;}
  state.pendingBezEffect=null;
  log(state,`${c?.name||'Dolch'} wurde durch Menias Effekt dauerhaft ausgerüstet. Der Rüstkammer-Stapel wurde nicht gemischt.`);
  return {ok:true,msg:`${c?.name||'Dolch'} wurde dauerhaft an Menia ausgerüstet.`};
}
function checkedEffectTargets(state){
 const pend=state.pendingBezEffect;if(!pend)return [];const p=state.players[pend.sourcePlayer],enemy=state.players[1-pend.sourcePlayer];
 if(pend.type==='skorpia_shield')return [{id:'physical',name:'+1 physischer Schild'},{id:'astral',name:'+1 ASTRAL-Schild'}];
 if(pend.type==='shield')return p.bezSlots.map((r,i)=>r&&i!==pend.sourceSlot?{id:String(i),name:cardData(r)?.name||'Bezwingerin'}:null).filter(Boolean);
 if(pend.type==='psilo')return psiloTargets(state);
 if(pend.type==='fragment_reward')return fragmentRewardTargets(state);
 if(pend.type==='zahira')return p.bezSlots.map((r,i)=>r&&i!==pend.sourceSlot?{id:String(i),name:cardData(r)?.name||'Bezwingerin'}:null).filter(Boolean);
 if(pend.type==='cassandra')return p.bezSlots.map((r,i)=>r?{id:String(i),name:cardData(r)?.name||'Bezwingerin'}:null).filter(Boolean);
 if(pend.type==='mira')return enemy.bezSlots.map((r,i)=>r?{id:String(i),name:cardData(r)?.name||'Bezwingerin'}:null).filter(Boolean);
 if(pend.type==='talisia2')return enemy.bezSlots.map((r,i)=>r&&(r.astralShield||0)>0?{id:String(i),name:cardData(r)?.name||'Bezwingerin'}:null).filter(Boolean);
 if(pend.type==='talisia1_source'){const a=[];p.bezSlots.forEach((r,i)=>{if(r&&(r.astralShield||0)>0)a.push({id:`bez:${i}`,name:cardData(r)?.name||'Bezwingerin'})});if(p.refuge&&(p.refuge.astralShield||0)>0)a.push({id:'refuge',name:cardData(p.refuge)?.name||'Zuflucht'});return a;}
 if(pend.type==='talisia1_target')return p.bezSlots.map((r,i)=>r?{id:String(i),name:cardData(r)?.name||'Bezwingerin'}:null).filter(Boolean);return [];
}
function resolveCheckedEffectTarget(state,id){
 const pend=state.pendingBezEffect;if(!pend)return {ok:false,msg:'Keine Effektauswahl aktiv.'};
 if(pend.type==='fragment_reward')return resolveFragmentReward(state,id);
 const p=state.players[pend.sourcePlayer],enemy=state.players[1-pend.sourcePlayer],src=p.bezSlots[pend.sourceSlot],c=cardData(src);
 if(!src){state.pendingBezEffect=null;return {ok:false,msg:'Quellkarte ist nicht mehr auf dem Spielfeld.'};}
 if(pend.type==='skorpia_shield'){
   if(!['physical','astral'].includes(id))return {ok:false,msg:'Ungültige Schildwahl.'};
   if(id==='physical')src.physicalShield=(src.physicalShield||0)+1;else src.astralShield=(src.astralShield||0)+1;
   state.pendingBezEffect=null;log(state,`${c.name}: +1 ${id==='physical'?'physischer':'ASTRAL'} Schild.`);return {ok:true,msg:'Skorpias Schildbonus angewandt.'};
 }
 if(pend.type==='shield'){
   const t=p.bezSlots[Number(id)];if(!t||Number(id)===pend.sourceSlot)return {ok:false,msg:'S.H.I.E.L.D. muss eine andere eigene Bezwingerin wählen.'};
   t.physicalShield=(t.physicalShield||0)+1;state.pendingBezEffect=null;
   log(state,`${c.name}: ${cardData(t)?.name} erhält 1 physischen Schild.`);return {ok:true,msg:'1 physischer Schild hinzugefügt.'};
 }
 if(pend.type==='psilo')return resolvePsiloTarget(state,id);
 if(pend.type==='zahira'){
   const t=p.bezSlots[Number(id)];if(!t||Number(id)===pend.sourceSlot)return {ok:false,msg:'Zahira muss eine andere eigene Bezwingerin wählen.'};
   if((src.honor||0)<1)return {ok:false,msg:'Zahira besitzt nicht mehr genügend Ehre.'};
   src.honor--;src.wonderTurn=p.turnCount;t.honor=(t.honor||0)+1;state.pendingBezEffect=null;
   log(state,`${c.name}: ${cardData(t)?.name} erhält 1 Ehre.`);return {ok:true,msg:'1 Ehre hinzugefügt.'};
 }
 if(pend.type==='cassandra'){
   const t=p.bezSlots[Number(id)];if(!t)return {ok:false,msg:'Ungültiges Ziel.'};
   if((src.honor||0)<3)return {ok:false,msg:'Cassandra besitzt nicht mehr genügend Ehre.'};
   src.honor-=3;src.wonderTurn=p.turnCount;t.hearts=(t.hearts||0)+1;state.pendingBezEffect=null;
   log(state,`${c.name}: ${cardData(t)?.name} erhält 1 Herz.`);return {ok:true,msg:'1 Herz hinzugefügt.'};
 }
 if(pend.type==='mira'){const t=enemy.bezSlots[Number(id)];if(!t)return {ok:false,msg:'Ungültiges Ziel.'};t.ready=false;t.effectState=t.effectState||{};t.effectState.delayLockedUntilSupply={sourcePlayer:pend.sourcePlayer,sourceTurn:p.turnCount+1};state.pendingBezEffect=null;log(state,`${c.name}: ${cardData(t)?.name} bleibt bis zum Beginn der nächsten eigenen VP in Einsatzverzögerung.`);return {ok:true,msg:'Einsatzverzögerung erzwungen.'};}
 if(pend.type==='talisia2'){const t=enemy.bezSlots[Number(id)];if(!t||(t.astralShield||0)<1)return {ok:false,msg:'Ziel besitzt keinen ASTRAL-Schild.'};t.astralShield--;src.astralShield=(src.astralShield||0)+1;state.pendingBezEffect=null;log(state,`${c.name}: 1 ASTRAL-Schild übernommen.`);return {ok:true,msg:'1 ASTRAL-Schild auf Talisia übertragen.'};}
 if(pend.type==='talisia1_source'){let s=id==='refuge'?p.refuge:(String(id).startsWith('bez:')?p.bezSlots[Number(String(id).split(':')[1])]:null);if(!s||(s.astralShield||0)<1)return {ok:false,msg:'Quelle besitzt keinen ASTRAL-Schild.'};state.pendingBezEffect={...pend,type:'talisia1_target',sourceCardId:id};return {ok:true,pending:true,msg:'Wähle eine eigene Bezwingerin, die 1 Herz erhält.'};}
 if(pend.type==='talisia1_target'){const t=p.bezSlots[Number(id)];if(!t)return {ok:false,msg:'Ungültiges Ziel.'};const sid=pend.sourceCardId;let s=sid==='refuge'?p.refuge:(String(sid).startsWith('bez:')?p.bezSlots[Number(String(sid).split(':')[1])]:null);if(!s||(s.astralShield||0)<1)return {ok:false,msg:'Quelle besitzt keinen ASTRAL-Schild mehr.'};if((src.honor||0)<2)return {ok:false,msg:'Talisia besitzt nicht mehr genügend Ehre.'};s.astralShield--;t.hearts=(t.hearts||0)+1;src.honor-=2;src.wonderTurn=p.turnCount;state.pendingBezEffect=null;log(state,`${c.name}: 1 ASTRAL-Schild in 1 Herz umgewandelt.`);return {ok:true,msg:'Talisias Wunder ausgeführt.'};}
 return {ok:false,msg:'Unbekannte Effektauswahl.'};
}
function startTalisia1Wonder(state,slot){
 const p=active(state),r=p.bezSlots[slot],c=cardData(r);if(c?.effekte?.[0]?.engine_key!=='talisia1')return {ok:false,msg:'Falsche Karte.'};if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Wunder nur in VP oder NP.'};if(r.wonderTurn===p.turnCount)return {ok:false,msg:'Wunder bereits benutzt.'};if((r.honor||0)<2)return {ok:false,msg:'Benötigt 2 Ehre.'};if(!(p.bezSlots.some(x=>x&&(x.astralShield||0)>0)||(p.refuge&&(p.refuge.astralShield||0)>0)))return {ok:false,msg:'Keine Quelle mit ASTRAL-Schild.'};state.pendingBezEffect={type:'talisia1_source',sourcePlayer:p.index,sourceSlot:slot};return {ok:true,pending:true,msg:'Wähle die Quelle des ASTRAL-Schildes.'};
}
function releaseMiraDelayLocks(state){const p=active(state);p.bezSlots.forEach(r=>{const lock=r?.effectState?.delayLockedUntilSupply;if(lock&&lock.sourcePlayer===p.index&&p.turnCount>=lock.sourceTurn){delete r.effectState.delayLockedUntilSupply;r.ready=true;log(state,`${cardData(r)?.name}: Miras Einsatzverzögerung endet.`);}});}
function jeanneForcedTarget(state,attackerSource){const src=attackerKindAndSlot(attackerSource);if(src.kind!=='bez')return null;const p=active(state),opp=opponent(state),attacker=p.bezSlots[src.slot];if(!attacker)return null;const js=opp.bezSlots.map((r,i)=>r&&cardData(r)?.effekte?.[0]?.engine_key==='jeanne_taunt'?{r,slot:i}:null).filter(Boolean);for(const j of js){const n=Number(cardData(j.r)?.effekte?.[0]?.forced_attackers||0);if(n>=2)return {type:'bez',slot:j.slot,label:cardData(j.r)?.name};if(n===1&&p.bezSlots.filter(x=>x&&x.attackedTurn===p.turnCount).length===0)return {type:'bez',slot:j.slot,label:cardData(j.r)?.name};}return null;}

function tickBezEffectDurations(state){
 const p=active(state);
 for(const r of p.bezSlots||[]){
   if(!r||r.effectDisabled||r.effectRoundsRemaining===null||r.effectRoundsRemaining===undefined)continue;
   r.effectRoundsRemaining--;
   if(r.effectRoundsRemaining<=0){
     const c=cardData(r);
     if(c?.effekte?.[0]?.engine_key==='martha2'){
       r.effectRoundsRemaining=null;r.effectState=r.effectState||{};r.effectState.physicalImmune=false;r.effectDisabled=false;
       log(state,`${c.name}: Schutz vor physischem Schaden ist nach der eigenen Kampfrunde abgelaufen.`);
     }else{
       r.effectRoundsRemaining=0;r.effectDisabled=true;
       log(state,`${c?.name||'Ein Effekt'} ist nach Ablauf der eigenen Kampfrunden deaktiviert.`);
     }
   }
 }
}

function setFaceDown(state,handIndex,slot){
  const p=active(state);
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Karten können hier nur in Versorgungs- oder Nachschubphase gesetzt werden.'};
  if(p.azr[slot])return {ok:false,msg:'Dieser ASTRAL-/Rüstkammer-Bereich ist belegt.'};
  const bild=p.hand[handIndex],c=dbCard(bild);
  if(!c || !['astral','ruestkammer'].includes(c.deck_bereich))return {ok:false,msg:'Nur ASTRAL- oder Rüstkammer-Karten können hier gesetzt werden.'};
  p.hand.splice(handIndex,1);
  const r=makeRuntimeCard(bild,p.index,p.turnCount);
  r.faceDown=true;
  p.azr[slot]=r;
  log(state,`${p.name} setzt eine Karte verdeckt in die ASTRAL-/Rüstkammer-Zone.`);
  return {ok:true};
}
function playOpenAzr(state,handIndex,slot){
  const p=active(state);
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Karten können hier nur in Versorgungs- oder Nachschubphase ausgespielt werden.'};
  if(p.azr[slot])return {ok:false,msg:'Dieser ASTRAL-/Rüstkammer-Bereich ist belegt.'};
  const bild=p.hand[handIndex],c=dbCard(bild);
  if(!c || !['astral','ruestkammer'].includes(c.deck_bereich))return {ok:false,msg:'Nur ASTRAL- oder Rüstkammer-Karten können hier ausgespielt werden.'};
  if(isEquipmentCard(c)){
    return {ok:false,msg:`${c.kartentyp} darf offen nicht in der AZR liegen. Spiele die Karte direkt an eine Bezwingerin oder setze sie verdeckt.`};
  }
  const area=fieldArea(c);
  if(area && !isMornakCard(c)){
    return {ok:false,msg:`Diese Karte gehört offen in den ${area==='primary'?'Primär':'Sekundär'}bereich. Alternativ kannst du sie verdeckt in die AZR setzen.`};
  }
  p.hand.splice(handIndex,1);
  const r=makeRuntimeCard(bild,p.index,p.turnCount);
  r.faceDown=false;
  if(c?.effekte?.some(e=>e.engine_key==='fluestern_brut')){
    r.effectRoundsRemaining=2;r.effectState=r.effectState||{};r.effectState.durationOwnRounds=true;
  }
  p.azr[slot]=r;
  log(state,`${p.name} spielt ${c.name} offen in die ASTRAL-/Rüstkammer-Zone.${c?.effekte?.some(e=>e.engine_key==='fluestern_brut')?' Kampfrundendauer: 2 eigene KR.':''}`);
  return {ok:true};
}
function playFieldFromHand(state,handIndex,area){
  const p=active(state);
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Primär- und Sekundärkarten können nur in Versorgungs- oder Nachschubphase ausgespielt werden.'};
  const bild=p.hand[handIndex],c=dbCard(bild);
  const allowed=mornakAllowedAreas(c);
  if(!c || !allowed.includes(area) || !['primary','secondary'].includes(area))return {ok:false,msg:'Diese Karte gehört nicht in diesen Bereich.'};

  if(area==='primary'){
    if(state.sharedPrimary)return {ok:false,msg:'Der gemeinsame Primärbereich ist bereits belegt.'};
  }else{
    if(p.secondary)return {ok:false,msg:'Dein Sekundärbereich ist bereits belegt.'};
  }

  p.hand.splice(handIndex,1);
  const r=makeRuntimeCard(bild,p.index,p.turnCount);
  r.faceDown=false;

  if(area==='primary')state.sharedPrimary=r;
  else p.secondary=r;

  log(state,`${p.name} spielt ${c.name} offen in den ${area==='primary'?'Primär':'Sekundär'}bereich.`);
  return {ok:true};
}
function moveMornakFromAzr(state,azrSlot,area){
  const p=active(state),r=p.azr[azrSlot],c=cardData(r);
  if(!r || r.faceDown || !isMornakCard(c))return {ok:false,msg:'Hier liegt keine aufgedeckte Mornak-Brut.'};
  if(!['primary','secondary','azr'].includes(area))return {ok:false,msg:'Ungültiger Bereich für Mornak-Brut.'};
  if(area==='azr'){
    state.pendingFieldCard=null;
    log(state,`${p.name} lässt ${c.name} offen in der ASTRAL-/Rüstkammer-Zone.`);
    return {ok:true,msg:'Mornak-Brut bleibt offen in der ASTRAL-/Rüstkammer-Zone.'};
  }
  if(area==='primary'){
    if(state.sharedPrimary)return {ok:false,msg:'Der gemeinsame Primärbereich ist bereits belegt.'};
    state.sharedPrimary=r;
  }else{
    if(p.secondary)return {ok:false,msg:'Dein Sekundärbereich ist bereits belegt.'};
    p.secondary=r;
  }
  p.azr[azrSlot]=null;state.pendingFieldCard=null;
  log(state,`${p.name} verschiebt ${c.name} in den ${area==='primary'?'Primär':'Sekundär'}bereich.`);
  return {ok:true,msg:`Mornak-Brut in den ${area==='primary'?'Primär':'Sekundär'}bereich verschoben.`};
}
function moveRevealedFieldCard(state,azrSlot){
  const p=active(state),r=p.azr[azrSlot];
  if(!r || r.faceDown)return {ok:false,msg:'Hier liegt keine aufgedeckte Karte.'};
  const c=cardData(r),area=fieldArea(c);
  if(!area)return {ok:false,msg:'Diese Karte gehört nicht in Primär- oder Sekundärbereich.'};

  if(area==='primary'){
    if(state.sharedPrimary)return {ok:false,msg:'Der gemeinsame Primärbereich ist bereits belegt. Die aufgedeckte Karte kann noch nicht verschoben werden.'};
    state.sharedPrimary=r;
  }else{
    if(p.secondary)return {ok:false,msg:'Dein Sekundärbereich ist bereits belegt. Die aufgedeckte Karte kann noch nicht verschoben werden.'};
    p.secondary=r;
  }
  p.azr[azrSlot]=null;
  state.pendingFieldCard=null;
  log(state,`${p.name} verschiebt ${c?.name||'die aufgedeckte Karte'} regelkonform in den ${area==='primary'?'Primär':'Sekundär'}bereich.`);
  return {ok:true};
}
function equipRuntimeToBez(state,p,r,bezSlot,kind){
  ensureEquipmentState(p);
  if(!p.bezSlots[bezSlot])return {ok:false,msg:'In diesem Bereich liegt keine Bezwingerin.'};
  const c=cardData(r);
  const actualKind=equipmentKind(c);
  if(!actualKind || actualKind!==kind)return {ok:false,msg:'Diese Ausrüstung gehört nicht in diesen Bereich.'};

  const previous=p.equipment[bezSlot][kind];
  if(previous?.effectState?.permanentMeniaDagger)return {ok:false,msg:'Menias dauerhaft ausgerüsteter Dolch kann nicht ersetzt werden.'};
  if(previous){
    discardRuntime(p,previous);
    log(state,`${cardData(previous)?.name||'Die bisherige Ausrüstung'} wird ersetzt und auf den Ablagestapel gelegt.`);
  }

  r.faceDown=false;
  p.equipment[bezSlot][kind]=r;
  initializeEquipmentCombatState(r,p);
  const prof=equipmentCombatProfile(r);
  log(state,`${p.name} legt ${c?.name||'eine Ausrüstung'} als ${equipmentLabel(kind)} an Bezwingerin ${bezSlot+1} an.`);
  return {ok:true,needsShieldChoice:!!prof.shieldChoice && !r.shieldChoice};
}
function equipFromHand(state,handIndex,bezSlot,kind){
  const p=active(state);
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Ausrüstungen können nur in Versorgungs- oder Nachschubphase angelegt werden.'};
  const bild=p.hand[handIndex],c=dbCard(bild);
  if(!c || equipmentKind(c)!==kind)return {ok:false,msg:'Diese Handkarte gehört nicht in diesen Ausrüstungsbereich.'};
  if(!p.bezSlots[bezSlot])return {ok:false,msg:'Hier liegt keine Bezwingerin, an die die Ausrüstung angelegt werden kann.'};

  p.hand.splice(handIndex,1);
  const r=makeRuntimeCard(bild,p.index,p.turnCount);
  return equipRuntimeToBez(state,p,r,bezSlot,kind);
}
function equipFromAzr(state,azrSlot,bezSlot,kind){
  const p=active(state);
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Verdeckte Ausrüstung kann nur in Versorgungs- oder Nachschubphase aktiviert werden.'};
  const r=p.azr[azrSlot];
  if(!r || r.faceDown)return {ok:false,msg:'Die Ausrüstung muss zuerst aufgedeckt werden.'};
  const c=cardData(r);
  if(!c || equipmentKind(c)!==kind)return {ok:false,msg:'Diese Karte gehört nicht in diesen Ausrüstungsbereich.'};

  const result=equipRuntimeToBez(state,p,r,bezSlot,kind);
  if(result.ok){
    p.azr[azrSlot]=null;
    state.pendingEquipment=null;
  }
  return result;
}
function discardEquipment(state,bezSlot,kind){
  const p=active(state);
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Ausrüstungen können nur in Versorgungs- oder Nachschubphase freiwillig abgelegt werden.'};
  ensureEquipmentState(p);
  const r=p.equipment[bezSlot]?.[kind];
  if(!r)return {ok:false,msg:'In diesem Ausrüstungsbereich liegt keine Karte.'};
  if(r.effectState?.permanentMeniaDagger)return {ok:false,msg:'Dieser Dolch wurde durch Menia dauerhaft ausgerüstet und kann nicht freiwillig abgelegt werden.'};
  discardRuntime(p,r);
  p.equipment[bezSlot][kind]=null;
  log(state,`${p.name} legt ${cardData(r)?.name||'eine Ausrüstung'} freiwillig auf den Ablagestapel.`);
  return {ok:true};
}
function reveal(state,slot){
  const p=active(state),r=p.azr[slot];
  if(!r || !r.faceDown)return {ok:false,msg:'Hier liegt keine verdeckte Karte.'};
  const c=cardData(r);

  if(isEquipmentCard(c)){
    if(!['supply','resupply'].includes(currentPhase(state).id)){
      return {ok:false,msg:'Verdeckte Waffe, Schild, Rüstung oder Kopfschutz kann nur in Versorgungs- oder Nachschubphase aktiviert werden.'};
    }
    r.faceDown=false;
    state.pendingEquipment={owner:p.index,azrSlot:slot,kind:equipmentKind(c)};
    log(state,`${p.name} deckt ${c?.name||'eine Ausrüstung'} auf. Sie muss jetzt sofort an eine Bezwingerin angelegt werden.`);
    return {ok:true,needsEquipmentPlacement:true,kind:equipmentKind(c)};
  }

  const area=fieldArea(c);
  if(area){
    if(!['supply','resupply'].includes(currentPhase(state).id)){
      return {ok:false,msg:'Diese Primär-/Sekundärkarte kann in der aktuellen Grundversion nur in Versorgungs- oder Nachschubphase aktiviert werden.'};
    }
    r.faceDown=false;
    if(isMornakCard(c)){
      state.pendingFieldCard={owner:p.index,azrSlot:slot,area:'mornak_choice'};
      log(state,`${p.name} deckt ${c.name} auf. Wähle PRIMÄR, SEKUNDÄR oder lasse sie offen in der AZR.`);
      return {ok:true,needsFieldPlacement:true,area:'mornak_choice',msg:'Mornak-Brut: Zielbereich wählen.'};
    }
    state.pendingFieldCard={owner:p.index,azrSlot:slot,area};
    const moved=moveRevealedFieldCard(state,slot);
    if(moved.ok)return moved;
    log(state,`${p.name} deckt ${c?.name||'eine Karte'} auf. Sie muss in den ${area==='primary'?'Primär':'Sekundär'}bereich verschoben werden, sobald dieser frei ist.`);
    return {ok:true,needsFieldPlacement:true,area,msg:moved.msg};
  }

  if(!['honor','supply','rush','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'In dieser Phase kann die gesetzte Karte in der Grundversion nicht aktiviert werden.'};
  r.faceDown=false;
  log(state,`${p.name} deckt ${c?.name||'eine gesetzte Karte'} auf. Der individuelle Karteneffekt ist noch nicht implementiert.`);
  return {ok:true};
}

function isRefugeRuntime(runtime){
  const c=cardData(runtime);
  return !!c && String(c.kartentyp||'').toLowerCase()==='zuflucht';
}
function canRefugeAttack(state,playerIndex=state.activePlayer){
  const p=state.players[playerIndex];
  if(!p?.refuge)return false;
  // Vom Nutzer bestätigte Zuflucht-Regel: Sie darf nur angreifen, wenn auf
  // der eigenen Spielfeldseite keine Bezwingerin vorhanden ist.
  if(p.bezSlots.some(Boolean))return false;
  return canAttack(p.refuge,p);
}
function refugeWonderAvailable(state){
  const p=active(state),r=p.refuge,c=cardData(r);
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Wunder können nur in Versorgungs- oder Nachschubphase gewirkt werden.'};
  if(!c?.wunder)return {ok:false,msg:'Diese Zuflucht besitzt kein Wunder.'};
  if(r.wonderTurn===p.turnCount)return {ok:false,msg:'Diese Zuflucht hat in dieser Kampfrunde bereits ein Wunder gewirkt.'};
  const cost=Number(c.wunder.kosten_ehre||0);
  if((r.honor||0)<cost)return {ok:false,msg:`Für dieses Wunder werden ${cost} Ehre auf der Zuflucht benötigt.`};
  const nonempty=['bezwingerinnen','astral','ruestkammer'].some(k=>p.stacks[k]?.length);
  if(!nonempty)return {ok:false,msg:'Alle drei Hauptstapel sind leer.'};
  return {ok:true,cost};
}
function activateRefugeWonder(state){
  if(state.pendingWonderDraw)return {ok:false,msg:'Es wartet bereits eine Kartenziehung aus einem Wunder.'};
  const chk=refugeWonderAvailable(state);
  if(!chk.ok)return chk;
  const p=active(state),r=p.refuge;
  r.honor-=chk.cost;
  r.wonderTurn=p.turnCount;
  state.pendingWonderDraw={playerIndex:p.index,source:'refuge'};
  log(state,`${p.name} wirkt das Wunder der Zuflucht für ${chk.cost} Ehre und darf eine Karte von einem Hauptstapel ziehen.`);
  return {ok:true,needsStackChoice:true,msg:'Wunder aktiviert. Wähle einen der drei Hauptstapel.'};
}
function resolveWonderDraw(state,stack){
  const pending=state.pendingWonderDraw;
  if(!pending)return {ok:false,msg:'Es wartet keine Kartenziehung aus einem Wunder.'};
  if(pending.playerIndex!==state.activePlayer)return {ok:false,msg:'Die offene Wunder-Kartenziehung gehört nicht dem aktiven Spieler.'};
  const r=drawFrom(state,pending.playerIndex,stack);
  if(!r.ok)return r;
  state.pendingWonderDraw=null;
  return {ok:true,bild:r.bild,msg:'Wunder abgewickelt: Eine Karte wurde gezogen.'};
}
function chooseRefugeStage2Bonus(state,type){
  const pending=state.pendingRefugeStage2Choice;
  if(!pending)return {ok:false,msg:'Es wartet keine Auswahl für eine Stufe-2-Zuflucht.'};
  if(pending.playerIndex!==state.activePlayer)return {ok:false,msg:'Diese Auswahl gehört nicht dem aktiven Spieler.'};
  if(!['physical','astral'].includes(type))return {ok:false,msg:'Ungültige Auswahl.'};
  const p=active(state),r=p.refuge;
  if(type==='physical')r.physical=(r.physical||0)+1;
  else r.astral=(r.astral||0)+1;
  state.pendingRefugeStage2Choice=null;
  log(state,`${p.name} gibt der Stufe-2-Zuflucht dauerhaft +1 ${type==='physical'?'Physische':'ASTRAL'} Stärke.`);
  return {ok:true,msg:`Stufe-2-Effekt: +1 ${type==='physical'?'Physische':'ASTRAL'} Stärke gewählt.`};
}
function availableDevelopment(state,runtime){
  if(!runtime)return null;
  const p=active(state);
  return p.development
    .map(dbCard)
    .find(c=>c && c.grundkarte_bild===runtime.bild && c.stufe===runtime.stufe+1) || null;
}
function develop(state,kind,slot=null){
  const p=active(state);
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Entwicklungen sind nur in Versorgungs- oder Nachschubphase möglich.'};
  const r=kind==='refuge'?p.refuge:p.bezSlots[slot];
  if(!r)return {ok:false,msg:'Keine Karte vorhanden.'};
  if(r.developedTurn===p.turnCount)return {ok:false,msg:'Diese Karte wurde in dieser Kampfrunde bereits entwickelt.'};
  const dev=availableDevelopment(state,r);
  if(!dev)return {ok:false,msg:'Keine passende Karte der nächsten Stufe im Entwicklungsstapel.'};
  const kosten=dev.stufe;
  if(r.honor<kosten)return {ok:false,msg:`Für Stufe ${dev.stufe} werden ${kosten} Ehre auf dieser Karte benötigt.`};

  // Bereits verlorene Herzen und Basis-Schilde bleiben auch nach einer
  // Entwicklung verloren. Beispiel: 5 -> aktuell 3 Herzen = 2 Schaden.
  // Hat die neue Stufe 7 Herzen, startet sie deshalb mit 5 statt 7.
  const alt=cardData(r);

  const alteMaxHerzen=alt?.herzen ?? r.hearts ?? 0;
  const alterMaxPhysSchild=alt?.physischer_schild ?? r.physicalShield ?? 0;
  const alterMaxAstralSchild=alt?.astraler_schild ?? r.astralShield ?? 0;

  const herzSchaden=Math.max(0,alteMaxHerzen-(r.hearts ?? 0));
  const physSchildSchaden=Math.max(0,alterMaxPhysSchild-(r.physicalShield ?? 0));
  const astralSchildSchaden=Math.max(0,alterMaxAstralSchild-(r.astralShield ?? 0));

  const deploymentReadyBeforeDevelopment=r.ready;
  r.honor-=kosten;
  p.development=p.development.filter(x=>x!==dev.bild);
  r.developmentStack.push(dev.bild);
  r.bild=dev.bild;
  r.stufe=dev.stufe;

  const neueMaxHerzen=dev.herzen ?? alteMaxHerzen;
  const neuerMaxPhysSchild=dev.physischer_schild ?? alterMaxPhysSchild;
  const neuerMaxAstralSchild=dev.astraler_schild ?? alterMaxAstralSchild;

  r.hearts=Math.max(0,neueMaxHerzen-herzSchaden);
  r.physicalShield=Math.max(0,neuerMaxPhysSchild-physSchildSchaden);
  r.astralShield=Math.max(0,neuerMaxAstralSchild-astralSchildSchaden);

  // Angriffswerte sind keine verbrauchten Ressourcen und werden daher
  // direkt auf die Werte der neuen Entwicklungsstufe gesetzt.
  r.physical=dev.physische_staerke ?? r.physical;
  r.astral=dev.astrale_staerke ?? r.astral;
  r.ready=deploymentReadyBeforeDevelopment;

  r.developedTurn=p.turnCount;
  log(state,`${p.name} entwickelt ${dev.name} auf Stufe ${dev.stufe}. Bereits erlittener Herz- und Schildschaden bleibt erhalten.`);

  // Alle aktuell vorhandenen Stufe-2-Zufluchten besitzen beim Ausspielen
  // die einmalige Wahl: +1 Physische ODER +1 ASTRAL-Stärke.
  if(kind==='refuge' && dev.stufe===2){state.pendingRefugeStage2Choice={playerIndex:p.index};return {ok:true,needsRefugeStage2Choice:true,msg:'Zuflucht auf Stufe 2 entwickelt. Wähle jetzt +1 Physische oder +1 ASTRAL-Stärke.'};}
  if(kind==='bez'){resolveBezOnPlay(state,p,slot,r,dev);if(state.pendingBezEffect)return {ok:true,pendingBezEffect:true,msg:`${dev.name} entwickelt. Ausspieleffekt auswählen.`};}
  return {ok:true};
}
function canAttack(runtime,p){
  // Einsatzverzögerte Karten können angegriffen werden, aber selbst nicht angreifen.
  return !!runtime && runtime.ready && runtime.attackedTurn!==p.turnCount;
}
function hasHeartAttribute(runtime){
  if(!runtime)return false;
  const c=cardData(runtime);
  return c?.herzen !== null && c?.herzen !== undefined;
}
function targetKey(t){
  return `${t.type}:${t.slot??''}`;
}
function attackerRuntime(state,attackerSource){
  const p=active(state);
  if(attackerSource==='refuge' || attackerSource?.type==='refuge')return p.refuge;
  const slot=typeof attackerSource==='number' ? attackerSource : attackerSource?.slot;
  return p.bezSlots[slot];
}
function attackerKindAndSlot(attackerSource){
  if(attackerSource==='refuge' || attackerSource?.type==='refuge')return {kind:'refuge',slot:null};
  const slot=typeof attackerSource==='number' ? attackerSource : attackerSource?.slot;
  return {kind:'bez',slot};
}
function attackTargets(state,attackerSource){
  const opp=opponent(state);
  const targets=[];
  const src=attackerKindAndSlot(attackerSource);

  opp.bezSlots.forEach((r,i)=>{
    if(r && hasHeartAttribute(r))targets.push({type:'bez',slot:i,label:cardData(r)?.name||`Bezwingerin ${i+1}`});
  });
  if(opp.secondary && hasHeartAttribute(opp.secondary))targets.push({type:'secondary',label:cardData(opp.secondary)?.name||'Sekundärbereich'});
  if(state.sharedPrimary && state.sharedPrimary.owner===opp.index && hasHeartAttribute(state.sharedPrimary)){
    targets.push({type:'primary',label:cardData(state.sharedPrimary)?.name||'Primärbereich'});
  }

  const forcedJeanne=jeanneForcedTarget(state,attackerSource);
  const forcedJeanneTarget=forcedJeanne
    ? targets.find(t=>targetKey(t)===targetKey(forcedJeanne))
    : null;

  // Arcadia: Solange ihre Kampfrundendauer aktiv ist, muss die erste
  // gegnerische Bezwingerin, die in dieser KR tatsächlich kämpft, Arcadia
  // physisch angreifen. 0 physische Stärke macht den Angriff nicht unmöglich.
  // Ein anderer bereits zwingender Zieleffekt (z.B. Jeanne auf einem anderen
  // Ziel) kann Arcadias "falls möglich" aufheben.
  if(src.kind==='bez' && !firstEnemyBezFightUsed(state,active(state).index)){
    const arc=activeArcadiaConstraint(state,active(state).index);
    if(arc){
      const arcTarget=targets.find(t=>t.type==='bez' && t.slot===arc.slot);
      const conflictingJeanne=forcedJeanneTarget && targetKey(forcedJeanneTarget)!==targetKey(arcTarget||{});
      if(arcTarget && !conflictingJeanne){
        return [{...arcTarget,forcedAttackType:'physical'}];
      }
    }
  }

  // Jeanne gilt nur, wenn Jeanne nach den übrigen Grundregeln tatsächlich
  // ein legales Ziel ist ("falls möglich").
  if(forcedJeanneTarget)return [forcedJeanneTarget];

  const noBez=opp.bezSlots.every(x=>!x);
  if(src.kind==='bez'){
    const ar=attackerRuntime(state,attackerSource),ac=cardData(ar);
    const calypsoBlocked=ac?.effekte?.[0]?.engine_key==='calypso' && ar?.enteredTurn===active(state).turnCount;
    // Eine Bezwingerin darf die gegnerische Zuflucht nur angreifen,
    // wenn beim Gegner überhaupt keine Bezwingerin mehr auf dem Feld liegt.
    // Dadurch gilt die Zielregel bereits in der allerersten nutzbaren Ansturmphase
    // genauso wie in allen späteren Kampfrunden.
    if(!calypsoBlocked && noBez && hasHeartAttribute(opp.refuge)){
      targets.push({type:'refuge',label:`Zuflucht von ${opp.name}`});
    }
  }else{
    // Eine Zuflucht besitzt keinen gegenüberliegenden Bezwingerinnen-Slot.
    // Daher ist der direkte Angriff auf die gegnerische Zuflucht erst möglich,
    // wenn dort keine Bezwingerin mehr vorhanden ist.
    if(noBez && hasHeartAttribute(opp.refuge))targets.push({type:'refuge',label:`Zuflucht von ${opp.name}`});
  }
  return targets;
}
function prepareAttack(state,attackerSource,target,attackType){
  if(currentPhase(state).id!=='rush')return {ok:false,msg:'Angriffe werden in der Ansturmphase festgelegt.'};
  const p=active(state),src=attackerKindAndSlot(attackerSource),r=attackerRuntime(state,attackerSource);
  if(src.kind==='refuge'){
    if(!canRefugeAttack(state,p.index))return {ok:false,msg:'Die Zuflucht kann nur angreifen, wenn auf deiner Spielfeldseite keine Bezwingerin vorhanden ist.'};
  }else if(!canAttack(r,p)){
    return {ok:false,msg:'Diese Bezwingerin ist einsatzverzögert oder hat bereits angegriffen.'};
  }
  if(!['physical','astral'].includes(attackType))return {ok:false,msg:'Ungültige Angriffsart.'};
  const legalTarget=attackTargets(state,attackerSource).find(t=>targetKey(t)===targetKey(target));
  if(legalTarget?.forcedAttackType && attackType!==legalTarget.forcedAttackType)return {ok:false,msg:'Arcadia erzwingt für diesen Kampf einen physischen Angriff.'};
  const legal=!!legalTarget;
  if(!legal)return {ok:false,msg:'Dieses Angriffsziel ist nach der Grundregel nicht zulässig.'};

  // Z.E.R.O. P.O.L.I.C.E. greift erst, wenn die Bezwingerin einen ansonsten
  // vollständig legalen Angriff beginnen möchte. Ein ungültiges Ziel oder eine
  // falsche Angriffsart verbraucht weder Ehre noch den permanenten Effekt.
  if(src.kind==='bez'){
    const tax=applyPoliceAttackTax(state,p,r);
    if(!tax.ok)return tax;
  }

  state.attack={
    attackerKind:src.kind,
    attackerSlot:src.slot,
    target,
    attackType,
    defenderConfirmed:false,
    revealedDuringDefense:false
  };
  log(state,`${p.name} kündigt mit ${cardData(r)?.name||'einer Karte'} einen ${attackType==='physical'?'physischen':'ASTRAL'} Angriff an.`);
  return {ok:true};
}
function defenderFaceDownSlots(state){
  if(!state.attack)return [];
  const opp=opponent(state);
  return opp.azr.map((r,i)=>r?.faceDown?i:null).filter(i=>i!==null);
}
function revealDefenderCard(state,slot){
  if(currentPhase(state).id!=='rush' || !state.attack)return {ok:false,msg:'Es wartet kein Angriff auf die Reaktion des Verteidigers.'};
  const opp=opponent(state),r=opp.azr[slot];
  if(!r || !r.faceDown)return {ok:false,msg:'In diesem AZR-Feld liegt keine verdeckte Karte.'};
  r.faceDown=false;
  state.attack.revealedDuringDefense=true;
  log(state,`${opp.name} aktiviert die verdeckte Karte in AZR ${slot+1}: ${cardData(r)?.name||'Karte'}.`);
  return {ok:true};
}
function confirmAttack(state){
  if(currentPhase(state).id!=='rush' || !state.attack)return {ok:false,msg:'Es ist kein Angriff vorbereitet.'};
  state.attack.defenderConfirmed=true;
  state.phaseIndex=6;
  log(state,`${opponent(state).name} lässt den Angriff zu. Die Kampfphase beginnt.`);
  return {ok:true};
}
function applyDamage(runtime,amount,type){
  if(!runtime || amount<=0)return {shield:0,hearts:0};
  if(type==='physical' && runtime.effectState?.physicalImmune)return {shield:0,hearts:0};
  const shieldKey=type==='physical'?'physicalShield':'astralShield';
  const shieldLoss=Math.min(runtime[shieldKey]||0,amount);
  runtime[shieldKey]-=shieldLoss;
  amount-=shieldLoss;
  const heartLoss=Math.min(runtime.hearts||0,amount);
  runtime.hearts-=heartLoss;
  return {shield:shieldLoss,hearts:heartLoss};
}
function shieldSourcesForBez(state,playerIndex,bezSlot,type){
  const p=state.players[playerIndex],r=p.bezSlots[bezSlot];
  if(!r)return [];
  ensureEquipmentState(p);
  const shieldKey=type==='physical'?'physicalShield':'astralShield';
  const sources=[];
  if(cardData(r)?.name==='Geißel der Galaxie Nemesis'){
    ownMornakLocations(state,playerIndex).forEach((m,i)=>{
      if((m.r.hearts||0)>0)sources.push({source:'mornak',kind:String(i),label:`Schaden auf Mornak-Brut umleiten (${m.r.hearts} Herz)`,value:m.r.hearts,mornakIndex:i});
    });
  }

  for(const kind of ['shield','armor','helmet','weapon']){
    const eq=p.equipment[bezSlot]?.[kind];
    if(!eq)continue;
    initializeEquipmentCombatState(eq,p);
    const value=eq[shieldKey]||0;
    if(value>0){
      sources.push({
        source:'equipment',
        kind,
        label:`${cardData(eq)?.name||equipmentLabel(kind)} (${value})`,
        value
      });
    }
  }

  const baseValue=r[shieldKey]||0;
  if(baseValue>0){
    sources.push({
      source:'base',
      kind:'base',
      label:`Basisschild von ${cardData(r)?.name||'Bezwingerin'} (${baseValue})`,
      value:baseValue
    });
  }
  return sources;
}
function applyChosenShieldSource(state,packet,choice){
  const p=state.players[packet.playerIndex];
  const r=p.bezSlots[packet.bezSlot];
  if(!r)return {ok:false,msg:'Die betroffene Bezwingerin ist nicht mehr vorhanden.'};
  const shieldKey=packet.type==='physical'?'physicalShield':'astralShield';

  let sourceRuntime=null,label='';
  if(choice.source==='base'){
    sourceRuntime=r;
    label=`Basisschild von ${cardData(r)?.name||'Bezwingerin'}`;
  }else if(choice.source==='mornak'){
    const loc=ownMornakLocations(state,packet.playerIndex)[Number(choice.mornakIndex??choice.kind)];
    if(!loc?.r)return {ok:false,msg:'Diese Mornak-Brut ist nicht mehr vorhanden.'};
    const loss=Math.min(loc.r.hearts||0,packet.remaining);
    loc.r.hearts-=loss;packet.remaining-=loss;packet.heartLoss=(packet.heartLoss||0)+loss;
    log(state,`Mornak-Brut übernimmt ${loss} Schaden für Nemesis.`);
    if((loc.r.hearts||0)<=0){
      let target=null;
      if(loc.zone==='primary')target={playerIndex:packet.playerIndex,zone:'primary',r:loc.r};
      else if(loc.zone==='secondary')target={playerIndex:packet.playerIndex,zone:'secondary',r:loc.r};
      else if(loc.zone==='azr')target={playerIndex:packet.playerIndex,zone:'azr',slot:loc.slot,r:loc.r};
      else if(loc.zone==='enemy_azr')target={playerIndex:loc.hostPlayer,zone:'azr',slot:loc.slot,r:loc.r};
      if(target)destroyFieldRuntime(state,target,'durch umgeleiteten Schaden zerstört');
    }
    return {ok:true,loss};
  }else if(choice.source==='equipment'){
    ensureEquipmentState(p);
    sourceRuntime=p.equipment[packet.bezSlot]?.[choice.kind];
    if(!sourceRuntime)return {ok:false,msg:'Diese Ausrüstung ist nicht mehr vorhanden.'};
    label=cardData(sourceRuntime)?.name||equipmentLabel(choice.kind);
  }else{
    return {ok:false,msg:'Ungültige Schildquelle.'};
  }

  const available=sourceRuntime[shieldKey]||0;
  if(available<=0)return {ok:false,msg:'Diese Schildquelle besitzt keine passenden Schildpunkte mehr.'};

  const loss=Math.min(available,packet.remaining);
  sourceRuntime[shieldKey]-=loss;
  packet.remaining-=loss;
  packet.shieldLoss=(packet.shieldLoss||0)+loss;
  log(state,`${label} fängt ${loss} ${packet.type==='physical'?'physischen':'ASTRAL'} Schaden ab.`);
  return {ok:true,loss};
}
function finishDamagePacketWithoutShields(state,packet){
  const p=state.players[packet.playerIndex];
  const r=p.bezSlots[packet.bezSlot];
  if(!r || packet.remaining<=0)return;
  const heartLoss=Math.min(r.hearts||0,packet.remaining);
  r.hearts-=heartLoss;
  packet.remaining-=heartLoss;
  packet.heartLoss=(packet.heartLoss||0)+heartLoss;
  if(heartLoss>0){
    log(state,`${cardData(r)?.name||'Bezwingerin'} verliert ${heartLoss} Herz${heartLoss===1?'':'en'}.`);
  }
  // Überschüssiger Schaden verfällt nach der Grundregel.
  packet.remaining=0;
}
function currentShieldChoice(state){
  const pd=state.pendingDamage;
  if(!pd || !pd.packets?.length)return null;

  while(pd.packetIndex<pd.packets.length){
    const packet=pd.packets[pd.packetIndex];
    if(packet.remaining<=0){
      if(pd.combatTiming==='attacker_first' && packet.role==='defender'){
        const victim=state.players[packet.playerIndex]?.bezSlots?.[packet.bezSlot];
        if(victim && (victim.hearts||0)<=0){
          const counterPacket=pd.packets.find(x=>x.role==='attacker');
          if(counterPacket)counterPacket.remaining=0;
          log(state,'Primärangriff zerstört die verteidigende Bezwingerin vor ihrem Gegenangriff.');
        }
      }else if(pd.combatTiming==='defender_first' && packet.role==='attacker'){
        const victim=state.players[packet.playerIndex]?.bezSlots?.[packet.bezSlot];
        if(victim && (victim.hearts||0)<=0){
          const attackPacket=pd.packets.find(x=>x.role==='defender');
          if(attackPacket)attackPacket.remaining=0;
          log(state,'Der zuerst ausgeführte Gegenangriff zerstört die angreifende Bezwingerin vor ihrem Angriff.');
        }
      }
      pd.packetIndex++;
      continue;
    }
    const affected=state.players[packet.playerIndex]?.bezSlots?.[packet.bezSlot];
    if(packet.type==='physical' && affected?.effectState?.physicalImmune){
      log(state,`${cardData(affected)?.name||'Bezwingerin'} bleibt von physischem Schaden unberührt.`);
      packet.remaining=0;pd.packetIndex++;continue;
    }
    const sources=shieldSourcesForBez(state,packet.playerIndex,packet.bezSlot,packet.type);
    if(sources.length===0){
      finishDamagePacketWithoutShields(state,packet);
      pd.packetIndex++;
      continue;
    }
    return {
      playerIndex:packet.playerIndex,
      bezSlot:packet.bezSlot,
      type:packet.type,
      remaining:packet.remaining,
      sources
    };
  }
  return null;
}
function finalizePendingCombat(state){
  const pd=state.pendingDamage;
  if(!pd)return {ok:false,msg:'Keine offene Schadensverteilung.'};

  const attack=state.attack;
  if(attack){
    awardEvelynBerserkerMarks(state,{
      attackerPlayer:pd.attackerIndex,attackerKind:pd.attackerKind||'bez',attackerSlot:pd.attackerSlot,
      defenderPlayer:pd.defenderIndex,targetType:pd.defKind,defenderSlot:pd.defSlot
    });
    killIfNeeded(state,pd.defenderIndex,pd.defKind,pd.defSlot);
    killIfNeeded(state,pd.attackerIndex,pd.attackerKind||'bez',pd.attackerSlot);
  }
  state.pendingDamage=null;
  state.attack=null;
  return {ok:true,msg:'Kampf vollständig abgewickelt.'};
}
function chooseShieldSource(state,source,kind){
  if(!state.pendingDamage)return {ok:false,msg:'Es wartet keine Schildentscheidung.'};
  const choice=currentShieldChoice(state);
  if(!choice){
    return finalizePendingCombat(state);
  }

  const selected=choice.sources.find(s=>s.source===source && s.kind===kind);
  if(!selected)return {ok:false,msg:'Diese Schildquelle steht für den aktuellen Schaden nicht zur Verfügung.'};

  const packet=state.pendingDamage.packets[state.pendingDamage.packetIndex];
  const result=applyChosenShieldSource(state,packet,selected);
  if(!result.ok)return result;

  const next=currentShieldChoice(state);
  if(!next){
    return finalizePendingCombat(state);
  }
  return {ok:true,needsShieldChoice:true,msg:'Wähle die nächste Schildquelle.',choice:next};
}
function killIfNeeded(state,playerIndex,kind,slot=null){
  const p=state.players[playerIndex];
  let r=null;
  if(kind==='bez')r=p.bezSlots[slot];
  else if(kind==='primary')r=state.sharedPrimary;
  else if(kind==='secondary')r=p.secondary;
  else r=p.refuge;

  if(!r || r.hearts>0)return false;

  if(kind==='refuge'){
    state.winner=1-playerIndex;
    log(state,`${p.name}s Zuflucht fällt auf 0 Herzen. ${state.players[state.winner].name} gewinnt das Gefecht.`);
    return true;
  }

  discardRuntime(p,r);

  if(kind==='bez'){
    ensureEquipmentState(p);
    for(const k of ['weapon','shield','armor','helmet']){
      const eq=p.equipment[slot][k];
      if(eq){
        discardRuntime(p,eq);
        p.equipment[slot][k]=null;
      }
    }
    p.bezSlots[slot]=null;
  }
  if(kind==='primary')state.sharedPrimary=null;
  if(kind==='secondary')p.secondary=null;

  log(state,`${cardData(r)?.name||'Eine Karte'} fällt auf 0 Herzen und wird auf den Ablagestapel gelegt.`);
  return true;
}
function resolveCombat(state){
  if(currentPhase(state).id!=='combat' || !state.attack)return {ok:false,msg:'Es ist kein Kampf vorbereitet.'};
  if(state.pendingDamage){
    const choice=currentShieldChoice(state);
    return choice
      ? {ok:true,needsShieldChoice:true,msg:'Wähle, von welcher Karte Schildpunkte entfernt werden sollen.',choice}
      : finalizePendingCombat(state);
  }

  const p=active(state),opp=opponent(state);
  const attackerKind=state.attack.attackerKind||'bez';
  const a=attackerKind==='refuge' ? p.refuge : p.bezSlots[state.attack.attackerSlot];
  if(!a)return {ok:false,msg:'Der Angreifer ist nicht mehr auf dem Feld.'};
  if(!state.attack.defenderConfirmed)return {ok:false,msg:'Der verteidigende Spieler muss den Angriff zuerst zulassen.'};

  const target=state.attack.target;
  let d=null,defKind=target.type,defSlot=target.slot??null;
  if(target.type==='bez')d=opp.bezSlots[target.slot];
  else if(target.type==='primary')d=state.sharedPrimary;
  else if(target.type==='secondary')d=opp.secondary;
  else d=opp.refuge;
  if(!d)return {ok:false,msg:'Das Ziel ist nicht mehr vorhanden.'};

  const ac=cardData(a),dc=cardData(d);
  const type=state.attack.attackType;

  const atk=attackerKind==='refuge'
    ? {base:type==='physical'?(a.physical ?? ac?.physische_staerke ?? 0):(a.astral ?? ac?.astrale_staerke ?? 0),equipment:0,total:type==='physical'?(a.physical ?? ac?.physische_staerke ?? 0):(a.astral ?? ac?.astrale_staerke ?? 0)}
    : combatStrength(state,p.index,state.attack.attackerSlot,type,true);
  let attackValue=atk.total;
  if(attackerKind==='bez' && a?.effectState?.baronesse2Armed &&
     a.effectState.baronesse2ArmedTurn===p.turnCount &&
     baronesse2CanBuff(state,state.attack.attackerSlot,target)){
    a.effectState.baronesse2Armed=false;
    // Der Karteneffekt verleiht physische Stärke. Bei einem ASTRAL-Angriff
    // wird der Effekt dennoch ausgelöst/verbraucht, erhöht aber nicht den
    // ASTRAL-Schadenswert.
    if(type==='physical')attackValue+=1;
    log(state,`${cardData(a)?.name}: +1 physische Stärke für diesen Kampf${type==='physical'?'.':' (bei ASTRAL-Angriff ohne zusätzlichen ASTRAL-Schaden).'}`);
  }

  let counterValue=0,counter={base:0,equipment:0,total:0};
  if(target.type==='bez'){
    counter=combatStrength(state,opp.index,target.slot,type,false);
    counterValue=counter.total;
  }else{
    counterValue=type==='physical'
      ? (d.physical ?? dc?.physische_staerke ?? 0)
      : (d.astral ?? dc?.astrale_staerke ?? 0);
    counter={base:counterValue,equipment:0,total:counterValue};
  }

  const atkBonus=atk.equipment?` (Basis ${atk.base} + Ausrüstung ${atk.equipment})`:'';
  const counterBonus=counter.equipment?` (Basis ${counter.base} + Ausrüstung ${counter.equipment})`:'';
  const timing=target.type==='bez'?combatTiming(a,d):'simultaneous';
  const timingText=timing==='attacker_first'?' – Primärangriff: Angreifer schlägt zuerst':timing==='defender_first'?' – Verteidiger schlägt zuerst':'';
  log(state,`${ac?.name||'Angreifer'} verursacht ${attackValue}${atkBonus} ${type==='physical'?'physischen':'ASTRAL'} Schaden; ${dc?.name||'Ziel'} hat ${counterValue}${counterBonus} Gegenangriff${timingText}.`);

  a.attackedTurn=p.turnCount;
  // Psilos Verstärkung gilt genau für den nächsten Kampf der KREATUR.
  // Sie wird daher nach der Kampfbeteiligung verbraucht – unabhängig davon,
  // ob der Kampf physisch oder ASTRAL geführt wurde.
  consumePsiloBonus(a);
  if(target.type==='bez')consumePsiloBonus(d);
  if(a?.effectState?.primaryAttackActive)a.effectState.primaryAttackActive=false;
  if(target.type==='bez' && d?.effectState?.primaryAttackActive)d.effectState.primaryAttackActive=false;

  // Primär/Sekundär/Zuflucht haben keine anliegende Bezwingerinnen-Ausrüstung
  // und werden deshalb weiterhin direkt abgewickelt.
  if(target.type!=='bez'){
    const dmg=applyDamage(d,attackValue,type);
    if(dmg.shield||dmg.hearts){
      log(state,`Verteidiger: −${dmg.shield} Basisschild/−${dmg.hearts} Herzen.`);
    }
  }

  const packets=[];
  const defenderPacket=target.type==='bez' && attackValue>0 ? {
    role:'defender',playerIndex:opp.index,bezSlot:target.slot,type,remaining:attackValue,shieldLoss:0,heartLoss:0
  }:null;
  let attackerPacket=counterValue>0 && attackerKind!=='refuge' ? {
    role:'attacker',playerIndex:p.index,bezSlot:state.attack.attackerSlot,type,remaining:counterValue,shieldLoss:0,heartLoss:0
  }:null;
  if(attackerPacket&&a?.effectState?.counterDodgeActive){a.effectState.counterDodgeActive=false;attackerPacket=null;log(state,`${cardData(a)?.name}: weicht dem Gegenangriff vollständig aus.`);}
  if(attackerKind==='refuge' && counterValue>0){
    const dmg=applyDamage(a,counterValue,type);
    if(dmg.shield||dmg.hearts)log(state,`Angreifende Zuflucht: −${dmg.shield} Basisschild/−${dmg.hearts} Herzen durch Gegenangriff.`);
  }
  if(timing==='defender_first'){if(attackerPacket)packets.push(attackerPacket);if(defenderPacket)packets.push(defenderPacket);}
  else {if(defenderPacket)packets.push(defenderPacket);if(attackerPacket)packets.push(attackerPacket);}

  state.pendingDamage={
    attackerIndex:p.index,
    attackerKind,
    attackerSlot:state.attack.attackerSlot,
    defenderIndex:opp.index,
    defKind,
    defSlot,
    packetIndex:0,
    packets,
    combatTiming:target.type==='bez'?timing:'simultaneous'
  };

  const choice=currentShieldChoice(state);
  if(choice){
    return {
      ok:true,
      needsShieldChoice:true,
      msg:`${state.players[choice.playerIndex].name}: Wähle, von welcher Karte Schildpunkte entfernt werden sollen.`,
      choice
    };
  }

  return finalizePendingCombat(state);
}
function beginPhase(state){
  const p=active(state),phase=currentPhase(state);
  if(phase.id==='supply')releaseMiraDelayLocks(state);
  if(phase.id==='start'){
    tickBezEffectDurations(state);
    tickFieldDurations(state);
    p.recruitedThisTurn=false;
    p.drawDone=false;
    state.attack=null;
  }
  if(phase.id==='honor'){
    // Zusatzregel: Die allererste Ehrungsphase des Startspielers entfällt.
    if(state.firstTurn && state.activePlayer===state.startingPlayer){
      log(state,`${p.name}s erste Ehrungsphase wird übersprungen.`);
      state.phaseIndex=2;
      return beginPhase(state);
    }

    // In jeder regulären Ehrungsphase erhält jede eigene Karte auf dem Feld
    // mit vorhandenem Herz-Attribut automatisch genau 1 Ehre.
    grantHonor(state);
  }
  if(phase.id==='supply_start'){
    expireEquipmentCombatBonuses(state,p);
    log(state,`Anfang der Versorgungsphase von ${p.name}: unterstützte zeitlich begrenzte Ausrüstungsboni wurden geprüft.`);
  }
  return phase;
}
function advancePhase(state){
  if(state.winner!==null)return {ok:false,msg:'Das Gefecht ist bereits beendet.'};
  const p=active(state),phase=currentPhase(state);

  if(state.pendingEquipment){
    return {ok:false,msg:'Die aufgedeckte Ausrüstung muss zuerst an eine Bezwingerin angelegt werden.'};
  }
  if(state.pendingFieldCard){
    return {ok:false,msg:'Die aufgedeckte Primär-/Sekundärkarte muss zuerst in ihren vorgesehenen Bereich verschoben werden.'};
  }
  if(state.pendingDamage){
    return {ok:false,msg:'Die Schild-/Schadensverteilung des aktuellen Kampfes muss zuerst abgeschlossen werden.'};
  }
  if(state.pendingWonderDraw){
    return {ok:false,msg:'Die Kartenziehung aus dem Wunder muss zuerst abgeschlossen werden.'};
  }
  if(state.pendingRefugeStage2Choice){
    return {ok:false,msg:'Die Auswahl für den Stufe-2-Zuflucht-Effekt muss zuerst abgeschlossen werden.'};
  }
  if(state.pendingBezEffect){
    return {ok:false,msg:'Die aktuelle Bezwingerinnen-Effektauswahl muss zuerst abgeschlossen werden.'};
  }

  if(phase.id==='draw'){
    const nonempty=Object.values(p.stacks).some(a=>a.length);
    if(nonempty && !p.drawDone)return {ok:false,msg:'In der Ziehphase muss zuerst eine Karte von einem Hauptstapel gezogen werden.'};
  }
  if(phase.id==='rush'){
    if(state.attack)return {ok:false,msg:'Der angekündigte Angriff muss zuerst vom verteidigenden Spieler bestätigt oder durch eine verdeckte Karte beantwortet werden.'};
    // Kein Angriff geplant: direkt in NP.
    state.phaseIndex=7;
    beginPhase(state);
    return {ok:true};
  }
  if(phase.id==='combat' && state.attack){
    return {ok:false,msg:'Führe zuerst den vorbereiteten Kampf aus.'};
  }
  if(phase.id==='combat'){
    state.phaseIndex=7;
    beginPhase(state);
    return {ok:true};
  }
  if(phase.id==='end'){
    expirePsiloBonuses(state);
    expireDeathPrimaryAttack(state);
    expireAliceDodge(state);
    expireBaronesse2Arm(state);
    p.turnCount+=1;
    state.activePlayer=1-state.activePlayer;
    state.roundSerial+=1;
    state.phaseIndex=0;
    state.firstTurn=false;
    beginPhase(state);
    log(state,`${active(state).name} beginnt seine Kampfrunde.`);
    return {ok:true};
  }

  state.phaseIndex+=1;
  beginPhase(state);
  return {ok:true};
}
function drawPhaseCard(state,stack){
  if(currentPhase(state).id!=='draw')return {ok:false,msg:'Du kannst nur in der Ziehphase regulär ziehen.'};
  const p=active(state);
  if(p.drawDone)return {ok:false,msg:'Du hast in dieser Ziehphase bereits gezogen.'};
  const r=drawFrom(state,p.index,stack);
  if(r.ok)p.drawDone=true;
  return r;
}
function returnToRush(state){
  if(currentPhase(state).id!=='combat' || state.attack)return {ok:false,msg:'Noch nicht möglich.'};
  const p=active(state);
  if(!p.bezSlots.some(r=>canAttack(r,p)) && !canRefugeAttack(state))return {ok:false,msg:'Keine weitere eigene Karte kann angreifen.'};
  state.phaseIndex=5;
  beginPhase(state);
  return {ok:true};
}
function save(state){localStorage.setItem('5goddesses_active_game_v1',JSON.stringify(state))}
function migrateLoadedState(state){
  if(!state || !Array.isArray(state.players))return state;

  if(state.sharedPrimary===undefined)state.sharedPrimary=null;
  if(state.attack===undefined)state.attack=null;
  if(state.pendingEquipment===undefined)state.pendingEquipment=null;
  if(state.pendingFieldCard===undefined)state.pendingFieldCard=null;
  if(state.pendingDamage===undefined)state.pendingDamage=null;
  if(state.pendingWonderDraw===undefined)state.pendingWonderDraw=null;
  if(state.pendingRefugeStage2Choice===undefined)state.pendingRefugeStage2Choice=null;
  if(state.pendingBezEffect===undefined)state.pendingBezEffect=null;
  if(!Array.isArray(state.fragmentRewardQueue))state.fragmentRewardQueue=[];

  state.players.forEach((p,index)=>{
    if(p.index===undefined)p.index=index;
    if(p.honorGrantedTurn===undefined)p.honorGrantedTurn=null;
    if(p.policeTaxTurn===undefined)p.policeTaxTurn=null;
    if(p.secondary===undefined)p.secondary=null;
    ensureEquipmentState(p);
    if(!Array.isArray(p.azr))p.azr=[null,null,null];
    while(p.azr.length<3)p.azr.push(null);
    if(!Array.isArray(p.bezSlots))p.bezSlots=[null,null];
    while(p.bezSlots.length<2)p.bezSlots.push(null);

    // Re-apply the deployment-delay rule to old runtime cards.
    const normalizeRuntime=(r,isRefuge=false)=>{
      if(!r)return;
      const c=cardData(r);
      if(r.physical===undefined)r.physical=c?.physische_staerke ?? 0;
      if(r.astral===undefined)r.astral=c?.astrale_staerke ?? 0;
      if(r.wonderTurn===undefined)r.wonderTurn=null;
      if(r.wonderCostCurrent===undefined)r.wonderCostCurrent=Number(c?.wunder?.kosten_ehre ?? 0);
      if(r.berserkerMarks===undefined)r.berserkerMarks=0;
      if(r.effectState===undefined||!r.effectState)r.effectState={};
      if(r.effectRoundsRemaining===undefined)r.effectRoundsRemaining=(c?.effekt_dauer_kr ?? null);
      if(isRefuge){
        r.ready=true;
      }else if(!hasDeploymentDelay(c)){
        r.ready=true;
      }else if(r.ready===undefined){
        r.ready=false;
      }
    };

    normalizeRuntime(p.refuge,true);
    p.bezSlots.forEach(r=>normalizeRuntime(r,false));
    p.equipment.forEach(eq=>{
      for(const k of ['weapon','shield','armor','helmet']){
        normalizeRuntime(eq[k],false);
        if(eq[k])initializeEquipmentCombatState(eq[k],p);
      }
    });
    p.azr.forEach(r=>normalizeRuntime(r,false));
    normalizeRuntime(p.secondary,false);
  });

  if(state.sharedPrimary){
    const c=cardData(state.sharedPrimary);
    if(!hasDeploymentDelay(c))state.sharedPrimary.ready=true;
  }

  return state;
}
function load(){
  try{
    const state=JSON.parse(localStorage.getItem('5goddesses_active_game_v1')||'null');
    return migrateLoadedState(state);
  }catch(e){
    console.error('Gespeichertes Gefecht konnte nicht geladen werden:',e);
    return null;
  }
}
function clear(){localStorage.removeItem('5goddesses_active_game_v1')}

window.G5Engine={
  PHASES,decks,validDeck,startGame,save,load,clear,dbCard,currentPhase,active,opponent,
  advancePhase,grantHonor,drawPhaseCard,readyEligibleBez,readyBez,recruit,setFaceDown,playOpenAzr,reveal,
  equipmentKind,isEquipmentCard,fieldArea,mornakAllowedAreas,playFieldFromHand,moveRevealedFieldCard,moveMornakFromAzr,equipFromHand,equipFromAzr,discardEquipment,
  chooseEquipmentShieldBonus,equipmentCombatProfile,combatStrength,
  availableDevelopment,develop,hasDeploymentDelay,canAttack,canRefugeAttack,hasHeartAttribute,attackTargets,prepareAttack,
  refugeWonderAvailable,activateRefugeWonder,resolveWonderDraw,chooseRefugeStage2Bonus,
  bezEffectInfo,activateBezEffect,thalZirisTargets,resolveThalZiris,thalZirisStage1Targets,resolveThalZirisStage1,
  mornakTokenTargets,resolveMornakTokenPlacement,startNemesisWonder,cancelPendingBezEffect,
  checkedEffectTargets,resolveCheckedEffectTarget,startTalisia1Wonder,jeanneForcedTarget,
  startZahiraWonder,startCassandraWonder,meniaDaggerTargets,resolveMeniaDagger,
  startPsiloWonder,psiloTargets,resolvePsiloTarget,keylaSearchTargets,resolveKeylaSearch,
  startQueen2Wonder,queenStackTargets,resolveQueenSearch,queenDiscardTargets,resolveQueen2Discard,
  activateDeathPrimaryAttack,hasPrimaryAttack,hasSecondaryAttack,
  activateAliceDodge,startLilou2Wonder,lilou2Targets,resolveLilou2Discard,startBaronesse2Wonder,
  keyla2DestroyTargets,keyla2DiscardTargets,resolveKeyla2Choice,resolveKeyla2Destroy,resolveKeyla2Discard,
  fragmentRewardTargets,resolveFragmentReward,
  defenderFaceDownSlots,revealDefenderCard,confirmAttack,resolveCombat,currentShieldChoice,chooseShieldSource,returnToRush,cardData
};
})();
