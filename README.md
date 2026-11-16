# YazeSim

NoRiba'ya bağlı yapay zekâ sohbet ve simülasyon uygulaması. Web ve mobil sürümü olacak; kullanım NoR ile ödenir.

**Durum:** hazırlık. Önceki deneme inceleniyor; plan onaylanınca kod yazılmaya başlanır ve GitHub'da herkese açık depo açılır.

## Klasörler

- `external/` — İnceleme için dışarıdan gelen eski kodlar. Yalnız bu bilgisayarda durur; git'e ve GitHub'a hiçbir zaman girmez (`.gitignore`).

## Gizli bilgi kuralları

Depo herkese açık olacak, bu yüzden:

- Gizli bilgi (API anahtarı, özel anahtar, şifre) koda, commit'e ve dokümana yazılmaz. `.env` git dışında kalır; depoda yalnız `.env.example` olur.
- Yapay zekâ servisinin anahtarı yalnız sunucuda durur. Web ve mobil uygulamanın içine konmaz, çünkü uygulamanın içi indirilip okunabilir.
- Her commit'te ve CI'da gizli bilgi taraması (gitleaks) çalışır; GitHub'da gizli bilgi taraması ve itme koruması açılır.
- `external/` içindeki kod hiçbir zaman çalıştırılmaz, yalnız okunur. İçindeki gizli bilgiler sızmış sayılır ve yeni sistemde kullanılmaz.
