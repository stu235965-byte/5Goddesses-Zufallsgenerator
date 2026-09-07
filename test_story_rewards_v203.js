const fs=require('fs'),vm=require('vm');
const store=new Map();
global.window=global;
global.structuredClone=global.structuredClone;
global.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
global.document={getElementById(){return null},querySelector(){return null}};
for(const f of ['5goddesses-datenbank.js','story-encounter-decks.js','story-boss-decks.js','game-engine.js','story-mode.js'])vm.runInThisContext(fs.readFileSync(__dirname+'/'+f,'utf8'),{filename:f});
let pass=0,fail=0;const t=(n,v)=>{console.log((v?'PASS ':'FAIL ')+n);v?pass++:fail++;};
const S=G5StoryMode,E=G5Engine,DB=GODDESSES_DB.karten;
const starter=S.starterDeck();
t('Starterdeck gültig',E.validDeck(starter));
t('Story-Kartenpool startet mit exakt 19 Starterkarten',S.storyPoolSet().size===19);
const e=S.events().find(x=>x.id==='act1_martha');
const rewards=S.rewardChoices(e);
t('Martha-Sieg bietet mindestens eine neue Belohnung',rewards.length>0);
t('Belohnungen stammen nur aus Astralkammer/Rüstkammer',rewards.every(b=>['astral','ruestkammer'].includes(DB.find(k=>k.bild===b)?.deck_bereich)));
const enemy=G5STORY_ENCOUNTER_DECKS.get('act1_martha');
t('Belohnungen stammen aus dem besiegten Deck',rewards.every(b=>enemy.karten.astral.includes(b)||enemy.karten.ruestkammer.includes(b)));
const reward=rewards[0],card=DB.find(k=>k.bild===reward);const pool=S.storyPoolSet();pool.add(reward);localStorage.setItem('5goddesses_story_pool_v1',JSON.stringify([...pool]));
t('Gewonnene Karte wird dem Story-Kartenpool hinzugefügt',S.storyPoolSet().has(reward)&&S.storyPoolSet().size===20);
const k=S.loadStoryDeckCards();const area=card.deck_bereich;k[area][0]=reward;S.saveStoryDeckCards(k);const custom=S.playerDeck();
t('Gewonnene Karte kann in Menias Storydeck eingesetzt werden',custom.karten[area].includes(reward));
t('Angepasstes Storydeck bleibt nach normalen Regeln gültig',E.validDeck(custom));
// Eine nicht freigeschaltete Karte darf nicht aus gespeichertem Deck übernommen werden.
const locked=DB.find(x=>x.deck_bereich==='astral'&&!S.storyPoolSet().has(x.bild));
if(locked){const bad=S.loadStoryDeckCards();bad.astral[0]=locked.bild;localStorage.setItem('5goddesses_story_deck_v1',JSON.stringify(bad));const safe=S.playerDeck();t('Nicht freigeschaltete Karten werden nicht ins Storydeck übernommen',!safe.karten.astral.includes(locked.bild));}
else t('Nicht freigeschaltete Karten werden nicht ins Storydeck übernommen',true);
console.log(`${pass} PASS / ${fail} FAIL`);if(fail)process.exit(1);
