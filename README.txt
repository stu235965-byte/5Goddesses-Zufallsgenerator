5Goddesses – Gefecht v1.13

1. STICKY-LEISTEN
- Die obere Gefechtsleiste und die darunterliegende Phasen-/Aktionsleiste
  können sich nicht mehr gegenseitig überlagern.
- Die Position der unteren Leiste wird dynamisch aus der tatsächlichen
  Höhe und Position der oberen Leiste berechnet.
- Das funktioniert auch bei unterschiedlichen Fensterbreiten und wenn
  die obere Leiste auf kleinen Displays höher wird.
- Bei einer Größenänderung des Fensters wird der Abstand neu berechnet.

2. EHRUNGSPHASE
- Die Ehrungsvergabe erfolgt nun automatisch beim Eintritt in die
  Ehrungsphase.
- Jede eigene Karte auf dem Spielfeld mit einem vorhandenen Herz-Attribut
  erhält genau 1 Ehre.
- Herzen = 0 zählt ausdrücklich als vorhandenes Herz-Attribut.
- Berücksichtigt werden Zuflucht, Bezwingerinnen, AZR-Karten,
  Sekundärkarte und eine eigene Karte in der gemeinsamen Primärzone.
- Verdeckte Karten mit Herz-Attribut erhalten ebenfalls Ehre.
- Die erste Ehrungsphase des Startspielers wird vollständig übersprungen.
- Eine Sicherung verhindert doppelte Ehrungsvergabe in derselben
  eigenen Kampfrunde.
- Der bisherige Button „Ehre vergeben“ wurde entfernt, da die Vergabe
  automatisch erfolgt.

3. KOMPATIBILITÄT
- Alte gespeicherte Gefechte erhalten beim Laden automatisch das neue
  Feld für die Ehrungsvergabe.
- Service Worker v20.

Zu ersetzen:
- battlefield.js
- game-engine.js
- style.css
- service-worker.js
