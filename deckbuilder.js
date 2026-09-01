const DECKS_KEY='5goddesses_decks_v1';
const DECK_LIMITS={zuflucht:1,bezwingerinnen:3,astral:5,ruestkammer:5,entwicklung:5};
const DECK_LABELS={
  zuflucht:'Zuflucht',
  bezwingerinnen:'Bezwingerinnen',
  astral:'Astralkammer',
  ruestkammer:'Rüstkammer',
  entwicklung:'Entwicklungskarten'
};
const DECK_ORDER=['zuflucht','bezwingerinnen','astral','ruestkammer','entwicklung'];

let editorDeck=null;
let editorOriginalId=null;

function deckDb(){return window.GODDESSES_DB?.karten||[]}
function deckKarte(bild){return deckDb().find(k=>k.bild===bild)||null}
function deckPoolSet(){
  try{
    const raw=localStorage.getItem('5goddesses_kartenpool_v2');
    if(raw){
      const a=JSON.parse(raw);
      return new Set(Array.isArray(a)?a:[]);
    }
  }catch(e){}
  return new Set(deckDb().map(k=>k.bild));
}
function ladeDecks(){
  try{
    const a=JSON.parse(localStorage.getItem(DECKS_KEY)||'[]');
    return Array.isArray(a)?a:[];
  }catch(e){return []}
}
function speichereDecks(decks){localStorage.setItem(DECKS_KEY,JSON.stringify(decks))}
function neueId(){return 'deck-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
function leeresDeck(){
  return {zuflucht:[],bezwingerinnen:[],astral:[],ruestkammer:[],entwicklung:[]};
}
function kopiereKartenstruktur(karten){
  const neu=leeresDeck();
  for(const b of DECK_ORDER)neu[b]=Array.isArray(karten?.[b])?[...karten[b]]:[];
  return neu;
}
function anzahlDeckkarten(karten){
  return DECK_ORDER.reduce((sum,b)=>sum+(karten[b]?.length||0),0);
}
function passendeZufluchtEntwicklung(zufluchtBild){
  return deckDb().find(k=>
    k.deck_bereich==='entwicklung' &&
    k.stufe===2 &&
    k.kartentyp==='Zuflucht' &&
    k.grundkarte_bild===zufluchtBild
  )||null;
}
function deckValidierung(karten){
  const fehler=[];

  for(const b of DECK_ORDER){
    const ist=karten[b]?.length||0;
    const soll=DECK_LIMITS[b];
    if(ist!==soll)fehler.push(`${DECK_LABELS[b]}: ${ist}/${soll}`);
  }

  if((karten.bezwingerinnen||[]).length===3){
    const klassen=karten.bezwingerinnen
      .map(deckKarte).filter(Boolean)
      .map(k=>k.klasse).filter(Boolean);
    if(new Set(klassen).size!==3){
      fehler.push('Die 3 Bezwingerinnen müssen 3 unterschiedliche Klassen haben.');
    }
  }

  if((karten.zuflucht||[]).length===1){
    const pflicht=passendeZufluchtEntwicklung(karten.zuflucht[0]);
    if(!pflicht || !(karten.entwicklung||[]).includes(pflicht.bild)){
      fehler.push('Die passende Stufe-2-Zuflucht muss im Entwicklungsdeck enthalten sein.');
    }
  }

  return {komplett:fehler.length===0,fehler};
}
function deckNameEinzigartig(name,ignoreId=null){
  const decks=ladeDecks();
  const basis=(name||'Deck').trim()||'Deck';
  if(!decks.some(d=>d.id!==ignoreId && d.name===basis))return basis;
  let i=2;
  while(decks.some(d=>d.id!==ignoreId && d.name===`${basis} ${i}`))i++;
  return `${basis} ${i}`;
}
function zeitText(iso){
  try{
    return new Date(iso).toLocaleString('de-DE',{
      day:'2-digit',month:'2-digit',year:'numeric',
      hour:'2-digit',minute:'2-digit'
    });
  }catch(e){return ''}
}
function quelleText(q){return q==='zufall'?'Zufallsgenerator':'Eigener Deckbuilder'}

function speichereNeuesDeck(name,karten,quelle='eigen'){
  const decks=ladeDecks();
  const jetzt=new Date().toISOString();
  const deck={
    id:neueId(),
    name:deckNameEinzigartig(name),
    quelle,
    erstellt:jetzt,
    geaendert:jetzt,
    karten:kopiereKartenstruktur(karten)
  };
  decks.unshift(deck);
  speichereDecks(decks);
  return deck;
}

function zeigeGeneratorInfo(text,fehler=false){
  const info=document.getElementById('generatorSpeicherInfo');
  if(!info)return;
  info.textContent=text;
  info.classList.toggle('error-text',fehler);
}

document.getElementById('zufallsdeckSpeichern')?.addEventListener('click',()=>{
  const karten=window.AKTUELLES_ZUFALLSDECK;
  if(!karten){
    zeigeGeneratorInfo('Ziehe zuerst ein vollständiges Deck.',true);
    return;
  }

  const valid=deckValidierung(karten);
  if(!valid.komplett){
    zeigeGeneratorInfo('Dieses Zufallsdeck erfüllt die Deckregeln nicht.',true);
    return;
  }

  const input=document.getElementById('generatorDeckname');
  const name=input?.value.trim()||'Zufallsdeck';
  const deck=speichereNeuesDeck(name,karten,'zufall');
  if(input)input.value=deck.name;
  zeigeGeneratorInfo(`„${deck.name}“ wurde unter „Meine Decks“ gespeichert.`);
  renderGespeicherteDecks();
});

function renderGespeicherteDecks(){
  const liste=document.getElementById('deckListe');
  const leer=document.getElementById('deckListeLeer');
  if(!liste||!leer)return;

  const decks=ladeDecks();
  liste.innerHTML='';
  leer.hidden=decks.length>0;

  for(const deck of decks){
    const valid=deckValidierung(deck.karten);
    const card=document.createElement('article');
    card.className='saved-deck';

    const head=document.createElement('div');
    head.className='saved-deck-head';

    const text=document.createElement('div');
    const name=document.createElement('h2');
    name.textContent=deck.name;

    const meta=document.createElement('div');
    meta.className='deck-meta';
    meta.textContent=`${quelleText(deck.quelle)} · ${anzahlDeckkarten(deck.karten)}/19 Karten · ${valid.komplett?'Vollständig':'Entwurf'} · ${zeitText(deck.geaendert)}`;

    text.append(name,meta);

    const actions=document.createElement('div');
    actions.className='saved-deck-actions';

    const edit=document.createElement('button');
    edit.textContent='Öffnen / Bearbeiten';
    edit.addEventListener('click',()=>oeffneDeckEditor(deck));

    const del=document.createElement('button');
    del.textContent='Löschen';
    del.className='danger-btn';
    del.addEventListener('click',()=>{
      if(!confirm(`Deck „${deck.name}“ wirklich löschen?`))return;
      speichereDecks(ladeDecks().filter(d=>d.id!==deck.id));
      renderGespeicherteDecks();
    });

    actions.append(edit,del);
    head.append(text,actions);
    card.appendChild(head);

    const counts=document.createElement('div');
    counts.className='deck-count-row';
    for(const b of DECK_ORDER){
      const chip=document.createElement('span');
      chip.textContent=`${DECK_LABELS[b]} ${deck.karten[b]?.length||0}/${DECK_LIMITS[b]}`;
      counts.appendChild(chip);
    }
    card.appendChild(counts);

    const preview=document.createElement('div');
    preview.className='deck-preview';
    const bilder=DECK_ORDER.flatMap(b=>deck.karten[b]||[]);
    for(const bild of bilder){
      const k=deckKarte(bild);
      const img=document.createElement('img');
      img.src=bild;
      img.alt=k?.name||'Karte';
      img.loading='lazy';
      preview.appendChild(img);
    }
    card.appendChild(preview);

    if(!valid.komplett){
      const warn=document.createElement('div');
      warn.className='deck-warning';
      warn.textContent='Entwurf: '+valid.fehler.join(' · ');
      card.appendChild(warn);
    }

    liste.appendChild(card);
  }
}
window.renderGespeicherteDecks=renderGespeicherteDecks;

document.getElementById('neuesDeck')?.addEventListener('click',()=>oeffneDeckEditor(null));
document.getElementById('deckAbbrechen')?.addEventListener('click',()=>schliesseDeckEditor());

document.getElementById('deckSpeichern')?.addEventListener('click',()=>{
  if(!editorDeck)return;

  const input=document.getElementById('deckName');
  const name=(input?.value||'').trim()||'Neues Deck';
  const decks=ladeDecks();
  const jetzt=new Date().toISOString();

  if(editorOriginalId){
    const idx=decks.findIndex(d=>d.id===editorOriginalId);
    if(idx>=0){
      decks[idx]={
        ...decks[idx],
        name:deckNameEinzigartig(name,editorOriginalId),
        geaendert:jetzt,
        karten:kopiereKartenstruktur(editorDeck)
      };
    }
  }else{
    decks.unshift({
      id:neueId(),
      name:deckNameEinzigartig(name),
      quelle:'eigen',
      erstellt:jetzt,
      geaendert:jetzt,
      karten:kopiereKartenstruktur(editorDeck)
    });
  }

  speichereDecks(decks);
  schliesseDeckEditor();
  renderGespeicherteDecks();
});

function oeffneDeckEditor(deck){
  editorOriginalId=deck?.id||null;
  editorDeck=kopiereKartenstruktur(deck?.karten||leeresDeck());

  document.getElementById('deckListeAnsicht').hidden=true;
  document.getElementById('deckEditor').hidden=false;

  const input=document.getElementById('deckName');
  input.value=deck?.name||'Neues Deck';

  renderDeckEditor();
  window.scrollTo({top:0,behavior:'smooth'});
}
function schliesseDeckEditor(){
  editorDeck=null;
  editorOriginalId=null;
  document.getElementById('deckEditor').hidden=true;
  document.getElementById('deckListeAnsicht').hidden=false;
  window.scrollTo({top:0,behavior:'smooth'});
}
function deckMeldung(text=''){
  const box=document.getElementById('deckMeldung');
  if(!box)return;
  box.hidden=!text;
  box.textContent=text;
}
function deckEnthaelt(bereich,bild){return editorDeck?.[bereich]?.includes(bild)}

function erzwingePassendeZufluchtEntwicklung(zufluchtBild){
  const pool=deckPoolSet();
  const pflicht=passendeZufluchtEntwicklung(zufluchtBild);

  if(!pflicht || !pool.has(pflicht.bild)){
    return {
      ok:false,
      text:'Diese Zuflucht kann nicht gewählt werden, weil ihre passende Stufe-2-Zuflucht nicht in deinem Kartenpool vorhanden ist.'
    };
  }

  // Es darf nur die zur aktuell gewählten Zuflucht gehörende Zuflucht-Entwicklung im Pflichtplatz stehen.
  const andereZufluchtEntwicklungen=editorDeck.entwicklung.filter(bild=>{
    const k=deckKarte(bild);
    return k?.kartentyp==='Zuflucht';
  });
  editorDeck.entwicklung=editorDeck.entwicklung.filter(b=>!andereZufluchtEntwicklungen.includes(b));

  if(!editorDeck.entwicklung.includes(pflicht.bild)){
    if(editorDeck.entwicklung.length>=DECK_LIMITS.entwicklung)editorDeck.entwicklung.pop();
    editorDeck.entwicklung.unshift(pflicht.bild);
  }
  return {ok:true};
}

function toggleDeckKarte(bereich,karte){
  deckMeldung();

  const arr=editorDeck[bereich];
  const vorhanden=arr.includes(karte.bild);

  if(vorhanden){
    if(bereich==='entwicklung' && editorDeck.zuflucht.length===1){
      const pflicht=passendeZufluchtEntwicklung(editorDeck.zuflucht[0]);
      if(pflicht?.bild===karte.bild){
        deckMeldung('Die passende Stufe-2-Zuflucht ist Pflicht und kann nur entfernt werden, wenn du die Stufe-1-Zuflucht wechselst.');
        return;
      }
    }

    arr.splice(arr.indexOf(karte.bild),1);

    if(bereich==='zuflucht'){
      const alte=passendeZufluchtEntwicklung(karte.bild);
      if(alte)editorDeck.entwicklung=editorDeck.entwicklung.filter(b=>b!==alte.bild);
    }

    renderDeckEditor();
    return;
  }

  if(bereich==='zuflucht'){
    const pruefung=erzwingePassendeZufluchtEntwicklung(karte.bild);
    if(!pruefung.ok){
      deckMeldung(pruefung.text);
      return;
    }
    editorDeck.zuflucht=[karte.bild];
    renderDeckEditor();
    return;
  }

  if(arr.length>=DECK_LIMITS[bereich]){
    deckMeldung(`${DECK_LABELS[bereich]} ist bereits vollständig (${DECK_LIMITS[bereich]}/${DECK_LIMITS[bereich]}).`);
    return;
  }

  if(bereich==='bezwingerinnen'){
    const klasse=karte.klasse;
    const schon=arr.map(deckKarte).filter(Boolean).some(k=>k.klasse===klasse);
    if(schon){
      deckMeldung(`Die Klasse „${klasse}“ ist bereits durch eine andere Bezwingerin im Deck vertreten.`);
      return;
    }
  }

  arr.push(karte.bild);
  renderDeckEditor();
}

function renderDeckStatus(){
  const status=document.getElementById('deckStatus');
  if(!status||!editorDeck)return;

  const valid=deckValidierung(editorDeck);
  const teile=DECK_ORDER.map(b=>`${DECK_LABELS[b]} ${editorDeck[b].length}/${DECK_LIMITS[b]}`);

  status.innerHTML=
    `<strong>${anzahlDeckkarten(editorDeck)}/19 Karten</strong> · ${teile.join(' · ')}<br>`+
    `<span class="${valid.komplett?'deck-ok':'deck-draft'}">${valid.komplett?'Deck vollständig und regelkonform':'Entwurf – kann trotzdem gespeichert werden'}</span>`;
}

function renderDeckEditor(){
  if(!editorDeck)return;

  renderDeckStatus();
  const root=document.getElementById('deckBuilderBereiche');
  root.innerHTML='';
  const pool=deckPoolSet();

  for(const bereich of DECK_ORDER){
    const sec=document.createElement('section');
    sec.className='builder-category';

    const head=document.createElement('div');
    head.className='builder-category-head';

    const h=document.createElement('h2');
    h.textContent=DECK_LABELS[bereich].toUpperCase();

    const count=document.createElement('span');
    count.className='builder-count';
    count.textContent=`${editorDeck[bereich].length}/${DECK_LIMITS[bereich]}`;

    head.append(h,count);
    sec.appendChild(head);

    if(bereich==='bezwingerinnen'){
      const hint=document.createElement('p');
      hint.className='builder-hint';
      hint.textContent='Es müssen drei unterschiedliche Klassen gewählt werden.';
      sec.appendChild(hint);
    }
    if(bereich==='entwicklung'){
      const hint=document.createElement('p');
      hint.className='builder-hint';
      hint.textContent='Die passende Stufe-2-Zuflucht wird beim Wählen der Zuflucht automatisch als Pflichtkarte gesetzt.';
      sec.appendChild(hint);
    }

    const grid=document.createElement('div');
    grid.className='builder-grid';

    const karten=deckDb().filter(k=>k.deck_bereich===bereich && pool.has(k.bild));

    for(const karte of karten){
      const selected=deckEnthaelt(bereich,karte.bild);
      const el=document.createElement('button');
      el.type='button';
      el.className='builder-card'+(selected?' selected':'');
      el.title=karte.name||'';

      if(bereich==='entwicklung' && editorDeck.zuflucht.length===1){
        const pflicht=passendeZufluchtEntwicklung(editorDeck.zuflucht[0]);
        if(pflicht?.bild===karte.bild)el.classList.add('mandatory');
      }

      const img=document.createElement('img');
      img.src=karte.bild;
      img.alt=karte.name||DECK_LABELS[bereich];
      img.loading='lazy';

      const mark=document.createElement('span');
      mark.className='builder-card-mark';
      mark.textContent=selected?'✓':'+';
      el.append(img,mark);

      if(bereich==='bezwingerinnen' && karte.klasse){
        const badge=document.createElement('span');
        badge.className='builder-card-badge';
        badge.textContent=karte.klasse;
        el.appendChild(badge);
      }

      if(bereich==='entwicklung'){
        const grund=karte.grundkarte_bild;
        const grundIstImDeck=DECK_ORDER
          .filter(b=>b!=='entwicklung')
          .some(b=>editorDeck[b].includes(grund));
        if(grundIstImDeck){
          const badge=document.createElement('span');
          badge.className='builder-card-badge match';
          badge.textContent='passt zum Deck';
          el.appendChild(badge);
        }
      }

      el.addEventListener('click',()=>toggleDeckKarte(bereich,karte));
      grid.appendChild(el);
    }

    if(!karten.length){
      const leer=document.createElement('div');
      leer.className='empty-state';
      leer.textContent='In deinem Kartenpool sind für diese Kategorie keine Karten ausgewählt.';
      sec.appendChild(leer);
    }else{
      sec.appendChild(grid);
    }

    root.appendChild(sec);
  }
}

renderGespeicherteDecks();
