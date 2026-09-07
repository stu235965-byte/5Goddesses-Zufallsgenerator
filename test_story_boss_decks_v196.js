const fs=require('fs'),vm=require('vm');
const ctx={window:{},structuredClone:global.structuredClone,console};vm.createContext(ctx);
for(const f of ['5goddesses-datenbank.js','story-boss-decks.js','game-engine.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const S=ctx.window.G5STORY_BOSS_DECKS,E=ctx.window.G5Engine;
let pass=0;function ok(x,m){if(!x)throw Error(m);pass++}
const ids=['act1_queen','act2_strikelyn','act3_skorpia','act3_nemesis','act4_thal','act5_baronesse'];
ok(JSON.stringify(S.ids())===JSON.stringify(ids),'boss ids');
for(const id of ids){const d=S.get(id);ok(E.validDeck(d),id+' valid');ok(d.karten.zuflucht.length===1&&d.karten.bezwingerinnen.length===3&&d.karten.astral.length===5&&d.karten.ruestkammer.length===5&&d.karten.entwicklung.length===5,id+' counts')}
const n=S.get('act3_nemesis'),db=ctx.window.GODDESSES_DB.karten,by=b=>db.find(k=>k.bild===b)?.name;
ok(n.karten.bezwingerinnen.every(b=>by(b)==='Geißel der Galaxie Nemesis'),'3x Nemesis');
ok(n.karten.astral.filter(b=>by(b)==='Mornak - Brut').length===2,'2x Mornak');
ok(n.karten.ruestkammer.filter(b=>by(b)==='Flüstern der Brut').length===2,'2x Fluestern');
ok(by(n.karten.zuflucht[0])==='Infernalia Unterweltportal','Infernalia');
console.log(`${pass} PASS / 0 FAIL`);
