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
    honor:0,
    ready:!hasDeploymentDelay(c),
    enteredTurn,
    attackedTurn:null,
    developedTurn:null,
    wonderTurn:null,
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
    azr:[null,null,null],
    primary:null,
    secondary:null,
    discard:[],
    recruitedThisTurn:false,
    drawDone:false
  };
}
function cardData(runtime){return runtime?dbCard(runtime.bild):null}
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
    ...p.azr,
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
  return !!r && !r.ready && p.turnCount>r.enteredTurn;
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
  return {ok:true};
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
  p.hand.splice(handIndex,1);
  const r=makeRuntimeCard(bild,p.index,p.turnCount);
  r.faceDown=false;
  p.azr[slot]=r;
  log(state,`${p.name} spielt ${c.name} offen in die ASTRAL-/Rüstkammer-Zone. Der individuelle Karteneffekt ist noch nicht implementiert.`);
  return {ok:true};
}
function reveal(state,slot){
  const p=active(state),r=p.azr[slot];
  if(!r || !r.faceDown)return {ok:false,msg:'Hier liegt keine verdeckte Karte.'};
  if(!['honor','supply','rush','resupply'].includes(currentPhase(state).id))return {ok:false,msg:'In dieser Phase kann die gesetzte Karte in der Grundversion nicht aktiviert werden.'};
  r.faceDown=false;
  log(state,`${p.name} deckt ${cardData(r)?.name||'eine gesetzte Karte'} auf. Der individuelle Karteneffekt ist noch nicht implementiert.`);
  return {ok:true};
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

  r.honor-=kosten;
  p.development=p.development.filter(x=>x!==dev.bild);
  r.developmentStack.push(dev.bild);
  r.bild=dev.bild;
  r.stufe=dev.stufe;
  // Neue Basiswerte der obersten Entwicklungsstufe übernehmen.
  r.hearts=dev.herzen ?? r.hearts;
  r.physicalShield=dev.physischer_schild ?? r.physicalShield;
  r.astralShield=dev.astraler_schild ?? r.astralShield;
  r.developedTurn=p.turnCount;
  log(state,`${p.name} entwickelt ${dev.name} auf Stufe ${dev.stufe}.`);
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
function attackTargets(state,attackerSlot){
  const opp=opponent(state);
  const targets=[];

  // Jede gegnerische Bezwingerin mit Herz-Attribut ist grundsätzlich anwählbar.
  opp.bezSlots.forEach((r,i)=>{
    if(r && hasHeartAttribute(r)){
      targets.push({type:'bez',slot:i,label:cardData(r)?.name||`Bezwingerin ${i+1}`});
    }
  });

  // Sekundärbereich des Gegners, sofern dort eine Karte mit Herzen liegt.
  if(opp.secondary && hasHeartAttribute(opp.secondary)){
    targets.push({type:'secondary',label:cardData(opp.secondary)?.name||'Sekundärbereich'});
  }

  // Die gemeinsame Primärzone kann nur angegriffen werden, wenn dort eine
  // gegnerische Karte mit Herz-Attribut liegt.
  if(state.sharedPrimary &&
     state.sharedPrimary.owner===opp.index &&
     hasHeartAttribute(state.sharedPrimary)){
    targets.push({type:'primary',label:cardData(state.sharedPrimary)?.name||'Primärbereich'});
  }

  // Zuflucht nur wenn keine gegnerische Bezwingerin auf dem Feld ODER der
  // direkt gegenüberliegende Bezwingerinnenbereich frei ist.
  const noBez=opp.bezSlots.every(x=>!x);
  if((noBez || !opp.bezSlots[attackerSlot]) && hasHeartAttribute(opp.refuge)){
    targets.push({type:'refuge',label:`Zuflucht von ${opp.name}`});
  }
  return targets;
}
function prepareAttack(state,attackerSlot,target,attackType){
  if(currentPhase(state).id!=='rush')return {ok:false,msg:'Angriffe werden in der Ansturmphase festgelegt.'};
  const p=active(state),r=p.bezSlots[attackerSlot];
  if(!canAttack(r,p))return {ok:false,msg:'Diese Bezwingerin ist einsatzverzögert oder hat bereits angegriffen.'};
  if(!['physical','astral'].includes(attackType))return {ok:false,msg:'Ungültige Angriffsart.'};
  const legal=attackTargets(state,attackerSlot).some(t=>targetKey(t)===targetKey(target));
  if(!legal)return {ok:false,msg:'Dieses Angriffsziel ist nach der Grundregel nicht zulässig.'};

  state.attack={
    attackerSlot,
    target,
    attackType,
    defenderConfirmed:false,
    revealedDuringDefense:false
  };
  log(state,`${p.name} kündigt mit ${cardData(r)?.name||'einer Bezwingerin'} einen ${attackType==='physical'?'physischen':'ASTRAL'} Angriff an.`);
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

  for(const img of r.developmentStack||[r.bild])p.discard.push(img);

  if(kind==='bez')p.bezSlots[slot]=null;
  if(kind==='primary')state.sharedPrimary=null;
  if(kind==='secondary')p.secondary=null;

  log(state,`${cardData(r)?.name||'Eine Karte'} fällt auf 0 Herzen und wird auf den Ablagestapel gelegt.`);
  return true;
}
function resolveCombat(state){
  if(currentPhase(state).id!=='combat' || !state.attack)return {ok:false,msg:'Es ist kein Kampf vorbereitet.'};
  const p=active(state),opp=opponent(state);
  const a=p.bezSlots[state.attack.attackerSlot];
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
  const attackValue=type==='physical'?(ac?.physische_staerke??0):(ac?.astrale_staerke??0);
  const counterValue=type==='physical'?(dc?.physische_staerke??0):(dc?.astrale_staerke??0);

  const aBefore=a.hearts,dBefore=d.hearts;
  const dmgToDef=applyDamage(d,attackValue,type);
  const dmgToAtt=applyDamage(a,counterValue,type);

  a.attackedTurn=p.turnCount;

  log(state,`${ac?.name||'Angreifer'} verursacht ${attackValue} ${type==='physical'?'physischen':'ASTRAL'} Schaden; ${dc?.name||'Ziel'} führt gleichzeitig einen Gegenangriff mit ${counterValue} Stärke aus.`);
  if(dmgToDef.shield || dmgToDef.hearts || dmgToAtt.shield || dmgToAtt.hearts){
    log(state,`Schaden: Verteidiger −${dmgToDef.shield} Schild/−${dmgToDef.hearts} Herzen, Angreifer −${dmgToAtt.shield} Schild/−${dmgToAtt.hearts} Herzen.`);
  }

  killIfNeeded(state,opp.index,defKind,defSlot);
  killIfNeeded(state,p.index,'bez',state.attack.attackerSlot);
  state.attack=null;
  return {ok:true};
}
function beginPhase(state){
  const p=active(state),phase=currentPhase(state);
  if(phase.id==='start'){
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
    log(state,`Anfang der Versorgungsphase von ${p.name}: zeitabhängige Karteneffekte sind noch nicht implementiert.`);
  }
  return phase;
}
function advancePhase(state){
  if(state.winner!==null)return {ok:false,msg:'Das Gefecht ist bereits beendet.'};
  const p=active(state),phase=currentPhase(state);

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
  if(!p.bezSlots.some(r=>canAttack(r,p)))return {ok:false,msg:'Keine weitere einsatzbereite Bezwingerin kann angreifen.'};
  state.phaseIndex=5;
  beginPhase(state);
  return {ok:true};
}
function save(state){localStorage.setItem('5goddesses_active_game_v1',JSON.stringify(state))}
function migrateLoadedState(state){
  if(!state || !Array.isArray(state.players))return state;

  if(state.sharedPrimary===undefined)state.sharedPrimary=null;
  if(state.attack===undefined)state.attack=null;

  state.players.forEach((p,index)=>{
    if(p.index===undefined)p.index=index;
    if(p.honorGrantedTurn===undefined)p.honorGrantedTurn=null;
    if(p.secondary===undefined)p.secondary=null;
    if(!Array.isArray(p.azr))p.azr=[null,null,null];
    while(p.azr.length<3)p.azr.push(null);
    if(!Array.isArray(p.bezSlots))p.bezSlots=[null,null];
    while(p.bezSlots.length<2)p.bezSlots.push(null);

    // Re-apply the deployment-delay rule to old runtime cards.
    const normalizeRuntime=(r,isRefuge=false)=>{
      if(!r)return;
      const c=cardData(r);
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
  availableDevelopment,develop,hasDeploymentDelay,canAttack,hasHeartAttribute,attackTargets,prepareAttack,
  defenderFaceDownSlots,revealDefenderCard,confirmAttack,resolveCombat,returnToRush,cardData
};
})();
