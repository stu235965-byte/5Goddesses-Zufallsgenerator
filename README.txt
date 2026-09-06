5Goddesses PWA v1.76

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
- 22 Karten bis einschließlich v1.76 programmiert
- 27 Karten noch offen
- Mornak - Brut besitzt bereits ältere Engine-Logik, wurde in v1.76 vollständig auf den Originalkartentext korrigiert und zählt weiterhin nicht zu den 22 Karten des aktuellen Astralkammer-Audits.

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

v1.76:
- Überwachungssektor vollständig implementiert. Die gegnerischen verdeckt gesetzten AZR-Karten werden sichtbar dargestellt, behalten intern jedoch faceDown=true und damit sämtliche Regeln verdeckt gesetzter Karten. Der Effekt gilt automatisch auch für später gesetzte Karten und endet, sobald Überwachungssektor nicht mehr aktiv im gemeinsamen Sekundärbereich liegt.
- Mornak - Brut korrigiert: offen spielbar in PRIMÄR, SEKUNDÄR oder einem freien eigenen Bezwingerinnen-Bereich; nicht offen in der eigenen AZR. Verdecktes Setzen in die AZR bleibt nach den Grundregeln möglich, beim Aktivieren muss Mornak anschließend in einen legalen Bereich verschoben werden.
- Mornak-Brut-Tokens verwenden dieselben legalen eigenen Bereiche und besitzen wegen ihres Herzattributes Einsatzverzögerung. Spezielle Fremd-AZR-Platzierung durch Flüstern der Brut bleibt als ausdrückliche Quellkarten-Ausnahme erhalten.
- Mornak-Brut im Bezwingerinnen-Bereich kann weiterhin Schaden für Nemesis übernehmen; bei Zerstörung wird der Slot korrekt freigegeben. Ausrüstung kann nicht an Mornak-Brut angelegt werden, da sie keine Bezwingerin ist.

Sichtbare Version: v1.76
Service Worker Cache: 5goddesses-pwa-v87
