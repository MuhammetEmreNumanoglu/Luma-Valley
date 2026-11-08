# Luma Valley — Claude Code proje kuralları

Ürün sahibiyle iletişim **Türkçe**. Kod, değişken adları ve commit mesajları İngilizce.

## Oturum başında oku
1. `docs/PROGRESS.md`: nerede kaldık, neler doğrulanmadı
2. `docs/GAME_DESIGN.md`: mekanikler, bölgeler, ilk 30 dakika
3. `docs/ARCHITECTURE.md`: katmanlar, determinizm, kayıt, çizim
4. `docs/DECISIONS.md`: alınmış kararlar (onaysız değiştirme)
5. `docs/CONTENT_GUIDE.md`: içerik ekleme
   (v4: `GAMEPLAY_LOOP.md`, `ITEM_SOURCES.md`, `GAME_ECONOMY.md`, `PROGRESSION.md`, `ART_DIRECTION.md`)
6. `AGENTS.md`: Expo kuralları (sürüme özel dokümanı kontrol et, `npx expo install` kullan)

## Değişmez kurallar
- Oyun tamamen çevrimdışı çalışır. Backend, hesap veya reklam eklenmez (ürün sahibinin onayı olmadan).
- Motor (`src/engine`, `src/puzzles`) saf ve deterministik kalır: tohumlu RNG (`state.rng`), `now` parametre olarak gelir, `Math.random` ve `Date.now` kullanılmaz. `tests/fuzz.test.ts` determinizmi test eder.
- Her oyuncu eylemi `apply(state, command, now)` üzerinden geçer. Reddedilen komut durumu değiştirmez.
- Vadi kaynakları `src/content/valley.ts`'te veridir; kural `engine/nodes.ts`. Yeni görev isteği eklerken softlock testi (`tests/content.test.ts`) geçmeli.
- Tek para birimi Altın'dır (kayıtta `leaves`). Tek seferlik altın ödülleri ve harcamaları `changeCoins` ile ve benzersiz bir işlem kimliğiyle yapılır. Gerçek ödeme yalnızca doğrulanmış `grantPurchase` ile gelir. Sahte başarı gösterilmez. Işık Jetonu ve kıvılcım v5'te kaldırıldı; yeni para birimi eklenmez.
- Beş malzeme (taş, ahşap, seramik, kabuk, kristal) yalnızca atölye kaynak engellerinden gelir (`content/resources.ts`, `engine/resources.ts`); birleştirme yalnızca bir ürünü aynı ürünün üzerine bırakınca olur (`mergeDrop`).
- Çizim kodu (`src/render`) oyun durumunu okur, değiştirmez. Worklet çizim fonksiyonları (`ambient.ts`) kullanılmadan önce tanımlanır.
- Skia 2.x: path'ler `Skia.PathBuilder.Make()` ile kurulur, `detach()` ile çizilir. `StyleSheet.absoluteFillObject` yoktur, `FILL` (theme) kullanılır.
- Kullanıcıya görünen her metin `src/i18n/` içinde TR ve EN olarak bulunur (`strings.ts`, `content.ts`, `dialogues.ts`); testler eşleşmeyi kontrol eder.
- Görsel eklerken emoji, kare yer tutucu veya lisansı belirsiz dosya kullanılmaz. Yeni çizim `src/render/` içine yazılır, sonra `npm run sprites` çalıştırılır.

## Komutlar
```bash
npm test               # node:test, 107 test
npm run typecheck
npm run sprites        # PNG sprite + manifest
npm run preview-art    # görsel denetim sayfaları (art-preview/)
npm run simulate       # 210 günlük ekonomi simülasyonu
npm run sfx            # sesler
npm run brand          # ikon ve splash
npx expo export -p web && node scripts/serve-dist.mjs dist 8099 & E2E_URL=http://localhost:8099 npm run e2e   # tarayıcıda baştan sona
```

## Yeni içerik
`docs/CONTENT_GUIDE.md` adımlarını izle → `npm test` → `npm run preview-art` → E2E.
