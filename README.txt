5Goddesses PWA – Gefecht v1

Auf GitHub im Hauptverzeichnis ersetzen/hochladen:
- index.html
- style.css
- generator.js
- game-engine.js      (neu)
- battlefield.js      (neu)
- service-worker.js

Enthalten:
- Neuer Navigationspunkt „Gefecht“
- Auswahl von zwei gespeicherten vollständigen Decks
- Startspieler wählbar oder zufällig
- Spielfeld nach der Regelwerk-Vorlage, Gegnerseite gespiegelt
- Zuflucht, 2 Bezwingerinnenbereiche, 3 ASTRAL/Rüstkammer-Zonen,
  Hauptstapel, Entwicklungsstapel und Ablage
- Gefecht-Zuflucht startet mit 4 Herzen
- Beide Spieler ziehen zu Beginn je 1 Karte von jedem der drei Hauptstapel
- 9 Phasen einer Kampfrunde
- erste Ehrungsphase des Startspielers wird übersprungen
- Ziehphase: genau 1 Karte aus einem beliebigen Hauptstapel
- Ehre-Vergabe als Grundmechanik
- Rekrutieren von maximal 1 Bezwingerin pro Kampfrunde
- 2 Bezwingerinnenbereiche und Einsatzverzögerung
- Einsatzbereit machen ab der nächsten eigenen Kampfrunde
- ASTRAL/Rüstkammer-Karten verdeckt in 3 AZR-Felder setzen
- gesetzte Karten in zulässigen Grundphasen aufdecken
- Entwicklung Stufe 1 -> Stufe 2 für Zuflucht/Bezwingerinnen,
  sofern passende Entwicklungskarte und genügend eigene Ehre vorhanden sind
- Ansturm: Angreifer, Angriffsziel und physisch/ASTRAL wählen
- direkte Zuflucht-Angriffe nur bei freier gegenüberliegender Linie
  bzw. wenn keine gegnerische Bezwingerin auf dem Feld liegt
- Kampf mit gleichzeitigem Angriff/Gegenangriff
- jeweiliger Schild wird vor Herzen abgebaut
- Zerstörung bei 0 Herzen, Sieg bei Zuflucht 0
- mehrere Angriffe pro Kampfrunde über erneute Ansturm-/Kampfphase
- automatisches Speichern eines laufenden Gefechts im lokalen PWA-Speicher

Noch NICHT enthalten:
- individuelle Karteneffekte
- Ketten/Instinkt-Reaktionssystem aus den erweiterten Regeln
- Primär-/Sekundärangriff als Karteneffekt
- vollständiges offenes Ausspielen aller ASTRAL-/Rüstkammer-Untertypen
- Ausrüstungsplätze um einzelne Bezwingerinnen
- NPC

Service Worker: v8
