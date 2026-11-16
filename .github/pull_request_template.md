## Ne yapıldı

<!-- Kısa özet ve gerekçe. İlgili faz maddesi veya ADR. -->

## Nasıl test edildi

<!-- Çalıştırılan komutlar, eklenen testler, elle yapılan kontroller. -->

## Ekran görüntüleri

<!-- Arayüz değiştiyse: 390 px ve 1440 px, açık ve koyu tema. -->

## Kontrol listesi

- [ ] `pnpm verify` geçiyor (testler, tip kontrolü, lint, gitleaks)
- [ ] Boş, yükleniyor, hata ve yetkisiz durumları ele alındı (arayüz değiştiyse)
- [ ] Yeni ortam değişkeni varsa `.env.example` ve `packages/shared/src/env.ts` güncellendi
- [ ] Sohbet içeriği, kişisel veri veya gizli bilgi loglanmıyor, koda veya teste yazılmadı
- [ ] NoR ve kredi tutarları her yerde tam sayı (`bigint`); ana ağ koruması gevşetilmedi
- [ ] Her yapay zekâ çağrısı kredi defterinden geçiyor (varsa)
- [ ] Doküman (README, ADR, `docs/PHASES.md`, runbook) güncellendi
