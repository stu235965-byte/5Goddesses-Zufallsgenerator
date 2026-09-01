5Goddesses – Gefecht v1.11

KRITISCHER RENDER-FIX

Ursache des leeren Spielfelds:
battlefield.js verwendet seit der neuen Einsatzverzögerungsregel
E().hasDeploymentDelay(...). Diese Funktion war zwar in game-engine.js
vorhanden, wurde aber versehentlich NICHT über window.G5Engine exportiert.

Dadurch entstand beim Rendern der ersten Karte ein JavaScript-Fehler.
Folge:
- Gegnerfeld blieb leer
- eigenes Feld blieb leer
- Hand blieb leer
- nur die statische Primärzone war noch sichtbar

Behoben:
- hasDeploymentDelay wird korrekt von G5Engine exportiert
- bestehende gespeicherte Gefechte werden beim Laden defensiv auf die
  neueren Zustandsfelder migriert
- Zufluchten bleiben dabei immer einsatzbereit
- Karten ohne Einsatzverzögerung werden bei alten Spielständen korrigiert
- Sticky Phasen-/Aktionsleiste aus v1.10 bleibt enthalten
- Service Worker v18

Für diesen Fix ersetzen:
- game-engine.js
- service-worker.js

Falls der Browser nach dem GitHub-Upload noch die alte Version zeigt:
Seite einmal vollständig neu laden bzw. die installierte PWA schließen
und erneut öffnen.
