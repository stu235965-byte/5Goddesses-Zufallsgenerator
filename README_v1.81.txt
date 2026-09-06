5Goddesses PWA v1.81

v1.81 schließt die beiden letzten bewusst gesperrten Karten-TODOs ab.

Neu / korrigiert:
- Die brillante Magistratin Strikelyn vollständig implementiert.
  - 1 Ladung: Schutz einer eigenen Bezwingerin vor gegnerischen ASTRAL-Sprüchen und Gegenstandskarten bis zum Beginn der nächsten eigenen Versorgungsphase.
  - 2 Ladungen: zusätzlich Schutz vor gegnerischen Zwischenwelt-Geboten.
  - maximal eine Aktivierung pro eigener Kampfrunde.
- Mantel der Stille Dunkelglanz vollständig implementiert.
  - permanenter Zielschutz der ausgerüsteten Bezwingerin vor gegnerischen ASTRAL-Sprüchen und Gegenstandskarten.
  - Gebote und nicht zielende Flächeneffekte bleiben unberührt.
- Zentrale, quellenbasierte Zielschutzprüfung für ASTRAL-Sprüche, Gegenstände und Gebote.
- Strikelyn und Mantel der Stille Dunkelglanz im Deckbuilder und Zufallsgenerator freigeschaltet.
- Exekution: Gibt es kein gültiges legales Ziel, wird sie ohne Effekt abgelegt.

Tests:
- 124 PASS / 0 FAIL über den vollständigen vorhandenen Testbestand.
- node --check game-engine.js: PASS
- node --check battlefield.js: PASS
- node --check deckbuilder.js: PASS
- node --check generator.js: PASS
- Datenbank weiterhin 158 Karten; 49 Astralkammerkarten.

Version: v1.81
Service-Worker-Cache: v92
Battlefield-Build: 1.81
