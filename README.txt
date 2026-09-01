5Goddesses – Gefecht v1.17
ANGRIFFSZIEL-KLICKFIX

Fehlerursache:
- Gegnerische Bezwingerinnen und die gegnerische Zuflucht wurden als
  echte HTML-Buttons mit dem Attribut "disabled" gerendert.
- Ein HTML-Button mit "disabled" löst keine Click-Events aus.
- Deshalb leuchteten die Ziele zwar korrekt gold auf, aber ein Klick
  darauf konnte die Zielauswahl nicht auslösen.

Korrektur:
- Gegnerische Bezwingerinnen und Zuflucht bleiben visuell als gegnerische
  Felder markiert, sind technisch aber nicht mehr "disabled".
- Eigene Aktionen können dadurch nicht versehentlich auf dem Gegnerfeld
  ausgeführt werden, weil diese Handler weiterhin nur an #playerBoard
  gebunden sind.
- Zusätzlich gibt es jetzt eine zentrale Angriffsziel-Erkennung über
  Event Delegation. Dadurch bleibt die Zielauswahl auch nach einem
  Neurendern des Spielfelds stabil.
- Auswahlfolge bleibt:
  1. eigene Angreiferin
  2. goldes gegnerisches Ziel
  3. Physisch oder ASTRAL

Service Worker: v24

Zu ersetzen:
- battlefield.js
- service-worker.js
