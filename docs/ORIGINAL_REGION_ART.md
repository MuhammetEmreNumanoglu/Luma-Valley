# Original regional artwork

`assets/art/structures/watermill_landmark_original.png` was created specifically for Luma Valley with the built-in OpenAI image generation tool and downscaled for use as a game sprite. It is original generated artwork, not extracted from another game or website.

Prompt: "Create a single original transparent-background 2D game sprite for an isometric cozy premium mobile game. Subject: restored historic stone watermill with timber details, a small wooden waterwheel and slate roof; richly detailed hand-painted stylized realism, warm inviting natural color and soft daylight, three-quarter isometric view, no ground plane beyond a small soft contact shadow, no background, no text, no border. A clean single unified isolated object, fully visible with generous transparent padding, suitable as a building landmark in a lush valley game. Do not imitate any particular existing game."

Four more original generated landmarks are `regional_greenhouse_original.png`, `regional_forest_cabin_original.png`, `regional_lakeside_dock_original.png`, and `regional_festival_cafe_original.png`, each generated with the built-in image generator and downscaled for the game. Prompts requested, respectively: a restored glass greenhouse in a flower garden; a woodland cabin with lanterns; a lakeside dock with a boat; and a festive cafe with a striped stall. All requested isolated transparent-background, cozy hand-painted stylized realism in three-quarter view, with no text, borders or imitation of existing games.

## Üç aşamalı bölge çizimleri (15 Kasım 2026)

İlk beş bölge artık kendi özgün, üç aşamalı (yıkık / onarımda / onarılmış) çizimlerini kullanır. Hepsi `scripts/art-studio/regional/regional.js` içinde kodla kurulan low-poly modellerdir; three.js (MIT) ile ortografik izometrik kamerada (yaw 45°, pitch 30°, sol üstten sıcak ışık) render edilir. Ücretli araç veya üçüncü taraf varlık kullanılmadı; lisans: projeye ait özgün çalışma.

| Bölge | Simge yapı (yapı kimliği) | Köprü / kapı | Ağaç | Dekor | Yol |
|---|---|---|---|---|---|
| 1 Sakin Vadi | Sazlı çiftlik evi, saman sundurması (`r1_cottage`) | Alçak ahşap yaya köprüsü, saman balyaları (`r1_bridge`) | Elmalı meşe | Saman arabası | Toprak yol, papatyalı kenar |
| 2 Eski Değirmen Yolu | Taş su değirmeni ve çarkı (`r2_windmill`) | Taş kapı kulesi, çark tabelası (`r2_gate`) | Kavak | Değirmen taşları ve un çuvalları | Arnavut kaldırımı |
| 3 Çiçekli Bahçeler | Cam sera (`r3_house`) | Beyaz kemerli bahçe köprüsü, çiçek kutuları, gül kemeri (`r3_bridge`) | Manolya | Çiçek kemeri | Pembe-krem kaldırım taşları, çiçekli kenar |
| 4 Göl Kıyısı | Kazıklı kayıkhane (`r4_gazebo`) | Mavi direkli iskele kapısı, can simidi, sazlar (`r4_gate`) | Salkım söğüt | Sandal | Ahşap iskele yolu |
| 5 Fenerli Orman | Kütük kulübe, yosunlu çatı (`r5_hut`) | Halat korkuluklu kütük köprü, fenerler (`r5_bridge`) | Fenerli köknar | Fener taşı | Yosunlu orman yolu, fener taşları |

Yapı ve kayıt kimlikleri değişmedi; seçim `src/art/ids.ts` içindeki `REGIONAL_STAGED_ART` ve `structureSpriteId` ile yapılır. Önceki tek aşamalı (yalnızca onarılmış) OpenAI görselleri bölge 2–5'te artık haritada kullanılmıyor, aşamalar arasında üslup tutarlılığı için yerlerine bu set geçti; bölge 6 kafesi hâlâ eski görseli kullanır.

Yeniden üretmek: `scripts/art-studio/regional/` içindeki `regional.js` ve `custom.js`'yi studio klasörüne kopyala (three.js `build/` ve `examples/` bağlantıları ile), klasörü 8096'da sun, `node render.mjs specs.json out`, sonra `python3 pack.py out <repo>`. Haritada denetim: `node --no-warnings --import ./scripts/ts-register.mjs scripts/verify-regional-art.mjs done|repair|ruin`.

Kalite notu: Bu set ücretsiz, kodla kurulan low-poly modellerdir ve haritadaki Kenney tabanlı stille uyumludur; yapay zekâ ile üretilmiş elle boyanmış görünümdeki görsellerin ayrıntı düzeyinde değildir.
