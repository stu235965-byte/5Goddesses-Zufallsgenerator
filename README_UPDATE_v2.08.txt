5Goddesses PWA – Update v2.08

Fehlerbehebungen
- Direkter Effektschaden zerstört Bezwingerinnen jetzt unmittelbar, sobald sie nach vollständiger Schadensauflösung 0 Herzen besitzen.
- Der Fix ist zentral für alle direct_effect-Schadenspakete umgesetzt und nicht nur auf ASTRAL-Feuerball beschränkt.
- ASTRAL-Feuerball führt sein Ziel nun zusätzlich mit vollständigen Zieldaten, damit ältere/spezielle Auflösungswege ebenfalls korrekt funktionieren.

Kontrolle Stufe-2-Wunderkosten
- Alle 10 Stufe-2-Bezwingerinnen erneut nach normaler Entwicklung geprüft.
- Wunderkosten der neuen Entwicklungsstufe werden weiterhin korrekt über resetWonderStateAfterDevelopment übernommen.
- Martha Kaizer Stufe 2: 3 Ehre Wunderkosten bestätigt; Aktivierung zieht tatsächlich 3 Ehre ab.
- Mit nur 2 Ehre ist Marthas Wunder gesperrt.

Tests
- test_direct_damage_discard_v208.js: 12 PASS / 0 FAIL
- test_wonder_cost_development_v207.js: 80 PASS / 0 FAIL
- test_martha_wonder_cost_v208.js: 30 PASS / 0 FAIL

Version: v2.08
Battlefield-Build: 2.08
Service-Worker-Cache: v119
