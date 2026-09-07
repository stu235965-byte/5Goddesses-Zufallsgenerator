const fs=require('fs'),vm=require('vm');
const files=['5goddesses-datenbank.js','story-boss-decks.js','story-encounter-decks.js','game-engine.js'];
const store=new Map();
const ctx={window:{},structuredClone:global.structuredClone,console,localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}};
vm.createContext(ctx); for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const E=ctx.window.G5Engine,B=ctx.window.G5STORY_BOSS_DECKS,I=ctx.window.G5STORY_ENCOUNTER_DECKS,db=ctx.window.GODDESSES_DB.karten;
let pass=0,fail=0; function t(n,ok){console.log((ok?'PASS ':'FAIL ')+n);ok?pass++:fail++;}
const p=I.get('act1_zahira'); const menia=db.find(c=>c.name==='Der unsichtbare Untergang Menia'&&c.deck_bereich==='bezwingerinnen'); p.karten.bezwingerinnen[0]=menia.bild;
t('Menias Storydeck gültig',E.validDeck(p));
for(const id of I.ids()){const d=I.get(id);t(`${id}: Engine validDeck`,E.validDeck(d));try{const s=E.startGame(p,d,0);t(`${id}: startGame`,!!s&&s.players?.length===2)}catch(e){t(`${id}: startGame`,false)}}
for(const id of B.ids()){const d=B.get(id);t(`${id}: Boss validDeck`,E.validDeck(d));try{const s=E.startGame(p,d,0);t(`${id}: Boss startGame`,!!s&&s.players?.length===2)}catch(e){t(`${id}: Boss startGame`,false)}}
const story=fs.readFileSync('story-mode.js','utf8'),bf=fs.readFileSync('battlefield.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8');
t('Storykampf nutzt scheduleAI',bf.includes('scheduleAI(); return state;')&&!bf.includes('scheduleAITurn'));
t('Sieg-Callback an Storymode verdrahtet',bf.includes('window.G5StoryMode?.battleFinished?.({won,encounterId:state.storyEncounterId||null,bossId:state.storyBossId||null'));
t('Akt-I-Fortschritt aktiviert nächsten Index',story.includes('if(p.index<EVENTS.length-1)p.index++'));
t('Abgeschlossene Knoten deaktiviert',story.includes("b.classList.add('completed');b.disabled=true"));
t('Zukünftige Knoten verborgen',story.includes('if(i>p.index'));
t('Q.U.E.E.N.-Boss-Knoten verdrahtet',story.includes("boss:'act1_queen'"));
t('Story-Assets im Service Worker',sw.includes('./story-mode.js')&&sw.includes('./story-encounter-decks.js')&&sw.includes('./story-weltkarte.png')&&sw.includes('v113'));
console.log(`TOTAL ${pass} PASS / ${fail} FAIL`); if(fail)process.exit(1);
