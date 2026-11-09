# 07 · Yazı tipi lisans denetimi

| Yazı tipi | Kaynak | Lisans | Ticari kullanım | Gömme / dağıtım | Bildirim | Yükleme |
|---|---|---|---|---|---|---|
| Nunito (500 Medium, 600 SemiBold, 700 Bold, 800 ExtraBold) | `@expo-google-fonts/nunito` 0.4.2 (Google Fonts'tan paketlenmiş), github.com/googlefonts/nunito | SIL Open Font License 1.1 | Evet | Evet; font tek başına satılamaz, adı korunan "Reserved Font Name" kuralları uygulanır | Telif satırı + OFL metni dağıtımla birlikte verilmeli | **Yerel**: paket içindeki `Nunito_*.ttf`, `useFonts` ile `require` (src/App.tsx) |

- Çalışma anında Google Fonts veya başka bir sunucuya font isteği **yok** (web akışında ağ trafiği kaydedildi: 0 dış istek).
- Telif satırı: "Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito)" — `node_modules/@expo-google-fonts/nunito/LICENSE_FONT`.
- Uygulama içi bildirim: Ayarlar → Açık kaynak lisansları ("Nunito yazı tipi ... SIL Open Font License 1.1"). Tam OFL metni: `legal/third-party-notices.md`.
- Türkçe karakterler (ç, ğ, ı, İ, ö, ş, ü): Nunito'nun Latin Extended kapsamında; tüm arayüz metinleri Türkçe olarak E2E ekran görüntülerinde doğru çiziliyor.
- Uygulama ikonu ve görsellerde yazı tipi yok. Skia çizimleri metin çizmiyor (tahtadaki seviye rakamları çizgiyle çiziliyor).
