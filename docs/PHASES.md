# YazeSim — Fazlar ve ilerleme

Yeni oturum buradan devam eder. Her adımın (commit'in) sonunda güncellenir. Ayrıntılı plan: `docs/plans/yazesim-v1.md`; fazın kendi planı: `docs/plans/faz-N.md`; çalışma dersleri: `docs/runbooks/AGENT-NOTES.md`.

## Şu an

- **Faz:** 0 — İskelet (plan onaylı, 2026-11-16)
- **Dal:** `faz-0-iskelet` (yerel; GitHub'a henüz itilmedi)
- **Son yapılan:** Ortak paketler, Docker yığını ve `pnpm bootstrap` (commit `10ddc7a`). Yerel yığın çalışıyor; veritabanı testleri gerçek Postgres'te geçti.
- **Sıradaki adım:** Faz 0 adım 5 — `apps/api` (NestJS, `/api/v1/saglik`), sonra `apps/worker`, `apps/web`.
- **Bekleyen (Yusuf):** Gemini anahtarı (`.env`'e kendisi girecek); GitHub'da depo sahibi ve adı (adım 13'te sorulacak).
- **Adım 13'te sorulacak:** Commit'ler GitHub'ın gizli e-posta adresiyle (noreply) atılıyor, gerçek e-posta görünmez; dokümanlarda geçen ilk adların (Yusuf, Habib bey) herkese açık depoda kalması onaylanacak.
- **Paralel:** Faz 1 tasarım tuvali ayrı oturumda (yalnız `docs/design/` altına yazar; o dosyalar bu oturumun commit'lerine eklenmez).

## Faz 0 — İskelet · `docs/plans/faz-0.md`

- [x] 1. Araç kontrolü (node 24.22.2, pnpm 12.11.2, docker 29.9.2, foundry 1.8.5, gh 2.103.3 — girişli, gitleaks 8.30.1)
- [x] 2. Yerel git, ilk commit (`main`), `faz-0-iskelet` dalı
- [x] 3. Monorepo kökü (pnpm, turbo, tsconfig, eslint, prettier, commitlint, husky)
- [x] 4. Ortak paketler (config, shared, server, database, test-support)
- [ ] 5. Uygulamalar (api, worker, web)
- [ ] 6. Sahte NoR (contracts, 43114 koruması)
- [x] 7. Docker (postgres, redis, anvil)
- [~] 8. Betikler (bootstrap, verify, infra, repo:guard hazır; sahte NoR yayını adım 6 ile eklenecek)
- [x] 9. `.env.example`
- [ ] 10. Güvenlik dosyaları ve depo koruma testi
- [ ] 11. CI
- [ ] 12. Doküman ve sürüm notu
- [ ] 13. Herkese açık depo (onayla)
- [ ] 14. Bağımsız inceleme ve PR

Notlar:
- Commit'ler (`faz-0-iskelet`): `83c50cb` kök · `aa4fb33` shared · `2698945` server · `0ae7fd2` database + test-support · `10ddc7a` Docker + betikler.
- Yerel portlar NoRiba ile çakışmasın diye: Postgres 5433, Redis 6380, Anvil 8546, API 4200, işçi 4210, web 3200.
- Ertelenenler: Playwright → Faz 1; sahte yapay zekâ sağlayıcısı → Faz 4 (`packages/ai` ile); geçici Anvil yardımcısı ve web zincir değişkenleri → Faz 5.
- CI yazılınca `scripts/src/lib/versions.test.ts`'e CI sürüm sabitleme testi geri eklenecek; web eklenince Prettier Tailwind eklentisi geri gelecek.

## Sonraki fazlar (ayrıntı `docs/plans/yazesim-v1.md` §10)

| Faz | Konu | Durum |
|---|---|---|
| 1 | Tasarım yönü | Ayrı oturumda tuval hazırlanıyor |
| 2 | Hesap ve giriş | Bekliyor |
| 3 | Kredi defteri ve fiyat | Bekliyor |
| 4 | Rol kataloğu ve sohbet | Bekliyor |
| 5 | NoR yükleme | Bekliyor |
| 6 | Yönetim ve güvenlik | Bekliyor |
| 7 | Kendini geliştirme | Bekliyor |
| 8 | Katalog ve cila | Bekliyor |
| 9 | Canlıya hazırlık | Bekliyor |
