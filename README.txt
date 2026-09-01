5Goddesses – Gemeinsames Datenmodell
Schema-Version: 1

Gesamtzahl Karten: 158

Verteilung:
- Zuflucht: 10
- Bezwingerinnen: 30
- Astral: 49
- Rüstkammer: 50
- Entwicklung: 19

Wichtig:
- Alle Kartengruppen verwenden jetzt exakt dieselben Schlüsselfelder.
- Nicht relevante/nicht vorhandene Einzelwerte stehen als null.
- Ein tatsächlicher Kartenwert 0 bleibt 0.
- Entwicklungskarten sind über entwicklungskarte=true markiert.
- Wenn möglich, verweist grundkarte_bild auf die gleichnamige Stufe-1-Karte.
- effekte und tags sind bereits als leere Felder vorbereitet, damit wir später
  Kartentexte und NPC-Logik ergänzen können, ohne das Schema erneut umzubauen.

Dateien:
- 5goddesses-datenbank.json : empfohlene zentrale Datenbank inkl. Indizes/Deckregeln
- karten_daten.json          : nur die Kartenliste
- 5goddesses-datenbank.js   : direkt im Browser/PWA einbindbar
- karten_daten.csv           : Kontrolltabelle
- datenmodell_schema.json    : Erklärung aller Felder

Validierung:
- Doppelte IDs: 0
- Karten ohne Namen: 0
