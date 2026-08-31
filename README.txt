5GODDESSES – PWA TESTVERSION
============================

Diese Version ist eine Progressive Web App (PWA) des Zufallsgenerators.
Sie enthält:
- Zufallsgenerator (1 Zuflucht, 3 Bezwingerinnen, 5 Astralkammer, 5 Rüstkammer)
- persönlichen Kartenpool mit Auswahl per Klick
- lokales Speichern von Kartenpool und Profilname
- App-Manifest und App-Icons
- Service Worker für Offline-Nutzung
- Installationsbutton, sofern der Browser eine Installation unterstützt

WICHTIG: PWA-Funktionen funktionieren nicht vollständig, wenn index.html nur per Doppelklick
als file:// geöffnet wird. Die App muss über HTTP/HTTPS bereitgestellt werden.
Für andere Nutzer sollte der komplette Ordner auf einer HTTPS-Webseite gehostet werden.

LOKAL TESTEN AUF DEM PC
-----------------------
1. Diesen Ordner öffnen.
2. In diesem Ordner ein Terminal öffnen.
3. Falls Python installiert ist:
       python -m http.server 8000
4. Im Browser öffnen:
       http://localhost:8000

ANDROID
-------
Die gehostete HTTPS-Seite in Chrome/Edge o. ä. öffnen und "App installieren" bzw.
"Zum Startbildschirm hinzufügen" wählen. Der integrierte Button wird angezeigt,
wenn der Browser die Installation anbietet.

iPHONE / iPAD
--------------
Die gehostete HTTPS-Seite in Safari öffnen -> Teilen -> "Zum Home-Bildschirm".

OFFLINE
-------
Beim ersten Online-Aufruf speichert der Service Worker die Web-App und die Kartenbilder
im Browser-Cache. Anschließend kann die installierte App auch ohne Internetverbindung
verwendet werden. Der Kartenpool bleibt lokal auf dem jeweiligen Gerät/Browser gespeichert.

DATEIEN FÜR PWA
---------------
manifest.webmanifest   App-Name, Farben und Icons
service-worker.js      Offline-Cache
pwa.js                 Installation und Service-Worker-Registrierung
icons/                 App-Icons

Zum Veröffentlichen muss der komplette Inhalt dieses Ordners zusammen hochgeladen werden.
