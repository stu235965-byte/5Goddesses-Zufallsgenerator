5Goddesses – Gefecht v1.20
PRIMÄR- UND SEKUNDÄRKARTEN

Umgesetzt:
- Das Datenbankfeld `bereich` bestimmt den Zielbereich:
  * Primär -> gemeinsamer Primärbereich
  * Sekundär -> eigener Sekundärbereich
- Passende Karten können aus der Hand offen direkt in ihren Bereich
  gespielt werden.
- Drag & Drop hebt nur den korrekten Bereich als legales offenes Ziel hervor.
- Primär-/Sekundärkarten können alternativ verdeckt in die AZR gesetzt werden.
- Offen dürfen solche Karten nicht in der AZR verbleiben.
- Beim Aufdecken einer verdeckten Primär-/Sekundärkarte wird sie automatisch
  in ihren vorgesehenen Bereich verschoben, sofern dieser frei ist.
- Ist der Bereich belegt, bleibt die aufgedeckte Karte vorübergehend in der
  AZR und blockiert den Phasenwechsel, bis ihr Zielbereich frei ist.
- Bereits vorhandene Kampfziel-Logik für Primär/Sekundär bleibt erhalten.
- Individuelle Karteneffekte sind weiterhin ein separater nächster Schritt.

Service Worker v27.

Zu ersetzen:
- battlefield.js
- game-engine.js
- style.css
- service-worker.js
