5Goddesses PWA v2.06

KI-Ausrüstungs-Bugfix:
- Aufgedeckte KI-Ausrüstung in pendingEquipment kann jetzt auch an bereits belegte passende Ausrüstungsslots angelegt werden.
- Die vorhandene Ausrüstung wird dabei durch die bestehende Engine regelkonform ersetzt und auf den Ablagestapel gelegt.
- Die KI prüft alle eigenen Bezwingerinnen nach Bedrohungswert und versucht die Platzierung nacheinander, sodass Kartenregeln (z. B. KRAKEN/Urlaub) weiterhin respektiert werden.
- Dadurch bleibt die KI nicht mehr dauerhaft in pendingEquipment hängen, wenn alle passenden Slots belegt sind.

Version:
- App v2.06
- Battlefield 2.06
- Service-Worker-Cache v117

Neuer Regressionstest:
- test_ai_equipment_replace_v206.js: 4 PASS / 0 FAIL
