5Goddesses PWA – Update Zufallsgenerator mit Entwicklungsdeck

Auf GitHub im Hauptverzeichnis ersetzen:
- generator.js
- service-worker.js
- 5goddesses-datenbank.js
- 5goddesses-datenbank.json

Neue Generatorlogik:
- 1 Zuflucht
- 3 Bezwingerinnen mit unterschiedlichen Klassen
- 5 Astralkammer
- 5 Rüstkammer
- 5 Entwicklungskarten

Alle Karten hängen vom persönlichen Kartenpool ab.

Pflichtregel:
Die gezogene Stufe-1-Zuflucht wird nur aus Zufluchten gewählt, deren passende
Stufe-2-Zuflucht ebenfalls im Kartenpool ausgewählt ist. Diese passende
Stufe-2-Zuflucht ist immer eine der fünf Entwicklungskarten.

Priorisierung:
Für die übrigen vier Plätze werden zuerst verfügbare Stufe-2-Entwicklungskarten
bevorzugt, deren Grundkarte tatsächlich im gerade generierten Deck liegt.
Wenn danach noch Plätze frei sind, werden sie zufällig mit anderen ausgewählten
Entwicklungskarten aufgefüllt.

Hinweis zum aktuellen Datenbestand:
Die derzeitige gemeinsame Datenbank enthält Entwicklungskarten für Zufluchten
und Bezwingerinnen. Sobald später passende Stufe-2-Astral- oder
Rüstkammerkarten in der Datenbank vorhanden sind, werden sie durch dieselbe
Logik automatisch ebenfalls priorisiert.

Service Worker:
Cache-Version auf v6 erhöht, damit installierte PWAs die neue Logik laden.
