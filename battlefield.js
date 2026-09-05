(() => {
'use strict';
window.G5_BATTLEFIELD_BUILD='1.69';

const G5_PROFILE_NAME_KEY='5goddesses_profilname_v1';
function battleProfileName(){
  const name=(localStorage.getItem(G5_PROFILE_NAME_KEY)||'').trim();
  return name || 'Spieler 1';
}
function applyBattlePlayerNames(){
  if(!state?.players?.length)return;
  state.players[0].name=battleProfileName();
  if(!state.players[1].name || state.players[1].name==='Spieler 1')state.players[1].name='Spieler 2';
}
function updateBattleSetupPlayerNames(){
  const name=battleProfileName();
  const p1Label=document.querySelector('label[for="gameDeckP1"] .setup-player-name');
  if(p1Label)p1Label.textContent=name;
  const start=document.getElementById('gameStartPlayer');
  if(start?.options?.[0])start.options[0].textContent=name;
}


const E=()=>window.G5Engine;
let state=null;
let selectedHandIndex=null;
let selectedAttacker=null;
let selectedTarget=null;
let selectedAttackType=null;
let refugeActionSelected=false;
let cardPreviewMode=false;
let previewRuntime=null;
let previewOwnerIndex=null;
let previewHidden=false;

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function cardName(r){return r?E().cardData(r)?.name||'Karte':''}
function finishEquipmentChoice(result,bezSlot,kind){
  if(!result?.ok || !result.needsShieldChoice)return result;
  const physical=confirm('Chikaras Stahlherz: Welchen externen Schildpunkt erhält die Bezwingerin?\n\nOK = physischer Schild\nAbbrechen = ASTRAL-Schild');
  const rr=E().chooseEquipmentShieldBonus(state,bezSlot,kind,physical?'physical':'astral');
  if(!rr.ok)return rr;
  return {ok:true,msg:rr.msg};
}
function cardImg(r){return r?E().cardData(r)?.bild||r.bild:''}
function phase(){return state?E().currentPhase(state):null}
function selectedAttackerRuntime(){
  if(selectedAttacker===null || !state)return null;
  const p=E().active(state);
  return selectedAttacker==='refuge' ? p.refuge : p.bezSlots[selectedAttacker];
}
function saveRender(msg=''){
  if(state)E().save(state);
  render(msg);
}

function prefersReducedMotion(){
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function ensureTurnHandoffOverlay(){
  let overlay=document.getElementById('turnHandoffOverlay');
  if(overlay)return overlay;
  overlay=document.createElement('div');
  overlay.id='turnHandoffOverlay';
  overlay.className='turn-handoff-overlay';
  overlay.setAttribute('aria-live','polite');
  overlay.innerHTML='<div class="turn-handoff-card"><div class="turn-handoff-small">Runde übergeben</div><strong></strong></div>';
  document.getElementById('gameShell')?.appendChild(overlay);
  return overlay;
}
async function animateRoundHandoff(){
  if(!state)return;
  const nextButton=document.getElementById('gameNextPhase');
  const battlefield=document.getElementById('battlefield');
  const shell=document.getElementById('gameShell');

  // Regeln zuerst prüfen, ohne den Spielerwechsel vorwegzunehmen:
  // In der Endphase gibt es normalerweise keine offene Pflichtauswahl mehr,
  // aber falls doch, soll die Engine weiterhin die maßgebliche Fehlermeldung liefern.
  if(phase()?.id!=='end'){
    const r=E().advancePhase(state);
    selectedHandIndex=null;selectedAttacker=null;selectedTarget=null;refugeActionSelected=false;
    return saveRender(r.msg||'');
  }

  if(prefersReducedMotion() || !battlefield || !shell){
    const r=E().advancePhase(state);
    selectedHandIndex=null;selectedAttacker=null;selectedTarget=null;refugeActionSelected=false;
    return saveRender(r.msg||'');
  }

  const oldPlayer=E().active(state)?.name||'Spieler';
  const nextPlayer=state.players?.[1-state.activePlayer]?.name||'Nächster Spieler';
  const overlay=ensureTurnHandoffOverlay();
  const overlayName=overlay.querySelector('strong');
  if(overlayName)overlayName.textContent=`${nextPlayer} ist am Zug`;

  shell.classList.add('turn-handoff-active');
  nextButton.disabled=true;
  battlefield.classList.remove('turn-flip-in');
  battlefield.classList.add('turn-flip-out');

  // Erst wenn das Brett fast nur noch von der Kante sichtbar ist, wird intern gewechselt.
  await wait(330);

  const r=E().advancePhase(state);
  if(!r.ok){
    battlefield.classList.remove('turn-flip-out');
    shell.classList.remove('turn-handoff-active');
    nextButton.disabled=false;
    return saveRender(r.msg||'Runde konnte nicht übergeben werden.');
  }

  selectedHandIndex=null;selectedAttacker=null;selectedTarget=null;selectedAttackType=null;refugeActionSelected=false;

  // Neuen Spieler hinter der "Brettkante" rendern.
  E().save(state);
  render('');
  overlay.classList.add('visible');
  battlefield.classList.remove('turn-flip-out');
  battlefield.classList.add('turn-flip-in');

  // Ein sehr kurzer Halt macht die Übergabe verständlicher, ohne den Spielfluss zu bremsen.
  await wait(120);
  requestAnimationFrame(()=>battlefield.classList.add('turn-flip-in-active'));

  await wait(430);

  battlefield.classList.remove('turn-flip-in','turn-flip-in-active');
  overlay.classList.remove('visible');
  shell.classList.remove('turn-handoff-active');
  nextButton.disabled=false;
  message(`${nextPlayer} beginnt die Kampfrunde.`);
  requestAnimationFrame(updateStickyGameOffsets);
  const fitWrap=document.getElementById('battlefieldFit');
  if(!fitWrap?.dataset.fitScale) scheduleMobileBattlefieldFit();
}
function gamePageOpened(){
  window.addEventListener('resize',updateStickyGameOffsets);

  fillDeckSelectors();
  const saved=E().load();
  document.getElementById('gameResume').hidden=!saved;
  if(state)render();
}
window.gamePageOpened=gamePageOpened;

const MOBILE_BATTLEFIELD_MAX_WIDTH=900;
let battlefieldFitRaf=0;

function resetMobileBattlefieldFit(){
  const wrap=document.getElementById('battlefieldFit');
  const board=document.getElementById('battlefield');
  if(!wrap||!board)return;

  wrap.classList.remove('mobile-fit-active');
  wrap.style.height='';
  wrap.style.width='';
  wrap.style.maxWidth='';
  board.style.transform='';
  board.style.width='';
  delete wrap.dataset.fitScale;
}

function fitBattlefieldToMobileViewport(){
  const wrap=document.getElementById('battlefieldFit');
  const board=document.getElementById('battlefield');
  const shell=document.getElementById('gameShell');
  if(!wrap||!board||!shell||shell.hidden)return;

  // Einmal berechnet = eingefroren. Das ist absichtlich auch bei Pinch-Zoom
  // und normalen Render-Vorgängen so.
  if(wrap.dataset.fitScale)return;

  // Für die Grundskalierung ausschließlich den Layout-Viewport verwenden.
  // visualViewport verändert sich beim Pinch-Zoom und darf die einmal
  // berechnete Spielfeldgröße nicht beeinflussen.
  const viewportWidth=Math.round(document.documentElement.clientWidth||window.innerWidth);
  const viewportHeight=Math.round(document.documentElement.clientHeight||window.innerHeight);

  if(viewportWidth>MOBILE_BATTLEFIELD_MAX_WIDTH){
    resetMobileBattlefieldFit();
    return;
  }

  wrap.classList.add('mobile-fit-active');

  // Feste, vollständige Brettbreite als Ausgangsgeometrie.
  // Das Brett wird absolut im Wrapper positioniert, sodass seine unskalierte
  // 1260px-Breite niemals die Seite oder einzelne Spielerbereiche verbreitert.
  board.style.width='1260px';
  board.style.transform='none';

  const naturalWidth=1260;
  const naturalHeight=Math.max(board.scrollHeight,board.getBoundingClientRect().height,1);
  const availableWidth=Math.max(240,viewportWidth-8);

  // Primär nach kompletter Breite einpassen. Zusätzlich darf das Brett höchstens
  // 78 % der sichtbaren Höhe beanspruchen, damit auch Hochformatgeräte alles sehen.
  const availableHeight=Math.max(260,viewportHeight*0.78);
  const scale=Math.min(1,availableWidth/naturalWidth,availableHeight/naturalHeight);

  board.style.transformOrigin='top left';
  board.style.transform=`scale(${scale})`;

  wrap.style.width='100%';
  wrap.style.maxWidth='100%';
  wrap.style.height=`${Math.ceil(naturalHeight*scale)}px`;
  wrap.dataset.fitScale=String(scale);
}
function scheduleMobileBattlefieldFit(){
  cancelAnimationFrame(battlefieldFitRaf);
  battlefieldFitRaf=requestAnimationFrame(()=>{
    battlefieldFitRaf=requestAnimationFrame(fitBattlefieldToMobileViewport);
  });
}

// v1.57: Nach dem ersten Auto-Fit bleibt die Brettskalierung vollständig eingefroren.
// Pinch-Zoom darf keinerlei Re-Fit auslösen. Nur ein echter orientationchange
// setzt den Fit zurück und berechnet ihn einmal neu.
window.addEventListener('orientationchange',()=>{
  resetMobileBattlefieldFit();
  setTimeout(scheduleMobileBattlefieldFit,250);
});
// Kein Re-Fit bei visualViewport.resize:
 // Dieses Event feuert auf Android/iOS auch beim Pinch-Zoom und würde
 // das Spielfeld gegen den Zoom sofort wieder verkleinern.

function fillDeckSelectors(){
  updateBattleSetupPlayerNames();
  const all=E().decks();
  const normalized=all.map(d=>E().normalizeDeckForBattle?.(d)||d);
  const ds=normalized.filter(E().validDeck);

  for(const id of ['gameDeckP1','gameDeckP2']){
    const sel=document.getElementById(id);
    if(!sel)return;
    const old=sel.value;
    const oldIndex=sel.selectedIndex;
    sel.replaceChildren();

    for(const d of ds){
      const o=document.createElement('option');
      o.value=String(d.id||'');
      o.textContent=d.name||'Unbenanntes Deck';
      sel.appendChild(o);
    }

    if(old && ds.some(d=>String(d.id||'')===old)){
      sel.value=old;
    }else if(oldIndex>=0 && sel.options.length){
      sel.selectedIndex=Math.min(oldIndex,sel.options.length-1);
    }
  }

  if(ds.length>1){
    const p1=document.getElementById('gameDeckP1');
    const p2=document.getElementById('gameDeckP2');
    if(p2 && (!p2.value || p2.value===p1?.value))p2.selectedIndex=1;
  }

  const info=document.getElementById('gameSetupInfo');
  if(!info)return;
  if(!all.length){
    info.hidden=false;
    info.textContent='Du brauchst zuerst mindestens ein vollständiges Deck unter „Meine Decks“.';
  }else if(!ds.length){
    info.hidden=false;
    info.textContent=`${all.length} gespeicherte${all.length===1?'s Deck':' Decks'} gefunden, aber keines erfüllt aktuell alle Gefechtsregeln. Öffne das Deck einmal unter „Meine Decks“ und speichere es erneut.`;
  }else{
    info.hidden=true;
    info.textContent='';
  }
}

function startGame(){
  const ds=E().decks().filter(E().validDeck);
  const d1=ds.find(d=>d.id===document.getElementById('gameDeckP1').value);
  const d2=ds.find(d=>d.id===document.getElementById('gameDeckP2').value);
  if(!d1||!d2)return;
  let sp=document.getElementById('gameStartPlayer').value;
  sp=sp==='random'?Math.floor(Math.random()*2):Number(sp);
  state=E().startGame(d1,d2,sp);
  applyBattlePlayerNames();
  E().save(state);
  document.getElementById('gameSetup').hidden=true;
  document.getElementById('gameShell').hidden=false;
  selectedHandIndex=null;selectedAttacker=null;selectedTarget=null;refugeActionSelected=false;

  // v1.64: Beim Gefechtsstart denselben Auto-Fit-Ablauf erzwingen,
  // der bisher erst nach einem echten orientationchange zuverlässig griff.
  resetMobileBattlefieldFit();
  render('Gefecht gestartet. Beide Spieler haben 3 Karten auf der Starthand.');
  setTimeout(()=>{
    resetMobileBattlefieldFit();
    scheduleMobileBattlefieldFit();
  },250);
}
function resumeGame(){
  const saved=E().load();
  if(!saved)return;
  state=saved;
  applyBattlePlayerNames();
  E().save(state);
  document.getElementById('gameSetup').hidden=true;
  document.getElementById('gameShell').hidden=false;

  // Auch beim Fortsetzen eines Gefechts frisch an das aktuelle Hoch-/Querformat anpassen.
  resetMobileBattlefieldFit();
  render('Gespeichertes Gefecht fortgesetzt.');
  setTimeout(()=>{
    resetMobileBattlefieldFit();
    scheduleMobileBattlefieldFit();
  },250);
}
function newGame(){
  if(!confirm('Aktuelles Gefecht beenden und zur Deckauswahl zurückkehren?'))return;
  state=null;E().clear();
  document.getElementById('gameShell').hidden=true;
  document.getElementById('gameSetup').hidden=false;
  window.addEventListener('resize',updateStickyGameOffsets);

  fillDeckSelectors();
}
function message(text,type=''){
  const el=document.getElementById('gameMessage');
  el.textContent=text||'';
  el.className='game-message'+(type?` ${type}`:'');
}
function cardHasDeploymentDelay(c){
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

function statLine(r,{playerIndex=null,bezSlot=null}={}){
  if(!r)return '';
  const c=E().cardData(r);
  const isEq=E().isEquipmentCard?.(c);

  let hearts=Number(r.hearts||0);
  let phys=Number(r.physical ?? c?.physische_staerke ?? 0);
  let astr=Number(r.astral ?? c?.astrale_staerke ?? 0);
  let pShield=Number(r.physicalShield||0);
  let aShield=Number(r.astralShield||0);

  if(isEq){
    // Auf der Ausrüstung selbst stehen nur die Werte, die genau diese Quelle
    // aktuell beiträgt. So ist sofort sichtbar, woher der Gesamtwert kommt.
    hearts=Number(r.heartBonus||0);
    phys=Number(r.tempPhysicalBonus||0)+Number(r.attackPhysicalWhenAttacking||0)+Number(r.defendPhysicalWhenDefending||0);
    astr=Number(r.tempAstralBonus||0)+Number(r.attackAstralWhenAttacking||0);
  }else if(playerIndex!==null && bezSlot!==null){
    const total=E().effectiveBezStats?.(state,playerIndex,bezSlot);
    if(total){
      hearts=total.hearts;
      phys=total.physical;
      astr=total.astral;
      pShield=total.physicalShield;
      aShield=total.astralShield;
    }
  }

  const physText=isEq && phys>0?`+${phys}`:phys;
  const astrText=isEq && astr>0?`+${astr}`:astr;
  const heartText=isEq && hearts>0?`+${hearts}`:hearts;

  return `<span class="stat heart">♥ ${heartText}</span>
    <span class="stat physical">⚔ ${physText}</span>
    <span class="stat astral">✦ ${astrText}</span>
    <span class="stat pshield">◆ ${pShield}</span>
    <span class="stat ashield">◆ ${aShield}</span>
    <span class="stat honor">● ${r.honor}</span>`;
}
function runtimeCountersHtml(r){
  if(!r || r.faceDown)return '';
  const c=E().cardData(r),parts=[];
  if(r.effectUsesRemaining!==null && r.effectUsesRemaining!==undefined)parts.push(`<span title="Verbleibende Ladungen">Ladungen ${Number(r.effectUsesRemaining)}</span>`);
  if(r.effectRoundsRemaining!==null && r.effectRoundsRemaining!==undefined)parts.push(`<span title="Verbleibende eigene Kampfrunden">KR ${Number(r.effectRoundsRemaining)}</span>`);
  if((r.berserkerMarks||0)>0 || c?.effekte?.some?.(e=>e.engine_key==='evelyn_berserker'))parts.push(`<span title="Berserkermarken">Berserk ${Number(r.berserkerMarks||0)}</span>`);
  return parts.length?`<div class="runtime-counters">${parts.join('')}</div>`:'';
}

function runtimeCardHtml(r,{hidden=false,small=false,playerIndex=null,bezSlot=null}={}){
  if(!r)return '<div class="board-empty">Frei</div>';
  const c=E().cardData(r);
  if(hidden || r.faceDown){
    return `<div class="board-card back ${small?'small':''}"><img class="real-card-back" src="icons/kartenrueckseite.png" alt="Kartenrückseite"></div>`;
  }
  const isRefuge=c?.deck_bereich==='zuflucht'||String(c?.kartentyp||'').toLowerCase()==='zuflucht';
  const deploymentDelayApplies=!isRefuge && c?.herzen!==null && c?.herzen!==undefined;
  const delayed=(r.ready===false && deploymentDelayApplies)?' delayed-card':'';
  const readiness=deploymentDelayApplies?(r.ready?'<em>EINSATZBEREIT</em>':'<em class="delay">Einsatzverzögerung</em>'):'';
  return `<div class="board-card ${small?'small':''}${delayed}">
    <img src="${esc(c?.bild||r.bild)}" alt="${esc(c?.name||'Karte')}">
    ${runtimeCountersHtml(r)}
    <div class="board-card-meta"><strong>${esc(c?.name||'Karte')}</strong><div class="stat-row">${statLine(r,{playerIndex,bezSlot})}</div>${readiness}</div>
  </div>`;
}
function stackHtml(p,key,label){
  const pile=Array.isArray(p?.stacks?.[key])?p.stacks[key]:[];
  const n=pile.length;
  return `<button class="stack-pile" data-stack="${key}" ${n?'':'disabled'}>
    <span class="stack-back">${esc(label)}</span><b>${n}</b>
  </button>`;
}
function developmentHtml(p){
  const n=Array.isArray(p?.development)?p.development.length:0;
  return `<div class="dev-pile"><span>ENTWICKLUNG</span><b>${n}</b></div>`;
}
function equipmentSlot(label,kind,bezIndex,r,isActive){
  return `<button class="equip-slot ${kind}" data-equip="${kind}" data-equip-bez="${bezIndex}" ${(isActive||cardPreviewMode)?'':'disabled'}>
    ${runtimeCardHtml(r)}
    <span class="slot-label">${label}</span>
  </button>`;
}

function bezEffectBadge(r){
  if(!r)return '';
  const c=E().cardData(r);
  if(!c)return '';
  const symbol=String(c.effekt_symbol||'none');
  const labels={
    on_play:'⚡',
    wonder:'✦',
    permanent:'∞',
    charges:'●',
    duration:'⏱'
  };
  const icon=labels[symbol]||'';
  if(!icon)return '';

  return ` <span class="bez-effect-badge" title="${esc(c.effekt_text||'Karteneffekt')}">${icon}</span>`;
}

function bezCore(r,i,isActive,playerIndex){
  // Gegnerische Bezwingerinnen dürfen nicht als HTML-"disabled" gerendert
  // werden: In der Ansturmphase müssen sie als Angriffsziel anklickbar sein.
  // Eigene Grundaktionen werden ohnehin nur über #playerBoard verdrahtet.
  return `<button type="button" class="board-slot bez-slot${isActive?'':' opponent-slot'}" data-bez="${i}" aria-disabled="${isActive?'false':'true'}">${runtimeCardHtml(r,{playerIndex,bezSlot:i})}<span class="slot-label">BEZWINGERIN${bezEffectBadge(r)}</span></button>`;
}
function playerBoardHtml(p,isActive,isOpponent){
  // Defensive migration/rendering: older gespeicherte Gefechte können einzelne
  // Felder noch nicht besitzen. Das Spielfeld darf deshalb nicht komplett
  // abstürzen, nur weil z.B. azr/equipment/development fehlt.
  p=p||{};
  const eq=Array.isArray(p.equipment) ? p.equipment : [
    {weapon:null,shield:null,armor:null,helmet:null},
    {weapon:null,shield:null,armor:null,helmet:null}
  ];
  const azrList=Array.isArray(p.azr) ? p.azr : [null,null,null];
  const bezSlots=Array.isArray(p.bezSlots) ? p.bezSlots : [null,null];
  const hand=Array.isArray(p.hand) ? p.hand : [];
  const discard=Array.isArray(p.discard) ? p.discard : [];
  const development=Array.isArray(p.development) ? p.development : [];
  const stacks=p.stacks||{bezwingerinnen:[],astral:[],ruestkammer:[]};
  const safePlayer={...p,azr:azrList,bezSlots,hand,discard,development,stacks,equipment:eq};

  const azr=azrList.map((r,i)=>`<button class="board-slot azr-slot" data-azr="${i}" ${(isActive||cardPreviewMode)?'':'disabled'}>${runtimeCardHtml(r,{hidden:isOpponent&&r?.faceDown})}<span class="slot-label">AZR ${i+1}</span></button>`).join('');
  const oppClass=isOpponent?' mirrored':'';

  return `<div class="board-inner${oppClass}">
    <div class="board-player-title">
      <strong>${esc(safePlayer.name||'Spieler')}${isActive?' · AM ZUG':''}</strong>
      <span>${esc(safePlayer.deckName||'Deck')} · Hand ${hand.length} · Ablage ${discard.length}</span>
    </div>

    <div class="rule-board">
      <div class="development-column">${developmentHtml(safePlayer)}</div>

      <div class="playmat-center">
        <div class="primary-row">
          <div class="primary-zone-field" data-primary-target data-field-area="primary" role="button" tabindex="0">
            <span class="area-title">PRIMÄRZONE</span>
            ${runtimeCardHtml(safePlayer.primary||null,{small:true})}
          </div>
        </div>

        <div class="combat-grid">
          <div class="cg l-helmet">${equipmentSlot('HELM','helmet',0,eq[0]?.helmet,isActive)}</div>
          <div class="cg r-helmet">${equipmentSlot('HELM','helmet',1,eq[1]?.helmet,isActive)}</div>

          <div class="cg l-weapon">${equipmentSlot('WAFFE','weapon',0,eq[0]?.weapon,isActive)}</div>
          <div class="cg l-bez">${bezCore(bezSlots[0],0,isActive,safePlayer.index)}</div>
          <div class="cg l-shield">${equipmentSlot('SCHILD','shield',0,eq[0]?.shield,isActive)}</div>

          <div class="cg refuge">
            <button type="button" class="refuge-card${isActive?'':' opponent-slot'}" data-refuge aria-disabled="${isActive?'false':'true'}">${runtimeCardHtml(safePlayer.refuge)}<span class="slot-label">ZUFLUCHT</span></button>
          </div>

          <div class="cg r-weapon">${equipmentSlot('WAFFE','weapon',1,eq[1]?.weapon,isActive)}</div>
          <div class="cg r-bez">${bezCore(bezSlots[1],1,isActive,safePlayer.index)}</div>
          <div class="cg r-shield">${equipmentSlot('SCHILD','shield',1,eq[1]?.shield,isActive)}</div>

          <div class="cg l-armor">${equipmentSlot('RÜSTUNG','armor',0,eq[0]?.armor,isActive)}</div>
          <div class="cg r-armor">${equipmentSlot('RÜSTUNG','armor',1,eq[1]?.armor,isActive)}</div>
        </div>

        <div class="azr-row">${azr}</div>
      </div>

      <div class="stacks-column">
        ${stackHtml(safePlayer,'bezwingerinnen','BEZWINGERINNEN')}
        ${stackHtml(safePlayer,'astral','ASTRAL')}
        ${stackHtml(safePlayer,'ruestkammer','RÜSTKAMMER')}
        <div class="discard-pile"><span>ABLAGE</span><b>${discard.length}</b></div>
      </div>
    </div>
  </div>`;
}
function renderSharedSecondary(){
  const root=document.getElementById('sharedSecondaryZone');
  if(!root)return;
  const shared=state.sharedSecondary||null;
  root.innerHTML=shared
    ? `<div class="shared-secondary-card" data-secondary-target data-field-area="secondary" role="button" tabindex="0">${runtimeCardHtml(shared)}</div>`
    : `<div class="shared-secondary-empty" data-field-area="secondary"><span>SEKUNDÄR</span><small>Frei</small></div>`;
}


function ensureGameCardPreview(){
  let overlay=document.getElementById('gameCardPreviewOverlay');
  if(overlay)return overlay;
  overlay=document.createElement('div');
  overlay.id='gameCardPreviewOverlay';
  overlay.className='game-card-preview-overlay';
  overlay.hidden=true;
  overlay.innerHTML=`
    <div class="game-card-preview-panel" role="dialog" aria-modal="true" aria-label="Kartenvorschau">
      <div class="game-card-preview-head">
        <div><div class="eyebrow">KARTENVORSCHAU</div><strong id="gameCardPreviewName">Karte auswählen</strong></div>
        <button type="button" id="gamePreviewClose" class="game-preview-close" title="Kartenansicht schließen" aria-label="Kartenansicht schließen">✕</button>
      </div>
      <div class="game-card-preview-body">
        <div id="gameCardPreviewEmpty" class="game-card-preview-empty">Tippe auf eine Karte im Spielfeld oder auf deiner Hand.</div>
        <img id="gameCardPreviewImage" class="game-card-preview-image" alt="" hidden>
        <div id="gameCardPreviewMeta" class="game-card-preview-meta"></div>
      </div>
    </div>`;
  document.getElementById('gameShell')?.appendChild(overlay);
  overlay.querySelector('#gamePreviewClose')?.addEventListener('click',closeGameCardPreview);
  return overlay;
}
function closeGameCardPreview(){
  const overlay=ensureGameCardPreview();
  overlay.hidden=true;
  previewRuntime=null;previewOwnerIndex=null;previewHidden=false;
}
function previewCard(runtime,ownerIndex,{forceBack=false}={}){
  if(!cardPreviewMode||!runtime)return;
  const overlay=ensureGameCardPreview();
  overlay.hidden=false;
  const activeIndex=state.activePlayer;
  const hiddenFromViewer=forceBack || (!!runtime.faceDown && ownerIndex!==activeIndex);
  const c=E().cardData(runtime);
  const img=overlay.querySelector('#gameCardPreviewImage');
  const empty=overlay.querySelector('#gameCardPreviewEmpty');
  const name=overlay.querySelector('#gameCardPreviewName');
  const meta=overlay.querySelector('#gameCardPreviewMeta');
  previewRuntime=runtime;previewOwnerIndex=ownerIndex;previewHidden=hiddenFromViewer;
  empty.hidden=true;img.hidden=false;
  if(hiddenFromViewer){
    img.src='icons/kartenrueckseite.png';img.alt='Verdeckte gegnerische Karte';
    name.textContent='Verdeckte gegnerische Karte';
    meta.textContent='Diese Karte bleibt für dich verdeckt.';
  }else{
    img.src=c?.bild||runtime.bild;img.alt=c?.name||'Karte';
    name.textContent=c?.name||'Karte';
    const details=[c?.kartengruppe,c?.kartentyp,c?.klasse,c?.bereich,c?.stufe?`Stufe ${c.stufe}`:null].filter(Boolean);
    meta.textContent=details.join(' · ');
  }
}
function clearGamePreview(){
  previewRuntime=null;previewOwnerIndex=null;previewHidden=false;
  const overlay=ensureGameCardPreview(),img=overlay.querySelector('#gameCardPreviewImage');
  overlay.querySelector('#gameCardPreviewEmpty').hidden=false;
  img.hidden=true;img.removeAttribute('src');img.alt='';
  overlay.querySelector('#gameCardPreviewName').textContent='Karte auswählen';
  overlay.querySelector('#gameCardPreviewMeta').textContent='';
}
function toggleCardPreviewMode(){
  cardPreviewMode=!cardPreviewMode;
  const overlay=ensureGameCardPreview();

  if(cardPreviewMode){
    clearGamePreview();
    overlay.hidden=true;
    selectedHandIndex=null;
    selectedAttacker=null;
    selectedTarget=null;
    selectedAttackType=null;
    refugeActionSelected=false;
  }else{
    closeGameCardPreview();
  }

  // v1.62: Das Spielfeld MUSS beim Umschalten neu aufgebaut werden.
  // Die Karten-Listener werden beim Rendern erzeugt. Ohne Re-Render blieben
  // nach Aktivieren der Lupe die alten Spiel-Listener (Entwickeln, Wunder,
  // Angreifen usw.) an den Karten hängen und die Vorschau-Listener fehlten.
  // Im Vorschaumodus baut renderBoards() ausschließlich Preview-Listener auf;
  // beim Verlassen werden wieder die normalen Spiel-Listener erzeugt.
  if(state){
    render();
  }else{
    document.getElementById('gameShell')?.classList.toggle('card-preview-mode',cardPreviewMode);
    document.getElementById('gamePreviewToggle')?.classList.toggle('active',cardPreviewMode);
    document.getElementById('gamePreviewToggle')?.setAttribute('aria-pressed',String(cardPreviewMode));
  }
}

function previewRuntimeFromBoardElement(target){
  const own=E().active(state),opp=E().opponent(state);
  const inOwn=!!target.closest('#playerBoard');
  const inOpp=!!target.closest('#opponentBoard');
  const player=inOwn?own:(inOpp?opp:null);

  const bez=target.closest('[data-bez]');
  if(bez&&player){
    const slot=Number(bez.dataset.bez);
    return {runtime:player.bezSlots?.[slot]||null,ownerIndex:player.index};
  }
  const refuge=target.closest('[data-refuge]');
  if(refuge&&player)return {runtime:player.refuge||null,ownerIndex:player.index};

  const primary=target.closest('[data-primary-target]');
  if(primary&&player)return {runtime:player.primary||null,ownerIndex:player.index};

  const secondary=target.closest('#sharedSecondaryZone [data-secondary-target]');
  if(secondary)return {runtime:state.sharedSecondary||null,ownerIndex:state.sharedSecondary?.owner};

  const azr=target.closest('[data-azr]');
  if(azr&&player){
    const slot=Number(azr.dataset.azr);
    const runtime=player.azr?.[slot]||null;
    return {runtime,ownerIndex:player.index,forceBack:inOpp&&!!runtime?.faceDown};
  }

  const equip=target.closest('[data-equip]');
  if(equip&&player){
    const slot=Number(equip.dataset.equipBez);
    const kind=equip.dataset.equip;
    return {runtime:player.equipment?.[slot]?.[kind]||null,ownerIndex:player.index};
  }
  return null;
}

// v1.63: zentraler Capture-Guard.
// Er läuft VOR sämtlichen Karten-Handlern des Gefechts und verhindert im
// Vorschaumodus garantiert Entwickeln/Wunder/Angriff/Ausrüstung usw.
document.addEventListener('click',ev=>{
  if(!cardPreviewMode||!state)return;
  const boardTarget=ev.target.closest('#playerBoard,#opponentBoard,#sharedSecondaryZone');
  if(!boardTarget)return;

  ev.preventDefault();
  ev.stopPropagation();
  ev.stopImmediatePropagation();

  const found=previewRuntimeFromBoardElement(ev.target);
  if(found?.runtime){
    previewCard(found.runtime,found.ownerIndex,{forceBack:!!found.forceBack});
  }
},true);

function wirePreviewTargets(){
  if(!cardPreviewMode)return;
  const own=E().active(state),opp=E().opponent(state);
  const bind=(sel,runtime,ownerIndex,opts={})=>{
    const el=document.querySelector(sel);
    if(!el||!runtime)return;
    el.classList.add('preview-selectable');
    el.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();previewCard(runtime,ownerIndex,opts);},true);
  };
  own.bezSlots.forEach((r,i)=>bind(`#playerBoard [data-bez="${i}"]`,r,own.index));
  opp.bezSlots.forEach((r,i)=>bind(`#opponentBoard [data-bez="${i}"]`,r,opp.index));
  bind('#playerBoard [data-refuge]',own.refuge,own.index);
  bind('#opponentBoard [data-refuge]',opp.refuge,opp.index);
  bind('#playerBoard [data-primary-target]',own.primary,own.index);
  bind('#opponentBoard [data-primary-target]',opp.primary,opp.index);
  bind('#sharedSecondaryZone [data-secondary-target]',state.sharedSecondary,state.sharedSecondary?.owner);
  own.azr.forEach((r,i)=>bind(`#playerBoard [data-azr="${i}"]`,r,own.index));
  opp.azr.forEach((r,i)=>bind(`#opponentBoard [data-azr="${i}"]`,r,opp.index,{forceBack:!!r?.faceDown}));
  (own.equipment||[]).forEach((eq,bi)=>Object.entries(eq||{}).forEach(([kind,r])=>bind(`#playerBoard [data-equip="${kind}"][data-equip-bez="${bi}"]`,r,own.index)));
  (opp.equipment||[]).forEach((eq,bi)=>Object.entries(eq||{}).forEach(([kind,r])=>bind(`#opponentBoard [data-equip="${kind}"][data-equip-bez="${bi}"]`,r,opp.index)));
}

function renderBoards(){
  const a=state.activePlayer,opp=1-a;
  const opponentRoot=document.getElementById('opponentBoard');
  const playerRoot=document.getElementById('playerBoard');

  try{
    opponentRoot.innerHTML=playerBoardHtml(state.players[opp],false,true);
  }catch(err){
    console.error('Gegnerfeld konnte nicht gerendert werden:',err);
    opponentRoot.innerHTML=`<div class="board-render-error">Gegnerfeld konnte nicht dargestellt werden.<br><small>${esc(err?.message||err)}</small></div>`;
  }

  try{
    playerRoot.innerHTML=playerBoardHtml(state.players[a],true,false);
  }catch(err){
    console.error('Eigenes Spielfeld konnte nicht gerendert werden:',err);
    playerRoot.innerHTML=`<div class="board-render-error">Eigenes Spielfeld konnte nicht dargestellt werden.<br><small>${esc(err?.message||err)}</small></div>`;
  }

  try{
    renderSharedSecondary();
  }catch(err){
    console.error('Sekundärzone konnte nicht gerendert werden:',err);
  }

  if(cardPreviewMode){
    wirePreviewTargets();
    return;
  }

  // Stack draw in draw phase.
  document.querySelectorAll('#playerBoard .stack-pile').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(phase().id!=='draw')return message('Von den Hauptstapeln wird regulär nur in der Ziehphase gezogen.','warn');
      const r=E().drawPhaseCard(state,btn.dataset.stack);
      saveRender(r.msg||'Karte gezogen.');
    });
  });

  document.querySelectorAll('#playerBoard [data-bez]').forEach(btn=>{
    btn.addEventListener('click',()=>handleOwnBez(Number(btn.dataset.bez)));
  });
  document.querySelectorAll('#playerBoard [data-azr]').forEach(btn=>{
    btn.addEventListener('click',()=>handleAzr(Number(btn.dataset.azr)));
  });
  document.querySelectorAll('#playerBoard [data-equip]').forEach(btn=>{
    btn.addEventListener('click',()=>handleEquipmentSlot(btn.dataset.equip,Number(btn.dataset.equipBez)));
  });
  document.querySelector('#playerBoard [data-refuge]')?.addEventListener('click',()=>handleRefuge());
  document.querySelector('#playerBoard [data-primary-target]')?.addEventListener('click',()=>{const r=E().active(state).primary,c=E().cardData(r);if(r?.owner===state.activePlayer&&c?.effekte?.some(e=>e.engine_key==='ruth_shop')&&['supply','resupply'].includes(phase().id)){const rr=E().startRuthEffect(state);saveRender(rr.msg);}});
  document.querySelector('#playerBoard [data-primary-target]')?.addEventListener('click',handleOwnPrimary);

  if(state.pendingEquipment && state.pendingEquipment.owner===state.activePlayer){
    const pending=state.pendingEquipment;
    [0,1].forEach(i=>{
      if(E().active(state).bezSlots[i]){
        document.querySelector(`#playerBoard [data-equip="${pending.kind}"][data-equip-bez="${i}"]`)?.classList.add('drop-valid','equip-pending-target');
      }
    });
  }

  // Angriffsauswahl in der Ansturmphase.
  if(phase()?.id==='rush' && !state.attack){
    // Eigene einsatzbereite Bezwingerinnen hervorheben.
    document.querySelectorAll('#playerBoard [data-bez]').forEach(btn=>{
      const slot=Number(btn.dataset.bez);
      const r=E().active(state).bezSlots[slot];
      if(E().canAttack(r,E().active(state))){
        btn.classList.add('attack-source-valid');
        if(selectedAttacker===slot)btn.classList.add('attack-source-selected');
      }
    });
    const refugeBtn=document.querySelector('#playerBoard [data-refuge]');
    if(refugeBtn && E().canRefugeAttack(state)){
      refugeBtn.classList.add('attack-source-valid');
      if(selectedAttacker==='refuge')refugeBtn.classList.add('attack-source-selected');
    }

    // Nach Wahl eines Angreifers nur legale gegnerische Karten mit Herzen hervorheben.
    if(selectedAttacker!==null){
      const targets=E().attackTargets(state,selectedAttacker);
      const addTarget=(selector,target)=>{
        const el=document.querySelector(selector);
        if(!el)return;
        const legal=targets.some(t=>t.type===target.type && t.slot===target.slot);
        if(!legal)return;
        el.classList.add('attack-target-valid');
        el.dataset.attackTarget='true';
        if(selectedTarget && selectedTarget.type===target.type && selectedTarget.slot===target.slot){
          el.classList.add('attack-target-selected');
        }

        const activateTarget=(ev)=>{
          ev.preventDefault();
          ev.stopPropagation();
          chooseTarget(target);
          return false;
        };
        el.onclick=activateTarget;
        el.onkeydown=(ev)=>{
          if(ev.key==='Enter' || ev.key===' '){
            activateTarget(ev);
          }
        };
      };

      [0,1].forEach(i=>addTarget(`#opponentBoard [data-bez="${i}"]`,{type:'bez',slot:i}));
      addTarget('#opponentBoard [data-refuge]',{type:'refuge'});
      addTarget('#opponentBoard [data-primary-target]',{type:'primary'});
      addTarget('#sharedSecondaryZone [data-secondary-target]',{type:'secondary'});
    }
  }

  wireDragAndDrop();
}
function renderHand(){
  const p=E().active(state);
  document.getElementById('handTitle').textContent=`Hand von ${p.name}`;
  document.getElementById('handCount').textContent=`${p.hand.length} Karten`;
  const root=document.getElementById('gameHand');
  root.innerHTML='';

  p.hand.forEach((bild,i)=>{
    const c=E().dbCard(bild);
    const el=document.createElement('button');
    el.className='hand-card'+(selectedHandIndex===i?' selected':'');
    el.draggable=!cardPreviewMode;
    el.dataset.handIndex=String(i);
    el.innerHTML=`<img src="${esc(bild)}" alt="${esc(c?.name||'Karte')}"><span>${esc(c?.name||'Karte')}</span>`;
    el.addEventListener('dragstart',(ev)=>{
      if(cardPreviewMode){ev.preventDefault();return;}
      ev.dataTransfer.setData('text/plain',String(i));
      ev.dataTransfer.effectAllowed='move';
      selectedHandIndex=i;
      markLegalDropTargets(i);
    });
    el.addEventListener('dragend',clearDropTargets);
    el.addEventListener('click',()=>{
      if(cardPreviewMode){
        const runtime={bild,owner:p.index,faceDown:false};
        previewCard(runtime,p.index);
        return;
      }
      selectedHandIndex=selectedHandIndex===i?null:i;
      renderHand();renderActions();
    });
    root.appendChild(el);
  });
  if(!p.hand.length)root.innerHTML='<div class="empty-state">Keine Handkarten.</div>';
}
function handSelected(){
  const p=E().active(state);
  if(selectedHandIndex===null||!p.hand[selectedHandIndex])return null;
  return E().dbCard(p.hand[selectedHandIndex]);
}
function renderActions(){
  const root=document.getElementById('gameActions');
  root.innerHTML='';
  if(cardPreviewMode){
    root.innerHTML='<div class="preview-mode-notice">🔍 Kartenvorschau aktiv · Spielinteraktionen sind eingefroren. Tippe eine Karte zum Vergrößern an.</div>';
    return;
  }
  // Direkter Kartenschaden (z.B. Die Kanone) kann in VP/NP/Instinkt-Fenstern
  // entstehen und darf deshalb nicht nur in der Kampfphase bedienbar sein.
  if(state.pendingDamage?.directDamageTarget){
    const choice=E().currentShieldChoice(state);
    if(choice){
      const affected=state.players[choice.playerIndex];
      const bez=affected?.bezSlots?.[choice.bezSlot];
      const info=document.createElement('span');
      info.className='shield-choice-info';
      info.innerHTML=`<strong>${esc(affected?.name||'Spieler')}</strong>: ${esc(cardName(bez))} erhält noch <strong>${choice.remaining}</strong> ${choice.type==='physical'?'physischen':'ASTRAL'} Schaden durch ${esc(state.pendingDamage.directDamageTarget.source||'Karteneffekt')}. Wähle die Schildquelle.`;
      root.appendChild(info);
      choice.sources.forEach(src=>{
        const b=document.createElement('button');
        b.className='primary shield-source-button';
        b.textContent=src.label;
        b.addEventListener('click',()=>{
          const rr=E().chooseShieldSource(state,src.source,src.kind);
          saveRender(rr.msg||'Schaden abgewickelt.');
        });
        root.appendChild(b);
      });
      return;
    }
  }

  if(state.pendingBezEffect?.type==='lilou2_discard'){
    const title=document.createElement('strong');title.textContent='Lilou Guerir Stufe 2 – Stufe-1-Bezwingerin aus Ablage wählen';root.appendChild(title);
    E().lilou2Targets(state,state.pendingBezEffect.sourcePlayer).forEach(t=>{const b=document.createElement('button');b.type='button';b.textContent=t.name;b.addEventListener('click',()=>{const rr=E().resolveLilou2Discard(state,t.id);saveRender(rr.msg);});root.appendChild(b);});
    return;
  }
  if(state.pendingBezEffect?.type==='queen_search'){
    const title=document.createElement('strong');title.textContent='Q.U.E.E.N. – Z.E.R.O. aus Bezwingerinnen-Stapel wählen';root.appendChild(title);
    E().queenStackTargets(state,state.pendingBezEffect.sourcePlayer).forEach(t=>{
      const b=document.createElement('button');b.type='button';b.textContent=t.name;
      b.addEventListener('click',()=>{const rr=E().resolveQueenSearch(state,t.id);saveRender(rr.msg);});root.appendChild(b);
    });
    return;
  }
  if(state.pendingBezEffect?.type==='queen2_discard'){
    const title=document.createElement('strong');title.textContent='Q.U.E.E.N. Stufe 2 – Z.E.R.O. aus Ablage wählen';root.appendChild(title);
    E().queenDiscardTargets(state,state.pendingBezEffect.sourcePlayer).forEach(t=>{
      const b=document.createElement('button');b.type='button';b.textContent=t.name;
      b.addEventListener('click',()=>{const rr=E().resolveQueen2Discard(state,t.id);saveRender(rr.msg);});root.appendChild(b);
    });
    return;
  }
  if(state.pendingBezEffect?.type==='keyla_search' || state.pendingBezEffect?.type==='keyla2_search'){
    const title=document.createElement('strong');title.textContent='Keyla Dorn – ASTRALFRAGMENT aus Rüstkammer wählen';root.appendChild(title);
    E().keylaSearchTargets(state,state.pendingBezEffect.sourcePlayer).forEach(t=>{
      const b=document.createElement('button');b.type='button';b.textContent=t.name;
      b.addEventListener('click',()=>{const rr=E().resolveKeylaSearch(state,t.id);saveRender(rr.msg);});root.appendChild(b);
    });
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Nicht nutzen';
    cancel.addEventListener('click',()=>{const rr=E().cancelPendingBezEffect(state);saveRender(rr.msg);});root.appendChild(cancel);return;
  }
  if(state.pendingBezEffect?.type==='keyla2_choice'){
    const title=document.createElement('strong');title.textContent='Keyla Dorn Stufe 2 – Aktion wählen';root.appendChild(title);
    [['destroy','Offene Reliquie zerstören'],['search','ASTRALFRAGMENT im Rüstkammer-Stapel suchen'],['discard','ASTRALFRAGMENT aus eigener Ablage nehmen']].forEach(([id,label])=>{
      const b=document.createElement('button');b.type='button';b.textContent=label;
      b.addEventListener('click',()=>{const rr=E().resolveKeyla2Choice(state,id);saveRender(rr.msg);});root.appendChild(b);
    });
    return;
  }
  if(state.pendingBezEffect?.type==='keyla2_destroy'){
    const title=document.createElement('strong');title.textContent='Keyla Dorn – offene Reliquie zerstören';root.appendChild(title);
    E().keyla2DestroyTargets(state).forEach(t=>{
      const b=document.createElement('button');b.type='button';b.textContent=`${t.own?'Eigene':'Gegnerische'}: ${t.name}`;
      b.addEventListener('click',()=>{const rr=E().resolveKeyla2Destroy(state,t.id);saveRender(rr.msg);});root.appendChild(b);
    });
    return;
  }

  if(state.pendingBezEffect?.type==='wunderumwandlungsapparatur_remove_honor'){
    const title=document.createElement('strong');
    const removed=Number(state.pendingBezEffect.removed||0);
    title.textContent=`Wunderumwandlungsapparatur – Ehre entfernen (${removed}/2)`;
    root.appendChild(title);
    const info=document.createElement('span');
    info.textContent='Wähle, von welcher eigenen offenen Karte 1 Ehre entfernt wird. Dieselbe Karte kann mehrfach gewählt werden, solange sie genug Ehre besitzt.';
    root.appendChild(info);
    E().wunderumwandlungsapparaturHonorSources(state).forEach(t=>{
      const b=document.createElement('button');
      b.type='button';
      b.textContent=`${t.name} (${t.honor} Ehre)`;
      b.addEventListener('click',()=>{
        const rr=E().resolveWunderumwandlungsapparaturHonor(state,t.id);
        saveRender(rr.msg);
      });
      root.appendChild(b);
    });
    return;
  }
  if(state.pendingBezEffect?.type==='wunderumwandlungsapparatur_target'){
    const title=document.createElement('strong');
    title.textContent='Wunderumwandlungsapparatur – Bezwingerin für +1 Ehre wählen';
    root.appendChild(title);
    E().wunderumwandlungsapparaturTargets(state).forEach(t=>{
      const b=document.createElement('button');
      b.type='button';
      b.textContent=`${t.name} (${t.honor} Ehre)`;
      b.addEventListener('click',()=>{
        const rr=E().resolveWunderumwandlungsapparaturTarget(state,t.id);
        saveRender(rr.msg);
      });
      root.appendChild(b);
    });
    return;
  }
  if(state.pendingBezEffect?.type==='ruth_target'){const title=document.createElement('strong');title.textContent='Dorfschmiedin Ruth – Bezwingerin wählen';root.appendChild(title);E().ruthTargets(state).forEach(t=>{const b=document.createElement('button');b.type='button';b.textContent=t.name;b.onclick=()=>{const rr=E().resolveRuthTarget(state,t.id);saveRender(rr.msg)};root.appendChild(b)});return;}
  if(state.pendingBezEffect?.type==='ruth_choice'){const title=document.createElement('strong');title.textContent='Dorfschmiedin Ruth – Schild wählen';root.appendChild(title);[['physical','+1 physischer Schild'],['astral','+1 ASTRAL-Schild']].forEach(([id,label])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{const rr=E().resolveRuthChoice(state,id);saveRender(rr.msg)};root.appendChild(b)});return;}
  if(state.pendingBezEffect?.type==='ehris_select'){const title=document.createElement('strong');title.textContent='Ehris Ohrringe – Oberwelt-Bezwingerin wählen';root.appendChild(title);E().ehrisTargets(state,state.pendingBezEffect.sourcePlayer).forEach(t=>{const b=document.createElement('button');b.type='button';b.textContent=t.name;b.onclick=()=>{const rr=E().resolveEhrisSelection(state,t.id);saveRender(rr.msg)};root.appendChild(b)});return;}
  if(state.pendingBezEffect && ['laehmendes_nervengift','trank_der_staerke','trank_der_astral_macht','die_kanone','ueberladung','skyflux'].includes(state.pendingBezEffect.type)){
    const title=document.createElement('strong');
    title.textContent=state.pendingBezEffect.type==='laehmendes_nervengift'
      ? 'Lähmendes Nervengift – gegnerische Bezwingerin wählen'
      : state.pendingBezEffect.type==='die_kanone'
        ? 'Die Kanone – gegnerische Bezwingerin wählen'
        : state.pendingBezEffect.type==='ueberladung'
          ? 'Überladung – eigene Bezwingerin wählen'
          : state.pendingBezEffect.type==='skyflux'
            ? 'Skyflux – eigene Bezwingerin für Positionswechsel wählen'
            : state.pendingBezEffect.type==='trank_der_astral_macht'
              ? 'Trank der ASTRAL-Macht – eigene Bezwingerin wählen'
              : 'Trank der Stärke – eigene Bezwingerin wählen';
    root.appendChild(title);
    E().instantRuestkammerTargets(state).forEach(t=>{
      const b=document.createElement('button');b.type='button';b.textContent=t.name;
      b.addEventListener('click',()=>{const rr=E().resolveInstantRuestkammerTarget(state,t.id);saveRender(rr.msg);});
      root.appendChild(b);
    });
    return;
  }
  if(state.pendingBezEffect?.type==='kristallharnisch_choice'){
    const title=document.createElement('strong');title.textContent='Kristallharnisch – Blitz-Effekt';root.appendChild(title);
    const yes=document.createElement('button');yes.type='button';yes.textContent='1 ASTRAL-Stärke → +2 ASTRAL-Schilde';
    yes.addEventListener('click',()=>{const rr=E().resolveKristallharnischEffect(state,true);saveRender(rr.msg);});root.appendChild(yes);
    const no=document.createElement('button');no.type='button';no.textContent='Effekt nicht nutzen';
    no.addEventListener('click',()=>{const rr=E().resolveKristallharnischEffect(state,false);saveRender(rr.msg);});root.appendChild(no);
    return;
  }
  if(state.pendingBezEffect?.type==='fragmentfresser_schlund_discard'){
    const title=document.createElement('strong');title.textContent='Fragmentfresser Schlund – ASTRALFRAGMENT aus Ablage wählen';root.appendChild(title);
    E().fragmentfresserSchlundTargets(state,state.pendingBezEffect.sourcePlayer).forEach(t=>{
      const b=document.createElement('button');b.type='button';b.textContent=t.name;
      b.addEventListener('click',()=>{const rr=E().resolveFragmentfresserSchlund(state,t.id);saveRender(rr.msg);});root.appendChild(b);
    });
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Effekt nicht nutzen';
    cancel.addEventListener('click',()=>{const rr=E().cancelPendingBezEffect(state);saveRender('Fragmentfresser Schlunds optionaler Effekt wurde nicht genutzt.');});root.appendChild(cancel);
    return;
  }
  if(state.pendingBezEffect?.type==='keyla2_discard'){
    const title=document.createElement('strong');title.textContent='Keyla Dorn – ASTRALFRAGMENT aus Ablage wählen';root.appendChild(title);
    E().keyla2DiscardTargets(state,state.pendingBezEffect.sourcePlayer).forEach(t=>{
      const b=document.createElement('button');b.type='button';b.textContent=t.name;
      b.addEventListener('click',()=>{const rr=E().resolveKeyla2Discard(state,t.id);saveRender(rr.msg);});root.appendChild(b);
    });
    return;
  }
  if(state.pendingBezEffect?.type==='menia_dagger'){
    const title=document.createElement('strong');title.textContent='Menia – Dolch aus dem Rüstkammer-Stapel wählen';root.appendChild(title);
    const info=document.createElement('span');info.textContent='Nur passende Dolche werden angezeigt. Nicht gewählte Karten behalten ihre Reihenfolge im Stapel.';root.appendChild(info);
    E().meniaDaggerTargets(state).forEach(t=>{const b=document.createElement('button');b.type='button';b.textContent=t.name;b.addEventListener('click',()=>{const rr=E().resolveMeniaDagger(state,t.id);saveRender(rr.msg);});root.appendChild(b);});
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Nicht nutzen';cancel.addEventListener('click',()=>{const rr=E().cancelPendingBezEffect(state);saveRender(rr.msg||'Menias Suche wurde nicht genutzt.');});root.appendChild(cancel);return;
  }
  if(state.pendingBezEffect && ['skorpia_shield','shield','psilo','fragment_reward','zahira','cassandra','mira','talisia2','talisia1_source','talisia1_target'].includes(state.pendingBezEffect.type)){
    const labels={skorpia_shield:'Skorpia Masako – Schildbonus wählen',shield:'S.H.I.E.L.D. – andere eigene Bezwingerin wählen',psilo:'Psilo Cybe – KREATUR wählen',fragment_reward:`${state.pendingBezEffect.cardName||'ASTRALFRAGMENT'} – eigene Bezwingerin für Zerstörungseffekt wählen`,zahira:'Zahira – andere eigene Bezwingerin wählen',cassandra:'Cassandra – eigene Bezwingerin wählen',mira:'Mira Masako – gegnerische Bezwingerin wählen',talisia2:'Talisia II – gegnerische Bezwingerin wählen',talisia1_source:'Talisia – ASTRAL-Schild-Quelle wählen',talisia1_target:'Talisia – Empfängerin für 1 Herz wählen'};
    const title=document.createElement('strong');title.textContent=labels[state.pendingBezEffect.type];root.appendChild(title);
    E().checkedEffectTargets(state).forEach(t=>{const b=document.createElement('button');b.type='button';b.textContent=t.name;b.addEventListener('click',()=>{const rr=E().resolveCheckedEffectTarget(state,t.id);saveRender(rr.msg);});root.appendChild(b);});
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Abbrechen';cancel.addEventListener('click',()=>{const rr=E().cancelPendingBezEffect(state);saveRender(rr.msg);});root.appendChild(cancel);return;
  }
  if(state.pendingBezEffect?.type==='thal1'){
    const title=document.createElement('strong');title.textContent='Thal Ziris Stufe 1 – eigene Kampfrundendauer verändern';root.appendChild(title);
    E().thalZirisStage1Targets(state,state.pendingBezEffect.sourcePlayer).forEach(t=>{
      const wrap=document.createElement('span');wrap.className='effect-target-choice';
      const label=document.createElement('span');label.textContent=`${t.name} (${t.roundsRemaining} KR)`;wrap.appendChild(label);
      [-1,1].forEach(delta=>{const b=document.createElement('button');b.type='button';b.textContent=delta<0?'−1 KR':'+1 KR';b.addEventListener('click',()=>{const rr=E().resolveThalZirisStage1(state,t.id,delta);saveRender(rr.msg);});wrap.appendChild(b);});
      root.appendChild(wrap);
    });
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Nicht nutzen';cancel.addEventListener('click',()=>{const rr=E().cancelPendingBezEffect(state);saveRender(rr.msg);});root.appendChild(cancel);return;
  }
  if(state.pendingBezEffect?.type==='mornak_token_place'){
    const title=document.createElement('strong');title.textContent='Mornak-Brut TOKEN – Bereich wählen';root.appendChild(title);
    E().mornakTokenTargets(state,state.pendingBezEffect.sourcePlayer,!!state.pendingBezEffect.allowEnemyAzr).forEach(t=>{
      const b=document.createElement('button');b.type='button';b.textContent=t.name;b.addEventListener('click',()=>{const rr=E().resolveMornakTokenPlacement(state,t.id);saveRender(rr.msg);});root.appendChild(b);
    });
    return;
  }
  if(state.pendingBezEffect?.type==='thal2'){
    const title=document.createElement('strong');
    title.textContent='Thal Ziris – Kampfrundendauer verändern';
    root.appendChild(title);
    const targets=E().thalZirisTargets(state);
    targets.forEach(t=>{
      const wrap=document.createElement('span');
      wrap.className='effect-target-choice';
      const label=document.createElement('span');
      label.textContent=`${t.own?'Eigene':'Gegnerische'} Karte: ${t.name} (${t.roundsRemaining} KR)`;
      wrap.appendChild(label);
      [-1,1].forEach(delta=>{
        const b=document.createElement('button');
        b.type='button';
        b.textContent=delta<0?'−1 KR':'+1 KR';
        b.addEventListener('click',()=>{
          const cost=t.own?3:2;
          if(confirm(`${t.name}: Kampfrundendauer ${delta>0?'um 1 erhöhen':'um 1 verringern'}? Kosten: ${cost} Ehre.`)){
            const rr=E().resolveThalZiris(state,t.id,delta);
            saveRender(rr.msg);
          }
        });
        wrap.appendChild(b);
      });
      root.appendChild(wrap);
    });
    const cancel=document.createElement('button');
    cancel.type='button';cancel.textContent='Abbrechen';
    cancel.addEventListener('click',()=>{const rr=E().cancelPendingBezEffect(state);saveRender(rr.msg);});
    root.appendChild(cancel);
    return;
  }

  const p=E().active(state),ph=phase();

  const title=document.createElement('div');
  title.className='game-action-title';
  title.textContent=ph.name;
  root.appendChild(title);

  if(ph.id==='honor'){
    const info=document.createElement('span');
    info.textContent='Ehre wurde automatisch vergeben: Jede eigene Karte mit Herzanzahl erhält 1 Ehre.';
    root.appendChild(info);
  }

  if(ph.id==='draw'){
    const info=document.createElement('span');
    info.textContent=p.drawDone?'Karte bereits gezogen.':'Klicke auf einen der drei Hauptstapel auf deinem Spielfeld.';
    root.appendChild(info);
  }

  if(['supply','resupply'].includes(ph.id)){
    if(state.pendingFieldCard && state.pendingFieldCard.owner===state.activePlayer){
      const pending=state.pendingFieldCard;
      const r=p.azr[pending.azrSlot];
      if(pending.area==='mornak_choice'){
        const info=document.createElement('span');
        info.textContent='Mornak-Brut ist aufgedeckt. Wähle PRIMÄR, SEKUNDÄR oder lasse sie offen in dieser AZR.';
        root.appendChild(info);
        [['primary','PRIMÄR'],['secondary','SEKUNDÄR'],['azr','In AZR lassen']].forEach(([area,label])=>{
          const b=document.createElement('button');b.className='primary';b.textContent=label;
          b.disabled=area==='primary'?!!p.primary:area==='secondary'?!!state.sharedSecondary:false;
          b.addEventListener('click',()=>saveRender(E().moveMornakFromAzr(state,pending.azrSlot,area).msg));
          root.appendChild(b);
        });
        return;
      }
      const b=document.createElement('button');
      b.className='primary';
      b.textContent=`${pending.area==='primary'?'Primär':'Sekundär'}bereich erneut prüfen`;
      b.addEventListener('click',()=>{
        const rr=E().moveRevealedFieldCard(state,pending.azrSlot);
        saveRender(rr.msg||'Karte verschoben.');
      });
      root.appendChild(b);
      const info=document.createElement('span');
      info.textContent=`${cardName(r)} ist aufgedeckt und muss in den ${pending.area==='primary'?'Primär':'Sekundär'}bereich.`;
      root.appendChild(info);
      return;
    }

    if(state.pendingEquipment && state.pendingEquipment.owner===state.activePlayer){
      const pending=state.pendingEquipment;
      const r=p.azr[pending.azrSlot];
      const info=document.createElement('span');
      info.innerHTML=`Aufgedeckte Ausrüstung: <strong>${esc(cardName(r))}</strong>. Wähle jetzt die passende Ausrüstungsposition einer Bezwingerin.`;
      root.appendChild(info);

      [0,1].forEach(bezSlot=>{
        const b=document.createElement('button');
        b.className='primary';
        b.textContent=`An Bezwingerin ${bezSlot+1} anlegen`;
        b.disabled=!p.bezSlots[bezSlot];
        b.addEventListener('click',()=>{
          let rr=E().equipFromAzr(state,pending.azrSlot,bezSlot,pending.kind);
          if(rr.ok)rr=finishEquipmentChoice(rr,bezSlot,pending.kind);
          saveRender(rr.msg||'Ausrüstung angelegt.');
        });
        root.appendChild(b);
      });
      return;
    }

    if(state.pendingRefugeStage2Choice && state.pendingRefugeStage2Choice.playerIndex===state.activePlayer){
      const info=document.createElement('span');
      info.innerHTML='<strong>Stufe-2-Zuflucht:</strong> Wähle den einmaligen Bonus beim Ausspielen.';
      root.appendChild(info);
      const phys=document.createElement('button');
      phys.className='primary';
      phys.textContent='+1 Physische Stärke';
      phys.addEventListener('click',()=>saveRender(E().chooseRefugeStage2Bonus(state,'physical').msg));
      const astral=document.createElement('button');
      astral.className='primary';
      astral.textContent='+1 ASTRAL-Stärke';
      astral.addEventListener('click',()=>saveRender(E().chooseRefugeStage2Bonus(state,'astral').msg));
      root.append(phys,astral);
      return;
    }

    if(state.pendingWonderDraw && state.pendingWonderDraw.playerIndex===state.activePlayer){
      const info=document.createElement('span');
      info.innerHTML='<strong>Zuflucht-Wunder:</strong> Wähle einen Hauptstapel und ziehe eine Karte.';
      root.appendChild(info);
      for(const [key,label] of [['bezwingerinnen','Bezwingerinnen'],['astral','ASTRAL'],['ruestkammer','Rüstkammer']]){
        const b=document.createElement('button');
        b.className='primary';
        b.textContent=`${label}-Stapel`;
        b.disabled=!p.stacks[key]?.length;
        b.addEventListener('click',()=>saveRender(E().resolveWonderDraw(state,key).msg));
        root.appendChild(b);
      }
      return;
    }

    if(refugeActionSelected){
      const r=p.refuge,c=E().cardData(r),dev=E().availableDevelopment(state,r);
      const info=document.createElement('span');
      info.innerHTML=`Ausgewählt: <strong>${esc(cardName(r))}</strong> – Ehre: <strong>${r.honor||0}</strong>`;
      root.appendChild(info);

      if(dev){
        const b=document.createElement('button');
        b.className='primary';
        b.textContent=`Auf Stufe ${dev.stufe} entwickeln (${dev.stufe} Ehre)`;
        b.disabled=(r.honor||0)<dev.stufe || r.developedTurn===p.turnCount;
        b.addEventListener('click',()=>{
          const rr=E().develop(state,'refuge');
          refugeActionSelected=false;
          saveRender(rr.msg||'Zuflucht entwickelt.');
        });
        root.appendChild(b);
      }

      if(c?.wunder){
        const chk=E().refugeWonderAvailable(state);
        const b=document.createElement('button');
        b.className='primary';
        b.textContent=`Wunder wirken (${c.wunder.kosten_ehre} Ehre) – Karte ziehen`;
        b.disabled=!chk.ok;
        b.title=chk.ok?'':chk.msg;
        b.addEventListener('click',()=>{
          const rr=E().activateRefugeWonder(state);
          refugeActionSelected=false;
          saveRender(rr.msg||'Wunder aktiviert.');
        });
        root.appendChild(b);
      }

      const cancel=document.createElement('button');
      cancel.textContent='Auswahl schließen';
      cancel.addEventListener('click',()=>{refugeActionSelected=false;renderActions();});
      root.appendChild(cancel);
      return;
    }

    const c=handSelected();
    if(c){
      const info=document.createElement('span');
      info.innerHTML=`Ausgewählt: <strong>${esc(c.name)}</strong>`;
      root.appendChild(info);

      if(c.deck_bereich==='bezwingerinnen'){
        [0,1].forEach(slot=>{
          const b=document.createElement('button');
          b.textContent=`In Bezwingerinnenbereich ${slot+1} rekrutieren`;
          b.disabled=!!p.bezSlots[slot]||p.recruitedThisTurn;
          b.addEventListener('click',()=>{
            const r=E().recruit(state,selectedHandIndex,slot);
            if(r.ok)selectedHandIndex=null;
            saveRender(r.msg||'Bezwingerin rekrutiert.');
          });
          root.appendChild(b);
        });
      }
      if(['astral','ruestkammer'].includes(c.deck_bereich)){
        const eqKind=E().equipmentKind(c);

        if(eqKind){
          [0,1].forEach(bezSlot=>{
            const b=document.createElement('button');
            b.textContent=`${c.kartentyp} an Bezwingerin ${bezSlot+1} anlegen`;
            b.disabled=!p.bezSlots[bezSlot];
            b.addEventListener('click',()=>{
              let r=E().equipFromHand(state,selectedHandIndex,bezSlot,eqKind);
              if(r.ok){
                r=finishEquipmentChoice(r,bezSlot,eqKind);
                selectedHandIndex=null;
              }
              saveRender(r.msg||'Ausrüstung angelegt.');
            });
            root.appendChild(b);
          });
        }

        const field=E().fieldArea(c);
        const mornakAreas=E().mornakAllowedAreas?.(c)||[];
        const fieldAreas=mornakAreas.includes('secondary')?['primary','secondary']:(field?[field]:[]);
        fieldAreas.forEach(area=>{
          const fieldBtn=document.createElement('button');
          fieldBtn.className='primary';
          fieldBtn.textContent=`Offen in ${area==='primary'?'Primär':'Sekundär'}bereich spielen`;
          fieldBtn.disabled=area==='primary' ? !!p.primary : !!state.sharedSecondary;
          fieldBtn.addEventListener('click',()=>{
            const r=E().playFieldFromHand(state,selectedHandIndex,area);
            if(r.ok)selectedHandIndex=null;
            saveRender(r.msg||'Karte ausgespielt.');
          });
          root.appendChild(fieldBtn);
        });

        [0,1,2].forEach(slot=>{
          const hiddenBtn=document.createElement('button');
          hiddenBtn.textContent=`Verdeckt in AZR ${slot+1}`;
          hiddenBtn.disabled=!!p.azr[slot];
          hiddenBtn.addEventListener('click',()=>{
            const r=E().setFaceDown(state,selectedHandIndex,slot);
            if(r.ok)selectedHandIndex=null;
            saveRender(r.msg||'Karte verdeckt gesetzt.');
          });
          root.appendChild(hiddenBtn);

          if(!eqKind && (!field || mornakAreas.includes('azr'))){
            const openBtn=document.createElement('button');
            openBtn.textContent=`Offen in AZR ${slot+1}`;
            openBtn.disabled=!!p.azr[slot];
            openBtn.addEventListener('click',()=>{
              const r=E().playOpenAzr(state,selectedHandIndex,slot);
              if(r.ok)selectedHandIndex=null;
              saveRender(r.msg||'Karte offen ausgespielt.');
            });
            root.appendChild(openBtn);
          }
        });

        const note=document.createElement('span');
        note.className='action-note';
        note.textContent=eqKind
          ?'Ausrüstungen werden offen direkt an eine Bezwingerin angelegt. In der AZR dürfen sie nur verdeckt gesetzt werden.'
          :mornakAreas.includes('secondary')
            ?'Mornak-Brut darf offen in PRIMÄR, SEKUNDÄR oder eine freie eigene ASTRAL-/Rüstkammer-Zone gespielt werden.'
          :field
            ?`Diese Karte gehört offen in den ${field==='primary'?'Primär':'Sekundär'}bereich. Alternativ darf sie verdeckt in die AZR gesetzt werden.`
            :'Diese Karte kann offen oder verdeckt in die AZR gespielt werden. Individuelle Karteneffekte folgen später.';
        root.appendChild(note);
      }
    }else{
      const info=document.createElement('span');
      info.textContent='Wähle eine Handkarte oder eine Karte auf dem Spielfeld.';
      root.appendChild(info);
    }
  }

  if(ph.id==='rush'){
    const opp=E().opponent(state);

    if(state.attack){
      const atk=(state.attack.attackerKind==='refuge'?p.refuge:p.bezSlots[state.attack.attackerSlot]);
      const targetLabel=(()=>{
        const t=state.attack.target;
        if(t.type==='bez')return cardName(opp.bezSlots[t.slot]);
        if(t.type==='primary')return cardName(opp.primary);
        if(t.type==='secondary')return cardName(state.sharedSecondary);
        return cardName(opp.refuge);
      })();

      const info=document.createElement('div');
      info.className='defense-prompt';
      info.innerHTML=`<strong>${esc(opp.name)} ist am Zug zur Reaktion.</strong><br>
        ${esc(cardName(atk))} greift <strong>${esc(targetLabel)}</strong>
        ${state.attack.attackType==='physical'?'physisch':'ASTRAL'} an.`;
      root.appendChild(info);

      const hidden=E().defenderFaceDownSlots(state);
      if(hidden.length){
        const note=document.createElement('span');
        note.textContent='Möchtest du vor dem Kampf eine verdeckte AZR-Karte aktivieren?';
        root.appendChild(note);

        hidden.forEach(slot=>{
          const b=document.createElement('button');
          b.textContent=`Verdeckte Karte in AZR ${slot+1} aktivieren`;
          b.addEventListener('click',()=>{
            const r=E().revealDefenderCard(state,slot);
            saveRender(r.msg||'Verdeckte Karte aktiviert.');
          });
          root.appendChild(b);
        });
      }else{
        const note=document.createElement('span');
        note.textContent=state.attack.revealedDuringDefense
          ?'Verdeckte Karte aktiviert. Prüfe den Effekt und bestätige anschließend den Angriff.'
          :'Keine verdeckte AZR-Karte kann aktiviert werden.';
        root.appendChild(note);
      }

      const allow=document.createElement('button');
      allow.className='primary';
      allow.textContent=state.attack.revealedDuringDefense
        ?'Okay – Angriff fortsetzen'
        :'Angriff zulassen';
      allow.addEventListener('click',()=>{
        const r=E().confirmAttack(state);
        if(r.ok){
          selectedAttacker=null;
          selectedTarget=null;
          selectedAttackType=null;
        }
        saveRender(r.msg||'Kampfphase beginnt.');
      });
      root.appendChild(allow);

      const warn=document.createElement('span');
      warn.className='action-note';
      warn.textContent='Die konkrete Wirkung aktivierter verdeckter Karten wird noch nicht automatisch ausgeführt.';
      root.appendChild(warn);
    }else{
      const attackers=p.bezSlots.map((r,i)=>E().canAttack(r,p)?i:null).filter(i=>i!==null);
      if(E().canRefugeAttack(state))attackers.push('refuge');

      if(!attackers.length){
        const info=document.createElement('span');
        info.textContent=p.bezSlots.some(Boolean)
          ?'Keine einsatzbereite Bezwingerin kann angreifen. Die Zuflucht darf nur angreifen, wenn keine eigene Bezwingerin mehr auf dem Feld liegt.'
          :'Derzeit kann keine eigene Karte angreifen.';
        root.appendChild(info);
      }else if(selectedAttacker===null){
        const info=document.createElement('span');
        info.textContent=E().canRefugeAttack(state)
          ?'Klicke auf deine Zuflucht, um sie als Angreifer zu wählen.'
          :'Klicke auf eine eigene einsatzbereite Bezwingerin. Sie wird als Angreiferin ausgewählt.';
        root.appendChild(info);
      }else if(selectedTarget===null){
        const info=document.createElement('span');
        info.innerHTML=`Angreifer: <strong>${esc(cardName(selectedAttackerRuntime()))}</strong>. Klicke jetzt auf eines der gold aufleuchtenden gegnerischen Ziele mit Herzpunkten.`;
        root.appendChild(info);
      }else{
        const info=document.createElement('span');
        const selectedMeta=E().attackTargets(state,selectedAttacker).find(t=>t.type===selectedTarget.type&&t.slot===selectedTarget.slot);
        info.innerHTML=selectedMeta?.vacationOwnerChoosesAttackType
          ? `Urlaub erzwingt dieses Ziel. <strong>Der Besitzer von Urlaub</strong> bestimmt jetzt die Angriffsart für <strong>${esc(cardName(selectedAttackerRuntime()))}</strong>.`
          : `Ziel gewählt. Wähle jetzt die Angriffsart für <strong>${esc(cardName(selectedAttackerRuntime()))}</strong>.`;
        root.appendChild(info);

        const physical=document.createElement('button');
        physical.className='primary';
        physical.textContent='Physisch angreifen';
        physical.addEventListener('click',()=>{
          selectedAttackType='physical';
          const r=E().prepareAttack(state,selectedAttacker,selectedTarget,'physical');
          saveRender(r.msg||'Physischer Angriff angekündigt.');
        });

        const astral=document.createElement('button');
        astral.className='primary';
        astral.textContent='ASTRAL angreifen';
        astral.addEventListener('click',()=>{
          selectedAttackType='astral';
          const r=E().prepareAttack(state,selectedAttacker,selectedTarget,'astral');
          saveRender(r.msg||'ASTRAL-Angriff angekündigt.');
        });

        root.append(physical,astral);
      }
    }
  }
  if(ph.id==='combat'){
    if(state.pendingDamage){
      const choice=E().currentShieldChoice(state);
      if(choice){
        const affected=state.players[choice.playerIndex];
        const bez=affected.bezSlots[choice.bezSlot];
        const info=document.createElement('span');
        info.className='shield-choice-info';
        info.innerHTML=`<strong>${esc(affected.name)}</strong>: ${esc(cardName(bez))} erhält noch <strong>${choice.remaining}</strong> ${choice.type==='physical'?'physischen':'ASTRAL'} Schaden. Wähle, von welcher Karte zuerst Schildpunkte entfernt werden.`;
        root.appendChild(info);

        choice.sources.forEach(src=>{
          const b=document.createElement('button');
          b.className='primary shield-source-button';
          b.textContent=src.label;
          b.addEventListener('click',()=>{
            const rr=E().chooseShieldSource(state,src.source,src.kind);
            saveRender(rr.msg||'Schildpunkte entfernt.');
          });
          root.appendChild(b);
        });
        return;
      }
    }

    if(state.attack){
      const a=(state.attack.attackerKind==='refuge'?p.refuge:p.bezSlots[state.attack.attackerSlot]);
      const b=document.createElement('button');
      b.className='primary';
      b.textContent=`Kampf ausführen: ${cardName(a)}`;
      b.addEventListener('click',()=>{
        if(E().titanCanRedirectRefuge?.(state) && state.attack.titanRedirect===undefined){
          const use=confirm('Der Torwächter T.I.T.A.N.: Schaden der Zuflucht auf T.I.T.A.N. umleiten?');
          E().setTitanRedirectChoice(state,use);
        }
        const r=E().resolveCombat(state);
        saveRender(r.msg||'Kampf abgewickelt.');
      });
      root.appendChild(b);
    }else{
      const more=p.bezSlots.some(r=>E().canAttack(r,p)) || E().canRefugeAttack(state);
      if(more){
        const b=document.createElement('button');
        b.textContent='Mit weiterer Karte angreifen';
        b.addEventListener('click',()=>{
          const r=E().returnToRush(state);
          saveRender(r.msg||'Zurück in die Ansturmphase.');
        });
        root.appendChild(b);
      }
      const info=document.createElement('span');
      info.textContent='Kein weiterer Kampf vorbereitet. Wechsle anschließend in die Nachschubphase.';
      root.appendChild(info);
    }
  }

  if(['start','supply_start','end'].includes(ph.id)){
    const info=document.createElement('span');
    info.textContent=ph.id==='supply_start'
      ?'Hier werden später zeitabhängige Karteneffekte in der Regel-Reihenfolge abgewickelt.'
      :'In dieser Phase werden in der ersten Version noch keine manuellen Aktionen benötigt.';
    root.appendChild(info);
  }
}
function trySerinithCharge(slot,r){
  const fx=E().bezEffectInfo?.(state,slot),c=E().cardData(r);
  if(c?.effekte?.[0]?.engine_key!=='serinith' || fx?.symbol!=='charges' ||
     (fx.usesRemaining??0)<=0 || fx.usedThisTurn)return false;

  const a=Number(r.astralShield||0),p=Number(r.physicalShield||0);
  if(a<=0 && p<=0)return false;

  let choice=null;
  if(a>0 && p>0){
    const answer=prompt(
      `Serinith Solthar – Ladung einsetzen?\\n`+
      `1 = 1 ASTRAL-Schild → 1 physischer Schild\\n`+
      `2 = 1 physischer Schild → 1 ASTRAL-Schild\\n`+
      `Abbrechen = normale Kartenaktion`
    );
    if(answer===null || answer==='')return false;
    if(answer==='1')choice='astral_to_physical';
    else if(answer==='2')choice='physical_to_astral';
    else {message('Bitte 1 oder 2 wählen.','warn');return true;}
  }else if(a>0){
    if(!confirm('Serinith Solthar: Eine Ladung einsetzen und 1 ASTRAL-Schild in 1 physischen Schild umwandeln?'))return false;
    choice='astral_to_physical';
  }else{
    if(!confirm('Serinith Solthar: Eine Ladung einsetzen und 1 physischen Schild in 1 ASTRAL-Schild umwandeln?'))return false;
    choice='physical_to_astral';
  }

  const rr=E().activateBezEffect(state,slot,choice);
  saveRender(rr.msg||'Seriniths Ladung eingesetzt.');
  return true;
}

