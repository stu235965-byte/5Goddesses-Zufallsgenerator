5GODDESSES – ICON CACHE FIX

Dieses Paket verwendet neue Icon-Dateinamen, damit Android/Chrome nicht mehr
auf die alten PWA-Icons aus dem Cache zurückgreifen kann.

Auf GitHub hochladen/ersetzen:
1. Die vier neuen Dateien in den Ordner icons/ hochladen:
   - icon-192-v2.png
   - icon-512-v2.png
   - icon-maskable-192-v2.png
   - icon-maskable-512-v2.png

2. manifest.webmanifest im Hauptverzeichnis durch die neue Version ersetzen.

Danach auf Android:
- installierte 5Goddesses-PWA deinstallieren
- Browser komplett schließen
- Seite erneut öffnen
- PWA neu installieren

Die alten Icon-Dateien können auf GitHub bleiben; sie werden vom neuen Manifest
nicht mehr verwendet.
