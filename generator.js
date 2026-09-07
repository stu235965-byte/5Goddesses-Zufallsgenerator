const GENERATOR_CONFIG=[
  ['zuflucht',1,'Zuflucht'],
  ['bezwingerinnen',3,'Bezwingerinnen'],
  ['astral',5,'Astralkammer'],
  ['ruestkammer',5,'Rüstkammer']
];
const POOL_CONFIG=[
  ['zuflucht','Zuflucht'],
  ['bezwingerinnen','Bezwingerinnen'],
  ['astral','Astralkammer'],
  ['ruestkammer','Rüstkammer'],
  ['entwicklung','Entwicklungskarten']
];
const STORAGE_KEY='5goddesses_kartenpool_v2';
const LEGACY_STORAGE_KEY='5goddesses_kartenpool_v1';
const PROFILE_KEY='5goddesses_profilname_v1';

function datenbank(){return window.GODDESSES_DB?.karten||[]}
function kartenInBereich(b){return datenbank().filter(k=>k.deck_bereich===b)}
function istImPool(k){return ausgewaehlt.has(k.bild)}
const GESPERRTE_GENERATORKARTEN=new Set([
  'Genova Toshi'
]);
function istGeneratorFreigegeben(k){
  return !!k && !GESPERRTE_GENERATORKARTEN.has(k.name);
}
function istImAktivenGeneratorPool(k){return istImPool(k) && istGeneratorFreigegeben(k)}
function mischen(a){
  const b=[...a];
  for(let i=b.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [b[i],b[j]]=[b[j],b[i]];
  }
  return b;
}

function ladePool(){
  try{
    const neu=localStorage.getItem(STORAGE_KEY);
    if(neu){
      const a=JSON.parse(neu);
      return new Set(Array.isArray(a)?a:[]);
    }
    const alt=localStorage.getItem(LEGACY_STORAGE_KEY);
    if(alt){
      const a=JSON.parse(alt),s=new Set(Array.isArray(a)?a:[]);
      for(const k of kartenInBereich('entwicklung'))s.add(k.bild);
      return s;
    }
    return new Set(datenbank().map(k=>k.bild));
  }catch(e){
    return new Set(datenbank().map(k=>k.bild));
  }
}

let ausgewaehlt=ladePool();

function speicherePool(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify([...ausgewaehlt]));
  aktualisiereUebersicht();
  aktualisiereStatus();
}
function profilname(){return localStorage.getItem(PROFILE_KEY)||'Kartenpool'}

const MUSIC_PREF_KEY='5goddesses_musik_aktiv_v1';
const MENU_MUSIC_VOLUME=0.25;
const GAMEPLAY_MUSIC_VOLUME=0.15;
let fanHinweisBestaetigt=false;
let aktuelleSeite='home';
let gameplayMusikModus=false;

function musikAktiviert(){
  return localStorage.getItem(MUSIC_PREF_KEY)!=='0';
}

function istMenuseite(name){
  return ['home','generator','profil','decks','story'].includes(name);
}

function aktualisiereMusikSchalter(){
  const btn=document.getElementById('musicToggle');
  if(!btn)return;
  const aktiv=musikAktiviert();
  btn.textContent=aktiv?'♫ Musik: An':'♫ Musik: Aus';
  btn.setAttribute('aria-pressed',aktiv?'true':'false');
  btn.classList.toggle('muted',!aktiv);
}

function audioZuruecksetzen(audio){
  if(!audio)return;
  audio.pause();
  try{audio.currentTime=0}catch(e){}
}

function stoppeHintergrundmusik(reset=true){
  const audio=document.getElementById('backgroundMusic');
  if(!audio)return;
  audio.pause();
  if(reset){
    try{audio.currentTime=0}catch(e){}
  }
}

function stoppeGameplayMusik(reset=true){
  const audio=document.getElementById('gameplayMusic');
  if(!audio)return;
  audio.pause();
  if(reset){
    try{audio.currentTime=0}catch(e){}
  }
}