function handleOwnBez(slot){
  const p=E().active(state),r=p.bezSlots[slot],ph=phase();
  if(!r)return;

  // Ladungseffekte wie Serinith sind nicht auf VP/NP beschränkt:
  // höchstens einmal pro eigener KR, solange Ladungen vorhanden sind.
  if(trySerinithCharge(slot,r))return;

  if(ph.id==='supply'){
    const c=E().cardData(r);
    if(c?.effekte?.[0]?.engine_key==='alice' && (r.effectState?.counterDodgeUses||0)>0 && !r.effectState?.counterDodgeActive){
      if(confirm('Alice Merveilleux: Einmaliges Ausweichen gegen einen Gegenangriff für diese Kampfrunde aktivieren?')){
        const ar=E().activateAliceDodge(state,slot);
        if(!ar.ok)return message(ar.msg,'warn');
        return saveRender(ar.msg);
      }
    }
  }

  if(ph.id==='rush' && !state.attack){
    if(!E().canAttack(r,p)){
      return message('Diese Bezwingerin ist einsatzverzögert oder hat in dieser Kampfrunde bereits angegriffen.','warn');
    }
    const c=E().cardData(r);
    if(c?.effekte?.[0]?.engine_key==='death' && (r.effectState?.primaryAttackUses||0)>0 && !r.effectState?.primaryAttackActive){
      if(confirm('D.E.A.T.H.: Den einmaligen Primärangriff für den nächsten Kampf aktivieren?')){
        const pr=E().activateDeathPrimaryAttack(state,slot);
        if(!pr.ok)return message(pr.msg,'warn');
      }
    }
    selectedAttacker=slot;
    selectedTarget=null;
    selectedAttackType=null;
    renderBoards();
    renderActions();
    return message(`${cardName(r)} als Angreiferin gewählt. Wähle jetzt ein leuchtendes gegnerisches Ziel.`);
  }

  if(['supply','resupply'].includes(ph.id)){
    const fx=E().bezEffectInfo?.(state,slot);
    if(fx?.symbol==='wonder' && !fx.wonderUsed){
      const c=E().cardData(r);
      const base=Number((r.wonderCostCurrent ?? c?.wunder?.kosten_ehre) || 0);

      // v1.69: Trix Sigma Stufe 2 benötigt vor der Wunderauflösung eine
      // explizite Auswahl der Stärke-Umwandlung. Ohne choice lehnt die Engine
      // den Effekt korrekt ab; deshalb wird die Auswahl hier in der UI angeboten.
      if(c?.effekte?.[0]?.engine_key==='trix2'){
        const canA=Number(r.astral||0)>=1;
        const canP=Number(r.physical||0)>=1;
        if(!canA&&!canP)return message('Trix Sigma II hat keine Stärke, die umgewandelt werden kann.','warn');
        let choice=null;
        if(canA&&canP){
          const answer=prompt(
            `Trix Sigma II – Wunder wirken? Kosten: ${base} Ehre.\n`+
            `1 = 1 ASTRAL-Stärke → 1 physische Stärke\n`+
            `2 = 1 physische Stärke → 1 ASTRAL-Stärke\n`+
            `Abbrechen = Wunder nicht wirken`
          );
          if(answer===null||answer==='')return;
          if(answer==='1')choice='astral_to_physical';
          else if(answer==='2')choice='physical_to_astral';
          else return message('Bitte 1 oder 2 wählen.','warn');
        }else if(canA){
          if(!confirm(`Trix Sigma II: Für ${base} Ehre 1 ASTRAL-Stärke in 1 physische Stärke umwandeln?`))return;
          choice='astral_to_physical';
        }else{
          if(!confirm(`Trix Sigma II: Für ${base} Ehre 1 physische Stärke in 1 ASTRAL-Stärke umwandeln?`))return;
          choice='physical_to_astral';
        }
        const rr=E().activateBezEffect(state,slot,choice);
        return saveRender(rr.msg||'Wunder aktiviert.');
      }

      if(confirm(`${cardName(r)}: Wunder wirken? Aktuelle Kosten: ${base} Ehre.\n\n${fx.text}`)){
        const rr=E().activateBezEffect(state,slot);
        return saveRender(rr.msg||'Wunder aktiviert.');
      }
    }
    const dev=E().availableDevelopment(state,r);
    if(dev){
      if(confirm(`${cardName(r)} auf Stufe ${dev.stufe} entwickeln? Kosten: ${dev.stufe} Ehre auf dieser Karte.`)){
        const rr=E().develop(state,'bez',slot);
        return saveRender(rr.msg||'Entwicklung durchgeführt.');
      }
    }
    message('Für diese Bezwingerin gibt es momentan keine weitere Grundaktion.','warn');
  }
}
function handleRefuge(){
  const ph=phase(),p=E().active(state);

  if(ph.id==='rush' && !state.attack){
    if(!E().canRefugeAttack(state)){
      if(p.bezSlots.some(Boolean))return message('Die Zuflucht darf nur angreifen, wenn auf deiner Spielfeldseite keine Bezwingerin mehr vorhanden ist.','warn');
      return message('Die Zuflucht kann in dieser Kampfrunde nicht angreifen.','warn');
    }
    selectedAttacker='refuge';
    selectedTarget=null;
    selectedAttackType=null;
    refugeActionSelected=false;
    renderBoards();
    renderActions();
    return message(`${cardName(p.refuge)} als Angreifer gewählt. Wähle jetzt ein leuchtendes gegnerisches Ziel.`);
  }

  if(!['supply','resupply'].includes(ph.id))return;
  selectedHandIndex=null;
  refugeActionSelected=true;
  renderActions();
  message('Zuflucht ausgewählt. Wähle Entwickeln oder Wunder wirken.');
}
function handleAzr(slot){
  const p=E().active(state),r=p.azr[slot];
  if(!r)return;
  if(r.faceDown){const rr=E().reveal(state,slot);return saveRender(rr.msg||'Karte aufgedeckt.');}
  const c=E().cardData(r);
  if(c?.effekte?.some(e=>e.engine_key==='ehris_ohrringe') && ['supply','resupply'].includes(phase()?.id||'')){
    const eligible=p.bezSlots.map((b,i)=>b&&E().cardData(b)?.fraktion==='Oberwelt'?{slot:i,name:cardName(b)}:null).filter(Boolean);
    if(eligible.length<2)return message('Ehris Ohrringe benötigen mindestens zwei eigene Oberwelt-Bezwingerinnen.','warn');
    const raw=prompt('Ehris Ohrringe – welche Oberwelt-Bezwingerin erhält −1 Wunderkosten?\n'+eligible.map((x,i)=>`${i+1}: ${x.name}`).join('\n'));
    if(raw===null)return;const t=eligible[Number(raw)-1];if(!t)return message('Ungültige Auswahl.','warn');
    const rr=E().selectEhrisTarget(state,t.slot);return saveRender(rr.msg);
  }
}
function handleEquipmentSlot(kind,bezSlot){
  const p=E().active(state);

  if(state.pendingEquipment && state.pendingEquipment.owner===state.activePlayer){
    const pending=state.pendingEquipment;
    if(kind!==pending.kind)return message('Diese aufgedeckte Ausrüstung gehört in einen anderen Ausrüstungsbereich.','warn');
    let rr=E().equipFromAzr(state,pending.azrSlot,bezSlot,kind);
    if(rr.ok)rr=finishEquipmentChoice(rr,bezSlot,kind);
    return saveRender(rr.msg||'Ausrüstung angelegt.');
  }

  if(selectedHandIndex!==null){
    const c=handSelected();
    if(c && E().equipmentKind(c)){
      let rr=E().equipFromHand(state,selectedHandIndex,bezSlot,kind);
      if(rr.ok){
        rr=finishEquipmentChoice(rr,bezSlot,kind);
        selectedHandIndex=null;
      }
      return saveRender(rr.msg||'Ausrüstung angelegt.');
    }
  }

  const r=p.equipment?.[bezSlot]?.[kind];

  if(r && kind==='weapon' && ['supply','resupply'].includes(phase().id)){
    const c=E().cardData(r);
    if(c?.effekte?.some(e=>e.engine_key==='voidpiercer_lifebreaker_convert') && Number(r.effectUsesRemaining||0)>0){
      const bez=p.bezSlots?.[bezSlot];
      const phys=Number(bez?.physical||0),astr=Number(bez?.astral||0);
      if(r.effectUsedTurn===p.turnCount)return message('Voidpiercer & Lifebreaker wurde in dieser Kampfrunde bereits benutzt.','warn');
      if(phys<=0 && astr<=0)return message('Es ist keine Stärke vorhanden, die umgewandelt werden kann.','warn');
      let direction;
      if(phys>0 && astr>0){
        direction=confirm(`Voidpiercer & Lifebreaker – ${r.effectUsesRemaining} Zählermarke(n)

OK = 1 physische → 1 ASTRAL
Abbrechen = 1 ASTRAL → 1 physische`) ? 'physical_to_astral' : 'astral_to_physical';
      }else direction=phys>0?'physical_to_astral':'astral_to_physical';
      const rr=E().activateVoidpiercerLifebreaker(state,bezSlot,direction);
      return saveRender(rr.msg);
    }
    if(phase().id==='supply' && c?.effekte?.some(e=>e.engine_key==='parierdolch_dodge') &&
       (r.effectState?.counterDodgeUses||0)>0 && !r.effectState?.counterDodgeActive){
      if(confirm('Parierdolch: Einmaliges Ausweichen gegen einen Gegenangriff für diese Kampfrunde aktivieren?')){
        const rr=E().activateParierdolchDodge(state,bezSlot);
        return saveRender(rr.msg);
      }
    }
  }

  if(r && ['supply','resupply'].includes(phase().id)){
    if(confirm(`${cardName(r)} auf den Ablagestapel legen?`)){
      const rr=E().discardEquipment(state,bezSlot,kind);
      return saveRender(rr.msg||'Ausrüstung abgelegt.');
    }
  }
}
function handleOwnPrimary(){
  const p=E().active(state),r=p.primary,c=E().cardData(r);
  if(!r || r.owner!==p.index)return;
  if(c?.effekte?.some(e=>e.engine_key==='chronokrypta_duration_trade')){
    if(!['supply','resupply'].includes(phase()?.id||''))return message('Chronokrypta kann nur in VP oder NP benutzt werden.','warn');
    let rr=E().startChronokrypta(state);
    if(!rr.ok)return message(rr.msg,'warn');
    const payers=E().chronokryptaBezTargets(state);
    const payerRaw=prompt(`Chronokrypta – welche eigene Bezwingerin zahlt 2 Ehre?\n\n${payers.map((t,i)=>`${i+1}: ${t.name} (${t.honor} Ehre)`).join('\n')}`);
    if(payerRaw===null){state.pendingBezEffect=null;return;}
    const payer=payers[Number(payerRaw)-1];
    if(!payer){state.pendingBezEffect=null;return message('Ungültige Auswahl.','warn');}
    rr=E().selectChronokryptaPayer(state,payer.id);
    if(!rr.ok){state.pendingBezEffect=null;return message(rr.msg,'warn');}
    const targets=E().chronokryptaEquipmentTargets(state);
    const targetRaw=prompt(`Chronokrypta – welche Ausrüstung soll verändert werden?\n\n${targets.map((t,i)=>`${i+1}: ${t.own?'Eigene':'Gegnerische'} ${t.name} (KR ${t.roundsRemaining})`).join('\n')}`);
    if(targetRaw===null){state.pendingBezEffect=null;return;}
    const target=targets[Number(targetRaw)-1];
    if(!target){state.pendingBezEffect=null;return message('Ungültige Auswahl.','warn');}
    const delta=confirm(`Chronokrypta – ${target.name}\n\nOK = Kampfrundendauer +1\nAbbrechen = Kampfrundendauer −1`) ? 1 : -1;
    rr=E().resolveChronokrypta(state,target.id,delta);
    return saveRender(rr.msg);
  }
  if(c?.effekte?.some(e=>e.engine_key==='manta_wonder_physical')){
    if(!['supply','resupply'].includes(phase()?.id||''))return message('MANTAs Wunder kann nur in VP oder NP gewirkt werden.','warn');
    const rr=E().startMantaWonder(state);
    return saveRender(rr.msg);
  }
  if(c?.effekte?.some(e=>e.engine_key==='wunderumwandlungsapparatur_honor_convert')){
    if(!['supply','resupply'].includes(phase()?.id||''))return message('Das Wunder der Wunderumwandlungsapparatur kann nur in VP oder NP gewirkt werden.','warn');
    const rr=E().startWunderumwandlungsapparatur(state);
    return saveRender(rr.msg);
  }
  if(c?.effekte?.some(e=>e.engine_key==='ruth_kaufladen')){
    if(!['supply','resupply'].includes(phase()?.id||''))return message('Ruths Kaufladen kann nur in VP oder NP benutzt werden.','warn');
    const targets=E().ruthTargets(state);
    if(!targets.length)return message('Keine eigene Bezwingerin kann Ruth derzeit benutzen.','warn');
    const lines=targets.map((t,i)=>`${i+1}: ${t.name} (${t.honor} Ehre)`).join('\n');
    const raw=prompt(`Dorfschmiedin Ruth die Eiserne – Ladungen ${r.effectUsesRemaining}\n\nWelche Bezwingerin kauft?\n${lines}`);
    if(raw===null)return;
    const t=targets[Number(raw)-1];if(!t)return message('Ungültige Auswahl.','warn');
    const kind=confirm('OK = +1 physischer Schild\nAbbrechen = +1 ASTRAL-Schild')?'physical':'astral';
    const rr=E().activateRuth(state,t.slot,kind);return saveRender(rr.msg);
  }
}

