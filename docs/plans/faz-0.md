# Faz 0 — Depo iskeleti ve güvenlik temeli

Tarih: 2026-11-16 · Üst plan: `docs/plans/yazesim-v1.md` §10 · Durum: onaylandı (2026-11-16), uygulanıyor — ilerleme `docs/PHASES.md`

## Amaç

Ürün kodu yazılmadan önce, her şeyin üstüne kurulacağı zemini hazırlamak: tek komutla kurulan monorepo, yerel servisler (veritabanı, Redis, yerel zincir), ortak paketler, testler ve CI, gizli bilgi koruması, ve onayla açılan herkese açık GitHub deposu.

**Kapsam dışı:** Görsel tasarım (Faz 1), giriş (Faz 2), kredi defteri (Faz 3), sohbet (Faz 4). Faz 0'daki web sayfası yalnız "yakında" yer tutucusudur.

## Adımlar (her biri bir veya birkaç commit)

1. **Araç kontrolü.** Node 24 LTS, pnpm, Docker, Foundry, gh, gitleaks. Sürümler `toolchain.json`'da tek yerde; her paketin güncel kararlı sürümü resmi dokümanından doğrulanır. Eksik araç için kurulum komutu verilir (yönetici şifresi gerekenler Yusuf'ta).
2. **Yerel git.** `git init`, ilk commit `main`'de yalnız mevcut dosyalar (README, .gitignore, CLAUDE.md, docs). Ardından `faz-0-iskelet` dalı. İlk commit'ten önce: `git ls-files` içinde `external/` olmadığı ve gitleaks'in temiz olduğu doğrulanır.
3. **Monorepo kökü.** pnpm workspaces + sürüm kataloğu, Turborepo, `tsconfig` temeli (`strict`), ESLint (düz yapılandırma), Prettier, commitlint (Conventional Commits), lint-staged ve git kancaları. NoRiba'daki ayarlar kopyalanıp uyarlanır.
4. **Ortak paketler** (NoRiba'dan kopya + uyarlama, testleriyle):
   - `packages/config`: eslint, tsconfig, prettier.
   - `packages/shared`: NoR tutar biçimleme ve ayrıştırma (`bigint`), zincir ayarları (Anvil 31337, Fuji 43113, Avalanche 43114), zod env şeması, hata kodları, kanonik JSON.
   - `packages/server`: log maskeleme (sohbet içeriği ve gizli bilgi loga düşmez), AES-256-GCM alan şifreleme, anahtarlı özet, sağlık kontrolleri, yeniden deneme.
   - `packages/database`: Prisma kurulumu, ilk migrasyon (yalnız altyapı tablosu), tohum betiği iskeleti.
   - `packages/test-support`: geçici Postgres, geçici Anvil, sahte yapay zekâ sağlayıcısı arayüzü (Faz 4'te doldurulur).
5. **Uygulamalar** (en küçük çalışan hâlleri):
   - `apps/api`: NestJS; `/saglik` uç noktası, env doğrulaması, güvenlik başlıkları, tutarlı hata gövdesi, maskeli log.
   - `apps/worker`: NestJS bağımsız uygulama; BullMQ bağlantısı ve sağlık kontrolü.
   - `apps/web`: Next.js (App Router), Tailwind, next-intl (tr varsayılan), sıkı CSP iskeleti, "yakında" yer tutucu sayfa.
6. **Sahte NoR (yalnız test).** `contracts/`: Foundry projesi; OpenZeppelin ERC-20, 18 ondalık, `permit` yok. Anvil'e yayın betiği; betik chainId 43114'te `ALLOW_MAINNET=true` olmadan çalışmayı reddeder (testle).
7. **Yerel servisler.** `infra/docker/docker-compose.yml`: Postgres, Redis, Anvil; imaj sürümleri sabit.
8. **Betikler.** `pnpm bootstrap` (bağımlılıklar, yerel `.env` üretimi — rastgele yerel anahtarlar doğrudan dosyaya yazılır, ekrana basılmaz —, Docker, migrasyon, Anvil'e sahte NoR), `pnpm dev`, `pnpm verify` (tip, lint, test, gitleaks, boyut bütçesi; `--quick`), `pnpm chain:local`.
9. **`.env.example`.** Bütün değişken adları Türkçe açıklamalarıyla, değer olmadan: veritabanı ve Redis adresleri, `GEMINI_API_KEY`, hızlı/derin model adları, alan şifreleme ana anahtarı, oturum gizleri, zincir kimliği ve RPC, NoR ve kasa adresleri, `ALLOW_MAINNET`, yönetici adresleri, gömülü cüzdan istemci kimliği.
10. **Güvenlik dosyaları.** `.gitleaks.toml`; commit öncesi gitleaks; **depo koruma testi**: izlenen dosyalar arasında `external/` veya inceleme raporu varsa CI düşer. `SECURITY.md` (açık bildirme yolu), tüm hakları saklı bildirimi (ADR-010; hak sahibinin resmî adı Habib bey'den gelene kadar "YazeSim"), PR ve issue şablonları, Dependabot.
11. **CI** (GitHub Actions): kurulum, tip, lint, birim ve entegrasyon testleri (Postgres ve Redis servisleriyle), sözleşme testleri, gitleaks (tüm geçmiş), derleme, boyut bütçesi. Eylemler commit kimliğiyle sabitlenir, izinler en az düzeyde.
12. **Doküman.** README (Türkçe kurulum), `docs/runbooks/YEREL-GELISTIRME.md`, `docs/releases/faz-0.md`.
13. **Herkese açık depo (onayla).** Yusuf onaylayınca: depo sahibi ve adı sorulur (öneri `yazesim`), `gh repo create --public`, gizli bilgi taraması ve itme koruması açılır, `main` için dal koruması (PR + yeşil CI zorunlu). İlk itmeden hemen önce gitleaks tüm geçmişte tekrar koşar.
14. **Bağımsız inceleme ve PR.** Temiz bağlamlı alt ajan güvenlik ve kalite incelemesi; bulgular düzeltilir; PR açılır.

## Kabul ölçütleri

- Temiz bir makinede `pnpm bootstrap` tek komutla bitiyor; `pnpm dev` ile web, API ve işçi açılıyor; `/saglik` yeşil.
- `pnpm verify` ve CI yeşil; gitleaks temiz; depo koruma testi `external/` eklenince düşüyor (testle gösterilir).
- Sahte NoR Anvil'e yayınlanıyor; 43114 koruması testle doğrulanıyor.
- Hiçbir gizli bilgi depoda veya logda yok; `.env` git dışında.

## Yusuf'tan istenecekler

- Bu planın onayı.
- Depoyu açmadan önce: GitHub'da depo sahibi (kişisel hesap mı, kurum mu) ve depo adı; `gh auth status` sorun gösterirse tek komutluk giriş.
- Maliyet: yok (herkese açık depoda GitHub Actions ücretsiz).
