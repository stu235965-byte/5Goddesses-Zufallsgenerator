5Goddesses – v1.25
DECKBUILDER-VORSCHAU FIX

Behoben:

1. Karte wurde unter dem leeren Vorschaufeld angezeigt
Ursache:
- Die CSS-Regel für den leeren Platzhalter setzte display:flex.
- Dadurch wurde das HTML-Attribut hidden überschrieben.
- Nach einem Kartenklick waren deshalb Platzhalter UND Kartenvorschau sichtbar.

Fix:
- Innerhalb der Vorschau gilt jetzt [hidden] { display:none !important; }.
- Es ist immer nur entweder der Platzhalter oder die große Karte sichtbar.

2. Vorschau war nicht sticky
Ursache:
- position:sticky lag auf einem Kind-Element innerhalb des aside.
- Der umgebende aside-Container war praktisch genauso hoch wie das sticky
  Element selbst. Dadurch gab es innerhalb dieses Containers keinen
  Scrollbereich, in dem das Kind hätte "kleben" können.

Fix:
- position:sticky liegt jetzt direkt auf der rechten Grid-Spalte
  (.deck-card-preview).
- Die Vorschau bleibt dadurch beim Scrollen rechts sichtbar.
- Auf mobilen Displays wird sticky weiterhin deaktiviert.

Service Worker v32.

Zu ersetzen:
- style.css
- service-worker.js
