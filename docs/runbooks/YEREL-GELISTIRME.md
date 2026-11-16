# Yerel geliştirme

Bu rehber YazeSim'i kendi bilgisayarında çalıştırmak içindir. Komutlar depo kökünde çalıştırılır.

## 1. Araçlar

| Araç     | Sürüm                             | macOS kurulumu                            |
| -------- | --------------------------------- | ----------------------------------------- |
| Node.js  | 24 LTS (`.nvmrc`)                 | `brew install node@24` veya `nvm install` |
| pnpm     | `package.json` → `packageManager` | `corepack enable` (Node ile gelir)        |
| Docker   | Docker Desktop, servis açık       | `brew install --cask docker`              |
| Foundry  | 1.8.5 (`toolchain.json`)          | `foundryup --install v1.8.5`              |
| gitleaks | 8.19 veya üstü                    | `brew install gitleaks`                   |
| Git      | 2.40 veya üstü                    | `brew install git`                        |

`pnpm bootstrap` ilk adımda bunları denetler; eksik olanın kurulum komutunu yazar.

## 2. Kurulum

Depoyu alt modülüyle (forge-std) birlikte indirin, sonra:

```bash
pnpm bootstrap
```

Adımlar (her biri tekrar çalıştırılabilir; var olan değerler ve veriler korunur):

1. `tools` — araç sürümleri ve boş disk alanı
2. `install` — `pnpm install --frozen-lockfile`
3. `env` — `.env.example` şablonlarından yerel `.env` dosyaları: `infra/docker/.env`, `apps/api/.env`, `apps/worker/.env`, `apps/web/.env.local`, `packages/database/.env`. Parolalar ve şifreleme anahtarları rastgele üretilir, dosyalara `0600` izniyle yazılır, ekrana basılmaz.
4. `docker` — PostgreSQL (5433), Redis (6380), Anvil (8546); hepsi yalnız `127.0.0.1`'de
5. `db` — migrasyonlar, Prisma istemcisi ve uygulamanın kısıtlı veritabanı kullanıcısı (`yazesim_app`). API ve işçi bu kullanıcıyla bağlanır; tablo sahibi kullanıcı (`yazesim`) yalnız migrasyonlarda ve testlerde kullanılır.
6. `chain` — yerel zincire test NoR'u yayınlama; adres API ve işçi `.env` dosyalarına yazılır

Yalnız bazı adımlar: `pnpm bootstrap --only=env,db` · bazılarını atlamak: `pnpm bootstrap --skip=tools`.

Portlar, aynı bilgisayardaki başka projelerin (ör. NoRiba) varsayılan portlarıyla çakışmasın diye seçildi. Değiştirmek için `infra/docker/.env` içindeki `*_PORT` değerlerini düzenleyip `pnpm bootstrap --only=env,docker` çalıştırın.

## 3. Çalıştırma

```bash
pnpm dev
```

Web (3200), API (4200) ve işçi (4210) birlikte açılır. Sağlık uç noktaları: `http://localhost:4200/api/v1/saglik`, `http://localhost:4210/saglik`.

## 4. Yapay zekâ anahtarı (Faz 4'ten itibaren)

`apps/api/.env` içindeki `GEMINI_API_KEY` satırına anahtarınızı **kendiniz** yazın. Anahtarı sohbete, koda, commit'e veya dokümana yazmayın; yalnız sunucu tarafındaki bu dosyada durur. Anahtar olmadan da her şey çalışır; sohbet Faz 4'te gelecek.

## 5. Denetimler

| Komut                 | Ne yapar                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`         | CI'daki her şey: gitleaks, depo koruması, bağımlılık denetimi, biçim, lint, tip, testler, derleme, veritabanı ve uçtan uca testler |
| `pnpm verify --quick` | Yerel yığın gerektirmeyenler                                                                                                       |
| `pnpm test`           | Birim testleri                                                                                                                     |
| `pnpm repo:guard`     | İzlenen dosyalarda `external/`, inceleme raporu veya `.env` var mı                                                                 |

Commit'ten önce git kancaları biçimlendirir, depo korumasını ve gitleaks'i çalıştırır; commit mesajı Conventional Commits biçiminde olmalıdır.

## 6. Yerel yığını yönetme

| Komut                    | Ne yapar                                                       |
| ------------------------ | -------------------------------------------------------------- |
| `pnpm infra:up`          | Docker servislerini başlatır                                   |
| `pnpm infra:down`        | Durdurur (veriler korunur)                                     |
| `pnpm infra:logs`        | Logları izler                                                  |
| `pnpm infra:reset --yes` | **Yerel veritabanını, Redis'i ve zinciri kalıcı olarak siler** |
| `pnpm chain:local`       | Anvil'i başlatır, test NoR yoksa yayınlar                      |

## Sorun giderme

- **"Veritabanı parolası reddedildi":** `infra/docker/.env` silinip yeniden üretilmiş ama eski veritabanı duruyor. `pnpm infra:reset --yes && pnpm bootstrap`.
- **Port kullanımda:** `infra/docker/.env` içindeki portu değiştirin, `pnpm bootstrap --only=env,docker`.
- **API "RPC reports chain …" diyerek açılmıyor:** `RPC_URL` başka bir zinciri gösteriyor. Ana ağa yanlışlıkla bağlanmayı önleyen koruma budur; `apps/api/.env` içindeki `CHAIN_ID` ve `RPC_URL` değerlerini kontrol edin.
- **`forge` alt modül hatası:** `git submodule update --init --recursive`.
