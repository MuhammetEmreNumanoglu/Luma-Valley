# 08 · Görsel varlık lisans denetimi

Kaynak envanter: `assets/art/manifest.json` (her dosya için kimlik, dosya, boyut, kaynak, lisans). Denetim betiği bütün `assets/art/**/*.png` dosyalarını manifestle karşılaştırdı: **manifestte olmayan dosya 0, dosyası olmayan kayıt 0.**

| Grup | Dosya | Kaynak | Lisans | Ticari kullanım | Atıf | Kanıt | Risk |
|---|---|---|---|---|---|---|---|
| Yapılar, portreler, dekor, ikonlar (Kenney render'ları) | 174 | Kenney 3D kitleri (Fantasy Town, Nature, Food, Survival, … `docs/ASSET_LICENSES.md`), `scripts/art-studio/` ile render | CC0 1.0 | Evet | Gerekmez (yine de veriliyor) | Kitlerin `License.txt` dosyaları (CC0); `docs/ASSET_LICENSES.md` | Düşük |
| Ürünler, üreticiler, bazı dekor/ikon/yapı (OpenAI görselleri) | 180 | Bu proje için OpenAI görsel üretimi, küçültülmüş | "OpenAI-generated; not represented as CC0" | OpenAI kullanım koşulları çıktının kullanıcıya ait olduğunu söyler; ticari kullanım koşullara bağlıdır | Gerekmez | Manifest kaydı; üretim istemleri/hesap kayıtları depoda **yok** | **Orta** (aşağıda) |
| Üzüm, balkabağı, karpuz (15) | 15 | `src/render/crops.ts` (Skia), `scripts/gen-crop-art.ts` | Özgün çalışma | Evet | — | Kod depoda | Düşük |
| Prosedürel sprite yedekleri | 187 | `scripts/gen-sprites.ts` | Özgün çalışma | Evet | — | Kod depoda | Düşük |
| Uygulama ikonu, splash, Android ikon katmanları, favicon | 6 | `scripts/gen-brand.ts` (Skia) | Özgün çalışma | Evet | — | Kod depoda | Düşük |

## AI üretimi görseller (180 dosya)

- Yapay zekâ çıktısı otomatik olarak telifsiz veya münhasır kabul edilmemeli: bazı ülkelerde insan katkısı olmayan çıktılar telif korumasından yararlanamayabilir, yani başkaları benzerini kullanabilir. Oyunun bu görsellerin kullanılması ihlal riski taşımaz; risk, **münhasırlık** ve olası benzerlik iddialarıdır.
- Hesap ve kullanım koşulları kaydı: görsellerin hangi OpenAI hesabıyla, hangi tarihte ve hangi koşullar altında üretildiğine dair kayıt depoda yok. Sizde varsa saklayın (18-manual-actions-required.md).
- Gerçek kişi, marka, logo veya tanınmış karakter benzerliği: tüm ürün görselleri gözden geçirildi (meyve, sebze, hayvan, tarla, malzeme, fener vb. genel nesneler); marka/karakter içeren görsel görülmedi.
- Mağaza görselleri: ekran görüntüleri oyunun gerçek görüntüsü olmalı; AI ile "daha güzel" mağaza görseli üretilmemeli.

## Durdurulması gereken dosya

Yok. Lisansı bilinmeyen dosya bulunmadı. (Kaldırılan fasulye/arpa/mercimek görselleri bu sürümde depodan zaten çıkarıldı.)

Kök dizindeki `ASSET_LICENSE_AUDIT.md` bu dosyaya yönlendirir.
