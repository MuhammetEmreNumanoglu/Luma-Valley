# Yayın doğrulaması

| Alan | Durum |
|---|---|
| `app.json` geçerli, `expo-doctor` 20/20 | PASS |
| iOS Info.plist (introspect): gereksiz izin metni yok, `ITSAppUsesNonExemptEncryption=false`, privacy manifest yapılandırılmış | PASS |
| Android (introspect): targetSdk 36, gereksiz izinler engelli | PASS |
| EAS profilleri (development/preview/production) | Mevcut; `production` `autoIncrement` |
| Gerçek derleme ve imzalama | BLOCKED (hesap) |
| Privacy manifestin derlenmiş `PrivacyInfo.xcprivacy` içinde görünmesi | BLOCKED (iOS derlemesinde `.ipa` içinden kontrol edin) |
