5Goddesses PWA v1.76 – Überwachungssektor + Mornak-Brut

Implementiert / korrigiert:

1. Überwachungssektor
- Permanenter Sekundär/Stadt-Effekt vollständig in Datenbank, Engine und UI umgesetzt.
- Alle verdeckt gesetzten Karten des gegenüberliegenden Spielers in der ASTRAL-/RÜSTKAMMER-Zone werden sichtbar dargestellt.
- Die Karten bleiben regeltechnisch gesetzt/ver­deckt: intern bleibt faceDown=true. Dadurch werden sie weder aktiviert noch verlieren sie Instinkt-/Setzregeln.
- Der Effekt greift automatisch auch bei Karten, die erst später gesetzt werden.
- Verlässt Überwachungssektor den gemeinsamen Sekundärbereich oder ist sein Effekt deaktiviert, werden diese Karten wieder regulär verdeckt dargestellt.

2. Mornak - Brut
- Originalkartentext korrigiert: alternative offene Platzierung ist SEKUNDÄR oder ein freier Bezwingerinnen-Bereich, nicht die eigene AZR.
- Offenes Ausspielen aus der Hand in PRIMÄR, SEKUNDÄR oder einen freien Bezwingerinnen-Bereich möglich.
- Verdecktes Setzen in die AZR bleibt nach Grundregel möglich; beim Aufdecken muss Mornak in PRIMÄR, SEKUNDÄR oder einen freien Bezwingerinnen-Bereich verschoben werden.
- Normale Mornak-Brut-Tokens erhalten dieselben eigenen Zielbereiche.
- Mornak-Brut-Tokens besitzen Einsatzverzögerung, da die Karte ein Herzattribut besitzt.
- Schadensumleitung für Geißel der Galaxie Nemesis funktioniert auch mit Mornak-Brut im Bezwingerinnen-Bereich; Überschussschaden läuft anschließend regulär auf Nemesis weiter.
- Eine durch Umleitung zerstörte Mornak-Brut gibt den Bezwingerinnen-Slot korrekt frei.
- Ausrüstung kann nicht an Mornak-Brut im Bezwingerinnen-Bereich angelegt werden, da Mornak keine Bezwingerin ist.
- Die ausdrückliche gegnerische AZR-Platzierung durch Flüstern der Brut bleibt als Sonderregel dieses Quelleneffekts bestehen.

Tests:
- 10 gezielte Funktionstests für beide Karten: 10 PASS / 0 FAIL.
- node --check game-engine.js: PASS
- node --check battlefield.js: PASS

Sichtbare Version: v1.76
Service Worker Cache: 5goddesses-pwa-v87
