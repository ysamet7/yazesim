# YazeSim — Fazlar ve ilerleme

Yeni oturum buradan devam eder. Her adımın (commit'in) sonunda güncellenir. Ayrıntılı plan: `docs/plans/yazesim-v1.md`; fazın kendi planı: `docs/plans/faz-N.md`; çalışma dersleri: `docs/runbooks/AGENT-NOTES.md`.

## Şu an

- **Faz:** 0 — İskelet (plan onaylı, 2026-11-16)
- **Dal:** `faz-0-iskelet` (yerel; GitHub'a henüz itilmedi)
- **Son yapılan:** Bağımsız inceleme yapıldı (2 yüksek, 2 orta, 9 düşük bulgu); hepsi testleriyle düzeltildi (commit `e3bc9bd` … `1ed73cc`). `pnpm verify` (tam) yerelde yeşil.
- **Sıradaki adım:** Adım 13 — Yusuf'a GitHub deposunun sahibi/adı ve herkese açık yayın onayı sorulur; onayla depo açılır, korumalar açılır, dal itilir, PR açılır (birleştirme Yusuf'un onayıyla).
- **Bekleyen (Yusuf):** Gemini anahtarı (`.env`'e kendisi girecek); GitHub'da depo sahibi ve adı (adım 13'te sorulacak).
- **Adım 13'te sorulacak:** Commit'ler GitHub'ın gizli e-posta adresiyle (noreply) atılıyor, gerçek e-posta görünmez; dokümanlarda geçen ilk adların (Yusuf, Habib bey) herkese açık depoda kalması onaylanacak.
- **Paralel:** Faz 1 tasarım tuvali ayrı oturumda (yalnız `docs/design/` altına yazar; o dosyalar bu oturumun commit'lerine eklenmez).

## Faz 0 — İskelet · `docs/plans/faz-0.md`

- [x] 1. Araç kontrolü (node 24.22.2, pnpm 12.11.2, docker 29.9.2, foundry 1.8.5, gh 2.103.3 — girişli, gitleaks 8.30.1)
- [x] 2. Yerel git, ilk commit (`main`), `faz-0-iskelet` dalı
- [x] 3. Monorepo kökü (pnpm, turbo, tsconfig, eslint, prettier, commitlint, husky)
- [x] 4. Ortak paketler (config, shared, server, database, test-support)
- [x] 5. Uygulamalar (api, worker, web)
- [x] 6. Sahte NoR (contracts, 43114 koruması)
- [x] 7. Docker (postgres, redis, anvil)
- [x] 8. Betikler (bootstrap, verify, infra, repo:guard, chain:local)
- [x] 9. `.env.example` (model adları Faz 4'te, oturum gizleri ve gömülü cüzdan kimliği Faz 2'de, onları okuyan kodla eklenecek: şablon ↔ şema eşitlik testi kullanılmayan değişkene izin vermez)
- [x] 10. Güvenlik dosyaları ve depo koruma testi
- [x] 11. CI (yerelde doğrulandı; GitHub'da ilk koşu adım 13'ten sonra)
- [x] 12. Doküman ve sürüm notu (`docs/releases/faz-0.md`)
- [ ] 13. Herkese açık depo (onayla)
- [~] 14. Bağımsız inceleme ve PR (inceleme ve düzeltmeler tamam; PR adım 13'ten sonra)

Notlar:
- Commit'ler (`faz-0-iskelet`): `83c50cb` kök · `aa4fb33` shared · `2698945` server · `0ae7fd2` database + test-support · `10ddc7a` Docker + betikler · `3b1ae49` api · `bf6ebdc` worker · `d83507a` web · `c8e35f1` sahte NoR · `427146b` CI + güvenlik + dokümanlar · `b58beb2` ilerleme · inceleme düzeltmeleri: `e3bc9bd` log maskeleme · `145ed17` depo koruması · `1316455` kısıtlı veritabanı kullanıcısı · `1ed73cc` düşük bulgular.
- Yerel portlar NoRiba ile çakışmasın diye: Postgres 5433, Redis 6380, Anvil 8546, API 4200, işçi 4210, web 3200 (hepsi yalnız 127.0.0.1).
- Veritabanı: API ve işçi kısıtlı `yazesim_app` kullanıcısıyla (`yazesim_app_rw` grubu) bağlanır; tablo sahibi `yazesim` yalnız migrasyon ve testlerde. Yeni her tablo kendi migrasyonunda bu gruba yetkilendirilir (yalnız eklenen tablolar: SELECT ve INSERT); `privileges.db-spec.ts` unutulanı yakalar.
- Faz 5'e not: zinciri okuyan kod ilk kullanımdan önce zincir kimliğini yeniden doğrulamalı (açılıştaki kontrol RPC'ye ulaşamazsa yalnız uyarır).
- Ertelenenler: Playwright → Faz 1; sahte yapay zekâ sağlayıcısı → Faz 4 (`packages/ai` ile); geçici Anvil yardımcısı ve web zincir değişkenleri → Faz 5.
- Boyut bütçesi CI'a Faz 1'de (asıl arayüzle) eklenecek. LICENSE metnindeki hak sahibi adı ADR-010 için Habib bey'in onayını bekliyor.

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
