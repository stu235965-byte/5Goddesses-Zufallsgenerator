const config=[['Zuflucht',1],['Bezwingerin',3],['Astralkammer',5],['Rüstkammer',5]];
const STORAGE_KEY='5goddesses_kartenpool_v1';
const PROFILE_KEY='5goddesses_profilname_v1';

function mischen(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function alleKarten(){return config.flatMap(([name])=>(window.KARTEN[name]||[]).map(src=>({name,src})))}
function ladePool(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return new Set(alleKarten().map(k=>k.src));
    const arr=JSON.parse(raw);
    return new Set(Array.isArray(arr)?arr:[]);
  }catch(e){return new Set(alleKarten().map(k=>k.src))}
}
let ausgewaehlt=ladePool();
function speicherePool(){localStorage.setItem(STORAGE_KEY,JSON.stringify([...ausgewaehlt]));aktualisiereUebersicht();aktualisiereStatus()}
function profilname(){return localStorage.getItem(PROFILE_KEY)||'Mein Kartenpool'}
function dateiname(src){try{return decodeURIComponent(src.split('/').pop().replace(/\.webp$/i,''))}catch(e){return src.split('/').pop()}}

function zeigeSeite(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
  document.getElementById('page-'+name).classList.add('active');
  if(name==='profil')renderKartenpool();
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('.navbtn').forEach(b=>b.addEventListener('click',()=>zeigeSeite(b.dataset.page)));

function aktualisiereStatus(){
  const gesamt=alleKarten().length;
  const n=[...ausgewaehlt].filter(src=>alleKarten().some(k=>k.src===src)).length;
  document.getElementById('profilStatus').textContent=`Profil: ${profilname()} · ${n} von ${gesamt} Karten im Pool`;
}

function ziehen(){
  const ziel=document.getElementById('bereiche');
  const meldung=document.getElementById('generatorMeldung');
  meldung.hidden=true;meldung.innerHTML='';ziel.innerHTML='';
  const fehler=[];
  for(const [name,anzahl] of config){
    const pool=(window.KARTEN[name]||[]).filter(src=>ausgewaehlt.has(src));
    if(pool.length<anzahl)fehler.push(`<strong>${name}</strong>: ${pool.length} ausgewählt, benötigt werden ${anzahl}.`);
  }
  if(fehler.length){
    meldung.innerHTML=`Dein Kartenpool enthält für die Ziehung noch zu wenige Karten:<br>${fehler.join('<br>')}<br><br>Öffne „Mein Kartenpool“ und wähle weitere Karten aus.`;
    meldung.hidden=false;return;
  }
  for(const [name,anzahl] of config){
    const section=document.createElement('section');section.className='bereich';
    const h=document.createElement('h2');h.textContent=name.toUpperCase();section.appendChild(h);
    const row=document.createElement('div');row.className='karten';
    const pool=(window.KARTEN[name]||[]).filter(src=>ausgewaehlt.has(src));
    for(const src of mischen(pool).slice(0,anzahl)){
      const img=document.createElement('img');img.className='karte';img.src=src;img.alt=`${name}-Karte`;img.loading='eager';row.appendChild(img)
    }
    section.appendChild(row);ziel.appendChild(section)
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

document.getElementById('ziehen').addEventListener('click',ziehen);

function setzeKategorie(name,wert){for(const src of (window.KARTEN[name]||[])){wert?ausgewaehlt.add(src):ausgewaehlt.delete(src)}speicherePool();renderKartenpool()}
function setzeAlle(wert){for(const {src} of alleKarten()){wert?ausgewaehlt.add(src):ausgewaehlt.delete(src)}speicherePool();renderKartenpool()}
document.getElementById('alleAuswaehlen').addEventListener('click',()=>setzeAlle(true));
document.getElementById('alleAbwaehlen').addEventListener('click',()=>setzeAlle(false));

function aktualisiereUebersicht(){
  const gesamt=alleKarten().length;const n=alleKarten().filter(k=>ausgewaehlt.has(k.src)).length;
  const teile=config.map(([name])=>`${name}: ${(window.KARTEN[name]||[]).filter(src=>ausgewaehlt.has(src)).length}/${(window.KARTEN[name]||[]).length}`);
  document.getElementById('poolUebersicht').textContent=`${n} von ${gesamt} Karten ausgewählt · ${teile.join(' · ')}`;
}

function renderKartenpool(){
  const root=document.getElementById('kartenpool');root.innerHTML='';aktualisiereUebersicht();
  for(const [name] of config){
    const sec=document.createElement('section');sec.className='pool-kategorie';
    const head=document.createElement('div');head.className='pool-header';
    const h=document.createElement('h2');h.textContent=name.toUpperCase();head.appendChild(h);
    const acts=document.createElement('div');acts.className='pool-header-actions';
    const an=document.createElement('button');an.textContent='Alle auswählen';an.addEventListener('click',()=>setzeKategorie(name,true));
    const aus=document.createElement('button');aus.textContent='Alle abwählen';aus.addEventListener('click',()=>setzeKategorie(name,false));
    acts.append(an,aus);head.appendChild(acts);sec.appendChild(head);
    const grid=document.createElement('div');grid.className='pool-grid';
    for(const src of (window.KARTEN[name]||[])){
      const card=document.createElement('div');card.className='pool-card'+(ausgewaehlt.has(src)?' selected':'');card.tabIndex=0;
      const img=document.createElement('img');img.src=src;img.alt=`${name} ${dateiname(src)}`;img.loading='lazy';
      const check=document.createElement('div');check.className='pool-check';check.textContent=ausgewaehlt.has(src)?'✓':'';
      const toggle=()=>{ausgewaehlt.has(src)?ausgewaehlt.delete(src):ausgewaehlt.add(src);speicherePool();card.classList.toggle('selected',ausgewaehlt.has(src));check.textContent=ausgewaehlt.has(src)?'✓':''};
      card.addEventListener('click',toggle);card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
      card.append(img,check);grid.appendChild(card)
    }
    sec.appendChild(grid);root.appendChild(sec)
  }
}

const input=document.getElementById('profilname');input.value=profilname();
document.getElementById('profilSpeichern').addEventListener('click',()=>{
  const name=input.value.trim()||'Mein Kartenpool';localStorage.setItem(PROFILE_KEY,name);input.value=name;
  document.getElementById('speicherInfo').textContent='Profil wurde auf diesem Gerät gespeichert.';aktualisiereStatus();
  setTimeout(()=>document.getElementById('speicherInfo').textContent='',2500)
});

aktualisiereStatus();ziehen();
