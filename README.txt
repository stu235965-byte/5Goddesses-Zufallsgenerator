5Goddesses – Gefecht v1.12

ROBUSTER RENDER-FIX

Die Ursache wurde weiter eingegrenzt:
Die Darstellung der Karten war weiterhin von einer Funktion aus
game-engine.js abhängig. Bei einem gemischten Browser-/Service-Worker-
Cache konnte battlefield.js bereits die neue Version sein, während
game-engine.js noch aus einer älteren Version kam. Dann brach das
Rendern beim ersten Kartenfeld komplett ab.

In v1.12:
- battlefield.js besitzt die Einsatzverzögerungsprüfung jetzt selbst.
- Das Rendern ist damit NICHT mehr von hasDeploymentDelay aus der Engine
  abhängig.
- Gegnerfeld und eigenes Spielfeld werden getrennt abgesichert gerendert.
  Ein einzelner Fehler kann damit nicht mehr das komplette Gefechtsfeld
  verschwinden lassen.
- Die Engine exportiert hasDeploymentDelay trotzdem weiterhin korrekt.
- Sticky Phasenleiste bleibt erhalten.
- Service Worker v19.

Bitte bei diesem Fix ALLE vier Dateien ersetzen:
- battlefield.js
- game-engine.js
- style.css
- service-worker.js

Danach Browser/PWA vollständig schließen und neu öffnen.
Wenn GitHub Pages verwendet wird, ggf. einmal Strg+F5 im Browser.