function starteHintergrundmusik(){
  const audio=document.getElementById('backgroundMusic');
  if(!audio || !fanHinweisBestaetigt || !musikAktiviert() || gameplayMusikModus)return;
  // Auch die Deckauswahl des Testgefechts gehört noch zum Menübereich.
  if(!istMenuseite(aktuelleSeite) && aktuelleSeite!=='game')return;
  stoppeGameplayMusik(true);
  audio.volume=MENU_MUSIC_VOLUME;
  const versuch=audio.play();
  if(versuch?.catch)versuch.catch(()=>{});
}

function starteGameplayMusik(){
  gameplayMusikModus=true;
  stoppeHintergrundmusik(true);
  const audio=document.getElementById('gameplayMusic');
  if(!audio || !fanHinweisBestaetigt || !musikAktiviert())return;
  audio.volume=GAMEPLAY_MUSIC_VOLUME;
  const versuch=audio.play();
  if(versuch?.catch)versuch.catch(()=>{});
}

function beendeGameplayMusikUndStarteMenue(){
  gameplayMusikModus=false;
  stoppeGameplayMusik(true);
  starteHintergrundmusik();
}

function stoppeAlleMusik(reset=false){
  stoppeHintergrundmusik(reset);
  stoppeGameplayMusik(reset);
}

function setzeMusikAktiv(aktiv){
  localStorage.setItem(MUSIC_PREF_KEY,aktiv?'1':'0');
  aktualisiereMusikSchalter();
  if(!aktiv){
    stoppeAlleMusik(false);
    return;
  }
  if(gameplayMusikModus)starteGameplayMusik();
  else starteHintergrundmusik();
}

function initialisiereFanHinweisUndMusik(){
  const notice=document.getElementById('fanNotice');
  const accept=document.getElementById('fanNoticeAccept');
  const menuAudio=document.getElementById('backgroundMusic');
  const gameAudio=document.getElementById('gameplayMusic');
  if(menuAudio)menuAudio.volume=MENU_MUSIC_VOLUME;
  if(gameAudio)gameAudio.volume=GAMEPLAY_MUSIC_VOLUME;
  aktualisiereMusikSchalter();
  document.body.classList.add('fan-notice-open');
  accept?.focus();
  accept?.addEventListener('click',()=>{
    fanHinweisBestaetigt=true;
    if(notice)notice.hidden=true;
    document.body.classList.remove('fan-notice-open');
    starteHintergrundmusik();
  });
  document.getElementById('musicToggle')?.addEventListener('click',()=>{
    setzeMusikAktiv(!musikAktiviert());
  });
}

function zeigeSeite(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));

  document.querySelectorAll('.navbtn[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
  const ziel=document.getElementById('page-'+name);
  if(!ziel)return;
  ziel.classList.add('active');
  aktuelleSeite=name;
  document.body.classList.toggle('menu-background',istMenuseite(name));

  if(name==='game'){
    // Beim Öffnen der Testgefecht-Deckauswahl läuft die Menümusik weiter.
    // Erst battlefield.js meldet nach dem tatsächlichen Spielfeldaufbau den Wechsel.
    const shell=document.getElementById('gameShell');
    if(shell && !shell.hidden)starteGameplayMusik();
    else{
      gameplayMusikModus=false;
      stoppeGameplayMusik(true);
      starteHintergrundmusik();
    }
  }else if(istMenuseite(name)){
    beendeGameplayMusikUndStarteMenue();
  }else{
    gameplayMusikModus=false;
    stoppeAlleMusik(true);
  }

  if(name==='profil')renderKartenpool();
  if(name==='decks' && window.renderGespeicherteDecks)window.renderGespeicherteDecks();
  if(name==='game' && window.gamePageOpened)window.gamePageOpened();
  if(name==='story' && window.G5StoryMode?.open)window.G5StoryMode.open();
  window.scrollTo({top:0,behavior:'smooth'});
}
window.zeigeSeite=zeigeSeite;
window.starteGameplayMusik=starteGameplayMusik;
window.beendeGameplayMusikUndStarteMenue=beendeGameplayMusikUndStarteMenue;

function zeigeStartbildschirm(spielen=false){
  zeigeSeite('home');
  const submenu=document.getElementById('playSubmenu');
  const btn=document.getElementById('homeSpielen');
  if(submenu)submenu.hidden=!spielen;
  if(btn)btn.setAttribute('aria-expanded',spielen?'true':'false');
}


