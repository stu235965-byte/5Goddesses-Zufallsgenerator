5Goddesses PWA v1.75

Aktueller Stand

Die PWA enthält den Zufallsgenerator/Deckbuilder und ein spielbares 2-Spieler-Hotseat-Gefecht mit Phasen, Angriffen, Ausrüstung, Entwicklungen, Ehre, Wundern, Einsatzverzögerung und bereits implementierten Karten-/Instinkt-Effekten.

Datenbank:
- 158 Karten insgesamt
- 10 Zufluchten
- 30 Bezwingerinnen
- 49 Astralkammerkarten
- 50 Rüstkammerkarten
- 19 Entwicklungskarten

Astralkammer-Audit:
- 21 Karten bis einschließlich v1.74 programmiert
- 28 Karten noch offen
- Mornak - Brut besitzt bereits ältere Engine-Logik und zählt nicht zu diesen 21

Bewusst zurückgestellt:
- Strikelyn
- Mantel der Stille Dunkelglanz
Grund: Beide benötigen die noch fehlende allgemeine ASTRAL-Spruch/Gegenstand-Zielmechanik.

Wichtige feste Regeln der Implementierung:
- Jeder Spieler besitzt ein eigenes Primärfeld.
- Es gibt genau ein gemeinsames Sekundärfeld (state.sharedSecondary).
- Karten mit vorhandenem Herzattribut besitzen Einsatzverzögerung, auch bei Herzen = 0.
- Instinkt wird niemals aus dem Kartenbild abgeleitet, sondern nur nach ausdrücklicher Bestätigung gesetzt.
- SkyFlux verschiebt eine eigene Bezwingerin auf den anderen freien Bezwingerinnen-Slot; Ausrüstung wandert mit; danach +1 Ehre. Kein ASTRAL-Schild.

v1.75 ist ein reines Konsistenz-/Pflegerelease ohne Änderung der Spielregeln.

Sichtbare Version: v1.75
Service Worker Cache: 5goddesses-pwa-v86
