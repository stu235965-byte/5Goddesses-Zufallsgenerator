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
function profilname(){return localStorage.getItem(PROFILE_KEY)||'Mein Kartenpool'}

function zeigeSeite(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
  document.getElementById('page-'+name).classList.add('active');
  if(name==='profil')renderKartenpool();
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('.navbtn').forEach(b=>b.addEventListener('click',()=>zeigeSeite(b.dataset.page)));

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
  const entwicklungen=kartenInBereich('entwicklung').filter(istImPool);

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

  const fehler=[];

  const zufluchtKandidaten=gueltigeZufluchtenMitEntwicklung();
  if(zufluchtKandidaten.length<1){
    fehler.push('<strong>Zuflucht</strong>: Es muss mindestens eine ausgewählte Stufe-1-Zuflucht zusammen mit ihrer passenden Stufe-2-Entwicklungskarte im Kartenpool vorhanden sein.');
  }

  const bezPool=kartenInBereich('bezwingerinnen').filter(istImPool);
  const klassen=new Set(bezPool.map(k=>k.klasse).filter(Boolean));
  if(klassen.size<3){
    fehler.push(`<strong>Bezwingerinnen</strong>: ${klassen.size} unterschiedliche Klassen verfügbar, benötigt werden 3.`);
  }

  for(const [bereich,anzahl,label] of GENERATOR_CONFIG){
    if(bereich==='zuflucht'||bereich==='bezwingerinnen')continue;
    const pool=kartenInBereich(bereich).filter(istImPool);
    if(pool.length<anzahl){
      fehler.push(`<strong>${label}</strong>: ${pool.length} ausgewählt, benötigt werden ${anzahl}.`);
    }
  }

  const entwicklungsPool=kartenInBereich('entwicklung').filter(istImPool);
  if(entwicklungsPool.length<5){
    fehler.push(`<strong>Entwicklungskarten</strong>: ${entwicklungsPool.length} ausgewählt, benötigt werden 5.`);
  }

  if(fehler.length){
    meldung.innerHTML=`Dein Kartenpool erfüllt die Anforderungen für die Ziehung noch nicht:<br>${fehler.join('<br>')}<br><br>Öffne „Mein Kartenpool“ und wähle weitere Karten aus.`;
    meldung.hidden=false;
    return;
  }

  // Zuflucht nur aus Kandidaten ziehen, für die die Pflicht-Entwicklung verfügbar ist.
  const zuflucht=mischen(zufluchtKandidaten)[0];
  const bezwingerinnen=zieheBezwingerinnen(bezPool,3);
  const astral=mischen(kartenInBereich('astral').filter(istImPool)).slice(0,5);
  const ruestkammer=mischen(kartenInBereich('ruestkammer').filter(istImPool)).slice(0,5);

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
  const name=input.value.trim()||'Mein Kartenpool';
  localStorage.setItem(PROFILE_KEY,name);
  input.value=name;
  document.getElementById('speicherInfo').textContent='Profil wurde auf diesem Gerät gespeichert.';
  aktualisiereStatus();
  setTimeout(()=>document.getElementById('speicherInfo').textContent='',2500);
});

aktualisiereStatus();
ziehen();
