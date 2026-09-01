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
function mischen(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}

function ladePool(){
  try{
    const neu=localStorage.getItem(STORAGE_KEY);
    if(neu){const a=JSON.parse(neu);return new Set(Array.isArray(a)?a:[])}
    const alt=localStorage.getItem(LEGACY_STORAGE_KEY);
    if(alt){
      const a=JSON.parse(alt),s=new Set(Array.isArray(a)?a:[]);
      for(const k of kartenInBereich('entwicklung'))s.add(k.bild);
      return s;
    }
    return new Set(datenbank().map(k=>k.bild));
  }catch(e){return new Set(datenbank().map(k=>k.bild))}
}
let ausgewaehlt=ladePool();
function speicherePool(){localStorage.setItem(STORAGE_KEY,JSON.stringify([...ausgewaehlt]));aktualisiereUebersicht();aktualisiereStatus()}
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
  const alle=datenbank(),n=alle.filter(k=>ausgewaehlt.has(k.bild)).length;
  document.getElementById('profilStatus').textContent=`Profil: ${profilname()} · ${n} von ${alle.length} Karten im Pool`;
}

function zieheBezwingerinnen(pool,anzahl){
  const gruppen=new Map();
  for(const k of pool){
    if(!k.klasse)continue;
    if(!gruppen.has(k.klasse))gruppen.set(k.klasse,[]);
    gruppen.get(k.klasse).push(k);
  }
  return mischen([...gruppen.keys()]).slice(0,anzahl).map(klasse=>mischen(gruppen.get(klasse))[0]);
}

function ziehen(){
  const ziel=document.getElementById('bereiche'),meldung=document.getElementById('generatorMeldung');
  meldung.hidden=true;meldung.innerHTML='';ziel.innerHTML='';
  const fehler=[];
  for(const [bereich,anzahl,label] of GENERATOR_CONFIG){
    const pool=kartenInBereich(bereich).filter(k=>ausgewaehlt.has(k.bild));
    if(bereich==='bezwingerinnen'){
      const klassen=new Set(pool.map(k=>k.klasse).filter(Boolean));
      if(klassen.size<anzahl)fehler.push(`<strong>${label}</strong>: ${klassen.size} unterschiedliche Klassen verfügbar, benötigt werden ${anzahl}.`);
    }else if(pool.length<anzahl)fehler.push(`<strong>${label}</strong>: ${pool.length} ausgewählt, benötigt werden ${anzahl}.`);
  }
  if(fehler.length){
    meldung.innerHTML=`Dein Kartenpool enthält für die Ziehung noch zu wenige passende Karten:<br>${fehler.join('<br>')}<br><br>Öffne „Mein Kartenpool“ und wähle weitere Karten aus.`;
    meldung.hidden=false;return;
  }
  for(const [bereich,anzahl,label] of GENERATOR_CONFIG){
    const section=document.createElement('section');section.className='bereich';
    const h=document.createElement('h2');h.textContent=label.toUpperCase();section.appendChild(h);
    const row=document.createElement('div');row.className='karten';
    const pool=kartenInBereich(bereich).filter(k=>ausgewaehlt.has(k.bild));
    const gezogen=bereich==='bezwingerinnen'?zieheBezwingerinnen(pool,anzahl):mischen(pool).slice(0,anzahl);
    for(const k of gezogen){
      const img=document.createElement('img');img.className='karte';img.src=k.bild;img.alt=k.name||`${label}-Karte`;img.loading='eager';row.appendChild(img);
    }
    section.appendChild(row);ziel.appendChild(section);
  }
  window.scrollTo({top:0,behavior:'smooth'});
}
document.getElementById('ziehen').addEventListener('click',ziehen);

function setzeKategorie(bereich,wert){for(const k of kartenInBereich(bereich)){wert?ausgewaehlt.add(k.bild):ausgewaehlt.delete(k.bild)}speicherePool();renderKartenpool()}
function setzeAlle(wert){for(const k of datenbank()){wert?ausgewaehlt.add(k.bild):ausgewaehlt.delete(k.bild)}speicherePool();renderKartenpool()}
document.getElementById('alleAuswaehlen').addEventListener('click',()=>setzeAlle(true));
document.getElementById('alleAbwaehlen').addEventListener('click',()=>setzeAlle(false));

function aktualisiereUebersicht(){
  const alle=datenbank(),n=alle.filter(k=>ausgewaehlt.has(k.bild)).length;
  const teile=POOL_CONFIG.map(([b,l])=>{const ks=kartenInBereich(b);return `${l}: ${ks.filter(k=>ausgewaehlt.has(k.bild)).length}/${ks.length}`});
  document.getElementById('poolUebersicht').textContent=`${n} von ${alle.length} Karten ausgewählt · ${teile.join(' · ')}`;
}

function renderKartenpool(){
  const root=document.getElementById('kartenpool');root.innerHTML='';aktualisiereUebersicht();
  for(const [bereich,label] of POOL_CONFIG){
    const sec=document.createElement('section');sec.className='pool-kategorie';
    const head=document.createElement('div');head.className='pool-header';
    const h=document.createElement('h2');h.textContent=label.toUpperCase();head.appendChild(h);
    const acts=document.createElement('div');acts.className='pool-header-actions';
    const an=document.createElement('button');an.textContent='Alle auswählen';an.addEventListener('click',()=>setzeKategorie(bereich,true));
    const aus=document.createElement('button');aus.textContent='Alle abwählen';aus.addEventListener('click',()=>setzeKategorie(bereich,false));
    acts.append(an,aus);head.appendChild(acts);sec.appendChild(head);
    const grid=document.createElement('div');grid.className='pool-grid';
    for(const k of kartenInBereich(bereich)){
      const src=k.bild,card=document.createElement('div');card.className='pool-card'+(ausgewaehlt.has(src)?' selected':'');card.tabIndex=0;card.title=k.name||'';
      const img=document.createElement('img');img.src=src;img.alt=k.name||label;img.loading='lazy';
      const check=document.createElement('div');check.className='pool-check';check.textContent=ausgewaehlt.has(src)?'✓':'';
      const toggle=()=>{ausgewaehlt.has(src)?ausgewaehlt.delete(src):ausgewaehlt.add(src);speicherePool();card.classList.toggle('selected',ausgewaehlt.has(src));check.textContent=ausgewaehlt.has(src)?'✓':''};
      card.addEventListener('click',toggle);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
      card.append(img,check);grid.appendChild(card);
    }
    sec.appendChild(grid);root.appendChild(sec);
  }
}

const input=document.getElementById('profilname');input.value=profilname();
document.getElementById('profilSpeichern').addEventListener('click',()=>{
  const name=input.value.trim()||'Mein Kartenpool';localStorage.setItem(PROFILE_KEY,name);input.value=name;
  document.getElementById('speicherInfo').textContent='Profil wurde auf diesem Gerät gespeichert.';aktualisiereStatus();
  setTimeout(()=>document.getElementById('speicherInfo').textContent='',2500);
});
aktualisiereStatus();ziehen();
