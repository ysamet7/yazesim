# Çalışma dersleri (ajan notları)

Bir oturumda öğrenilen ve sonraki oturumların yeniden keşfetmemesi gereken şeyler. Kısa tutulur; eskiyen not silinir.

## Ortam

- Makine: macOS, Node 24, pnpm 12, Docker, Foundry, gh (girişli), gitleaks bu bilgisayarda kurulu.
- NoRiba deposu `~/Desktop/noriba` yalnız okunur; ortak kod oradan kopyalanıp uyarlanır, bağımlılık yapılmaz.
- `external/` asla çalıştırılmaz, git'e girmez.

## Paralel oturumlar

- Faz 1 tasarım oturumu aynı klasörde çalışabilir ve yalnız `docs/design/` altına yazar. Commit'lerde `git add -A` kullanılmaz; dosyalar adıyla eklenir.

## Dersler

- zsh'de `--include=*.ts` ve `echo ===` gibi `=`/glob içeren argümanlar hata verir; tırnak kullan. macOS'ta `timeout` komutu yok.
- Bash aracında karmaşık heredoc'lu komutlar güvenlik denetimine takılabilir; dosya yazmak için Write aracını kullan.
- `.env` dosyaları elle yazılmaz: `pnpm bootstrap --only=env` üretir (yeni `.env.example` anahtarı eklendiğinde de bu çalıştırılır).
- BullMQ: Redis'e hiç bağlanamamış Worker/Queue için `disconnect()` sonsuza dek bekler; `close(true)` kullan (apps/worker `closeWithin`).
- Zod 4'te `.superRefine` şemayı sarmaz; `schema.shape` hâlâ okunur (env örneği ↔ şema testi buna dayanır).
- pnpm `minimumReleaseAge` 24 saat: bir günden yeni sürüm kurulmaz; bir önceki sürümü seç.
