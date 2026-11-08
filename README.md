# Luma Valley: Unutulmuş Vadi

Cozy macera, merge, mantık bulmacası ve köy onarımı bir arada. Oyun tamamen çevrimdışı çalışan bir Expo (SDK 58) / React Native oyunudur.

Oyuncu, büyükannesinden kalan eski bir fenerle solmuş bir vadiye gelir. Atölyede nesneleri birleştirir, **Işık Yolları** bulmacalarını çözer ve vadinin yapılarını onarır. Böylece yedi bölgeyi ve vadinin unutulmuş hikâyesini yeniden canlandırır.

## Hızlı başlangıç

```bash
npm install
npm run sprites        # el çizimi görünümlü sprite'ları üretir (assets/sprites + manifest)
npx expo start         # telefonda: Expo Go / development build; tarayıcıda: w
```

Telefonda test için `docs/MOBILE_TESTING.md` dosyasına bakın. Windows ve Mac için ayrı adımlar, Expo Go ile development build arasındaki farklar orada anlatılıyor.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm test` | 65 test: motor, merge-3/5, ekonomi, görevler, 80 bulmacanın doğrulanması, içerik bütünlüğü, kayıt ve migration, 5000 rastgele hamlelik dayanıklılık testi, uçtan uca senaryolar |
| `npm run typecheck` | TypeScript `--strict` kontrolü |
| `npm run simulate` | Ekonomi simülasyonu (günde 10, 30, 60 ve 120 dk oynayan ve az ödeyen oyuncu profilleri, 210 gün) |
| `npm run sprites` | Prosedürel çizimleri PNG'ye çevirir ve `assets/sprites/manifest.json` dosyasını yazar |
| `npm run preview-art` | Görsel denetim için kontak baskıları üretir (`art-preview/`) |
| `npm run sfx` | Bütün sesleri ve müziği sentezler (`assets/sfx/`) |
| `npm run brand` | İkon, splash ve favicon üretir |
| `npm run e2e` | Web build'i Chromium'da baştan sona oynar ve ekran görüntülerini kaydeder (`E2E_URL` ile) |

## Klasörler

```text
src/
  core/         tohumlu RNG, saat koruması
  content/      veri: aileler, üreticiler, bölgeler/yapılar, görevler, karakterler, başarılar, denge
  engine/       saf ve deterministik oyun motoru (komut → yeni durum + olaylar)
  puzzles/      Işık Yolları motoru, üreticisi ve 80 bulmacalık patika
  persistence/  çift slotlu, sağlama toplamlı kayıt; migration ve onarım
  services/     satın alma arayüzü (bu sürümde mağaza bağlı değil)
  render/       Skia ile prosedürel çizim: nesneler, üreticiler, portreler, harita, yapılar, bulmaca, ortam animasyonu
  screens/      Harita, Atölye, Görevler, Defter, Pazar, Bulmaca, diyalog ve kaplamalar
  state/        GameProvider: komutlar, kayıt, ses ve titreşim, bildirimler
  i18n/         Türkçe ve İngilizce arayüz metinleri, içerik adları, diyaloglar
tests/          node:test
scripts/        sprite/ses/marka üretimi, simülasyon, autoplay botu, E2E
docs/           tasarım, mimari, içerik rehberi, monetizasyon, test raporu, lisanslar
```

## Belgeler
- `docs/GAME_DESIGN.md`: oyun tasarımı, ilk 30 dakika, ilerleme
- `docs/ARCHITECTURE.md`: teknik mimari, determinizm, kayıt
- `docs/CONTENT_GUIDE.md`: yeni bölge, aile, görev ve bulmaca ekleme
- `docs/MONETIZATION.md`: Yaprak ve Işık Jetonu ekonomisi, IAP planı, güvenlik
- `docs/TEST_REPORT.md`: neler test edildi, sonuçlar, nelerin doğrulanmadığı
- `docs/ASSET_LICENSES.md`: bütün görsel ve sesler projeye ait ve prosedürel
- `docs/MOBILE_TESTING.md`: Windows veya Mac'ten iPhone ve Android'de test
- `docs/PROGRESS.md`: durum raporu

Önceki oyun (Işık Kementi) `v0.2-light-lasso` etiketinde ve `feat/light-lasso` dalında saklanıyor.