document.querySelectorAll('.navbtn[data-page]').forEach(b=>b.addEventListener('click',()=>zeigeSeite(b.dataset.page)));
document.querySelectorAll('[data-home-page]').forEach(b=>b.addEventListener('click',()=>zeigeSeite(b.dataset.homePage)));
document.getElementById('homeButton')?.addEventListener('click',()=>zeigeStartbildschirm(false));
document.getElementById('navSpielen')?.addEventListener('click',()=>zeigeStartbildschirm(true));
document.getElementById('homeSpielen')?.addEventListener('click',()=>{
  const submenu=document.getElementById('playSubmenu');
  const btn=document.getElementById('homeSpielen');
  if(!submenu||!btn)return;
  submenu.hidden=!submenu.hidden;
  btn.setAttribute('aria-expanded',submenu.hidden?'false':'true');
});
document.getElementById('homeTestgefecht')?.addEventListener('click',()=>zeigeSeite('game'));
document.getElementById('homeStorymode')?.addEventListener('click',()=>zeigeSeite('story'));
// Tutorial bleibt vorerst deaktiviert. Storymode v1.99 nutzt die Weltkarte als Hub.

function aktualisiereStatus(){
  const alle=datenbank(),n=alle.filter(k=>istImPool(k)).length;
  document.getElementById('profilStatus').textContent=`Profil: ${profilname()} · ${n} von ${alle.length} Karten im Pool`;
}

function entwicklungFuerGrundkarte(grundkarte){
  return kartenInBereich('entwicklung').filter(e=>
    e.stufe===2 &&
    e.grundkarte_bild===grundkarte.bild &&
    istImPool(e)
  );
}

function gueltigeZufluchtenMitEntwicklung(){
  return kartenInBereich('zuflucht').filter(z=>
    istImPool(z) && entwicklungFuerGrundkarte(z).length>0
  );
}

function zieheBezwingerinnen(pool,anzahl){
  const gruppen=new Map();
  for(const k of pool){
    if(!k.klasse)continue;
    if(!gruppen.has(k.klasse))gruppen.set(k.klasse,[]);
    gruppen.get(k.klasse).push(k);
  }
  return mischen([...gruppen.keys()])
    .slice(0,anzahl)
    .map(klasse=>mischen(gruppen.get(klasse))[0]);
}

function waehleEntwicklungskarten(grundkarten, zuflucht){
  const entwicklungen=kartenInBereich('entwicklung').filter(istImAktivenGeneratorPool);

  // Pflicht: passende Stufe-2-Zuflucht zur gezogenen Stufe-1-Zuflucht.
  const passendeZuflucht=mischen(entwicklungFuerGrundkarte(zuflucht))[0];
  if(!passendeZuflucht)return null;

  const ergebnis=[passendeZuflucht];
  const benutzt=new Set(ergebnis.map(k=>k.bild));

  // Danach werden Entwicklungen der tatsächlich gezogenen Stufe-1-Karten bevorzugt.
  const grundbilder=new Set(grundkarten.map(k=>k.bild));
  const priorisiert=mischen(entwicklungen.filter(e=>
    !benutzt.has(e.bild) &&
    e.stufe===2 &&
    e.grundkarte_bild &&
    grundbilder.has(e.grundkarte_bild)
  ));

  for(const e of priorisiert){
    if(ergebnis.length>=5)break;
    ergebnis.push(e);
    benutzt.add(e.bild);
  }

  // Falls weniger als fünf passende Entwicklungen existieren, mit beliebigen
  // ausgewählten Entwicklungskarten aus dem persönlichen Kartenpool auffüllen.
  const rest=mischen(entwicklungen.filter(e=>!benutzt.has(e.bild)));
  for(const e of rest){
    if(ergebnis.length>=5)break;
    ergebnis.push(e);
    benutzt.add(e.bild);
  }

  return ergebnis.length===5?ergebnis:null;
}

