5Goddesses PWA v1.97 – Storymode Zwischengegner
- 21 feste Zwischengegnerdecks für Akt 1–5 ergänzt (4/4/5/4/4).
- Jedes Deck: 1 Zuflucht, 3 Bezwingerinnen mit eindeutigen Klassen, 5 Astralkammer, 5 Rüstkammer, 5 Entwicklungskarten.
- Kein Storyboss befindet sich in einem Zwischengegner-Bezwingerinnenstapel.
- Zuordnung über storyAct + storyOrder; API: G5STORY_ENCOUNTER_DECKS.get/forAct/sequence.
- Battlefield-Bridge startEncounter() nutzt dieselbe vorhandene KI wie Testgefecht/Bosse.
- Bossdecks v1.96 bleiben unverändert, inklusive Nemesis-Ausnahme.
- Neuer Test test_story_encounters_v197.js: 69 PASS / 0 FAIL.
