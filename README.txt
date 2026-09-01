5Goddesses – Gefecht v1.16
RÜSTKAMMER / AUSRÜSTUNGS-GRUNDSYSTEM

Umgesetzt auf Basis des Regelwerks:

- Rüstkammer-Nebenattribute Waffe, Schild, Rüstung und Kopfschutz
  werden als Ausrüstung erkannt.
- Drag & Drop aus der Hand:
  Waffe -> nur Waffenfeld einer ausliegenden Bezwingerin
  Schild -> nur Schildfeld
  Rüstung -> nur Rüstungsfeld
  Kopfschutz -> nur Helmbereich
- Nur Ausrüstungsfelder von tatsächlich ausliegenden Bezwingerinnen
  sind legale Ziele.
- Belegte Ausrüstungsfelder dürfen ersetzt werden.
  Die bisherige Ausrüstung geht dabei auf den Ablagestapel.
- Ausrüstung kann alternativ verdeckt in einen freien AZR-Bereich
  gesetzt werden.
- Ausrüstung kann NICHT offen in der AZR liegen.
- Wird verdeckte Ausrüstung in VP/NP aufgedeckt, muss sie sofort an
  eine Bezwingerin angelegt werden.
- Solange diese Platzierung aussteht, kann die Phase nicht gewechselt werden.
- Klick-/Button-Bedienung zusätzlich zu Drag & Drop, damit die Funktion
  auch auf Touch-Geräten nutzbar bleibt.
- Ausrüstung kann in VP/NP freiwillig durch Klick auf das belegte
  Ausrüstungsfeld abgelegt werden.
- Stirbt eine Bezwingerin, werden Waffe, Schild, Rüstung und Kopfschutz
  zusammen mit ihr auf den Ablagestapel gelegt.
- Gegenstand und Reliquie bleiben als AZR-Karten behandelt.
- Individuelle Kartenwirkungen und Werteboni der Ausrüstung sind noch
  NICHT implementiert; dieses Update bildet zunächst die regelkonforme
  Platzierung und Lebensdauer der Karten ab.

Kompatibilität:
- Alte gespeicherte Gefechte erhalten beim Laden automatisch leere
  Ausrüstungsbereiche.
- Service Worker v23.

Zu ersetzen:
- battlefield.js
- game-engine.js
- style.css
- service-worker.js
