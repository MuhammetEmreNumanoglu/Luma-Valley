# İlerleme ve Açılma Şartları (v5)

> v5: Vadideki kaya/ağaç/kil/kristal noktaları ve Taş Ocağı, Kereste Bahçesi, Kil Ocağı, Gelgit Havuzu, Kristal Mağarası, Çömlek Fırını kaldırıldı. Taş ve ahşap başlangıçtan, seramik 2., deniz kabuğu 3., kristal 4. bölge açılınca **atölye kaynak teslimatıyla** gelir (`ITEM_SOURCES.md`).

Kaynak: `content/quests.ts` (görevler, bölgeler), `content/valley.ts` (vadi kaynakları), `content/progression.ts` (kutu havuzu, seviye ödülleri ve `levelUnlocks`). Seviye modalı "Seviye N ile açılanlar" listesini doğrudan `levelUnlocks` ile gösterir; vaat ile motor aynı veriden beslenir.

## Bölgeler

| Bölge | Açan görev | Önemli yapılar | Açılan vadi binaları / atölye kaynakları |
|---|---|---|---|
| 1 Güneş Çayırı | başlangıç | **Fener Taşı** (`r1_light`, `r1_shrine`: Işık Yolu 1–2), **Unutulmuş Bahçe** (`r1_garden1-3`: çiçek, meyve), **Mira'nın Evi** (`r1_mira`, `r1_cottage2-3`: odun, taş), kuyu, dere çarkı, köprü | Atölye: Büyük Kaya ve Kütük Yığını. Vadi: Çiçek Serası (Sv2), Çiftlik Ağılı (Sv3), Meyve Bahçesi (`r1_orchard`), Fener Taşı işleri (`r1_shrine`) |
| 2 Bal Rüzgârı Köyü | `r1_bridge3` (köprü) | fırın, değirmen, çömlek atölyesi, saat kulesi | Atölye: Eski Çömlek Yığını (seramik). Vadi: Tahıl Tarlası (`r1_bridge3`), Değirmen (`r2_windmill1`), Arı Kovanları (`r2_bees`), Dokuma (`r2_loom`) |
| 3 Fener Limanı | `r2_gate` | iskele, tekne, deniz feneri | Atölye: Deniz Kabuğu Kümesi |
| 4 Kızıl Yaprak Ormanı | `r3_bridge` | Bilge Ağaç | Atölye: Kristal Oluşumu |
| 5–7 | `r4_gate`, `r5_bridge`, `r6_gate` | kule, gözlemevi, **Büyük Fener** (final) | Kaynak kademeleri yükselir (Sv18+: 3, Sv26+: 4) |

Bölgeye dokunulunca açılan panel: yapının aşaması, **ilerleme yüzdesi**, her gereksinim için ürün adı, seviyesi, sahip olunan/istenen miktar (eksikse gri ikon + "Git"), eksik ürüne dokununca kaynak paneli. Görev henüz açılmadıysa önce bitmesi gereken görevler listelenir.

## Kilitlenmeyi önleme
- Bir görevin istediği her aile, o görev açılmadan önce **yenilenebilir** bir kaynaktan (kutu veya kurulmuş bina) elde edilebilir olmalıdır. Tek seferlik birikintiler hızlandırıcıdır, zorunlu değildir. `tests/content.test.ts` → "no softlock".
- Seviye bir kilit değildir: birleştirme her zaman XP verir.
- Vadi binası kurmanın bedeli (30–200 altın) ilk gelir kaynaklarından (sipariş, keşif, seviye) hızla karşılanır.

## Seviye ile açılanlar (özet)

| Seviye | Açılan |
|---|---|
| 2 | Kutuda Buğday Tarlası; Yaşlı Ağaç (ikinci); Çiçek Serası |
| 3 | Kutuda meyve; Çiftlik Ağılı; ikinci Büyük Kaya |
| 4 | Kutuda domates |
| 5 | Kutuda tahıl; buzağı işi; üçüncü kaya ve ağaç |
| 6 | Kutuda mısır |
| 8 | Bina işleri Sv2 ürün verir; kutuda fasulye |
| 9–11 | Kutuda arpa, mercimek; piliç, düve; Fener Taşı alev parçası (10) |
| 10 | Atölye kaynakları kademe 2 (Sv2 malzeme) |
| 12–15 | Değirmen un çuvalı, Dokuma kumaş topu, bina işleri Sv3 (14) |
| 18+ | Atölye kaynakları kademe 3 |
| 20+ | Sv4 bina işleri, parlak fener |
| 26+ | Atölye kaynakları kademe 4; hatıra kutusu |
| 27+ | Sv5 bina işleri |

## Görev türleri
- **Hikâye** (vadinin onarımı, yeni yerler), **Büyük proje** (çok aşamalı yapılar), **Yan görev** (Ada, Bera… isteğe bağlı). Görevler sekmesinde tür, giver, yapı, gereksinimler (ad + seviye + miktar), ödül ve bu görevin açtığı vadi binası gösterilir.
- **Sürekli:** siparişler (oyuncunun o an elde edebildiği ailelerden), tüccar işleri, günlük ve haftalık görevler, günlük Yankı bulmacası.
