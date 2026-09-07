const fs=require('fs'),vm=require('vm');
global.window=global; global.document={getElementById(){return null},querySelector(){return null}}; global.localStorage={getItem(){return null},setItem(){},removeItem(){}};
vm.runInThisContext(fs.readFileSync(__dirname+'/5goddesses-datenbank.js','utf8'));
vm.runInThisContext(fs.readFileSync(__dirname+'/game-engine.js','utf8'));
// story-mode touches DOM only when open/render are called, so loading is safe.
vm.runInThisContext(fs.readFileSync(__dirname+'/story-mode.js','utf8'));
let pass=0; function ok(v,m){if(!v)throw new Error(m); pass++; console.log('PASS',m)}
const d=G5StoryMode.playerDeck();
ok(G5Engine.validDeck(d),'Starterdeck ist nach normalen Deckregeln gültig');
const names=a=>a.map(b=>GODDESSES_DB.karten.find(c=>c.bild===b)?.name);
ok(JSON.stringify(names(d.karten.zuflucht))===JSON.stringify(['Das strahlende Schloss Kaizer']),'Zuflucht stimmt');
ok(JSON.stringify(names(d.karten.bezwingerinnen))===JSON.stringify(['Die glorreiche Eroberin Martha Kaizer','Die Schöpferin Cassandra','Der unsichtbare Untergang Menia']),'Bezwingerinnen stimmen');
ok(JSON.stringify(names(d.karten.astral))===JSON.stringify(['Aufstieg','Zweifache Bestrafung','Bis zum bitteren Ende','Rabe der Hoffnung Kiki','Vollendete Tötungstechnik']),'Astralkammer stimmt');
ok(JSON.stringify(names(d.karten.ruestkammer))===JSON.stringify(['Die Abenddämmerung Hyhde','Die Morgenröte Jakyl','Parierdolch','Die strahlende Krone Gloria','Ubusa Brustpanzer']),'Rüstkammer stimmt');
ok(JSON.stringify(names(d.karten.entwicklung))===JSON.stringify(['Das strahlende Schloss Kaizer','Die glorreiche Eroberin Martha Kaizer','Bastion Fernstille','Glut des Morgens','Sanctum Lysandor']),'Entwicklungskarten stimmen');
const st=G5Engine.startGame(d,d,1); ok(!!st && st.players?.length===2,'Starterdeck kann ein Gefecht starten');
console.log(`${pass} PASS / 0 FAIL`);
