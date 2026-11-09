# Varlık Lisansları

## Güncel görsel değişiklikleri

`assets/art/items/` altındaki eşya görselleri (inek, tavuk, buğday, mısır ve domates aşamaları ile hasat ürünleri dahil), `assets/art/producers/` altındaki üreticiler, `assets/art/props/` altındaki manifestte belirtilen ağaçlar, çalılar ve kayalar, `st_cottage` yapısının üç aşaması ve `assets/art/icons/` altındaki `icon_leaf`, `icon_token`, `icon_energy` görselleri bu projenin isteği üzerine OpenAI görsel üretimiyle oluşturulmuş, ardından uygulama boyutlarına küçültülmüştür. Bunlar aşağıdaki Kenney kaynağından render edilmiş varlıklar veya CC0 olarak tanımlanan dosyalar değildir. Her dosyanın kaynağı ve lisans durumu manifestte belirtilir; art-studio paketleyicisi bu dosyaları korur.

Görsel yenilemeyle birlikte oyunda **üçüncü taraf görsel varlıklar** var. Hepsi **CC0 1.0** lisanslı (kamu malı). Ticari kullanım, değiştirme ve atıf vermeden dağıtım serbesttir. Atıf zorunlu değil, ama biz yine de veriyoruz. Lisansı doğrulanamayan hiçbir dosya projeye alınmadı.

## 1. Kenney 3D kitleri (CC0 1.0)
Kaynak: https://kenney.nl/assets. Dosyalar github.com/eturner58/game-assets aynasından indirildi; her kitin `License.txt` dosyasında "Creative Commons Zero, CC0" yazıyor.

Kullanılan kitler: Fantasy Town Kit, Nature Kit, Food Kit, Survival Kit, Graveyard Kit, Mini Dungeon, Platformer Kit, Furniture Kit, Holiday Kit, Mini Market, Cube Pets, Pirate Kit, Castle Kit, Space Kit, Watercraft Pack.

**Nasıl kullanıldı:**
- 3D modeller pakete **ham hâliyle konmadı.** `scripts/art-studio/` içinde three.js ile aynı izometrik kamera ve ışıkla birleştirildi, renklendirildi ve PNG sprite olarak render edildi.
- Kit dosyaları depoya da eklenmedi. Böylece paketler olduğu gibi yeniden yayımlanmıyor.

| Çıktı | Adet | Dosyalar |
|---|---|---|
| Kalan yapılar (yıkık / onarımda / onarılmış, ev için 4 renk) | 102 | `assets/art/structures/` (kırpılmış, zemin çapası kayıtlı) |
| Kalan harita dekoru, 5 vadi süslemesi ve 2 dikenli çalı | — | `assets/art/props/` (yeni ağaçlar yukarıda belirtilmiştir) |
| 42 karakter portresi (Mini Characters, yeniden renklendirilmiş + özgün yüz düzeneği; Lumi tamamen özgün) | 42 | `assets/art/portraits/` |
| Kalan arayüz ikonları | 18 | `assets/art/icons/` (üç yeni üretilen ikon yukarıda belirtilmiştir) |

Envanter: `assets/art/manifest.json` (kimlik, dosya, boyut, çapa, kaynak, lisans).

Kaynak deposu olarak ayrıca **github.com/shorepine/kenney** incelendi. Bu depo Kenney kütüphanesinin bir aynası ve `LICENSE.txt` dosyası Kenney'nin resmî CC0 metni. Buradan ek bir 2D dosya alınmadı (gerekçe `VISUAL_INVENTORY.md` içinde).

## 2. Projeye ait özgün çalışmalar (kod ile üretildi)
| Varlık | Kaynak |
|---|---|
| Özgün 3D modeller: mumlar, kabuklar, dikenli çalı, saat kadranı, kubbe, fener odası, 18 ikon, Lumi, yüz ifadesi düzeneği | `scripts/art-studio/custom.js`, `portrait.html` (three.js ile kod) |
| Yedek portre ve ikon çizimleri (sprite yüklenemezse) | `src/render/portraits.ts`, `icons.ts` (Skia) |
| Harita zemini, su, yollar, sis | `src/render/map.ts` |
| Işık Yolları karoları, ortam animasyonları | `src/render/puzzle.ts`, `ambient.ts` |
| Yedek çizimler (sprite yüklenemezse) | `src/render/items.ts`, `producers.ts`, `structures.ts` |
| Üzüm, balkabağı ve karpuz aşamaları ile hasatları (15 sprite, `assets/art/items/item_{grape,pumpkin,melon}{Farm,Crop}_*.png`) | `src/render/crops.ts` (Skia), PNG: `scripts/gen-crop-art.ts` |
| Uygulama ikonu, splash | `scripts/gen-brand.ts` |
| 15 ses efekti ve müzik | `scripts/gen-sfx.mjs` (sentez) |

## 3. Kütüphaneler ve yazı tipi
| Varlık | Lisans |
|---|---|
| Nunito (Google Fonts) | SIL OFL 1.1 |
| three.js r187 (yalnızca render stüdyosunda; uygulamada yok) | MIT |
| CanvasKit / React Native Skia | BSD-3-Clause / MIT |

## 4. Değerlendirilen ama kullanılmayan kaynaklar
| Kaynak | Durum |
|---|---|
| Penzilla "Isometric RPG Village" (itch.io) | Ücretli (4 $ ve üzeri). **Satın alınmadı, kullanılmadı.** Satın alınırsa ZIP `scripts/art-studio` yerine doğrudan `assets/art/` altına aynı kimliklerle konabilir. |
| leviart, cocotaslab (itch.io) | Sayfalar bu ortamdan açılamadı; lisans doğrulanamadığı için **kullanılmadı.** |
| CraftPix ücretsiz paketleri | Lisansı CC0 değil (CraftPix lisansı, yeniden dağıtım kısıtlı). Kullanılmadı. |
| Tiddybub/2d-assets | Lisans dosyası doğrulanamadı. Kullanılmadı. |
| Kenney Isometric Miniature Farm (2D) | CC0. 3D kitlerle tek tip bir görünüm elde edildiği için ayrıca gerekmedi. |

Başka oyunlardan kopya yoktur. Yayından önce "Luma Valley" adı için marka araştırması yapılmalıdır.
