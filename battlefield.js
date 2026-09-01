(() => {
'use strict';

const E=()=>window.G5Engine;
let state=null;
let selectedHandIndex=null;
let selectedAttacker=null;
let selectedTarget=null;
let selectedAttackType=null;

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function cardName(r){return r?E().cardData(r)?.name||'Karte':''}
function cardImg(r){return r?E().cardData(r)?.bild||r.bild:''}
function phase(){return state?E().currentPhase(state):null}
function saveRender(msg=''){
  if(state)E().save(state);
  render(msg);
}
function gamePageOpened(){
  window.addEventListener('resize',updateStickyGameOffsets);

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
  const deploymentDelayApplies = cardHasDeploymentDelay(c);
  const delayed = (r.ready===false && deploymentDelayApplies) ? ' delayed-card' : '';
  const readiness = deploymentDelayApplies
    ? (r.ready?'<em>EINSATZBEREIT</em>':'<em class="delay">Einsatzverzögerung</em>')
    : '';
  return `<div class="board-card ${small?'small':''}${delayed}">
    <img src="${esc(c?.bild||r.bild)}" alt="${esc(c?.name||'Karte')}">
    <div class="board-card-meta"><strong>${esc(c?.name||'Karte')}</strong><div class="stat-row">${statLine(r)}</div>${readiness}</div>
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
function equipmentSlot(label,kind,bezIndex,r,isActive){
  return `<button class="equip-slot ${kind}" data-equip="${kind}" data-equip-bez="${bezIndex}" ${isActive?'':'disabled'}>
    ${runtimeCardHtml(r)}
    <span class="slot-label">${label}</span>
  </button>`;
}
function bezCore(r,i,isActive){
  return `<button class="board-slot bez-slot" data-bez="${i}" ${isActive?'':'disabled'}>${runtimeCardHtml(r)}<span class="slot-label">BEZWINGERIN</span></button>`;
}
function playerBoardHtml(p,isActive,isOpponent){
  const eq=p.equipment||[
    {weapon:null,shield:null,armor:null,helmet:null},
    {weapon:null,shield:null,armor:null,helmet:null}
  ];
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
          <div class="secondary-zone" data-secondary-target>
            <span class="area-title">SEKUNDÄRZONE</span>
            ${runtimeCardHtml(p.secondary||null,{small:true})}
          </div>
        </div>

        <div class="combat-grid">
          <div class="cg l-helmet">${equipmentSlot('HELM','helmet',0,eq[0]?.helmet,isActive)}</div>
          <div class="cg r-helmet">${equipmentSlot('HELM','helmet',1,eq[1]?.helmet,isActive)}</div>

          <div class="cg l-weapon">${equipmentSlot('WAFFE','weapon',0,eq[0]?.weapon,isActive)}</div>
          <div class="cg l-bez">${bezCore(p.bezSlots[0],0,isActive)}</div>
          <div class="cg l-shield">${equipmentSlot('SCHILD','shield',0,eq[0]?.shield,isActive)}</div>

          <div class="cg refuge">
            <button class="refuge-card" data-refuge ${isActive?'':'disabled'}>${runtimeCardHtml(p.refuge)}<span class="slot-label">ZUFLUCHT</span></button>
          </div>

          <div class="cg r-weapon">${equipmentSlot('WAFFE','weapon',1,eq[1]?.weapon,isActive)}</div>
          <div class="cg r-bez">${bezCore(p.bezSlots[1],1,isActive)}</div>
          <div class="cg r-shield">${equipmentSlot('SCHILD','shield',1,eq[1]?.shield,isActive)}</div>

          <div class="cg l-armor">${equipmentSlot('RÜSTUNG','armor',0,eq[0]?.armor,isActive)}</div>
          <div class="cg r-armor">${equipmentSlot('RÜSTUNG','armor',1,eq[1]?.armor,isActive)}</div>
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
    ? `<div class="shared-primary-card" data-primary-target>${runtimeCardHtml(shared)}</div>`
    : `<div class="shared-primary-empty"><span>PRIMÄR</span><small>Frei</small></div>`;
}

function renderBoards(){
  const a=state.activePlayer,opp=1-a;
  const opponentRoot=document.getElementById('opponentBoard');
  const playerRoot=document.getElementById('playerBoard');

  try{
    opponentRoot.innerHTML=playerBoardHtml(state.players[opp],false,true);
  }catch(err){
    console.error('Gegnerfeld konnte nicht gerendert werden:',err);
    opponentRoot.innerHTML='<div class="board-render-error">Gegnerfeld konnte nicht dargestellt werden. Bitte Gefecht neu laden.</div>';
  }

  try{
    playerRoot.innerHTML=playerBoardHtml(state.players[a],true,false);
  }catch(err){
    console.error('Eigenes Spielfeld konnte nicht gerendert werden:',err);
    playerRoot.innerHTML='<div class="board-render-error">Eigenes Spielfeld konnte nicht dargestellt werden. Bitte Gefecht neu laden.</div>';
  }

  try{
    renderSharedPrimary();
  }catch(err){
    console.error('Primärzone konnte nicht gerendert werden:',err);
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

    // Nach Wahl eines Angreifers nur legale gegnerische Karten mit Herzen hervorheben.
    if(selectedAttacker!==null){
      const targets=E().attackTargets(state,selectedAttacker);
      const addTarget=(selector,target)=>{
        const el=document.querySelector(selector);
        if(!el)return;
        const legal=targets.some(t=>t.type===target.type && t.slot===target.slot);
        if(!legal)return;
        el.classList.add('attack-target-valid');
        if(selectedTarget && selectedTarget.type===target.type && selectedTarget.slot===target.slot){
          el.classList.add('attack-target-selected');
        }
        el.addEventListener('click',()=>chooseTarget(target));
      };

      [0,1].forEach(i=>addTarget(`#opponentBoard [data-bez="${i}"]`,{type:'bez',slot:i}));
      addTarget('#opponentBoard [data-refuge]',{type:'refuge'});
      addTarget('#opponentBoard [data-secondary-target]',{type:'secondary'});
      addTarget('#sharedPrimaryZone [data-primary-target]',{type:'primary'});
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
          const rr=E().equipFromAzr(state,pending.azrSlot,bezSlot,pending.kind);
          saveRender(rr.msg||'Ausrüstung angelegt.');
        });
        root.appendChild(b);
      });
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
              const r=E().equipFromHand(state,selectedHandIndex,bezSlot,eqKind);
              if(r.ok)selectedHandIndex=null;
              saveRender(r.msg||'Ausrüstung angelegt.');
            });
            root.appendChild(b);
          });
        }

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

          if(!eqKind){
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
      const atk=p.bezSlots[state.attack.attackerSlot];
      const targetLabel=(()=>{
        const t=state.attack.target;
        if(t.type==='bez')return cardName(opp.bezSlots[t.slot]);
        if(t.type==='secondary')return cardName(opp.secondary);
        if(t.type==='primary')return cardName(state.sharedPrimary);
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

      if(!attackers.length){
        const info=document.createElement('span');
        info.textContent='Keine einsatzbereite Bezwingerin kann angreifen. Einsatzverzögerte Karten dürfen weiterhin angegriffen werden.';
        root.appendChild(info);
      }else if(selectedAttacker===null){
        const info=document.createElement('span');
        info.textContent='Klicke auf eine eigene einsatzbereite Bezwingerin. Sie wird als Angreiferin ausgewählt.';
        root.appendChild(info);
      }else if(selectedTarget===null){
        const info=document.createElement('span');
        info.innerHTML=`Angreiferin: <strong>${esc(cardName(p.bezSlots[selectedAttacker]))}</strong>. Klicke jetzt auf eines der gold aufleuchtenden gegnerischen Ziele mit Herzpunkten.`;
        root.appendChild(info);
      }else{
        const info=document.createElement('span');
        info.innerHTML=`Ziel gewählt. Wähle jetzt die Angriffsart für <strong>${esc(cardName(p.bezSlots[selectedAttacker]))}</strong>.`;
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

  if(ph.id==='rush' && !state.attack){
    if(!E().canAttack(r,p)){
      return message('Diese Bezwingerin ist einsatzverzögert oder hat in dieser Kampfrunde bereits angegriffen.','warn');
    }
    selectedAttacker=slot;
    selectedTarget=null;
    selectedAttackType=null;
    renderBoards();
    renderActions();
    return message(`${cardName(r)} als Angreiferin gewählt. Wähle jetzt ein leuchtendes gegnerisches Ziel.`);
  }

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
function handleEquipmentSlot(kind,bezSlot){
  const p=E().active(state);

  if(state.pendingEquipment && state.pendingEquipment.owner===state.activePlayer){
    const pending=state.pendingEquipment;
    if(kind!==pending.kind)return message('Diese aufgedeckte Ausrüstung gehört in einen anderen Ausrüstungsbereich.','warn');
    const rr=E().equipFromAzr(state,pending.azrSlot,bezSlot,kind);
    return saveRender(rr.msg||'Ausrüstung angelegt.');
  }

  if(selectedHandIndex!==null){
    const c=handSelected();
    if(c && E().equipmentKind(c)){
      const rr=E().equipFromHand(state,selectedHandIndex,bezSlot,kind);
      if(rr.ok)selectedHandIndex=null;
      return saveRender(rr.msg||'Ausrüstung angelegt.');
    }
  }

  const r=p.equipment?.[bezSlot]?.[kind];
  if(r && ['supply','resupply'].includes(phase().id)){
    if(confirm(`${cardName(r)} auf den Ablagestapel legen?`)){
      const rr=E().discardEquipment(state,bezSlot,kind);
      return saveRender(rr.msg||'Ausrüstung abgelegt.');
    }
  }
}
function chooseTarget(target){
  if(phase()?.id!=='rush'||selectedAttacker===null)return;
  const legal=E().attackTargets(state,selectedAttacker).some(t=>t.type===target.type&&t.slot===target.slot);
  if(!legal)return message('Dieses Ziel darf mit dieser Bezwingerin derzeit nicht angegriffen werden.','warn');
  selectedTarget=target;
  selectedAttackType=null;
  renderBoards();
  renderActions();
  message('Angriffsziel gewählt. Wähle jetzt Physisch oder ASTRAL.');
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
  document.querySelectorAll('#playerBoard [data-bez],#playerBoard [data-azr],#playerBoard [data-equip]').forEach(target=>{
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
        r=E().equipFromHand(state,idx,Number(target.dataset.equipBez),target.dataset.equip);
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
  renderLog();
  requestAnimationFrame(updateStickyGameOffsets);
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

window.addEventListener('resize',updateStickyGameOffsets);

  fillDeckSelectors();
const saved=E().load();
document.getElementById('gameResume').hidden=!saved;
})();
