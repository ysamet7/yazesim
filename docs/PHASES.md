# YazeSim — Fazlar ve ilerleme

Yeni oturum buradan devam eder. Her adımın (commit'in) sonunda güncellenir. Ayrıntılı plan: `docs/plans/yazesim-v1.md`; fazın kendi planı: `docs/plans/faz-N.md`; çalışma dersleri: `docs/runbooks/AGENT-NOTES.md`.

## Şu an

- **Faz:** 0 — İskelet (plan onaylı, 2026-11-16)
- **Dal:** `faz-0-iskelet` (yerel; GitHub'a henüz itilmedi)
- **Son yapılan:** Yerel git açıldı; ilk commit `main`'de (yalnız dokümanlar).
- **Sıradaki adım:** Faz 0 adım 3 — monorepo kökü.
- **Bekleyen (Yusuf):** Gemini anahtarı (`.env`'e kendisi girecek); GitHub'da depo sahibi ve adı (adım 13'te sorulacak).
- **Adım 13'te sorulacak:** Commit'ler GitHub'ın gizli e-posta adresiyle (noreply) atılıyor, gerçek e-posta görünmez; dokümanlarda geçen ilk adların (Yusuf, Habib bey) herkese açık depoda kalması onaylanacak.
- **Paralel:** Faz 1 tasarım tuvali ayrı oturumda (yalnız `docs/design/` altına yazar; o dosyalar bu oturumun commit'lerine eklenmez).

## Faz 0 — İskelet · `docs/plans/faz-0.md`

- [x] 1. Araç kontrolü (node 24.22.2, pnpm 12.11.2, docker 29.9.2, foundry 1.8.5, gh 2.103.3 — girişli, gitleaks 8.30.1)
- [x] 2. Yerel git, ilk commit (`main`), `faz-0-iskelet` dalı
- [ ] 3. Monorepo kökü (pnpm, turbo, tsconfig, eslint, prettier, commitlint, husky)
- [ ] 4. Ortak paketler (config, shared, server, database, test-support)
- [ ] 5. Uygulamalar (api, worker, web)
- [ ] 6. Sahte NoR (contracts, 43114 koruması)
- [ ] 7. Docker (postgres, redis, anvil)
- [ ] 8. Betikler (bootstrap, dev, verify, chain:local)
- [ ] 9. `.env.example`
- [ ] 10. Güvenlik dosyaları ve depo koruma testi
- [ ] 11. CI
- [ ] 12. Doküman ve sürüm notu
- [ ] 13. Herkese açık depo (onayla)
- [ ] 14. Bağımsız inceleme ve PR

Notlar:
- (boş)

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
