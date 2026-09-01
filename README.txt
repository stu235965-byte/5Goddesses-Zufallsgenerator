5Goddesses – Gefecht v1.15

KORREKTUR STARTEHRE

Bisher:
- Jede neu ausgespielte Karte startete intern mit 0 Ehre,
  unabhängig von dem auf der Karte angegebenen Ehre-Wert.

Jetzt:
- Eine Karte startet beim Ausspielen mit ihrer in der Kartendatenbank
  angegebenen Ehre (`ehre`).
- Wird eine Karte verdeckt gesetzt, besitzt sie diese Startehre bereits
  intern.
- Solange die Karte verdeckt liegt, erhält sie in Ehrungsphasen KEINE
  zusätzliche Ehre.
- Beim Aufdecken ist ihre normale Startehre weiterhin vorhanden.
- Danach kann die offene Karte in folgenden Ehrungsphasen wie vorgesehen
  zusätzliche Ehre erhalten, sofern sie ein Herz-Attribut besitzt.
- Karten mit keiner angegebenen Startehre beginnen weiterhin bei 0.

Wichtig:
- Bereits laufende gespeicherte Gefechte werden nicht rückwirkend auf
  Startehre gesetzt, weil ein aktueller Wert von 0 auch durch bereits
  ausgegebene Ehre entstanden sein könnte.
- Für einen sauberen Test bitte ein neues Gefecht starten.

Service Worker: v22

Zu ersetzen:
- game-engine.js
- service-worker.js