function kartenSektion(label,karten){
  const section=document.createElement('section');
  section.className='bereich';

  const h=document.createElement('h2');
  h.textContent=label.toUpperCase();
  section.appendChild(h);

  const row=document.createElement('div');
  row.className='karten';

  for(const k of karten){
    const img=document.createElement('img');
    img.className='karte';
    img.src=k.bild;
    img.alt=k.name||`${label}-Karte`;
    img.loading='eager';
    row.appendChild(img);
  }

  section.appendChild(row);
  return section;
}

function ziehen(){
  const ziel=document.getElementById('bereiche');
  const meldung=document.getElementById('generatorMeldung');
  meldung.hidden=true;
  meldung.innerHTML='';
  ziel.innerHTML='';
  window.AKTUELLES_ZUFALLSDECK=null;
  const savebar=document.getElementById('generatorSpeichern');
  if(savebar)savebar.hidden=true;

  const fehler=[];

  const zufluchtKandidaten=gueltigeZufluchtenMitEntwicklung();
  if(zufluchtKandidaten.length<1){
    fehler.push('<strong>Zuflucht</strong>: Es muss mindestens eine ausgewählte Stufe-1-Zuflucht zusammen mit ihrer passenden Stufe-2-Entwicklungskarte im Kartenpool vorhanden sein.');
  }

  const bezPool=kartenInBereich('bezwingerinnen').filter(istImAktivenGeneratorPool);
  const klassen=new Set(bezPool.map(k=>k.klasse).filter(Boolean));
  if(klassen.size<3){
    fehler.push(`<strong>Bezwingerinnen</strong>: ${klassen.size} unterschiedliche Klassen verfügbar, benötigt werden 3.`);
  }

  for(const [bereich,anzahl,label] of GENERATOR_CONFIG){
    if(bereich==='zuflucht'||bereich==='bezwingerinnen')continue;
    const pool=kartenInBereich(bereich).filter(istImAktivenGeneratorPool);
    if(pool.length<anzahl){
      fehler.push(`<strong>${label}</strong>: ${pool.length} ausgewählt, benötigt werden ${anzahl}.`);
    }
  }

  const entwicklungsPool=kartenInBereich('entwicklung').filter(istImAktivenGeneratorPool);
  if(entwicklungsPool.length<5){
    fehler.push(`<strong>Entwicklungskarten</strong>: ${entwicklungsPool.length} ausgewählt, benötigt werden 5.`);
  }

  if(fehler.length){
    meldung.innerHTML=`Dein Kartenpool erfüllt die Anforderungen für die Ziehung noch nicht:<br>${fehler.join('<br>')}<br><br>Öffne „Kartenpool“ und wähle weitere Karten aus.`;
    meldung.hidden=false;
    return;
  }

  // Zuflucht nur aus Kandidaten ziehen, für die die Pflicht-Entwicklung verfügbar ist.
  const zuflucht=mischen(zufluchtKandidaten)[0];
  const bezwingerinnen=zieheBezwingerinnen(bezPool,3);
  const astral=mischen(kartenInBereich('astral').filter(istImAktivenGeneratorPool)).slice(0,5);
  const ruestkammer=mischen(kartenInBereich('ruestkammer').filter(istImAktivenGeneratorPool)).slice(0,5);

  const grundkarten=[zuflucht,...bezwingerinnen,...astral,...ruestkammer];
  const entwicklung=waehleEntwicklungskarten(grundkarten,zuflucht);

  if(!entwicklung){
    meldung.innerHTML='<strong>Entwicklungskarten:</strong> Es konnten keine fünf gültigen Entwicklungskarten aus deinem Kartenpool zusammengestellt werden.';
    meldung.hidden=false;
    return;
  }

  ziel.appendChild(kartenSektion('Zuflucht',[zuflucht]));
  ziel.appendChild(kartenSektion('Bezwingerinnen',bezwingerinnen));
  ziel.appendChild(kartenSektion('Astralkammer',astral));
  ziel.appendChild(kartenSektion('Rüstkammer',ruestkammer));
  ziel.appendChild(kartenSektion('Entwicklungskarten',entwicklung));

  window.AKTUELLES_ZUFALLSDECK={
    zuflucht:[zuflucht.bild],
    bezwingerinnen:bezwingerinnen.map(k=>k.bild),
    astral:astral.map(k=>k.bild),
    ruestkammer:ruestkammer.map(k=>k.bild),
    entwicklung:entwicklung.map(k=>k.bild)
  };

  if(savebar){
    savebar.hidden=false;
    const nameInput=document.getElementById('generatorDeckname');
    if(nameInput && !nameInput.value.trim()){
      nameInput.value='Zufallsdeck';
    }
  }

  window.scrollTo({top:0,behavior:'smooth'});
}