function handleBattlefieldTargetClick(ev){
  if(phase()?.id!=='rush' || selectedAttacker===null || state.attack)return;

  const bez=ev.target.closest('#opponentBoard [data-bez]');
  if(bez){
    chooseTarget({type:'bez',slot:Number(bez.dataset.bez)});
    return;
  }

  const refuge=ev.target.closest('#opponentBoard [data-refuge]');
  if(refuge){
    chooseTarget({type:'refuge'});
    return;
  }

  const primary=ev.target.closest('#opponentBoard [data-primary-target]');
  if(primary){
    chooseTarget({type:'primary'});
    return;
  }

  const secondary=ev.target.closest('#sharedSecondaryZone [data-secondary-target]');
  if(secondary){
    chooseTarget({type:'secondary'});
  }
}

function chooseTarget(target){
  if(phase()?.id!=='rush'||selectedAttacker===null)return;
  const legal=E().attackTargets(state,selectedAttacker).some(t=>t.type===target.type&&t.slot===target.slot);
  if(!legal)return message('Dieses Ziel darf mit der ausgewählten Karte derzeit nicht angegriffen werden.','warn');
  selectedTarget={type:target.type,slot:target.slot};
  selectedAttackType=null;
  renderBoards();
  renderActions();
  message('Angriffsziel gewählt. Wähle jetzt Physisch oder ASTRAL.');
  requestAnimationFrame(updateStickyGameOffsets);
}

