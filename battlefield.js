(() => {
'use strict';

const E=()=>window.G5Engine;
let state=null;
let selectedHandIndex=null;
let selectedAttacker=null;
let selectedTarget=null;
let selectedAttackType='physical';

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function cardName(r){return r?E().cardData(r)?.name||'Karte':''}
function cardImg(r){return r?E().cardData(r)?.bild||r.bild:''}
function phase(){return state?E().currentPhase(state):null}
function saveRender(msg=''){
  if(state)E().save(state);
  render(msg);
}
function gamePageOpened(){
  fillDeckSelectors();
  const saved=E().load();
  document.getElementById('gameResume').hidden=!saved;
  if(state)render();
}
window.gamePageOpened=gamePageOpened;

function fillDeckSelectors(){
  const ds=E().decks().filter(E().validDeck);
  for(const id of ['gameDeckP1','gameDeckP2']){
    const sel=document.getElementById(id);
    if(!sel)return;
    const old=sel.value;
    sel.innerHTML='';
    for(const d of ds){
      const o=document.createElement('option');
      o.value=d.id;o.textContent=d.name;sel.appendChild(o);
    }
    if(old && ds.some(d=>d.id===old))sel.value=old;
  }
  if(ds.length>1)document.getElementById('gameDeckP2').selectedIndex=1;
  const info=document.getElementById('gameSetupInfo');
  if(!ds.length){
    info.hidden=false;
    info.textContent='Du brauchst zuerst mindestens ein vollständiges Deck unter „Meine Decks“.';
  }else info.hidden=true;
}
function startGame(){
  const ds=E().decks().filter(E().validDeck);
  const d1=ds.find(d=>d.id===document.getElementById('gameDeckP1').value);
  const d2=ds.find(d=>d.id===document.getElementById('gameDeckP2').value);
  if(!d1||!d2)return;
  let sp=document.getElementById('gameStartPlayer').value;
  sp=sp==='random'?Math.floor(Math.random()*2):Number(sp);
  state=E().startGame(d1,d2,sp);
  E().save(state);
  document.getElementById('gameSetup').hidden=true;
  document.getElementById('gameShell').hidden=false;
  selectedHandIndex=null;selectedAttacker=null;selectedTarget=null;
  render('Gefecht gestartet. Beide Spieler haben 3 Karten auf der Starthand.');
}
function resumeGame(){
  const saved=E().load();
  if(!saved)return;
  state=saved;
  document.getElementById('gameSetup').hidden=true;
  document.getElementById('gameShell').hidden=false;
  render('Gespeichertes Gefecht fortgesetzt.');
}
function newGame(){
  if(!confirm('Aktuelles Gefecht beenden und zur Deckauswahl zurückkehren?'))return;
  state=null;E().clear();
  document.getElementById('gameShell').hidden=true;
  document.getElementById('gameSetup').hidden=false;
  fillDeckSelectors();
}
function message(text,type=''){
  const el=document.getElementById('gameMessage');
  el.textContent=text||'';
  el.className='game-message'+(type?` ${type}`:'');
}
function statLine(r){
  if(!r)return '';
  const c=E().cardData(r);
  return `<span class="stat heart">♥ ${r.hearts}</span>
    <span class="stat physical">⚔ ${c?.physische_staerke??0}</span>
    <span class="stat astral">✦ ${c?.astrale_staerke??0}</span>
    <span class="stat pshield">◆ ${r.physicalShield}</span>
    <span class="stat ashield">◆ ${r.astralShield}</span>
    <span class="stat honor">● ${r.honor}</span>`;
}
function runtimeCardHtml(r,{hidden=false,small=false}={}){
  if(!r)return '<div class="board-empty">Frei</div>';
  const c=E().cardData(r);
  if(hidden || r.faceDown){
    return `<div class="board-card back ${small?'small':''}"><img class="real-card-back" src="icons/kartenrueckseite.png" alt="Kartenrückseite"></div>`;
  }
  const isRefuge = c?.deck_bereich==='zuflucht' || c?.kartentyp==='Zuflucht';
  const delayed = (r.ready===false && !isRefuge) ? ' delayed-card' : '';
  return `<div class="board-card ${small?'small':''}${delayed}">
    <img src="${esc(c?.bild||r.bild)}" alt="${esc(c?.name||'Karte')}">
    <div class="board-card-meta"><strong>${esc(c?.name||'Karte')}</strong><div class="stat-row">${statLine(r)}</div>${r.ready?'<em>EINSATZBEREIT</em>':'<em class="delay">Einsatzverzögerung</em>'}</div>
  </div>`;
}
function stackHtml(p,key,label){
  const n=p.stacks[key].length;
  return `<button class="stack-pile" data-stack="${key}" ${n?'':'disabled'}>
    <span class="stack-back">${esc(label)}</span><b>${n}</b>
  </button>`;
}
function developmentHtml(p){
  return `<div class="dev-pile"><span>ENTWICKLUNG</span><b>${p.development.length}</b></div>`;
}
function equipmentSlot(label,kind,bezIndex){
  return `<button class="equip-slot ${kind}" data-equip="${kind}" data-equip-bez="${bezIndex}" disabled><span>${label}</span></button>`;
}
function bezCore(r,i,isActive){
  return `<button class="board-slot bez-slot" data-bez="${i}" ${isActive?'':'disabled'}>${runtimeCardHtml(r)}<span class="slot-label">BEZWINGERIN</span></button>`;
}
function playerBoardHtml(p,isActive,isOpponent){
  const azr=p.azr.map((r,i)=>`<button class="board-slot azr-slot" data-azr="${i}" ${isActive?'':'disabled'}>${runtimeCardHtml(r,{hidden:isOpponent&&r?.faceDown})}<span class="slot-label">AZR ${i+1}</span></button>`).join('');
  const oppClass=isOpponent?' mirrored':'';

  return `<div class="board-inner${oppClass}">
    <div class="board-player-title">
      <strong>${esc(p.name)}${isActive?' · AM ZUG':''}</strong>
      <span>${esc(p.deckName)} · Hand ${p.hand.length} · Ablage ${p.discard.length}</span>
    </div>

    <div class="rule-board">
      <div class="development-column">${developmentHtml(p)}</div>

      <div class="playmat-center">
        <div class="secondary-row">
          <div class="secondary-zone">
            <span class="area-title">SEKUNDÄRZONE</span>
            ${runtimeCardHtml(p.secondary||null,{small:true})}
          </div>
        </div>

        <div class="combat-grid">
          <div class="cg l-helmet">${equipmentSlot('HELM','helmet',0)}</div>
          <div class="cg r-helmet">${equipmentSlot('HELM','helmet',1)}</div>

          <div class="cg l-weapon">${equipmentSlot('WAFFE','weapon',0)}</div>
          <div class="cg l-bez">${bezCore(p.bezSlots[0],0,isActive)}</div>
          <div class="cg l-shield">${equipmentSlot('SCHILD','shield',0)}</div>

          <div class="cg refuge">
            <button class="refuge-card" data-refuge ${isActive?'':'disabled'}>${runtimeCardHtml(p.refuge)}<span class="slot-label">ZUFLUCHT</span></button>
          </div>

          <div class="cg r-weapon">${equipmentSlot('WAFFE','weapon',1)}</div>
          <div class="cg r-bez">${bezCore(p.bezSlots[1],1,isActive)}</div>
          <div class="cg r-shield">${equipmentSlot('SCHILD','shield',1)}</div>

          <div class="cg l-armor">${equipmentSlot('RÜSTUNG','armor',0)}</div>
          <div class="cg r-armor">${equipmentSlot('RÜSTUNG','armor',1)}</div>
        </div>

        <div class="azr-row">${azr}</div>
      </div>

      <div class="stacks-column">
        ${stackHtml(p,'bezwingerinnen','BEZWINGERINNEN')}
        ${stackHtml(p,'astral','ASTRAL')}
        ${stackHtml(p,'ruestkammer','RÜSTKAMMER')}
        <div class="discard-pile"><span>ABLAGE</span><b>${p.discard.length}</b></div>
      </div>
    </div>
  </div>`;
}
function renderSharedPrimary(){
  const root=document.getElementById('sharedPrimaryZone');
  if(!root)return;
  const shared=state.sharedPrimary||null;
  root.innerHTML=shared
    ? `<div class="shared-primary-card">${runtimeCardHtml(shared)}</div>`
    : `<div class="shared-primary-empty"><span>PRIMÄR</span><small>Frei</small></div>`;
}

function renderBoards(){
  const a=state.activePlayer,opp=1-a;
  document.getElementById('opponentBoard').innerHTML=playerBoardHtml(state.players[opp],false,true);
  document.getElementById('playerBoard').innerHTML=playerBoardHtml(state.players[a],true,false);
  renderSharedPrimary();

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
  document.querySelector('#playerBoard [data-refuge]')?.addEventListener('click',()=>handleRefuge());

  // Gegnerische Ziele in AP anklickbar.
  document.querySelectorAll('#opponentBoard [data-bez]').forEach(btn=>{
    btn.disabled=false;
    btn.addEventListener('click',()=>chooseTarget({type:'bez',slot:Number(btn.dataset.bez)}));
  });
  document.querySelector('#opponentBoard [data-refuge]')?.addEventListener('click',()=>chooseTarget({type:'refuge'}));

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
    el.draggable=true;
    el.dataset.handIndex=String(i);
    el.innerHTML=`<img src="${esc(bild)}" alt="${esc(c?.name||'Karte')}"><span>${esc(c?.name||'Karte')}</span>`;
    el.addEventListener('dragstart',(ev)=>{
      ev.dataTransfer.setData('text/plain',String(i));
      ev.dataTransfer.effectAllowed='move';
      selectedHandIndex=i;
      markLegalDropTargets(i);
    });
    el.addEventListener('dragend',clearDropTargets);
    el.addEventListener('click',()=>{
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
  const p=E().active(state),ph=phase();

  const title=document.createElement('div');
  title.className='game-action-title';
  title.textContent=ph.name;
  root.appendChild(title);

  if(ph.id==='honor'){
    const b=document.createElement('button');
    b.textContent='Ehre vergeben';
    b.className='primary';
    b.addEventListener('click',()=>{E().grantHonor(state);saveRender('Ehrungsphase abgewickelt.');});
    root.appendChild(b);
  }

  if(ph.id==='draw'){
    const info=document.createElement('span');
    info.textContent=p.drawDone?'Karte bereits gezogen.':'Klicke auf einen der drei Hauptstapel auf deinem Spielfeld.';
    root.appendChild(info);
  }

  if(['supply','resupply'].includes(ph.id)){
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

          const openBtn=document.createElement('button');
          openBtn.textContent=`Offen in AZR ${slot+1}`;
          openBtn.disabled=!!p.azr[slot];
          openBtn.addEventListener('click',()=>{
            const r=E().playOpenAzr(state,selectedHandIndex,slot);
            if(r.ok)selectedHandIndex=null;
            saveRender(r.msg||'Karte offen ausgespielt.');
          });
          root.appendChild(openBtn);
        });
        const note=document.createElement('span');
        note.className='action-note';
        note.textContent='Offen oder verdeckt setzen ist bereits möglich. Der individuelle Karteneffekt wird später ergänzt.';
        root.appendChild(note);
      }
    }else{
      const info=document.createElement('span');
      info.textContent='Wähle eine Handkarte oder eine Karte auf dem Spielfeld.';
      root.appendChild(info);
    }
  }

  if(ph.id==='rush'){
    const attackers=p.bezSlots.map((r,i)=>E().canAttack(r,p)?i:null).filter(i=>i!==null);
    if(!attackers.length){
      const info=document.createElement('span');
      info.textContent='Keine einsatzbereite Bezwingerin kann angreifen. Du kannst in die Nachschubphase wechseln.';
      root.appendChild(info);
    }else{
      const lab=document.createElement('span');
      lab.textContent='1. Angreifer wählen:';
      root.appendChild(lab);
      attackers.forEach(i=>{
        const b=document.createElement('button');
        b.textContent=cardName(p.bezSlots[i]);
        b.classList.toggle('selected-action',selectedAttacker===i);
        b.addEventListener('click',()=>{selectedAttacker=i;selectedTarget=null;renderActions();renderBoards();});
        root.appendChild(b);
      });

      if(selectedAttacker!==null){
        const typeP=document.createElement('button');
        typeP.textContent='Physischer Angriff';
        typeP.classList.toggle('selected-action',selectedAttackType==='physical');
        typeP.addEventListener('click',()=>{selectedAttackType='physical';renderActions();});
        const typeA=document.createElement('button');
        typeA.textContent='ASTRAL-Angriff';
        typeA.classList.toggle('selected-action',selectedAttackType==='astral');
        typeA.addEventListener('click',()=>{selectedAttackType='astral';renderActions();});
        root.append(typeP,typeA);

        const targets=E().attackTargets(state,selectedAttacker);
        const tlabel=document.createElement('span');
        tlabel.textContent='2. Ziel wählen:';
        root.appendChild(tlabel);
        targets.forEach(t=>{
          const b=document.createElement('button');
          b.textContent=t.label;
          const same=selectedTarget && selectedTarget.type===t.type && selectedTarget.slot===t.slot;
          b.classList.toggle('selected-action',same);
          b.addEventListener('click',()=>{selectedTarget={type:t.type,slot:t.slot};renderActions();});
          root.appendChild(b);
        });

        if(selectedTarget){
          const prep=document.createElement('button');
          prep.className='primary';
          prep.textContent='Angriff festlegen → Kampfphase';
          prep.addEventListener('click',()=>{
            const r=E().prepareAttack(state,selectedAttacker,selectedTarget,selectedAttackType);
            if(r.ok){
              state.phaseIndex=6;
              selectedAttacker=null;selectedTarget=null;
            }
            saveRender(r.msg||'Angriff festgelegt.');
          });
          root.appendChild(prep);
        }
      }
    }
  }

  if(ph.id==='combat'){
    if(state.attack){
      const a=p.bezSlots[state.attack.attackerSlot];
      const b=document.createElement('button');
      b.className='primary';
      b.textContent=`Kampf ausführen: ${cardName(a)}`;
      b.addEventListener('click',()=>{
        const r=E().resolveCombat(state);
        saveRender(r.msg||'Kampf abgewickelt.');
      });
      root.appendChild(b);
    }else{
      const more=p.bezSlots.some(r=>E().canAttack(r,p));
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
function handleOwnBez(slot){
  const p=E().active(state),r=p.bezSlots[slot],ph=phase();
  if(!r)return;
  if(['supply','resupply'].includes(ph.id)){
    if(E().readyEligibleBez(state,slot)){
      const rr=E().readyBez(state,slot);
      return saveRender(rr.msg||'Einsatzbereit.');
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
  if(!['supply','resupply'].includes(phase().id))return;
  const p=E().active(state);
  const dev=E().availableDevelopment(state,p.refuge);
  if(dev && confirm(`Zuflucht auf Stufe ${dev.stufe} entwickeln? Kosten: ${dev.stufe} Ehre auf der Zuflucht.`)){
    const r=E().develop(state,'refuge');
    saveRender(r.msg||'Zuflucht entwickelt.');
  }else if(!dev) message('Keine passende nächste Entwicklungsstufe im Entwicklungsdeck.','warn');
}
function handleAzr(slot){
  const r=E().active(state).azr[slot];
  if(!r)return;
  if(r.faceDown){
    const rr=E().reveal(state,slot);
    saveRender(rr.msg||'Karte aufgedeckt.');
  }
}
function chooseTarget(target){
  if(phase()?.id!=='rush'||selectedAttacker===null)return;
  const legal=E().attackTargets(state,selectedAttacker).some(t=>t.type===target.type&&t.slot===target.slot);
  if(!legal)return message('Dieses Ziel darf mit dieser Bezwingerin derzeit nicht angegriffen werden.','warn');
  selectedTarget=target;
  renderActions();
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
  document.querySelectorAll('#playerBoard [data-bez],#playerBoard [data-azr]').forEach(target=>{
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
      }else{
        const slot=Number(target.dataset.azr);
        const offen=confirm('Wie möchtest du die Karte setzen?\\n\\nOK = offen\\nAbbrechen = verdeckt');
        r=offen ? E().playOpenAzr(state,idx,slot) : E().setFaceDown(state,idx,slot);
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
  renderLog();
}

document.getElementById('gameStart')?.addEventListener('click',startGame);
document.getElementById('gameResume')?.addEventListener('click',resumeGame);
document.getElementById('gameNew')?.addEventListener('click',newGame);
document.getElementById('gameNextPhase')?.addEventListener('click',()=>{
  if(!state)return;
  const r=E().advancePhase(state);
  selectedHandIndex=null;selectedAttacker=null;selectedTarget=null;
  saveRender(r.msg||'');
});

fillDeckSelectors();
const saved=E().load();
document.getElementById('gameResume').hidden=!saved;
})();
