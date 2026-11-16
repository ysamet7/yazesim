# YazeSim

NoRiba.Finance'e bağlı yapay zekâ sohbet ve simülasyon uygulaması. Kullanıcı ihtiyacına göre bir **rol** seçer ve onunla konuşur: mesleğe göre **uzmanlar** (elektrik tesisatı, hukuk, sağlık, vergi…), **edebiyat** (Türk ve dünya edebiyatının büyük isimleri) ve **simülasyonlar** (iş mülakatı, pazarlık, dil pratiği…). Kullanım NoR ile, kullanıldığı kadar ödenir.

**Durum:** Faz 0 (iskelet). Ürün henüz kullanıma açık değildir. İlerleme: [`docs/PHASES.md`](docs/PHASES.md) · Plan: [`docs/plans/yazesim-v1.md`](docs/plans/yazesim-v1.md) · Kararlar: [`docs/DECISIONS.md`](docs/DECISIONS.md)

## Hızlı kurulum

Gerekenler: Node.js 24 LTS, pnpm (sürümü `package.json`'dan otomatik seçilir), Docker, Foundry 1.8.5, gitleaks, Git. Ayrıntı: [`docs/runbooks/YEREL-GELISTIRME.md`](docs/runbooks/YEREL-GELISTIRME.md).

```bash
git clone --recurse-submodules <depo-adresi> yazesim
```

```bash
cd yazesim && pnpm bootstrap
```

```bash
pnpm dev
```

`pnpm bootstrap` araçları denetler, bağımlılıkları kurar, yerel `.env` dosyalarını rastgele parolalarla üretir (hiçbiri ekrana basılmaz), Docker'da PostgreSQL, Redis ve yerel zinciri (Anvil) başlatır, veritabanı migrasyonlarını uygular ve yerel zincire test NoR'u yayınlar. Tekrar çalıştırmak güvenlidir.

| Servis | Adres                               |
| ------ | ----------------------------------- |
| Web    | http://localhost:3200               |
| API    | http://localhost:4200/api/v1/saglik |
| İşçi   | http://localhost:4210/saglik        |

Bütün denetimler (CI'daki ile aynı): `pnpm verify` · hızlısı: `pnpm verify --quick`.

## Yapı

| Klasör                  | İçerik                                                                          |
| ----------------------- | ------------------------------------------------------------------------------- |
| `apps/web`              | Next.js web uygulaması (Türkçe, mobil önce)                                     |
| `apps/api`              | NestJS REST API                                                                 |
| `apps/worker`           | NestJS + BullMQ arka plan işleri                                                |
| `packages/shared`       | Ortak tipler, ortam değişkeni şeması, NoR tutarları (`bigint`), zincir ayarları |
| `packages/server`       | Sunucu parçaları: log maskeleme, alan şifreleme, sağlık kontrolleri             |
| `packages/database`     | Prisma şeması ve migrasyonlar                                                   |
| `packages/test-support` | Testler için geçici veritabanı                                                  |
| `packages/config`       | TypeScript ve ESLint ayarları                                                   |
| `contracts`             | Yalnız test için sahte NoR (Foundry); ana ağa hiç yayınlanmaz                   |
| `infra/docker`          | Yerel PostgreSQL, Redis, Anvil                                                  |
| `scripts`               | `bootstrap`, `verify`, `infra:*`, `chain:local`, `repo:guard`                   |

## Güvenlik ve gizli bilgi

- Gizli bilgi (API anahtarı, özel anahtar, şifre) koda, commit'e ve dokümana yazılmaz. `.env` dosyaları git dışında kalır; depoda yalnız `.env.example` olur.
- Yapay zekâ servisinin anahtarı yalnız sunucuda durur; web uygulamasına konmaz.
- Her commit'te ve CI'da gitleaks çalışır; `external/`, inceleme raporu veya `.env` dosyası commit'e eklenemez.
- Ana ağa (Avalanche, 43114) işlem gönderen hiçbir şey açık onay olmadan çalışmaz; sahte NoR ana ağı her koşulda reddeder.
- Açık bildirme yolu: [`SECURITY.md`](SECURITY.md).

## Lisans

Tüm hakları saklıdır. Ayrıntı: [`LICENSE`](LICENSE).
