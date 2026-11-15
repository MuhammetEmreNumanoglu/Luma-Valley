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
7. `docs/CODEX_CHECKPOINT.md`, `docs/CODEX_REMAINING_TASKS.md`: master plan devam noktası

## Değişmez kurallar
- Oyun tamamen çevrimdışı çalışır. Backend, hesap veya reklam eklenmez (ürün sahibinin onayı olmadan).
- Motor (`src/engine`, `src/puzzles`) saf ve deterministik kalır: tohumlu RNG (`state.rng`), `now` parametre olarak gelir, `Math.random` ve `Date.now` kullanılmaz. `tests/fuzz.test.ts` determinizmi test eder.
- Her oyuncu eylemi `apply(state, command, now)` üzerinden geçer. Reddedilen komut durumu değiştirmez.
- Vadi kaynakları `src/content/valley.ts`'te veridir; kural `engine/nodes.ts`. Yeni görev isteği eklerken softlock testi (`tests/content.test.ts`) geçmeli.
- İki oyun içi para birimi vardır: **Altın** (kayıtta `leaves`) ve **Işık Jetonu** (kayıtta `starTokens`). İkisi ayrı kalır, birbirine dönüştürülmez ve yeni para birimi eklenmez. Tek seferlik altın ödülleri ve harcamaları `changeCoins` ile benzersiz işlem kimliğiyle yapılır. Işık Jetonu; tüccar yıldız paraları, günlük özel sipariş, günlük görev seti, Battle Pass, başarı/kozmetik koleksiyonları ile kazanılır; köprüler (B3+ 200/300/400/500), atölye alanları, Işık Mağazası kozmetikleri (tema, kart paketi, atölye görünümü, dekor) ve kolaylıklar (enerji, hızlandırma, envanter) için harcanır. Ana hikâye her zaman ücretsiz kazanılan jetonla ilerleyebilmelidir. (v5'teki "jeton kaldırıldı" kararı sonradan geri alındı; eski v5 dönüşümü kayıt migrasyonunda durur.)
- Gerçek ödeme kapalıdır: StoreKit/Apple Developer kurulmadan tahsilat yok. Gerçek ödül yalnızca doğrulanmış `grantPurchase` ile gelir; geliştirme mock'u (`premium/mock.ts`) oyuncu kaydına ücretli hak vermez. Sahte başarı gösterilmez.
- Beş malzeme (taş, ahşap, seramik, kabuk, kristal) yalnızca atölye kaynak engellerinden gelir (`content/resources.ts`, `engine/resources.ts`); birleştirme yalnızca bir ürünü aynı ürünün üzerine bırakınca olur (`mergeDrop`).
- Çizim kodu (`src/render`) oyun durumunu okur, değiştirmez. Worklet çizim fonksiyonları (`ambient.ts`) kullanılmadan önce tanımlanır.
- Skia 2.x: path'ler `Skia.PathBuilder.Make()` ile kurulur, `detach()` ile çizilir. `StyleSheet.absoluteFillObject` yoktur, `FILL` (theme) kullanılır.
- Kullanıcıya görünen her metin `src/i18n/` içinde TR ve EN olarak bulunur (`strings.ts`, `content.ts`, `dialogues.ts`); testler eşleşmeyi kontrol eder.
- Görsel eklerken emoji, kare yer tutucu veya lisansı belirsiz dosya kullanılmaz. Yeni çizim `src/render/` içine yazılır, sonra `npm run sprites` çalıştırılır.
- Yeni görsel/ses üretmek gerekirse `/asset-gen` skill'i kullanılır (godogen; ücretli API, önce ürün sahibinden onay). Üretilen dosya art-studio hattından geçer ve lisansı `docs/ASSET_LICENSES.md`'ye yazılır. Godogen'in `publish.sh`'ı bu depoya uygulanmaz (kendi `CLAUDE.md`'sini yazar).

## Komutlar
```bash
npm test               # node:test (258+ test)
npm run typecheck
npm run sprites        # PNG sprite + manifest
npm run preview-art    # görsel denetim sayfaları (art-preview/)
npm run simulate       # 210 günlük ekonomi simülasyonu
node --no-warnings --import ./scripts/ts-register.mjs scripts/simulate-season.ts 30 7,11,23   # Battle Pass 30 gün
node --no-warnings --import ./scripts/ts-register.mjs scripts/crate-pace.ts                   # ilk dakikalarda kutu
npm run balance -- 30  # bölge açılış günleri (5 tohum medyanı), en çok bekleten istekler
npm run sfx            # sesler
npm run brand          # ikon ve splash
npx expo export -p web && node scripts/serve-dist.mjs dist 8099 & E2E_URL=http://localhost:8099 npm run e2e   # tarayıcıda baştan sona
```

## Yeni içerik
`docs/CONTENT_GUIDE.md` adımlarını izle → `npm test` → `npm run preview-art` → E2E.
