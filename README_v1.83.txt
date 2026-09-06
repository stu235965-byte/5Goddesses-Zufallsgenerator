5Goddesses PWA v1.83

Core-Rules-Abschlussrelease nach dem ersten Gesamtaudit.

Änderungen:
- Primär- und Sekundärkarten mit Herzattribut/Einsatzverzögerung werden nach der normalen Wartezeit automatisch einsatzbereit und können in der Ansturmphase als Angreifer gewählt werden.
- Primär-/Sekundärkarten können Bezwingerinnen, Primär-/Sekundärkarten und nach den Grundregeln die Zuflucht angreifen.
- MANTAs Wunderbonus (+1 physische Stärke für einen Kampf) wirkt nun bei MANTAs eigenem Angriff und wird nach dem Kampf verbraucht.
- Primär-/Sekundärangriff-Timing wird auch bei Feldkartenangriffen berücksichtigt; ein vorrangiger tödlicher Gegenangriff verhindert den nachgelagerten Treffer.
- Eine eigene Primärkarte darf durch eine neue eigene Primärkarte ersetzt werden; die alte Karte geht auf die Ablage.
- Eine eigene Sekundärkarte darf im gemeinsamen Sekundärbereich ersetzt werden; eine gegnerische Sekundärkarte muss weiterhin zuerst entfernt/zerstört werden.
- Instinktfenster ist jetzt auch in der Ehrungsphase des Gegners verfügbar.
- Nach Aktivierung einer Instinktkarte bleibt das Instinktfenster offen, sodass mehrere gesetzte Instinktkarten in derselben Phase nacheinander aktiviert werden können; erst explizites Passen beendet das Fenster.
- Rüstkammer-Verzeichnis repariert: echter Ordnername „Rüstkammer“ statt fehlerhaft kodiertem „R#U00fcstkammer“. Alle 50 Rüstkammer-Bildpfade wurden geprüft.
- Offline-Paket erweitert: alle 158 Kartenbilder werden bei der Service-Worker-Installation vorab gecacht.
- PWA-Version v1.83, Battlefield-Build 1.83, Service-Worker-Cache v94.

Tests:
- Gesamter bestehender Regressionstestbestand weiterhin grün.
- Neuer Core-Rules-Test v1.83 für Feldkarten-Einsatzverzögerung, Primär-/Sekundärangriffe, MANTA, Feldersetzung, Ehrungsphasen-Instinkt, mehrere Instinktaktivierungen und Primärangriff-Timing.
- node --check game-engine.js / battlefield.js / deckbuilder.js / generator.js.
- Datenbank-/Bildpfadprüfung und ZIP-Integritätsprüfung.
