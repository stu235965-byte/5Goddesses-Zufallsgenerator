5Goddesses – Gefecht v1.5

KORREKTUR DES SPIELFELDRASTERS

Die Bezwingerinnen-/Ausrüstungsbereiche wurden komplett neu aufgebaut.
Statt verschachtelter Breitenberechnungen gibt es jetzt ein festes
7-Spalten-Raster:

Waffe | Bezwingerin | Schild | Zuflucht | Waffe | Bezwingerin | Schild

Helm und Rüstung liegen jeweils in eigenen Grid-Zellen oberhalb bzw.
unterhalb der zugehörigen Bezwingerin.

Dadurch ist eine geometrische Überlagerung mit der Zuflucht nicht mehr
möglich. Auf kleineren Displays wird das komplette Feld horizontal
gescrollt, statt Kartenfelder ineinander zu schieben.

Zusätzlich:
- gemeinsame Primärzone zwischen den beiden Spielfeldhälften deutlich
  sichtbar gemacht
- Primärzone besitzt ein vollständiges Kartenfeld
- Service Worker v13

Zu ersetzen:
- index.html
- battlefield.js
- style.css
- service-worker.js
