(function(){
'use strict';
const DB=()=>window.GODDESSES_DB?.karten||[];
function card(name,area,occurrence=0){const h=DB().filter(k=>k.name===name&&(!area||k.deck_bereich===area));if(!h[occurrence])throw new Error(`Story-Zwischengegner: Karte fehlt: ${name} (${area||'alle'})`);return h[occurrence].bild;}
function deck(id,act,order,title,leader,refuge,bez,astral,armor,dev){return {id:`story-${id}`,storyEncounterId:id,storyAct:act,storyOrder:order,storyEncounter:true,storyBoss:false,name:`Story · ${title}`,title,leader,karten:{zuflucht:[card(refuge,'zuflucht')],bezwingerinnen:bez.map(n=>card(n,'bezwingerinnen')),astral:astral.map(n=>card(n,'astral')),ruestkammer:armor.map(n=>card(n,'ruestkammer')),entwicklung:dev.map(n=>card(n,'entwicklung'))}};}
const DEV={
 ober:['Das strahlende Schloss Kaizer','Die glorreiche Eroberin Martha Kaizer','Wiederbelebungsapparatur','Q.U.E.E.N.','Sanctum Lysandor'],
 astral:['Zauberkessel Sternenwacht','Die ungezähmte Flamme Saphira','Sanctum Lysandor','Lebende Waffenbändigerin Keyla Dorn','Die Säule des Lebens Talisia'],
 mittel:['Glut des Morgens',"Die Unbeugsame Heldin Jeanne d'Arque",'Bastion Fernstille','Die Säule des Lebens Talisia','Die glorreiche Eroberin Martha Kaizer'],
 zwischen:['Rebellin der Leere Trix Sigma','Die Spitze der Herrschaft Khar Zirah','Bastion Fernstille','Die Säule des Lebens Talisia','Sanctum Lysandor'],
 unter:['Infernalia Unterweltportal','Mausoleum der Rachsucht','Die oberste Heilpriesterin Lilou Guerir','Rebellin der Leere Trix Sigma','Sanctum Lysandor']
};
const A={
 ober:['Aufopferung der S.H.I.E.L.D.','Überlegene Kriegsführung','Kontrollierte Überlastung','Rabe der Hoffnung Kiki','Energieschildsynchronisation'],
 astral:['Meteorsturm','Siegel der Kampfschwäche','Siegel der Astralschwäche','Wunderunterdrückung','Wurzelpeinverschlinger'],
 mittel:['Unerwarteter Reichtum','Beschützt die Bastion!','Neutralisationssiegel','Dein Angriff scheitert!','Geheimtechnik Sprint-Angriff'],
 portal:['System Reset','Portalgeschoss','Tauschportal','Nebel','Überwachungssektor'],
 leere:['Strahl des Vergessens','Exonova','Portalgeschoss','Tauschportal','Nebel'],
 unter:['Lähmende Angst','Vengeresse Vergeltung','Parade, Riposte!','Begnadete Reflexe','Vollendete Tötungstechnik']
};
const R={
 ober:['Die strahlende Krone Gloria','Glorreicher Helm Victores','Erhabene Lanze Invictus','Der Torwächter T.I.T.A.N.','Ehris Ohrringe der Zwietracht'],
 astral:['Schattenfluchkralle','Kristallharnisch','Mantel der Stille Dunkelglanz','Fragmentfresser Schlund','Lebensfresserschild Hunger'],
 frag:['Astralfragment der Ehre','Astralfragment des Lebens','Astralfragment der physischen Abwehr','Astralfragment der Astralabwehr','Fragmentfresser Schlund'],
 mittel:['Legionsschild','Parierdolch','Lähmendes Nervengift','Trank der Stärke','Legionsbrustpanzer'],
 zwischen:['Voidpiercer & Lifebreaker','Portalflügler Skyflux','Chikaras Stahlherz','Schattengleiter der Leere MANTA','Überwachungseinheit KRAKEN'],
 unter:['Die Bastion bringt Dir Erleuchtung','Legionshelm','Leichte Robe','Die Abenddämmerung Hyhde','Die Morgenröte Jakyl']
};
function build(){const D={};
// AKT 1 – Die Fanfaren der Göttinnen
D.act1_martha=deck('act1_martha',1,1,'Auftrag von Haus Imperia','Martha Kaizer','Das strahlende Schloss Kaizer',['Die glorreiche Eroberin Martha Kaizer','Die Schöpferin Cassandra','S.H.I.E.L.D.'],A.ober,R.ober,DEV.ober);
D.act1_zahira=deck('act1_zahira',1,2,'Die unsichtbare Beobachterin','Zahira Semiramis','Das strahlende Schloss Kaizer',['Das Gift von Babylon Zahira Semiramis','Die glorreiche Eroberin Martha Kaizer','Die Schöpferin Cassandra'],['Exekution','Zweifache Bestrafung','Überlegene Kriegsführung','Bis zum bitteren Ende','Rabe der Hoffnung Kiki'],R.ober,DEV.ober);
D.act1_sperrbezirk=deck('act1_sperrbezirk',1,3,'Sperrbezirk','Z.E.R.O. P.O.L.I.C.E.','Wiederbelebungsapparatur',['Z.E.R.O. P.O.L.I.C.E.','Z.E.R.O. ASTRAL','S.H.I.E.L.D.'],['Kontrollierte Überlastung','Energieschildsynchronisation','Wiederbelebungsapparatur Virus','Aufopferung der S.H.I.E.L.D.','Überlegene Kriegsführung'],['Energieschild','Überladung','Die zerstörte Q.U.E.E.N.','Der Torwächter T.I.T.A.N.','Glorreicher Helm Victores'],DEV.ober);
D.act1_waechter=deck('act1_waechter',1,4,'Die Wächter des Kerns','Z.E.R.O. ASTRAL','Wiederbelebungsapparatur',['Z.E.R.O. ASTRAL','Z.E.R.O. ATK','D.E.A.T.H.'],['Kontrollierte Überlastung','Energieschildsynchronisation','Wiederbelebungsapparatur Virus','Exekution','Zweifache Bestrafung'],['Energieschild','Überladung','Die zerstörte Q.U.E.E.N.','Erhabene Lanze Invictus','Die Abenddämmerung Hyhde'],DEV.ober);
// AKT 2 – Fragmente einer vergangenen Welt
D.act2_saphira=deck('act2_saphira',2,1,'Die ungezähmte Flamme','Saphira','Zauberkessel Sternenwacht',['Die ungezähmte Flamme Saphira','Wurzelpein Gebieterin Psilo Cybe','Lebende Waffenbändigerin Keyla Dorn'],['Meteorsturm','Saphiras Upsi','Verwüstung','Wurzelpeinverschlinger','Siegel der Kampfschwäche'],R.astral,DEV.astral);
D.act2_psilo=deck('act2_psilo',2,2,'Wurzelpein','Psilo Cybe','Zauberkessel Sternenwacht',['Wurzelpein Gebieterin Psilo Cybe','Die Ewige Evelyn','Lebende Waffenbändigerin Keyla Dorn'],['Verwüstung','Wurzelpeinverschlinger','Meteorsturm','Siegel der Astralschwäche','Wunderunterdrückung'],['Fragmentfresser Schlund','Lebensfresserschild Hunger','Astralfragment des Lebens','Kristallharnisch','Mantel der Stille Dunkelglanz'],DEV.astral);
D.act2_keyla=deck('act2_keyla',2,3,'Die Fragmentjägerin','Keyla Dorn','Sanctum Lysandor',['Lebende Waffenbändigerin Keyla Dorn','Die ungezähmte Flamme Saphira','Die Ewige Evelyn'],['Meteorsturm','Siegel der Kampfschwäche','Zeitsprung','Siegel der Astralschwäche','Wunderunterdrückung'],R.frag,DEV.astral);
D.act2_evelyn=deck('act2_evelyn',2,4,'Der Schattenfluch','Evelyn','Sanctum Lysandor',['Die Ewige Evelyn','Die ungezähmte Flamme Saphira','Wurzelpein Gebieterin Psilo Cybe'],['Meteorsturm','Ehrenlos','Zeitsprung','Wunderunterdrückung','Verwüstung'],['Schattenfluchkralle','Kristallharnisch','Mantel der Stille Dunkelglanz','Lebensfresserschild Hunger','Astralfragment des Lebens'],DEV.astral);
// AKT 3 – Blutlinien durch die Zeit
D.act3_jeanne=deck('act3_jeanne',3,1,'Glut des Morgens',"Jeanne d'Arque",'Glut des Morgens',["Die Unbeugsame Heldin Jeanne d'Arque",'Die Säule des Lebens Talisia','Die Quelle der Reinheit Amelia'],A.mittel,R.mittel,DEV.mittel);
D.act3_calypso=deck('act3_calypso',3,2,'Die Freibeuterin','Calypso','Bastion Fernstille',['Die verschlingende Flut Calypso','Die Säule des Lebens Talisia','Der schneidende Wind Mira Masako'],['Unerwarteter Reichtum','Demoralisierung','Neutralisationssiegel','Geheimtechnik Sprint-Angriff','Aufstieg'],['Parierdolch','Lähmendes Nervengift','Trank der Stärke','Hut der Weisheit','Dorfschmiedin Ruth die Eiserne'],DEV.mittel);
D.act3_mira=deck('act3_mira',3,3,'Chikara','Mira Masako','Bastion Fernstille',['Der schneidende Wind Mira Masako',"Die Unbeugsame Heldin Jeanne d'Arque",'Die Quelle der Reinheit Amelia'],['Beschützt die Bastion!','Auszeichnung','Neutralisationssiegel','Bastion-Schutzbarriere','Geheimtechnik Sprint-Angriff'],['Chikaras Stahlherz','Legionsschild','Legionsbrustpanzer','Trank der Stärke','Steinschwert'],DEV.mittel);
D.act3_zukunft=deck('act3_zukunft',3,4,'Fremde in der Zukunft','Trix Sigma','Die Spitze der Herrschaft Khar Zirah',['Rebellin der Leere Trix Sigma','Die Weltenwanderin Serinith Solthar','Die unendliche Versuchung Lilith'],A.portal,R.zwischen,DEV.zwischen);
D.act3_bruet=deck('act3_bruet',3,5,'Flüstern der Brut','Trix Sigma','Die Spitze der Herrschaft Khar Zirah',['Rebellin der Leere Trix Sigma','Die Weltenwanderin Serinith Solthar','Die unendliche Versuchung Lilith'],['Mornak - Brut','Exonova','Strahl des Vergessens','Nebel','Portalgeschoss'],['Flüstern der Brut','Voidpiercer & Lifebreaker','Schattengleiter der Leere MANTA','Portalbazooka SMASHR','Astrana-Suit'],DEV.zwischen);
// AKT 4 – Die Leere
D.act4_serinith=deck('act4_serinith',4,1,'Die Weltenwanderin','Serinith Solthar','Die Spitze der Herrschaft Khar Zirah',['Die Weltenwanderin Serinith Solthar','Rebellin der Leere Trix Sigma','Die unendliche Versuchung Lilith'],A.portal,R.zwischen,DEV.zwischen);
D.act4_trix=deck('act4_trix',4,2,'Rebellin der Leere','Trix Sigma','Die Spitze der Herrschaft Khar Zirah',['Rebellin der Leere Trix Sigma','Die Weltenwanderin Serinith Solthar','Die unendliche Versuchung Lilith'],A.leere,['Voidpiercer & Lifebreaker','Schattengleiter der Leere MANTA','Portalflügler Skyflux','Chronokrypta','Astrana-Suit'],DEV.zwischen);
D.act4_lilith=deck('act4_lilith',4,3,'Das unmögliche Erbe','Lilith','Infernalia Unterweltportal',['Die unendliche Versuchung Lilith','Die Weltenwanderin Serinith Solthar','Rebellin der Leere Trix Sigma'],['Geheimtechnik Sprint-Angriff','Abstieg','Nebel','Strahl des Vergessens','Zeitlose Unterwerfung'],['Chikaras Stahlherz','Voidpiercer & Lifebreaker','Legionshelm','Leichte Robe','Chronokrypta'],DEV.unter);
D.act4_sekh=deck('act4_sekh',4,4,"Sekh'Nehet",'D.E.A.T.H.','Infernalia Unterweltportal',['D.E.A.T.H.','Z.E.R.O. ASTRAL','Die unendliche Versuchung Lilith'],A.leere,['Voidpiercer & Lifebreaker','Schattengleiter der Leere MANTA','Chronokrypta','Gedankenschleier Psythra','Instabiler Stab'],DEV.zwischen);
// AKT 5 – Die Rache der Göttinnen
D.act5_arcadia=deck('act5_arcadia',5,1,'Die stille Zerstörung','Arcadia','Infernalia Unterweltportal',['Die stille Zerstörung Arcadia','Die Bestie Alice Merveilleux','Die oberste Heilpriesterin Lilou Guerir'],A.unter,R.unter,DEV.unter);
D.act5_lilou=deck('act5_lilou',5,2,'Die oberste Heilpriesterin','Lilou Guerir','Mausoleum der Rachsucht',['Die oberste Heilpriesterin Lilou Guerir','Die Bestie Alice Merveilleux','Die unendliche Versuchung Lilith'],['Lilou\'s Gabe','Vengeresse Vergeltung','Lähmende Angst','Begnadete Reflexe','Parade, Riposte!'],R.unter,DEV.unter);
D.act5_alice=deck('act5_alice',5,3,'Alice','Alice Merveilleux','Mausoleum der Rachsucht',['Die Bestie Alice Merveilleux','Die oberste Heilpriesterin Lilou Guerir','Die stille Zerstörung Arcadia'],['Vollendete Tötungstechnik','Begnadete Reflexe','Vengeresse Vergeltung','Lähmende Angst','Sofortige Zerstörung'],['Die Abenddämmerung Hyhde','Die Morgenröte Jakyl','Legionshelm','Leichte Robe','Parierdolch'],DEV.unter);
D.act5_rachsucht=deck('act5_rachsucht',5,4,'Rachsucht','Alice Merveilleux','Mausoleum der Rachsucht',['Die Bestie Alice Merveilleux','Die oberste Heilpriesterin Lilou Guerir','Die unendliche Versuchung Lilith'],A.unter,['Die Abenddämmerung Hyhde','Die Morgenröte Jakyl','Legionshelm','Leichte Robe','Die Bastion bringt Dir Erleuchtung'],DEV.unter);
return D;}
let cache=null;function all(){return cache||(cache=build())}function get(id){const d=all()[id];return d?structuredClone(d):null}function forAct(act){return Object.values(all()).filter(d=>d.storyAct===Number(act)).sort((a,b)=>a.storyOrder-b.storyOrder).map(d=>structuredClone(d));}function sequence(){return Object.values(all()).sort((a,b)=>a.storyAct-b.storyAct||a.storyOrder-b.storyOrder).map(d=>structuredClone(d));}
window.G5STORY_ENCOUNTER_DECKS={get,all:()=>structuredClone(all()),forAct,sequence,ids:()=>Object.keys(all())};
})();
