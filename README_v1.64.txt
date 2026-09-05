5Goddesses PWA v1.64

Mobile Auto-Fit:
- Beim Start eines neuen Gefechts wird der Auto-Fit jetzt sofort zurückgesetzt.
- Nach dem ersten Rendern wird nach kurzer Layout-Stabilisierungszeit derselbe
  Reset-und-Neuberechnen-Ablauf ausgelöst, der bisher erst durch einen
  orientationchange zuverlässig funktioniert hat.
- Dadurch sollte das Spielfeld direkt im Hochformat vollständig eingepasst sein,
  ohne dass man zuerst ins Querformat und wieder zurück wechseln muss.
- Dasselbe Verhalten gilt beim Fortsetzen eines gespeicherten Gefechts.
- Pinch-Zoom bleibt weiterhin unangetastet; nach dem initialen Fit wird die
  Skalierung wie bisher eingefroren.
- Buildmarker 1.64, Cache v74.
