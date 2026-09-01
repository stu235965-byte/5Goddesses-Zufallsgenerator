5Goddesses – Gefecht v1.19
KARTEN PASSEND IN ALLEN ZONEN

Problem:
- Bei Ausrüstungsfeldern, insbesondere dem Helmfeld, konnte das Kartenbild
  zusammen mit Name/Werten höher als das eigentliche Feld werden.
- Das Feld hatte overflow:hidden; dadurch wurde ein Teil der Karte abgeschnitten.
- Zusätzlich zielte eine ältere CSS-Regel auf .runtime-card, obwohl die
  tatsächliche Kartenklasse .board-card heißt.

Korrektur:
- Kartenbilder werden nun immer vollständig mit object-fit: contain in die
  jeweilige Zone eingepasst.
- Name und aktuelle Werte werden als kompakte Einblendung über dem Kartenbild
  dargestellt und vergrößern den Container nicht mehr.
- Die Regel gilt für:
  * Helm
  * Waffe
  * Schild
  * Rüstung
  * Bezwingerinnen
  * Zuflucht
  * AZR
  * Sekundärzone
  * gemeinsame Primärzone
- Kartenrückseiten werden ebenfalls vollständig eingepasst.
- Leere Felder behalten exakt ihre vorgesehenen Abmessungen.

Service Worker: v26

Zu ersetzen:
- style.css
- service-worker.js
