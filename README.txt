5Goddesses – Gefecht v1.23
ANGRIFFSZIEL-KLICK ROBUST KORRIGIERT

Symptom:
- Zielkarten leuchteten gold.
- Klick auf eine gegnerische Bezwingerin führte trotzdem nicht zu
  „Physisch angreifen“ / „ASTRAL angreifen“.

Korrektur:
- Gold markierte Ziele besitzen nun direkt einen eigenen Klick-Handler.
- Standardverhalten des Buttons wird unterdrückt.
- Die alte globale Capture-Klickbehandlung wurde entfernt, damit ein Klick
  nicht während des Events bereits das Spielfeld neu rendert.
- Bilder, Werteanzeige und andere Kindelemente können den Zielklick nicht
  mehr abfangen; die gesamte gold markierte Zone ist die Klickfläche.
- Bezwingerinnen/Zuflucht sind ausdrücklich type="button".
- Primär-/Sekundärziele sind auch per Tastatur aktivierbar.
- Nach erfolgreicher Auswahl erscheint sofort die Meldung:
  „Angriffsziel gewählt. Wähle jetzt Physisch oder ASTRAL.“

Ablauf:
1. eigene Bezwingerin anklicken
2. goldes gegnerisches Ziel anklicken
3. Buttons „Physisch angreifen“ und „ASTRAL angreifen“ erscheinen

Service Worker v30.

Zu ersetzen:
- battlefield.js
- style.css
- service-worker.js
