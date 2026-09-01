5Goddesses – v1.26
KARTENVORSCHAU FINALFIX

Das Problem war weiterhin die gleichzeitige Darstellung von Platzhalter
und Karteninhalt. Die Vorschau verlässt sich deshalb jetzt nicht mehr
auf das HTML-hidden-Attribut.

Neu:
- Die Vorschau besitzt genau EINEN Vorschau-Slot.
- Ohne ausgewählte Karte ist ausschließlich der Platzhalter sichtbar.
- Nach Klick auf eine Karte erhält die Vorschau die Klasse .has-card:
  * Platzhalter wird hart ausgeblendet
  * Kartenansicht wird hart eingeblendet
- Beide Ansichten benutzen exakt dieselbe Fläche.
- Die Karte kann dadurch nicht mehr unterhalb des leeren Feldes erscheinen.
- Die komplette rechte Vorschau-Spalte bleibt sticky.
- Sichtbare Header-Version wurde auf v1.26 erhöht.
- Service Worker Cache v34.

Zu ersetzen:
- index.html
- deckbuilder.js
- style.css
- service-worker.js
