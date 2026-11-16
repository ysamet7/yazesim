# Güvenlik politikası

YazeSim, kullanıcıların sohbetlerini (bazıları sağlık gibi özel nitelikli kişisel veri) ve NoR ile ödenen kredi bakiyelerini işler. Güvenlik açığı bildirimlerini ciddiye alıyor ve hızla yanıtlıyoruz.

## Açık bildirme

- Güvenlik açıklarını **herkese açık issue, PR veya tartışmada paylaşmayın.**
- Bildirimi GitHub'ın özel güvenlik bildirimiyle yapın: deponun **Security** sekmesinde **Report a vulnerability**. Bildirim yalnız depo yöneticilerine görünür.
- Bildiriminizde etkilenen bileşen (API, işçi, web, kontrat), yeniden üretme adımları ve olası etki yer alsın.
- Gerçek kullanıcı verisine erişmeyin, başkasının hesabını veya bakiyesini kullanmayın, test ağı dışındaki fonlara dokunmayın, hizmeti aksatacak yük denemesi yapmayın.

## Kapsam

| Bileşen                                   | Kapsamda                            |
| ----------------------------------------- | ----------------------------------- |
| `apps/api`, `apps/worker`, `apps/web`     | Evet                                |
| `packages/*`                              | Evet                                |
| `contracts/` (yalnız test için sahte NoR) | Evet, ancak ana ağa hiç yayınlanmaz |
| Yerel geliştirme yığını (`infra/docker`)  | Hayır; yalnız 127.0.0.1'e açıktır   |

Uygulama şu an geliştirme aşamasındadır; canlı kullanıcı yoktur.

## Taahhüdümüz

- Bildirimi 3 iş günü içinde teyit ederiz.
- Kritik açıklarda düzeltme önceliklidir; düzeltme yayımlanana kadar ayrıntılar paylaşılmaz.

## Geliştiriciler için

- Gizli bilgiler (özel anahtar, kurtarma kelimesi, API anahtarı, şifre) koda, teste, commit'e, log'a ve dokümana yazılmaz. Her commit gitleaks ile taranır; CI bütün geçmişi tarar; GitHub gizli bilgi taraması ve itme koruması açıktır.
- Yapay zekâ servisinin anahtarı yalnız sunucuda durur; `NEXT_PUBLIC_` ile başlayıp gizli bilgi adı taşıyan bir değişken web derlemesini durdurur.
- Sohbet içerikleri loglanmaz ve uygulama katmanında şifrelenir; `@yazesim/server` log alanlarını maskeler.
- Bağımlılıklar tam sürüme sabitlenir, 24 saatten yeni sürümler kurulmaz, yayın kaynağı güveni düşen paketler reddedilir (`pnpm-workspace.yaml`).