function clearDropTargets(){
  document.querySelectorAll('.drop-valid,.drop-hover').forEach(el=>{
    el.classList.remove('drop-valid','drop-hover');
  });
}
function legalDropSelectors(handIndex){
  const p=E().active(state);
  const c=E().dbCard(p.hand[handIndex]);
  const ph=phase();
  if(!c || !['supply','resupply'].includes(ph?.id||''))return [];

  const targets=[];
  if(c.deck_bereich==='bezwingerinnen'){
    if(!p.recruitedThisTurn){
      [0,1].forEach(i=>{ if(!p.bezSlots[i]) targets.push(`[data-bez="${i}"]`); });
    }
    return targets;
  }

  if(['astral','ruestkammer'].includes(c.deck_bereich)){
    const eqKind=E().equipmentKind(c);
    if(eqKind){
      [0,1].forEach(i=>{
        if(p.bezSlots[i])targets.push(`[data-equip="${eqKind}"][data-equip-bez="${i}"]`);
      });
    }
    const area=E().fieldArea(c);
    if(area==='primary' && !p.primary)targets.push('#playerBoard [data-field-area="primary"]');
    if(area==='secondary' && !state.sharedSecondary)targets.push('#sharedSecondaryZone [data-field-area="secondary"]');
    [0,1,2].forEach(i=>{ if(!p.azr[i]) targets.push(`[data-azr="${i}"]`); });
  }
  return targets;
}
function markLegalDropTargets(handIndex){
  clearDropTargets();
  for(const sel of legalDropSelectors(handIndex)){
    document.querySelectorAll(`#playerBoard ${sel}`).forEach(el=>el.classList.add('drop-valid'));
  }
}
function wireDragAndDrop(){
  document.querySelectorAll('#playerBoard [data-bez],#playerBoard [data-azr],#playerBoard [data-equip],#playerBoard [data-field-area="primary"],#sharedSecondaryZone [data-field-area="secondary"]').forEach(target=>{
    target.addEventListener('dragover',ev=>{
      const raw=ev.dataTransfer.getData('text/plain');
      const idx=raw===''?selectedHandIndex:Number(raw);
      const legal=legalDropSelectors(idx).some(sel=>target.matches(sel));
      if(!legal)return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect='move';
      target.classList.add('drop-hover');
    });
    target.addEventListener('dragleave',()=>target.classList.remove('drop-hover'));
    target.addEventListener('drop',ev=>{
      ev.preventDefault();
      target.classList.remove('drop-hover');
      const idx=Number(ev.dataTransfer.getData('text/plain'));
      const legal=legalDropSelectors(idx).some(sel=>target.matches(sel));
      if(!legal){
        clearDropTargets();
        return message('Diese Karte darf hier in der aktuellen Phase nicht ausgespielt werden.','warn');
      }

      let r;
      if(target.dataset.bez!==undefined){
        r=E().recruit(state,idx,Number(target.dataset.bez));
      }else if(target.dataset.equip!==undefined){
        const bezSlot=Number(target.dataset.equipBez),kind=target.dataset.equip;
        r=E().equipFromHand(state,idx,bezSlot,kind);
        if(r.ok)r=finishEquipmentChoice(r,bezSlot,kind);
      }else if(target.dataset.fieldArea!==undefined){
        r=E().playFieldFromHand(state,idx,target.dataset.fieldArea);
      }else{
        const slot=Number(target.dataset.azr);
        const c=E().dbCard(E().active(state).hand[idx]);
        if(E().isEquipmentCard(c)){
          // Laut Regelwerk darf Ausrüstung in der AZR nur verdeckt gesetzt werden.
          r=E().setFaceDown(state,idx,slot);
        }else{
          const offen=confirm('Wie möchtest du die Karte setzen?\\n\\nOK = offen\\nAbbrechen = verdeckt');
          r=offen ? E().playOpenAzr(state,idx,slot) : E().setFaceDown(state,idx,slot);
        }
      }

      if(r.ok)selectedHandIndex=null;
      clearDropTargets();
      saveRender(r.msg||'Karte ausgespielt.');
    });
  });
}