document.getElementById('ziehen').addEventListener('click',ziehen);

function setzeKategorie(bereich,wert){
  for(const k of kartenInBereich(bereich)){
    wert?ausgewaehlt.add(k.bild):ausgewaehlt.delete(k.bild);
  }
  speicherePool();
  renderKartenpool();
}
function setzeAlle(wert){
  for(const k of datenbank()){
    wert?ausgewaehlt.add(k.bild):ausgewaehlt.delete(k.bild);
  }
  speicherePool();
  renderKartenpool();
}
document.getElementById('alleAuswaehlen').addEventListener('click',()=>setzeAlle(true));
document.getElementById('alleAbwaehlen').addEventListener('click',()=>setzeAlle(false));

function aktualisiereUebersicht(){
  const alle=datenbank(),n=alle.filter(k=>istImPool(k)).length;
  const teile=POOL_CONFIG.map(([b,l])=>{
    const ks=kartenInBereich(b);
    return `${l}: ${ks.filter(k=>istImPool(k)).length}/${ks.length}`;
  });
  document.getElementById('poolUebersicht').textContent=`${n} von ${alle.length} Karten ausgewählt · ${teile.join(' · ')}`;
}

function renderKartenpool(){
  const root=document.getElementById('kartenpool');
  root.innerHTML='';
  aktualisiereUebersicht();

  for(const [bereich,label] of POOL_CONFIG){
    const sec=document.createElement('section');
    sec.className='pool-kategorie';

    const head=document.createElement('div');
    head.className='pool-header';

    const h=document.createElement('h2');
    h.textContent=label.toUpperCase();
    head.appendChild(h);

    const acts=document.createElement('div');
    acts.className='pool-header-actions';

    const an=document.createElement('button');
    an.textContent='Alle auswählen';
    an.addEventListener('click',()=>setzeKategorie(bereich,true));

    const aus=document.createElement('button');
    aus.textContent='Alle abwählen';
    aus.addEventListener('click',()=>setzeKategorie(bereich,false));

    acts.append(an,aus);
    head.appendChild(acts);
    sec.appendChild(head);

    const grid=document.createElement('div');
    grid.className='pool-grid';

    for(const k of kartenInBereich(bereich)){
      const src=k.bild;
      const card=document.createElement('div');
      card.className='pool-card'+(istImPool(k)?' selected':'');
      card.tabIndex=0;
      card.title=k.name||'';

      const img=document.createElement('img');
      img.src=src;
      img.alt=k.name||label;
      img.loading='lazy';

      const check=document.createElement('div');
      check.className='pool-check';
      check.textContent=istImPool(k)?'✓':'';

      const toggle=()=>{
        istImPool(k)?ausgewaehlt.delete(src):ausgewaehlt.add(src);
        speicherePool();
        card.classList.toggle('selected',istImPool(k));
        check.textContent=istImPool(k)?'✓':'';
      };

      card.addEventListener('click',toggle);
      card.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){
          e.preventDefault();
          toggle();
        }
      });

      card.append(img,check);
      grid.appendChild(card);
    }

    sec.appendChild(grid);
    root.appendChild(sec);
  }
}

const input=document.getElementById('profilname');
input.value=profilname();

document.getElementById('profilSpeichern').addEventListener('click',()=>{
  const name=input.value.trim()||'Kartenpool';
  localStorage.setItem(PROFILE_KEY,name);
  input.value=name;
  document.getElementById('speicherInfo').textContent='Profil wurde auf diesem Gerät gespeichert.';
  aktualisiereStatus();
  setTimeout(()=>document.getElementById('speicherInfo').textContent='',2500);
});

initialisiereFanHinweisUndMusik();
aktualisiereStatus();
ziehen();
