# Faz 0 — İskelet · sürüm notu

Tarih: 2026-11-16 · Dal: `faz-0-iskelet`

Bu faz kullanıcıya görünen bir özellik getirmez; sonraki fazların üzerine kurulacağı sağlam ve güvenli temeli kurar.

## Ne hazır

- **Tek komutla kurulum:** `pnpm bootstrap` temiz bir bilgisayarda araçları denetler, bağımlılıkları kurar, yerel ayar dosyalarını rastgele parolalarla üretir, veritabanını, Redis'i ve yerel test zincirini başlatır, test NoR'unu yayınlar. CI da aynı komutla kurar.
- **API:** sağlık kontrolü (`/api/v1/saglik`: veritabanı, Redis, zincir), sıkı güvenlik başlıkları, her hatada aynı biçimde Türkçe çevrilebilir hata gövdesi. Yanlış zincire bağlanırsa açılmayı reddeder (ana ağ koruması).
- **İşçi:** kuyruk işleri için ayrı süreç; sağlık kontrolü ve Redis kesintisinde bile takılmayan kapanış.
- **Web:** Türkçe, mobil önce, açık ve koyu temalı sade bir "hazırlanıyor" sayfası. Asıl görsel dil Faz 1'de seçilecek. Tarayıcıya gidecek ayarlar arasında gizli bilgi adı taşıyan bir değişken varsa derleme durur.
- **Veri güvenliği:** sohbet içeriği için uygulama katmanında şifreleme altyapısı hazır; loglar sohbet içeriğini ve gizli bilgiyi maskeler. Denetim kaydı tablosu veritabanı düzeyinde yalnız eklenebilir (silme ve değiştirme reddedilir). API ve işçi veritabanına kısıtlı bir kullanıcıyla bağlanır: tablo silemez, korumayı kapatamaz; tablo sahibi kullanıcı yalnız migrasyonlarda kullanılır.
- **Sahte NoR (yalnız test):** gerçek NoR'la aynı yapıda (18 ondalık, `permit` yok, sabit arz). Ana ağa yayın betiği her koşulda reddeder.
- **Kalite kapıları:** her commit'te biçim, gitleaks ve depo koruması; CI'da gizli bilgi taraması (bütün geçmiş), bağımlılık denetimi, lint, tip, birim, kontrat, veritabanı ve uçtan uca testler. GitHub eylemleri commit kimliğiyle sabit.

## Testler

| Paket       | Ne doğrulanıyor                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| shared      | NoR tutar biçimleme, zincir kilidi, ortam değişkeni kuralları (%100 kapsama)                              |
| server      | Log maskeleme, şifreleme, sağlık kontrolleri, hata gövdesi                                                |
| database    | Denetim kaydı değiştirilemez ve silinemez; uygulama kullanıcısı korumayı kapatamaz (gerçek PostgreSQL'de) |
| api, worker | Sağlık, güvenlik başlıkları, CORS, hata gövdesi, yanlış zincir reddi, gerçek kuyruk işi                   |
| web         | Güvenlik başlıkları, metin kataloğu (teknik kelime yok)                                                   |
| contracts   | Sahte NoR davranışı, ana ağ reddi                                                                         |
| scripts     | `.env.example` ↔ şema uyumu, üretilen ayarların geçerliliği, depo koruması                                |

## Bilerek sonraya bırakılanlar

- Playwright ekran testleri ve boyut bütçesi → Faz 1 (arayüz tasarımıyla).
- Sahte yapay zekâ sağlayıcısı → Faz 4 (`packages/ai` ile).
- Web'de nonce tabanlı CSP → Faz 4 (yapay zekâ çıktısı tarayıcıda gösterilmeden önce).

## Yusuf'tan beklenenler

- GitHub'da herkese açık deponun sahibi ve adı (onayla açılacak).
- Faz 1 tasarım yönü seçimi (ayrı oturumda hazırlanıyor).