function renderLog(){
  document.getElementById('gameLog').innerHTML=state.log.map(x=>`<div><span>KR ${x.turn}</span>${esc(x.text)}</div>`).join('');
}

function updateStickyGameOffsets(){
  const toolbar=document.querySelector('#gameShell .game-toolbar');
  const actions=document.getElementById('gameActions');
  if(!toolbar || !actions)return;

  const toolbarStyle=getComputedStyle(toolbar);
  const toolbarTop=parseFloat(toolbarStyle.top)||0;
  const toolbarHeight=toolbar.getBoundingClientRect().height;

  // Die Aktionsleiste beginnt immer unterhalb der oberen Gefechtsleiste.
  const gap=10;
  document.documentElement.style.setProperty(
    '--game-actions-sticky-top',
    `${Math.ceil(toolbarTop+toolbarHeight+gap)}px`
  );
}

function render(msg=''){
  if(!state)return;
  document.getElementById('gameSetup').hidden=true;
  document.getElementById('gameShell').hidden=false;

  const p=E().active(state),ph=phase();
  document.getElementById('gameTurnInfo').textContent=`${p.name} · Kampfrunde ${state.roundSerial}`;
  document.getElementById('gamePhaseInfo').textContent=`${ph.short} – ${ph.name}`;
  document.getElementById('gameNextPhase').textContent=ph.id==='end'?'Runde übergeben':'Nächste Phase';

  if(state.winner!==null){
    message(`🏆 ${state.players[state.winner].name} gewinnt! Die gegnerische Zuflucht hat 0 Herzen.`,'win');
    document.getElementById('gameNextPhase').disabled=true;
  }else{
    document.getElementById('gameNextPhase').disabled=false;
    if(msg)message(msg);
    else message('');
  }

  renderBoards();
  renderHand();
  renderActions();
  ensureGameCardPreview();
  document.getElementById('gameShell')?.classList.toggle('card-preview-mode',cardPreviewMode);
  document.getElementById('gamePreviewToggle')?.classList.toggle('active',cardPreviewMode);
  document.getElementById('gamePreviewToggle')?.setAttribute('aria-pressed',String(cardPreviewMode));
  renderLog();
  requestAnimationFrame(updateStickyGameOffsets);
}


