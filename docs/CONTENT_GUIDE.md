# İçerik Rehberi

İçerik veriye dayalıdır. Çoğu ekleme motor koduna dokunmadan yapılır ve her eklemeyi `npm test` doğrular.

## Yeni bölge
1. `src/content/regions.ts`: `REGIONS` listesine `{ id, ground, accent, water, biome, structures: [...] }` ekleyin. Yapı koordinatları dünya birimiyle verilir (genişlik 400, bölge yüksekliği 1100). En alttaki yapı (y > 980) köprü veya kapıdır.
2. `src/content/quests.ts`: `ROWS` listesine görev satırlarını ekleyin. Bir önceki bölgenin son görevinin ödülüne `R<n>` ekleyerek bölgeyi açın.
3. `src/i18n/content.ts`: `region.<n>`, `region.<n>.desc`, yapı adları, görev adları ve anı metinleri.
4. `src/i18n/dialogues.ts`: her görev için `start` ve `end` (her biri 1–4 satır).
5. Yeni bir yapı tipi gerekiyorsa `StructureType` türüne ve `src/render/structures.ts` içine bir çizici ekleyin. Çizici `k` (0..1) ilerlemesine göre yıkık, iskeleli ve tamam hâllerini çizmelidir.
6. `npm test` çalıştırın. İçerik testleri eksik referansları, ulaşılamayan görevleri, üretilemeyen gereksinimleri, eksik çevirileri ve bölge açılışını kontrol eder.
7. `npm run preview-art` çalıştırıp `art-preview/region<n>_ruin.png` ve `_done.png` dosyalarına bakın.

## Görev satırı söz dizimi
```ts
['r2_kiln', 'story', 'mira', 'r2_kilnhouse', 'stone:5x2 lp15', 'L80 X45 P:kiln'],
//  kimlik    tür     veren   yapı(aşama+1)  gereksinim           ödül
```
- **Gereksinim:** `aile:seviye` veya `aile:seviyexN` (nesne teslim), `lpNN` (patika bulmacası çözülmüş olmalı), `L120` (120 yaprak öde).
- **Ödül:** `L` yaprak, `T` jeton, `X` xp, `E` enerji, `C` açılacak hücre, `P:<üretici>` hediye üretici, `M:<yapı>` anı kartı, `R<n>` bölge.
- **Ön koşul:** Hikâye ve proje görevleri aynı bölgedeki aynı türden bir önceki göreve otomatik bağlanır. Yan görevler dördüncü sütunda açık liste alır.
- Yapının aşama sayısı, o yapıyı inşa eden görev sayısıdır.

## Yeni üretim ailesi
1. `src/content/families.ts`: `FamilyId` türüne ve `FAMILIES` listesine ekleyin (8–12 seviye).
2. `src/render/items.ts`: her seviye için ayrı bir çizim fonksiyonu yazın (renk değiştirme veya büyütme kullanmayın) ve `DRAWERS` tablosuna ekleyin.
3. `src/i18n/content.ts`: `ITEMS[aile]` adları ve `family.<id>`.
4. Kaynağını `src/content/valley.ts`'e ekleyin: tek seferlik birikinti (`mode: 'stages'`) ve/veya görevle açılan yenilenebilir bina (`mode: 'jobs'`, `quest`, `build`). İşleme gerekiyorsa işin `inputs` alanını kullanın. Tohum/fide ise `content/progression.ts` → `CRATE_POOL`. Ad ve açıklama: `i18n/content.ts` → `node.<kind>`, `job.<id>`.
5. `npm test`: softlock testi bu ailenin istendiği ilk görevden önce yenilenebilir bir kaynak bekler.
6. `npm run sprites` ile PNG'leri ve manifest'i yeniden üretin.

## Bulmaca
- Patika: `src/puzzles/levels.ts`. 1–6 elle tasarlanmıştır (kutu çizim karakterleriyle, çözülmüş hâlde yazılır). 7–80 `paramsFor(k)` ve sabit tohumla üretilir.
- Elle yeni bulmaca eklemek için `AUTHORED` listesine `[tohum, satırlar]` yazın: `A`/`B` fener, `a`/`b` hedef, `─│┌┐└┘├┤┬┴┼` yollar, `╴╶╵╷` kör uçlar, `#` kaya, `.` boşluk. Testler çözülebilirliği doğrular.
- Zorluk parametreleri: boyut, renk sayısı, renk başına hedef, kaplama, kaya oranı, filtre sayısı, kilit sayısı, karışıklık oranı.

## Denge
Bütün sayılar `src/content/balance.ts` ve üretici tablosundadır. Değişiklikten sonra:
```bash
npm run simulate          # 210 günlük profiller
npm test                  # integration testi: bot 1. bölgeyi bitirebiliyor mu
```

## İçerik sürümleme
Kayıt formatı `SAVE_VERSION` ile sürümlenir. İçerik eklemek (yeni görev, yapı veya bölge) eski kayıtları bozmaz; tamamlanmış görevler kimlikle saklanır. Bir görev kimliğini **yeniden adlandırmayın**. Gerekirse `persistence/save.ts` içine bir migration ekleyin.
