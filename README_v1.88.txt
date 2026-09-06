5Goddesses PWA v1.88 – Qualitäts- und Regressionstest-Release

Qualitätsbereinigung:
- Veraltete UI-Bezeichnungen „Meine Decks“ und „Mein Kartenpool“ in den laufenden App-Dateien auf „Deckbuilder“ bzw. „Kartenpool“ vereinheitlicht.
- Obsolete TODO_Strikelyn_Effekt.txt und TODO_Ruestkammer_Implementierung.txt aus der Vollversion entfernt; beide Inhalte sind längst implementiert.
- Versehentliche temporäre Testdatei test_collect_release_179.js.tmp entfernt.

Rüstkammer-Regressionsaudit:
- Neue dauerhafte Testsuite tests/test_ruestkammer_audit_full_v188.js.
- Alle 50 Rüstkammerkarten werden auf vollständige Datenbank-/Runtime-Registrierung geprüft.
- Zusätzlich 11 verhaltensbasierte Regressionstests für generische und besondere Mechaniken, darunter Ausrüstungsschilde, Ehre beim Anlegen, Fragmentfresser Schlund, Lebensfresserschild Hunger, Parierdolch, Bastion-Erleuchtung, Lähmendes Nervengift, Trank der Stärke, Urlaub und Schattenfluchkralle.
- Ergebnis der neuen Rüstkammer-Suite: 61 PASS / 0 FAIL.

Gesamttest:
- Sämtliche bisherigen Regressionstests plus die neue Rüstkammer-Suite werden erneut ausgeführt.
- Datenbank-, Bildpfad-, Service-Worker- und ZIP-Konsistenz werden vor dem Release geprüft.

Version: v1.88
Battlefield Build: 1.88
Service Worker Cache: v99