function handleInstinctBeforePhaseEnd(){
  if(cardPreviewMode)return true;
  if(!state || !E().instinctWindowNeeded?.(state))return false;

  const candidates=E().instinctCandidates(state);
  if(!candidates.length)return false;

  const owner=state.players[1-state.activePlayer]?.name||'Gegenspieler';
  const phaseName=phase()?.id==='resupply'?'Nachschubphase':phase()?.id==='rush'?'Ansturmphase':'Versorgungsphase';
  const use=confirm(`${owner}: Möchtest du vor dem Ende der gegnerischen ${phaseName} eine verdeckt gesetzte Instinkt-Karte aktivieren?`);

  if(!use){
    E().passInstinctWindow(state);
    E().save(state);
    return false;
  }

  let chosen=candidates[0];
  if(candidates.length>1){
    const raw=prompt('Welche Instinkt-Karte aktivieren?\n'+candidates.map((x,i)=>`${i+1}: verdeckte Karte in AZR ${x.slot+1}`).join('\n'));
    if(raw===null){
      // Abbrechen bedeutet nicht "passen": Die Phase bleibt stehen und kann erneut beendet werden.
      return true;
    }
    chosen=candidates[Number(raw)-1];
    if(!chosen){
      message('Ungültige Instinkt-Auswahl.','warn');
      return true;
    }
  }

  const rr=E().activateInstinctCard(state,chosen.slot);
  saveRender(rr.msg||'Instinkt-Karte aktiviert.');
  return true;
}

document.getElementById('gameStart')?.addEventListener('click',startGame);
document.getElementById('gameResume')?.addEventListener('click',resumeGame);
document.getElementById('gameNew')?.addEventListener('click',newGame);
document.getElementById('gameNextPhase')?.addEventListener('click',async()=>{
  if(!state)return;
  if(['supply','rush','resupply'].includes(phase()?.id||'') && handleInstinctBeforePhaseEnd())return;
  if(phase()?.id==='end')return animateRoundHandoff();
  const r=E().advancePhase(state);
  selectedHandIndex=null;selectedAttacker=null;selectedTarget=null;selectedAttackType=null;refugeActionSelected=false;
  saveRender(r.msg||'');
});

window.addEventListener('resize',updateStickyGameOffsets);
window.addEventListener('focus',()=>{
  if(document.getElementById('gameSetup') && !document.getElementById('gameSetup').hidden)fillDeckSelectors();
});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible' && document.getElementById('gameSetup') && !document.getElementById('gameSetup').hidden)fillDeckSelectors();
});


  fillDeckSelectors();
const saved=E().load();
document.getElementById('gameResume').hidden=!saved;
document.getElementById('gamePreviewToggle')?.addEventListener('click',toggleCardPreviewMode);

})();
