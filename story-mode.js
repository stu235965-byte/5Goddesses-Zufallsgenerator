(function(){
'use strict';
const KEY='5goddesses_story_progress_v1';
const ACT1='Akt I – Die Fanfaren der Göttinnen';

const EVENTS=[
  {
    id:'act1_prolog',act:1,order:0,title:'Menias Bibliothek',x:53.0,y:18.2,type:'story',
    text:[
      'Zwischen den hohen Regalen ihrer Bibliothek folgt Menia erneut den Spuren der fünf Welten. Unter dem Gebäude liegen jene Katakomben, die kaum jemand außer ihr kennt – und dort wartet der große blaue Kristall.',
      'Die alten Texte berichten von einem gewaltigen Energiekern im Zentrum, der weitere Kristalle speist. Solche Kristalle soll es in den großen Städten aller fünf Welten geben: Oberwelt, Mittelwelt, Astralwelt, Unterwelt und Zwischenwelt.',
      'Als Menia den Kristall berührt, scheint sich in seinem Inneren wieder eine Gestalt abzuzeichnen. Kein gesprochenes Wort erreicht sie – und doch fühlt es sich an, als würde etwas nach ihr rufen. Kurz darauf erscheint Kiki mit einer Nachricht von Martha Kaizer.'
    ],
    post:'Menia schließt die Aufzeichnungen und steckt einige Notizen ein. Wenn Martha persönlich nach ihr verlangt, wird der Auftrag kaum gewöhnlich sein.'
  },
  {
    id:'act1_martha',act:1,order:1,title:'Auftrag von Haus Imperia',x:43.0,y:18.8,type:'encounter',encounter:'act1_martha',
    text:[
      'Martha Kaizer erwartet Menia im Einflussbereich von Haus Imperia. Bevor sie die eigentliche Aufgabe übergibt, will sie sicher sein, dass Menia für die kommenden Auseinandersetzungen vorbereitet ist.',
      'Das Gefecht ist eine Prüfung, kein persönlicher Konflikt. Martha tritt mit Verbündeten an, die ihrer Ordnung und ihrem Schutzgedanken folgen.'
    ],
    post:'Martha akzeptiert Menias Leistung. In mehreren Bezirken der Oberwelt wurden ungewöhnliche Vorgänge an den Kristallanlagen gemeldet. Menia soll herausfinden, ob dahinter ein Angriff, Sabotage – oder etwas völlig anderes steckt.'
  },
  {
    id:'act1_zahira',act:1,order:2,title:'Die unsichtbare Beobachterin',x:46.2,y:23.0,type:'encounter',encounter:'act1_zahira',
    text:[
      'Auf dem Weg zur nächsten Kristallspur merkt Menia, dass sie beobachtet wird. Die Hinweise führen zu Zahira Semiramis.',
      'Zahira gibt kaum etwas preis. Statt einer Erklärung fordert sie Menia heraus – als wolle sie nicht gewinnen, sondern herausfinden, wie viel Menia bereits verstanden hat.'
    ],
    post:'Nach dem Kampf bleibt Zahiras Absicht unklar. Doch eine ihrer Bemerkungen lenkt Menias Blick auf einen von Automata kontrollierten Sperrbezirk. Dort sollen Zugänge zu einer wichtigen Anlage abgeriegelt worden sein.'
  },
  {
    id:'act1_sperrbezirk',act:1,order:3,title:'Sperrbezirk',x:34.0,y:19.0,type:'encounter',encounter:'act1_sperrbezirk',
    text:[
      'Die Z.E.R.O.-Einheiten lassen Menia nicht passieren. Der Bereich steht unter vollständiger Kontrolle der Automata.',
      'Wenn Menia den Ursprung der Störung erreichen will, muss sie sich durch die erste Verteidigungslinie kämpfen.'
    ],
    post:'Hinter der Sperre entdeckt Menia, dass die Maßnahmen nicht nur dem Schutz vor Eindringlingen dienen. Die Automata sichern den Weg zum Kernbereich selbst. Q.U.E.E.N.s Einfluss ist hier überall spürbar.'
  },
  {
    id:'act1_waechter',act:1,order:4,title:'Die Wächter des Kerns',x:41.1,y:12.2,type:'encounter',encounter:'act1_waechter',
    text:[
      'Je näher Menia der Anlage kommt, desto stärker wird das vertraute Pulsieren des Kristalls. Eine zweite Automata-Gruppe blockiert den letzten Zugang.',
      'Diese Wächter sind deutlich aggressiver. Menia erkennt D.E.A.T.H. zwischen den Einheiten – eine fraktionslose Konstruktion, deren Rolle sie noch nicht einordnen kann.'
    ],
    post:'Der letzte Schutzring fällt. Vor Menia liegt der Zugang zu Q.U.E.E.N.s Bereich. Gleichzeitig reagiert der Kristall so stark wie nie zuvor. Irgendetwas verbindet diese Anlage mit den Signalen, die Menia in ihrer Bibliothek gespürt hat.'
  },
  {
    id:'act1_queen',act:1,order:5,title:'Q.U.E.E.N. – Ordnung der Oberwelt',x:37.4,y:15.5,type:'boss',boss:'act1_queen',
    text:[
      'Q.U.E.E.N. stellt sich Menia selbst entgegen. Ihre Z.E.R.O.-Einheiten arbeiten wie Teile einer einzigen Maschine.',
      'Für Menia geht es nicht darum, die Automata zu vernichten. Sie braucht Zugang zu den Informationen hinter Q.U.E.E.N.s Sperre – Informationen über die Kristalle und ihre Verbindung zu den anderen Welten.'
    ],
    post:'Q.U.E.E.N.s Niederlage öffnet Menia den Zugriff auf die gesuchten Daten. Die Störung ist nicht auf die Oberwelt begrenzt. Eine Spur führt deutlich in Richtung Astralwelt. Damit endet der erste Abschnitt von Menias Reise – und zum ersten Mal liegt wirklich eine andere Welt vor ihr.'
  }
];

const STORY_POOL_KEY='5goddesses_story_pool_v1';
const STORY_DECK_KEY='5goddesses_story_deck_v1';

function defaultProgress(){return {index:0,pendingPost:null,rewardPending:null,rewards:{},completed:[],failed:false,act1Finished:false};}
function load(){try{const p=JSON.parse(localStorage.getItem(KEY)||'null');return p&&typeof p.index==='number'?{...defaultProgress(),...p,rewards:{...defaultProgress().rewards,...(p.rewards||{})}}:defaultProgress();}catch{return defaultProgress();}}
function save(p){localStorage.setItem(KEY,JSON.stringify(p));}
function eventById(id){return EVENTS.find(e=>e.id===id)||null;}
function current(p){return EVENTS[Math.min(p.index,EVENTS.length-1)]||EVENTS[0];}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function db(){return window.GODDESSES_DB?.karten||[];}
function cardByImage(bild){return db().find(c=>c.bild===bild)||null;}
function cardImageByName(name,area){return db().find(c=>c.name===name&&(!area||c.deck_bereich===area))?.bild;}
function pick(name,area){const bild=cardImageByName(name,area);if(!bild)throw new Error(`Menias Starterdeck: Karte fehlt: ${name} (${area})`);return bild;}
function cloneCards(k){return {zuflucht:[...(k.zuflucht||[])],bezwingerinnen:[...(k.bezwingerinnen||[])],astral:[...(k.astral||[])],ruestkammer:[...(k.ruestkammer||[])],entwicklung:[...(k.entwicklung||[])]};}
function starterDeck(){
  return {
    id:'story-menia-starter-v2',name:'Menia · Starterdeck',storyPlayerDeck:true,
    karten:{
      zuflucht:[pick('Das strahlende Schloss Kaizer','zuflucht')],
      bezwingerinnen:[pick('Die glorreiche Eroberin Martha Kaizer','bezwingerinnen'),pick('Die Schöpferin Cassandra','bezwingerinnen'),pick('Der unsichtbare Untergang Menia','bezwingerinnen')],
      astral:[pick('Aufstieg','astral'),pick('Aufopferung der S.H.I.E.L.D.','astral'),pick('ASTRAL-Feuerball','astral'),pick('Rabe der Hoffnung Kiki','astral'),pick('Vollendete Tötungstechnik','astral')],
      ruestkammer:[pick('Die Abenddämmerung Hyhde','ruestkammer'),pick('Die Morgenröte Jakyl','ruestkammer'),pick('Parierdolch','ruestkammer'),pick('Die strahlende Krone Gloria','ruestkammer'),pick('Ubusa Brustpanzer','ruestkammer')],
      entwicklung:[pick('Das strahlende Schloss Kaizer','entwicklung'),pick('Die glorreiche Eroberin Martha Kaizer','entwicklung'),pick('Bastion Fernstille','entwicklung'),pick('Glut des Morgens','entwicklung'),pick('Sanctum Lysandor','entwicklung')]
    }
  };
}
function starterPoolImages(){const k=starterDeck().karten;return [...new Set(Object.values(k).flat())];}
function storyPoolSet(){
  const base=new Set(starterPoolImages());
  try{const a=JSON.parse(localStorage.getItem(STORY_POOL_KEY)||'[]');if(Array.isArray(a))for(const bild of a)if(cardByImage(bild))base.add(bild);}catch{}
  return base;
}
function savePool(set){localStorage.setItem(STORY_POOL_KEY,JSON.stringify([...set]));}
function loadStoryDeckCards(){
  const starter=starterDeck().karten;
  try{
    const raw=JSON.parse(localStorage.getItem(STORY_DECK_KEY)||'null');
    if(!raw)return cloneCards(starter);
    const k=cloneCards(raw);
    // v2.05: unverändertes altes Starterdeck automatisch auf die neu balancierte Astralkammer migrieren.
    const oldStarterAstral=['Aufstieg','Zweifache Bestrafung','Bis zum bitteren Ende','Rabe der Hoffnung Kiki','Vollendete Tötungstechnik'].map(n=>cardImageByName(n,'astral'));
    if(k.astral.length===5 && oldStarterAstral.every((b,i)=>k.astral[i]===b)) k.astral=[...starter.astral];
    // Storydeck darf nur aus freigeschalteten Storykarten bestehen. Zuflucht, Bezwingerinnen und Entwicklung bleiben fest.
    const pool=storyPoolSet();
    k.zuflucht=[...starter.zuflucht];k.bezwingerinnen=[...starter.bezwingerinnen];k.entwicklung=[...starter.entwicklung];
    if(k.astral.length!==5||k.ruestkammer.length!==5||![...k.astral,...k.ruestkammer].every(x=>pool.has(x)))return cloneCards(starter);
    return k;
  }catch{return cloneCards(starter);}
}
function saveStoryDeckCards(k){localStorage.setItem(STORY_DECK_KEY,JSON.stringify(cloneCards(k)));}
function playerDeck(){return {id:'story-menia-custom-v1',name:'Menia · Storydeck',storyPlayerDeck:true,karten:loadStoryDeckCards()};}

function closeDialog(){const m=document.getElementById('storyModal');if(m)m.hidden=true;}
function setHtmlText(root,paragraphs){root.innerHTML=(paragraphs||[]).map(t=>`<p>${esc(t)}</p>`).join('');}
function completeEvent(){
  const p=load(),e=current(p);
  if(!p.completed.includes(e.id))p.completed.push(e.id);
  p.pendingPost=null;p.rewardPending=null;p.failed=false;
  if(p.index<EVENTS.length-1)p.index++; else p.act1Finished=true;
  save(p);closeDialog();render();
}
function showEvent(e,mode='intro'){
  const p=load(),modal=document.getElementById('storyModal');if(!modal)return;
  document.getElementById('storyDialogAct').textContent=ACT1;
  document.getElementById('storyDialogTitle').textContent=e.title;
  const text=document.getElementById('storyDialogText');
  const actions=document.getElementById('storyDialogActions');actions.innerHTML='';
  if(mode==='post'){
    setHtmlText(text,[e.post]);
    const b=document.createElement('button');b.className='primary story-fight-button';b.textContent=e.id===EVENTS.at(-1).id?'Akt I abschließen':'Weiter';b.onclick=completeEvent;actions.appendChild(b);
  }else{
    const paras=[...e.text];if(p.failed)paras.push('Der letzte Versuch ist gescheitert. Menia kann das Gefecht erneut beginnen.');
    setHtmlText(text,paras);
    const b=document.createElement('button');b.className='primary story-fight-button';
    if(e.type==='story'){b.textContent='Weiter';b.onclick=()=>{p.pendingPost=e.id;save(p);showEvent(e,'post');};}
    else {b.textContent=p.failed?'Kampf erneut beginnen':'Kampf beginnen';b.onclick=()=>startBattle(e);}
    actions.appendChild(b);
  }
  modal.hidden=false;
}
function startBattle(e){
  try{
    const deck=playerDeck();
    if(!window.G5Engine?.validDeck(deck))throw new Error('Menias Storydeck ist ungültig. Öffne den Story-Deckbuilder und stelle 5 Astralkammer- sowie 5 Rüstkammerkarten zusammen.');
    closeDialog();window.zeigeSeite?.('game');
    if(e.type==='boss')window.G5StoryBattlefield.startBoss(deck,e.boss,0);else window.G5StoryBattlefield.startEncounter(deck,e.encounter,0);
  }catch(err){console.error(err);alert(`Storykampf konnte nicht gestartet werden: ${err.message}`);window.zeigeSeite?.('story');}
}
function opponentDeckForEvent(e){return e?.type==='boss'?window.G5STORY_BOSS_DECKS?.get?.(e.boss):window.G5STORY_ENCOUNTER_DECKS?.get?.(e.encounter);}
function rewardChoices(e){
  const d=opponentDeckForEvent(e),pool=storyPoolSet();if(!d)return [];
  const all=[...(d.karten?.astral||[]),...(d.karten?.ruestkammer||[])];
  return [...new Set(all)].filter(b=>!pool.has(b)&&['astral','ruestkammer'].includes(cardByImage(b)?.deck_bereich));
}
function closeReward(){const m=document.getElementById('storyRewardModal');if(m)m.hidden=true;}
function claimReward(e,bild){
  const p=load();if(p.rewardPending!==e.id)return;
  const valid=rewardChoices(e);if(!valid.includes(bild))return;
  const pool=storyPoolSet();pool.add(bild);savePool(pool);
  p.rewards[e.id]=bild;p.rewardPending=null;p.pendingPost=e.id;save(p);closeReward();render();showEvent(e,'post');
}
function showReward(e){
  const p=load();if(p.rewards?.[e.id]){p.rewardPending=null;p.pendingPost=e.id;save(p);showEvent(e,'post');return;}
  const choices=rewardChoices(e);
  if(!choices.length){p.rewardPending=null;p.pendingPost=e.id;save(p);showEvent(e,'post');return;}
  const modal=document.getElementById('storyRewardModal'),grid=document.getElementById('storyRewardGrid');if(!modal||!grid)return;
  document.getElementById('storyRewardTitle').textContent=`Beute nach „${e.title}“`;
  grid.innerHTML='';
  for(const bild of choices){
    const k=cardByImage(bild);const b=document.createElement('button');b.type='button';b.className='story-reward-card';
    b.innerHTML=`<img src="${esc(bild)}" alt="${esc(k?.name||'Karte')}"><span>${esc(k?.name||'Karte')}</span><small>${k?.deck_bereich==='astral'?'Astralkammer':'Rüstkammer'}</small>`;
    b.onclick=()=>claimReward(e,bild);grid.appendChild(b);
  }
  modal.hidden=false;
}
function battleFinished(info){
  const p=load(),e=current(p);const expected=(e.type==='boss'?info?.bossId===e.boss:info?.encounterId===e.encounter);if(!expected)return;
  window.G5Engine?.clear?.();
  if(info.won){p.failed=false;p.pendingPost=null;p.rewardPending=e.id;}else{p.failed=true;p.pendingPost=null;p.rewardPending=null;}
  save(p);window.zeigeSeite?.('story');setTimeout(()=>info.won?showReward(e):showEvent(e,'intro'),40);
}

let builderWorking=null;
function fixedDeckSummaryHtml(){
  const s=starterDeck().karten;
  const names=a=>a.map(x=>esc(cardByImage(x)?.name||x)).join(' · ');
  return `<div class="story-builder-fixed"><strong>Fester Teil des Storydecks</strong><p><b>Zuflucht:</b> ${names(s.zuflucht)}</p><p><b>Bezwingerinnen:</b> ${names(s.bezwingerinnen)}</p><p><b>Entwicklung:</b> ${names(s.entwicklung)}</p></div>`;
}
function renderBuilder(){
  if(!builderWorking)return;const pool=storyPoolSet();
  const body=document.getElementById('storyDeckBuilderBody'),info=document.getElementById('storyDeckBuilderInfo');if(!body||!info)return;
  body.innerHTML=fixedDeckSummaryHtml();
  for(const area of ['astral','ruestkammer']){
    const unlocked=[...pool].map(cardByImage).filter(k=>k?.deck_bereich===area).sort((a,b)=>a.name.localeCompare(b.name,'de'));
    const selected=new Set(builderWorking[area]);
    const section=document.createElement('section');section.className='story-builder-section';
    section.innerHTML=`<div class="story-builder-section-head"><h3>${area==='astral'?'Astralkammer':'Rüstkammer'}</h3><span>${selected.size}/5 gewählt · ${unlocked.length} freigeschaltet</span></div>`;
    const grid=document.createElement('div');grid.className='story-builder-grid';
    for(const k of unlocked){
      const b=document.createElement('button');b.type='button';b.className='story-builder-card'+(selected.has(k.bild)?' selected':'');
      b.innerHTML=`<img src="${esc(k.bild)}" alt="${esc(k.name)}"><span>${esc(k.name)}</span>`;
      b.onclick=()=>{const a=builderWorking[area];const i=a.indexOf(k.bild);if(i>=0)a.splice(i,1);else if(a.length<5)a.push(k.bild);else{info.textContent='Es können genau 5 Karten gewählt werden. Entferne zuerst eine Karte.';info.classList.add('error-text');return;}renderBuilder();};
      grid.appendChild(b);
    }
    section.appendChild(grid);body.appendChild(section);
  }
  const okay=builderWorking.astral.length===5&&builderWorking.ruestkammer.length===5;
  info.textContent=okay?'Storydeck ist vollständig. Änderungen können gespeichert werden.':'Wähle genau 5 Astralkammer- und 5 Rüstkammerkarten.';info.classList.toggle('error-text',!okay);
  const saveBtn=document.getElementById('storyDeckBuilderSave');if(saveBtn)saveBtn.disabled=!okay;
}
function openDeckBuilder(){builderWorking=loadStoryDeckCards();renderBuilder();const m=document.getElementById('storyDeckBuilderModal');if(m)m.hidden=false;}
function closeDeckBuilder(){const m=document.getElementById('storyDeckBuilderModal');if(m)m.hidden=true;builderWorking=null;}
function resetBuilderToStarter(){builderWorking=cloneCards(starterDeck().karten);renderBuilder();}
function saveBuilder(){
  if(!builderWorking)return;const d={id:'story-menia-check',storyPlayerDeck:true,karten:cloneCards(builderWorking)};
  if(!window.G5Engine?.validDeck(d)){const info=document.getElementById('storyDeckBuilderInfo');if(info){info.textContent='Dieses Storydeck erfüllt die Deckregeln nicht.';info.classList.add('error-text');}return;}
  saveStoryDeckCards(builderWorking);closeDeckBuilder();render();
}
function chronicleHtml(p){
  const done=EVENTS.filter(e=>p.completed.includes(e.id));if(!done.length)return '<p class="story-empty">Noch keine abgeschlossenen Ereignisse. Menias Chronik füllt sich mit ihrer Reise.</p>';
  return `<h3>${esc(ACT1)}</h3>`+done.map((e,i)=>{const r=p.rewards?.[e.id]?cardByImage(p.rewards[e.id]):null;return `<article class="chronicle-entry"><div class="chronicle-number">${i+1}</div><div><h4>${esc(e.title)}</h4><p>${esc(e.post)}</p>${r?`<small class="chronicle-reward">Erhaltene Karte: ${esc(r.name)}</small>`:''}</div></article>`;}).join('');
}
function render(){
  const root=document.getElementById('storyNodes');if(!root)return;const p=load();root.innerHTML='';
  EVENTS.forEach((e,i)=>{if(i>p.index||(p.act1Finished&&i>=p.index))return;const b=document.createElement('button');b.type='button';b.className='story-node';b.style.left=`${e.x}%`;b.style.top=`${e.y}%`;b.setAttribute('aria-label',e.title);const complete=p.completed.includes(e.id);
    if(complete){b.classList.add('completed');b.disabled=true;b.innerHTML='<span>✓</span>';}
    else if(i===p.index&&!p.act1Finished){b.classList.add('current');b.innerHTML=`<span>${e.type==='boss'?'★':'!'}</span><small>${esc(e.title)}</small>`;b.onclick=()=>{if(p.rewardPending===e.id)showReward(e);else showEvent(e,p.pendingPost===e.id?'post':'intro');};}root.appendChild(b);});
  document.getElementById('storyActTitle').textContent=p.act1Finished?'Akt I abgeschlossen – Fortsetzung folgt':ACT1;
  document.getElementById('storyChronicleContent').innerHTML=chronicleHtml(p);
  const poolCount=document.getElementById('storyPoolCount');if(poolCount)poolCount.textContent=`Story-Kartenpool: ${storyPoolSet().size} Karten`;
  if(p.act1Finished){const done=document.createElement('div');done.className='story-act-complete';done.innerHTML='<strong>Akt I abgeschlossen</strong><span>Die Spur führt in die Astralwelt. Weitere Akte werden im nächsten Story-Ausbau freigeschaltet.</span>';root.appendChild(done);}
}
function open(){render();const p=load(),e=current(p);if(p.rewardPending===e.id)setTimeout(()=>showReward(e),60);}
function reset(){if(!confirm('Story-Testfortschritt wirklich zurücksetzen? Dabei werden auch alle gewonnenen Storykarten und Änderungen an Menias Storydeck entfernt.'))return;localStorage.removeItem(KEY);localStorage.removeItem(STORY_POOL_KEY);localStorage.removeItem(STORY_DECK_KEY);window.G5Engine?.clear?.();closeDialog();closeReward();closeDeckBuilder();render();}

document.getElementById('storyReset')?.addEventListener('click',reset);
document.getElementById('storyDeckBuilderOpen')?.addEventListener('click',openDeckBuilder);
document.getElementById('storyDialogClose')?.addEventListener('click',closeDialog);
document.querySelector('[data-story-close]')?.addEventListener('click',closeDialog);
document.getElementById('storyRewardClose')?.addEventListener('click',closeReward);
document.getElementById('storyDeckBuilderClose')?.addEventListener('click',closeDeckBuilder);
document.querySelector('[data-story-builder-close]')?.addEventListener('click',closeDeckBuilder);
document.getElementById('storyDeckBuilderSave')?.addEventListener('click',saveBuilder);
document.getElementById('storyDeckBuilderStarter')?.addEventListener('click',resetBuilderToStarter);
window.G5StoryMode={open,render,battleFinished,playerDeck,starterDeck,storyPoolSet,rewardChoices,loadStoryDeckCards,saveStoryDeckCards,openDeckBuilder,reset,events:()=>structuredClone(EVENTS)};
})();
