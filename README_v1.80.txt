5Goddesses PWA v1.80

Astralkammer-Audit- und Bereinigungsrelease nach v1.79.

Bereinigt:
- Falsch benannte Dublette „Vollendete Rettungstechnik“ entfernt.
- Die Dublette zeigte dasselbe Originalkartenbild wie „Vollendete Tötungstechnik“ und war kein eigener Karteninhalt.
- Der korrekte Datenbankbestand beträgt wieder 158 Karten insgesamt.
- Der korrekte Astralkammerbestand beträgt 49 Karten.
- Die überflüssige Bilddatei der Dublette wurde aus der Vollversion entfernt.
- 5goddesses-datenbank.js, 5goddesses-datenbank.json, karten_daten.json und karten_daten.csv sind erneut synchronisiert.

Astralkammer-Audit:
- Alle 49 echten Astralkammerkarten besitzen Engine-Logik.
- Vollständiger aktueller Testbestand: 110 PASS / 0 FAIL.
- Detailbericht: ASTRALKAMMER_AUDIT_v1.80.txt.
- node --check game-engine.js: PASS.
- node --check battlefield.js: PASS.

Hinweis:
- Exekution bleibt als Regelauslegungsfrage dokumentiert: Die Engine verbraucht die Karte derzeit nicht, wenn ein ausgewähltes Ziel die Bedingung 1 Herz / keine Schilde nicht erfüllt. Dies wurde in v1.80 bewusst nicht ohne Regelbestätigung verändert.

Service-Worker-Cache: v91
Battlefield-Build: 1.80
