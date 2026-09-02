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
    ? (r.physical ?? c?.physische_staerke ?? 0)
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
  for(const r of honorCardsOfPlayer(state,p)){
    if(honorEligible(r,p)){
      r.honor=(r.honor||0)+1;
      n++;
    }
  }

  p.honorGrantedTurn=p.turnCount;
  log(state,n
    ?`${p.name}: ${n} Karte${n===1?'':'n'} mit Herzanzahl erhalten jeweils 1 Ehre.`
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
  const opp=opposingBez(state,p,slot);
  if(key==='martha'){
    if(!opp || (opp.hearts??0)<=(r.hearts??0)){r.honor=(r.honor||0)+1;log(state,`${c.name}: Ausspieleffekt → +1 Ehre.`)}
  }else if(key==='effrayer'){
    const hasVengeresse=p.bezSlots.some((x,i)=>i!==slot&&x&&String(cardData(x)?.untertyp||'').includes('Vengeresse'));
    if(hasVengeresse){r.honor=(r.honor||0)+1;log(state,`${c.name}: Ausspieleffekt → +1 Ehre.`)}
  }else if(key==='amelia' && opp){opp.astralShield=(opp.astralShield||0)-1;log(state,`${c.name}: Gegenüber verliert 1 ASTRAL-Schild.`)}
  else if(key==='lilith' && opp){opp.honor=(opp.honor||0)-1;log(state,`${c.name}: Gegenüber verliert 1 Ehre.`)}
  else if(key==='trix'){
    const n=countOwnAzrCards(p); const add=n>=3?2:n>=2?1:0; r.honor=(r.honor||0)+add;if(add)log(state,`${c.name}: ${n} eigene AZR-Karten → +${add} Ehre.`)
  }else if(key==='calypso'){r.ready=true;r.effectState.noRefugeAttackTurn=p.turnCount;log(state,`${c.name}: keine Einsatzverzögerung; Zuflucht ist in dieser KR kein Angriffsziel.`)}
  else if(key==='talisia2'){
    if((r.astralShield||0)>=1){r.astralShield-=1;r.hearts+=1;log(state,`${c.name}: 1 ASTRAL-Schild wurde in 1 Herz umgewandelt.`)}
  }else if(key){log(state,`${c.name}: Ausspieleffekt „${c.effekt_text||key}“ ist erfasst; falls eine Ziel-/Suchauswahl nötig ist, wird er über die Effektsteuerung abgewickelt.`)}
}
function bezEffectInfo(state,slot){
 const p=active(state),r=p.bezSlots[slot];if(!r)return null;const c=cardData(r);if(!c)return null;
 return {symbol:c.effekt_symbol||'none',text:c.effekt_text||'',cost:Number(c.wunder?.kosten_ehre||0),usesRemaining:r.effectUsesRemaining,roundsRemaining:r.effectRoundsRemaining,disabled:!!r.effectDisabled,usedThisTurn:r.effectUsedTurn===p.turnCount,wonderUsed:r.wonderTurn===p.turnCount};
}
function activateBezEffect(state,slot,choice=null){
 const p=active(state),r=p.bezSlots[slot];if(!r)return {ok:false,msg:'Keine Bezwingerin in diesem Bereich.'};const c=cardData(r),sym=c?.effekt_symbol||'none',key=c?.effekte?.[0]?.engine_key;
 if(r.effectDisabled||sym==='none'||sym==='permanent'||sym==='duration'||sym==='on_play')return {ok:false,msg:'Dieser Effekt wird nicht manuell auf diese Weise aktiviert.'};
 if(sym==='wonder'){
   if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Wunder können nur in VP oder NP gewirkt werden.'};
   if(r.wonderTurn===p.turnCount)return {ok:false,msg:'Dieses Wunder wurde in dieser Kampfrunde bereits gewirkt.'};
   const cost=Number(c.wunder?.kosten_ehre||0);if((r.honor||0)<cost)return {ok:false,msg:`Benötigt ${cost} Ehre.`};
   r.honor-=cost;r.wonderTurn=p.turnCount;
 }else if(sym==='charges'){
   if(r.effectUsedTurn===p.turnCount)return {ok:false,msg:'Dieser Effekt wurde in dieser Kampfrunde bereits aktiviert.'};
   if((r.effectUsesRemaining??0)<=0)return {ok:false,msg:'Keine Zählermarken mehr vorhanden.'};
   r.effectUsesRemaining--;r.effectUsedTurn=p.turnCount;
 }
 // Effects that are unambiguous without selecting another card
 if(key==='serinith'){
   if(choice==='astral_to_physical' && r.astralShield>=1){r.astralShield--;r.physicalShield++;}
   else if(choice==='physical_to_astral' && r.physicalShield>=1){r.physicalShield--;r.astralShield++;}
   else return {ok:false,msg:'Wähle eine gültige Schild-Umwandlung.'};
 }else if(key==='evelyn'){
   if((r.physicalShield||0)<3)return {ok:false,msg:'Evelyn benötigt 3 physische Schilde.'};r.physicalShield-=3;r.hearts+=1;
 }else if(key==='saphira2'){r.astral=(r.astral||0)+1;c.wunder.kosten_ehre=Number(c.wunder.kosten_ehre||4)+1;}
 else if(key==='trix2'){
   if(choice==='astral_to_physical' && r.astral>=1){r.astral--;r.physical++;}
   else if(choice==='physical_to_astral' && r.physical>=1){r.physical--;r.astral++;}
   else return {ok:false,msg:'Wähle eine gültige Stärke-Umwandlung.'};
 }else {log(state,`${c.name}: Effekt aktiviert. Ziel-/Such-/Tokenauflösung muss entsprechend dem Kartentext ausgeführt werden.`);return {ok:true,manual:true,msg:`${c.name}: ${c.effekt_text}`};}
 log(state,`${c.name}: Effekt aktiviert.`);return {ok:true,msg:`Effekt von ${c.name} ausgeführt.`};
}
function tickBezEffectDurations(state){
 for(const p of state.players)for(const r of p.bezSlots){if(!r||r.effectDisabled||r.effectRoundsRemaining===null)continue;r.effectRoundsRemaining--;if(r.effectRoundsRemaining<=0){r.effectRoundsRemaining=0;r.effectDisabled=true;log(state,`${cardData(r)?.name||'Ein Effekt'} ist nach Ablauf der Kampfrunden deaktiviert.`)}}
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
  if(area){
    return {ok:false,msg:`Diese Karte gehört offen in den ${area==='primary'?'Primär':'Sekundär'}bereich. Alternativ kannst du sie verdeckt in die AZR setzen.`};
  }
  p.hand.splice(handIndex,1);
  const r=makeRuntimeCard(bild,p.index,p.turnCount);
  r.faceDown=false;
  p.azr[slot]=r;
  log(state,`${p.name} spielt ${c.name} offen in die ASTRAL-/Rüstkammer-Zone. Der individuelle Karteneffekt ist noch nicht implementiert.`);
  return {ok:true};
}
function playFieldFromHand(state,handIndex,area){
  const p=active(state);
  if(!['supply','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'Primär- und Sekundärkarten können nur in Versorgungs- oder Nachschubphase ausgespielt werden.'};
  const bild=p.hand[handIndex],c=dbCard(bild);
  if(!c || fieldArea(c)!==area)return {ok:false,msg:'Diese Karte gehört nicht in diesen Bereich.'};

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

  r.developedTurn=p.turnCount;
  log(state,`${p.name} entwickelt ${dev.name} auf Stufe ${dev.stufe}. Bereits erlittener Herz- und Schildschaden bleibt erhalten.`);

  // Alle aktuell vorhandenen Stufe-2-Zufluchten besitzen beim Ausspielen
  // die einmalige Wahl: +1 Physische ODER +1 ASTRAL-Stärke.
  if(kind==='refuge' && dev.stufe===2){
    state.pendingRefugeStage2Choice={playerIndex:p.index};
    return {ok:true,needsRefugeStage2Choice:true,msg:'Zuflucht auf Stufe 2 entwickelt. Wähle jetzt +1 Physische oder +1 ASTRAL-Stärke.'};
  }
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

  const noBez=opp.bezSlots.every(x=>!x);
  if(src.kind==='bez'){
    if((noBez || !opp.bezSlots[src.slot]) && hasHeartAttribute(opp.refuge))targets.push({type:'refuge',label:`Zuflucht von ${opp.name}`});
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
  const legal=attackTargets(state,attackerSource).some(t=>targetKey(t)===targetKey(target));
  if(!legal)return {ok:false,msg:'Dieses Angriffsziel ist nach der Grundregel nicht zulässig.'};

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
      pd.packetIndex++;
      continue;
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
  const attackValue=atk.total;

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
  log(state,`${ac?.name||'Angreifer'} verursacht ${attackValue}${atkBonus} ${type==='physical'?'physischen':'ASTRAL'} Schaden; ${dc?.name||'Ziel'} führt gleichzeitig einen Gegenangriff mit ${counterValue}${counterBonus} Stärke aus.`);

  a.attackedTurn=p.turnCount;

  // Primär/Sekundär/Zuflucht haben keine anliegende Bezwingerinnen-Ausrüstung
  // und werden deshalb weiterhin direkt abgewickelt.
  if(target.type!=='bez'){
    const dmg=applyDamage(d,attackValue,type);
    if(dmg.shield||dmg.hearts){
      log(state,`Verteidiger: −${dmg.shield} Basisschild/−${dmg.hearts} Herzen.`);
    }
  }

  const packets=[];
  if(target.type==='bez' && attackValue>0){
    packets.push({
      role:'defender',
      playerIndex:opp.index,
      bezSlot:target.slot,
      type,
      remaining:attackValue,
      shieldLoss:0,
      heartLoss:0
    });
  }
  if(counterValue>0){
    if(attackerKind==='refuge'){
      const dmg=applyDamage(a,counterValue,type);
      if(dmg.shield||dmg.hearts)log(state,`Angreifende Zuflucht: −${dmg.shield} Basisschild/−${dmg.hearts} Herzen durch Gegenangriff.`);
    }else{
      packets.push({
        role:'attacker',
        playerIndex:p.index,
        bezSlot:state.attack.attackerSlot,
        type,
        remaining:counterValue,
        shieldLoss:0,
        heartLoss:0
      });
    }
  }

  state.pendingDamage={
    attackerIndex:p.index,
    attackerKind,
    attackerSlot:state.attack.attackerSlot,
    defenderIndex:opp.index,
    defKind,
    defSlot,
    packetIndex:0,
    packets
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
  if(phase.id==='start'){
    tickBezEffectDurations(state);
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

  state.players.forEach((p,index)=>{
    if(p.index===undefined)p.index=index;
    if(p.honorGrantedTurn===undefined)p.honorGrantedTurn=null;
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
  equipmentKind,isEquipmentCard,fieldArea,playFieldFromHand,moveRevealedFieldCard,equipFromHand,equipFromAzr,discardEquipment,
  chooseEquipmentShieldBonus,equipmentCombatProfile,combatStrength,
  availableDevelopment,develop,hasDeploymentDelay,canAttack,canRefugeAttack,hasHeartAttribute,attackTargets,prepareAttack,
  refugeWonderAvailable,activateRefugeWonder,resolveWonderDraw,chooseRefugeStage2Bonus,
  defenderFaceDownSlots,revealDefenderCard,confirmAttack,resolveCombat,currentShieldChoice,chooseShieldSource,returnToRush,cardData
};
})();
