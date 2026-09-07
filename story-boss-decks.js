(function(){
'use strict';
const DB=()=>window.GODDESSES_DB?.karten||[];
function card(name, area, occurrence=0){
  const hits=DB().filter(k=>k.name===name && (!area||k.deck_bereich===area));
  if(!hits[occurrence]) throw new Error(`Story-Bossdeck: Karte fehlt: ${name} (${area||'alle'})`);
  return hits[occurrence].bild;
}
function deck(id, act, boss, refuge, bez, astral, armor, dev, opts={}){
  return {id:`story-${id}`,storyBossId:id,storyAct:act,storyBoss:true,name:`Storyboss · ${boss}`,
    boss,exception:opts.exception||null,karten:{
      zuflucht:[card(refuge,'zuflucht')],
      bezwingerinnen:bez.map(n=>card(n,'bezwingerinnen')),
      astral:astral.map(n=>card(n,'astral')),
      ruestkammer:armor.map(n=>card(n,'ruestkammer')),
      entwicklung:dev.map(n=>card(n,'entwicklung'))
    }};
}
function build(){
 const D={};
 D.act1_queen=deck('act1_queen',1,'Q.U.E.E.N.','Wiederbelebungsapparatur',
  ['Q.U.E.E.N.','Z.E.R.O. ATK','Z.E.R.O. ASTRAL'],
  ['Kontrollierte Überlastung','Energieschildsynchronisation','Wiederbelebungsapparatur Virus','Überlegene Kriegsführung','Aufopferung der S.H.I.E.L.D.'],
  ['Der Torwächter T.I.T.A.N.','Die strahlende Krone Gloria','Glorreicher Helm Victores','Erhabene Lanze Invictus','Ehris Ohrringe der Zwietracht'],
  ['Wiederbelebungsapparatur','Q.U.E.E.N.','Das strahlende Schloss Kaizer','Die glorreiche Eroberin Martha Kaizer','Sanctum Lysandor']);
 D.act2_strikelyn=deck('act2_strikelyn',2,'Strikelyn','Sanctum Lysandor',
  ['Die brillante Magistratin Strikelyn','Lebende Waffenbändigerin Keyla Dorn','Die ungezähmte Flamme Saphira'],
  ['Siegel der Kampfschwäche','Siegel der Astralschwäche','Wunderunterdrückung','Zeitsprung','Meteorsturm'],
  ['Kristallharnisch','Mantel der Stille Dunkelglanz','Fragmentfresser Schlund','Lebensfresserschild Hunger','Wunderumwandlungsapparatur'],
  ['Sanctum Lysandor','Lebende Waffenbändigerin Keyla Dorn','Die ungezähmte Flamme Saphira','Zauberkessel Sternenwacht','Die Spitze der Herrschaft Khar Zirah']);
 D.act3_skorpia=deck('act3_skorpia',3,'Skorpia Masako','Die Spitze der Herrschaft Khar Zirah',
  ['Stahlherz des Clans Skorpia Masako','Rebellin der Leere Trix Sigma','Die Weltenwanderin Serinith Solthar'],
  ['Überwachungssektor','Portalgeschoss','System Reset','Tauschportal','Nebel'],
  ['Chikaras Stahlherz','Portalflügler Skyflux','Schattengleiter der Leere MANTA','Überwachungseinheit KRAKEN','Astrana-Suit'],
  ['Die Spitze der Herrschaft Khar Zirah','Rebellin der Leere Trix Sigma','Pharaonin der Zeit Thal Ziris','Bastion Fernstille','Die Säule des Lebens Talisia']);
 D.act3_nemesis=deck('act3_nemesis',3,'Nemesis','Infernalia Unterweltportal',
  ['Geißel der Galaxie Nemesis','Geißel der Galaxie Nemesis','Geißel der Galaxie Nemesis'],
  ['Mornak - Brut','Mornak - Brut','Exonova','Strahl des Vergessens','System Reset'],
  ['Flüstern der Brut','Flüstern der Brut','Voidpiercer & Lifebreaker','Schattengleiter der Leere MANTA','Portalbazooka SMASHR'],
  ['Infernalia Unterweltportal','Die grausame Usurpatorin Baronesse Effrayer','Mausoleum der Rachsucht','Die oberste Heilpriesterin Lilou Guerir','Pharaonin der Zeit Thal Ziris'],
  {exception:'nemesis_swarm'});
 D.act4_thal=deck('act4_thal',4,'Thal Ziris','Die Spitze der Herrschaft Khar Zirah',
  ['Pharaonin der Zeit Thal Ziris','Rebellin der Leere Trix Sigma','Die Weltenwanderin Serinith Solthar'],
  ['Zeitsprung','Zeitlose Unterwerfung','Strahl des Vergessens','Tauschportal','Portalgeschoss'],
  ['Stab der Ewigen Ströme Chronarion','Chronokrypta','Schattengleiter der Leere MANTA','Voidpiercer & Lifebreaker','Portalflügler Skyflux'],
  ['Die Spitze der Herrschaft Khar Zirah','Pharaonin der Zeit Thal Ziris','Rebellin der Leere Trix Sigma','Sanctum Lysandor','Q.U.E.E.N.']);
 D.act5_baronesse=deck('act5_baronesse',5,'Baronesse Effrayer','Mausoleum der Rachsucht',
  ['Die grausame Usurpatorin Baronesse Effrayer','Die Bestie Alice Merveilleux','Die oberste Heilpriesterin Lilou Guerir'],
  ['Vengeresse Vergeltung','Lähmende Angst','Vollendete Tötungstechnik','Parade, Riposte!','Begnadete Reflexe'],
  ['Legionshelm','Leichte Robe','Die Bastion bringt Dir Erleuchtung','Die Abenddämmerung Hyhde','Die Morgenröte Jakyl'],
  ['Mausoleum der Rachsucht','Die grausame Usurpatorin Baronesse Effrayer','Die oberste Heilpriesterin Lilou Guerir','Infernalia Unterweltportal','Rebellin der Leere Trix Sigma']);
 return D;
}
let cache=null;
function all(){return cache||(cache=build())}
function get(id){const d=all()[id];return d?structuredClone(d):null}
function forAct(act){return Object.values(all()).filter(d=>d.storyAct===Number(act)).map(d=>structuredClone(d))}
window.G5STORY_BOSS_DECKS={get,all:()=>structuredClone(all()),forAct,ids:()=>Object.keys(all())};
})();
