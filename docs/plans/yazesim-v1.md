# YazeSim v1 — Ürün ve Teknik Plan

Tarih: 2026-11-16 · Onaylanınca `docs/plans/yazesim-v1.md` olarak depoya girer (açık depo: önceki denemenin ayrıntısı ve gizli bilgi yok).

## 1. Bağlam

YazeSim; NoRiba'ya bağlı, NoR ile ödenen bir yapay zekâ sohbet ve simülasyon uygulaması (NoRiba ADR-087). Önceki deneme incelendi (`external/inceleme-raporu.md`, git dışı): taşınacak kod yok, ürün baştan yazılır. Yusuf'un 2026-11-16 istekleri: mesleğe göre kategorilere ayrılmış roller (ör. elektrik tesisatı, hukuk, sağlık), edebiyat gibi alanlar, çok üst düzey ve "yapay zekâ yapmış gibi" durmayan görünüm, üst seviye mobil uyum, hız, gereksiz kredi çekmeyen token kullanımı, arka planda kendini geliştiren sistem, iyi kurulmuş NoR ↔ kredi dengesi.

Kararlar `docs/DECISIONS.md`'de: ADR-001 rol kataloğu ve gerçek kişi ilkesi · 002 edebiyat · 003 kendini geliştirme · 004 önce web + PWA · 005 önce Gemini · 006 yüklemede kilitlenen kur · 007 kasaya doğrudan gönderim · 008 fatura şirkette, NoR hazineye · 009 cüzdan + e-posta girişi · 010 tüm hakları saklı · 011 18+ ve katmanlı güvenlik · 012 uzman rolleri kısıtlamasız ve somut, rol kalitesi.

**Hedef:** Türkçe yapay zekâ sohbet uygulamaları arasında en iyi kullanım deneyimi; adil, öngörülebilir ve israfsız NoR/kredi ekonomisi; canlıya hazır kalite.

---

## 2. Ürün

### 2.1 Bilgi mimarisi ve ana ekranlar

| Ekran | Amaç | Öne çıkanlar |
|---|---|---|
| **Keşfet** (ana sayfa) | İki dokunuşta doğru role ulaşmak | Üstte tek büyük kutu: "Sorununu yaz, doğru uzmanı bulalım" (yerel arama, yapay zekâ çağrısı yok). Altında bölüm sekmeleri (Uzmanlar · Edebiyat · Simülasyonlar), kategori şeridi, son kullanılan roller |
| **Kategori** | Bir meslek alanındaki roller | Rol kartları: kim olduğu, neler yapar, örnek soru |
| **Rol sayfası** | Güven ve beklenti | Neler yapar, uzmanlık alanları, örnek başlangıç soruları, modlar (edebiyatta: Sohbet · Birlikte yaz · Metnimi değerlendir · Eser üzerine), mesaj başı yaklaşık kredi |
| **Sohbet** | Ana deneyim | Akan yanıt, durdur, yeniden üret, kopyala, beğen/beğenme (nedenli), "Hızlı / Derin" anahtarı, mesaj altında sade kredi bilgisi, acil durum kartı, çok satırlı giriş, klavye ve güvenli alan uyumu |
| **Sohbetlerim** | Geçmiş | Arama, rol filtresi, sil, "iz bırakmayan sohbet" |
| **Cüzdan ve Kredi** | Bakiye ve yükleme | Bakiye, "NoR yükle" adımları (tutar → bugünkü kurla kredi karşılığı → cüzdandan gönder → zincirde bekleniyor → yüklendi), hareket geçmişi, aylık kullanım özeti, günlük harcama sınırı ayarı |
| **Giriş** | Sürtünmesiz | E-postayla giriş (arka planda cüzdan) veya cüzdanla imza; 18+ beyanı; aydınlatma metni |
| **Ayarlar ve Gizlilik** | Kontrol kullanıcıda | Tema, yazı boyutu, kişisel bellek (aç/kapa, gör, sil), iyileştirmeye katkı izni, verimi indir, hesabı sil |
| **Yönetim** (`/yonetim`) | İşletim | Rol ve sürüm yönetimi, iyileştirme önerileri ve deneyler, şikâyet kuyruğu, fiyat/kur/bütçe ayarları, maliyet ve kalite panosu, denetim kaydı |

Her ekranda boş, yükleniyor, hata, yetkisiz, bakiye yetersiz ve çevrimdışı durumları tasarlanır.

### 2.2 Rol kataloğu (ilk sürüm, ~50 rol; içerik yazımı fazlara yayılır)

Rol = sürümlü veri: `slug`, bölüm, kategori, ad, kısa tanım, rol kartı (§2.4), talimat, varsayılan düzey (Hızlı/Derin), çıktı tavanı, token bütçesi, acil durum tetikleyicileri (varsa), gerekli izin (yalnız sağlıkta KVKK açık rızası), başlangıç soruları, test seti.

- **Uzmanlar:**
  - Ev ve Yapı: Elektrik Tesisatı, Sıhhi Tesisat, Doğalgaz ve Kombi, Tadilat ve Boya, İç Mimar
  - Hukuk: Kira ve Konut, İşçi Hakları, Tüketici Hakları, Aile Hukuku, Trafik ve Sigorta
  - Sağlık (KVKK açık rızası): Aile Hekimi, Eczacı, Beslenme, Psikolog, Veteriner
  - Para ve İş: Mali Müşavir (muhasebe ve vergi), Bütçe ve Faizsiz Finans, Girişimcilik, E-ticaret
  - Teknoloji: Yazılım, Bilgisayar ve Telefon Teknisyeni, Kişisel Siber Güvenlik
  - Araç: Oto Ustası · Tarım: Ziraat ve Bahçe · Eğitim: Matematik, İngilizce, Sınav Koçu · Kariyer: İK ve CV · Mutfak: Aşçı
  - Din ve Kültür: İlahiyat Bilgisi (kaynak gösterir, kendi adına konuşur; ADR-001)
- **Edebiyat (ADR-002):** Türk ve dünya edebiyatından vefat etmiş yazarlar. Telifi bitmişler (ör. Yunus Emre, Fuzûlî, Namık Kemal, Tevfik Fikret, Ömer Seyfettin, Mehmet Âkif, Sabahattin Ali, Orhan Veli, Sait Faik; Dante, Shakespeare, Cervantes, Goethe, Victor Hugo, Dostoyevski, Tolstoy, Çehov, Kafka, Poe, Mevlânâ, Hayyam, Virginia Woolf, Stefan Zweig, Orwell) alıntı yapabilir; telifi sürenler (ör. Nazım Hikmet, Tanpınar, Yahya Kemal, Peyami Safa, Camus) "üslubundan esinlenen" sınıfta, uzun alıntısız. Liste Yusuf'un onayıyla kesinleşir.
- **Simülasyonlar:** İş Mülakatı Provası (sonunda puan karnesi), Maaş ve Kira Pazarlığı, Zor Konuşma Provası, Dil Pratiği (İngilizce, Almanca, Arapça), Tarihî Olay Canlandırma; Habib bey'in özgün kurgu karakterleri izniyle ve yeniden yazılmış metinle.
- **İçerik ilkeleri (ADR-001 ve ek):** Kutsal varlık adına birinci şahıs yok; yaşayan siyasetçi yok; yaşayan kişi yalnız yazılı izinle. Ek: Atatürk canlandırılmaz (5816 sayılı Kanun riski); tarihî kişiler yalnız "tarihî canlandırma" etiketiyle, nefret ve aşağılama içermeyecek kurallarla.

### 2.3 Uzman rolleri: kısıtlamasız ve somut (ADR-012, altın kural 10)

- Roller gerçek bir kıdemli uzman gibi doğrudan cevap verir: adım adım iş tarifi, malzeme ve alet listesi, ilaç adı ve genel doz bilgisi, kanun maddesi ve dilekçe taslağı, hesap ve rakam. Bizden ret, kaçamak, "uzmana danışın" kalıbı ve yanıt sonu uyarısı eklenmez.
- Gemini'nin ayarlanabilir güvenlik filtreleri izin verilen en serbest düzeyde; kapatılamayan çekirdek korumaları ve kullanım politikası geçerli kalır.
- **Acil durum kartı** (kural tabanlı, yapay zekâ çağrısı yok, yanıtı engellemez): "çarpıldım", "gaz kokusu", "nefes alamıyor" gibi can güvenliği kalıplarında yanıtın üstünde küçük bir kart (112; elektrik arıza 186; doğalgaz acil 187; numaralar yayından önce resmî kaynaktan doğrulanır). Yanıt tam verilir; ilk adımı gerçek bir uzmanın söyleyeceği gibi söyler.
- Sağlık rollerine ilk girişte KVKK açık rızası (m.6): veriyle ilgili yasal zorunluluk, yanıtı kısıtlamaz.
- Yapay zekâ olduğu bilgisi rol sayfasında ve kullanım koşullarında bir kez; kullanıcı açıkça sorarsa rol de söyler. Kullanım koşullarındaki sorumluluk maddesini hukukçu yazar (H7).

### 2.4 Rol kalitesi: rol kartı şartnamesi

Her rol yazılmadan önce bir rol kartı doldurulur; talimat bu karttan üretilir ve test setiyle ölçülür:

| Alan | Örnek (Elektrik Tesisatı) |
|---|---|
| Kimlik ve deneyim | 25 yıllık, konut ve küçük işyeri tesisatında çalışmış usta |
| Uzmanlık derinliği | Sigorta ve kaçak akım rölesi seçimi, kablo kesiti hesabı, topraklama, priz-anahtar-avize montajı, arıza bulma, pano yenileme |
| Türkiye bağlamı | Elektrik İç Tesisleri Yönetmeliği, ilgili TSE standartları, dağıtım şirketi ve sayaç işlemleri, piyasadaki malzeme markaları ve yaklaşık fiyatlar |
| Yanıt yapısı | Önce doğrudan cevap → gerekli malzeme ve alet → numaralı adımlar → dikkat edilecek nokta → yaklaşık maliyet ve süre |
| Netleştirme | Yalnız cevap gerçekten değişecekse tek soru (ör. "bina kaç yıllık, sigortalar otomatik mi?") |
| Üslup | Samimi, kendinden emin, gereksiz uzatmayan usta dili |
| Test seti | 15–30 gerçekçi soru; doğruluk, somutluk, uzmanlık derinliği, Türkiye'ye uygunluk ve gereksiz uyarı/kaçamak yokluğu puanlanır |

- Rol talimatı bütçesi **2.000 token**: sabit önek önbellekten indirimli faturalandığı için zengin talimatın maliyet farkı küçüktür; bütçe testle denetlenir.
- Hukuk ve diğer mevzuata dayalı roller için kanun ve yönetmelik metinleri bilgi tabanı olarak eklenir (serbest kullanılabilir, FSEK m.31): rol güncel madde numarasıyla konuşur (Faz 8).
- Yayından önce her kategoriden örnek yanıtlar gerçek bir meslek sahibine okutulur (Yusuf ve Habib bey'in çevresinden usta, avukat, hekim).
- Kendini geliştirme döngüsü (§7) rol kalitesini sürekli ölçer ve iyileştirme önerir.

---

## 3. Mimari

```
apps/
  web/        Next.js (App Router): arayüz, /yonetim, PWA (kurulabilir, bildirim)
  api/        NestJS: REST + akış (SSE), giriş, sohbet, kredi, yönetim
  worker/     NestJS (BullMQ): zincir izleyici, kur örnekleyici, özetleme, mutabakat,
              haftalık iyileştirme, test seti koşucusu, saklama süresi temizliği
packages/
  shared/     zod şemaları, tipler, env şeması, zincir ayarları, NoR ve kredi biçimleme
  server/     ortak NestJS parçaları: log maskeleme, alan şifreleme, hata gövdesi, sağlık, yeniden deneme
  database/   Prisma şeması, migrasyonlar, tohum veri
  ai/         sağlayıcı arayüzü + Gemini uyarlayıcısı, bağlam kurucu, token tahmini, fiyat hesabı
  personas/   rol ve kategori verisi (zod şemalı), test setleri, token bütçe testleri
  ui/         tasarım tokenları ve bileşenler
  test-support/ geçici Postgres ve Anvil, deterministik sahte yapay zekâ sağlayıcısı
  config/     eslint, tsconfig, prettier
contracts/    yalnız test için sahte NoR (OpenZeppelin ERC-20, 18 ondalık, permit yok) — Foundry
infra/docker/ docker-compose: postgres, redis, anvil
scripts/      bootstrap, verify, chain:local, deposit:test
docs/         DECISIONS.md, plans/, runbooks/, legal/, design/
```

**NoRiba'dan kopyalanıp uyarlanacaklar** (bağımlılık değil kopya; NoRiba özel depo):
- `packages/shared/src/amount.ts` (`formatNoR`, `parseNoR`, `WEI_PER_NOR`), `chains.ts` (anvil/fuji/avalanche), `env.ts` deseni, `errors.ts`, `canonical-json.ts`
- `packages/server/src/logging/` (pino seçenekleri, `scrub`), `crypto/field-cipher.ts` (AES-256-GCM), `crypto/keyed-hash.ts`, `errors/`, `health/`, `retry/`
- `apps/api/src/auth/` (SIWE servisi, oturum, çerezler, belirteç dönüşü, iptal listesi, oturum koruyucu), `rate-limit/`, `consent/` deseni
- `apps/web/src/lib/wallet/embedded.ts` (gömülü cüzdan, K6 denemesi)
- `.gitleaks.toml`, `.github/workflows/ci.yml` deseni, commitlint, lint-staged, prettier, `toolchain.json` (Node 24.21.0, gitleaks 8.30.1, Foundry 1.8.5)

**Yığın:** NoRiba ile aynı sürüm ailesi (Next.js 16.4, Tailwind 4.3, Prisma 7.10, Playwright 1.64, Node 24 LTS); iskelette her paketin güncel kararlı sürümü resmi dokümandan doğrulanır. Gemini için Google'ın resmi `@google/genai` SDK'sı. Akış: API'den SSE; WebSocket gerekmez.

**Ortamlar:** yerel (Docker + Anvil + sahte NoR + sahte veya gerçek Gemini anahtarı), staging (Fuji test NoR, sabit kur), canlı (ana ağ NoR, havuz kuru; ana ağ izleyicisi yalnız açık onayla açılır). Sunucu bölgesi hukuk görüşüyle (öneri: AB, Frankfurt).

---

## 4. Veri modeli (özet; ayrıntı Prisma şemasında)

| Alan | Tablolar |
|---|---|
| Hesap | `User` (yaş beyanı, rol: kullanıcı/yönetici, durum), `Wallet` (adres, kaynak: imza/gömülü, bağlanma zamanı), `RefreshToken` (hash'li, iptal edilebilir), `Consent` (belge türü, sürüm, zaman) |
| Roller | `Category`, `Persona`, `PersonaVersion` (talimat, düzey, tavan, bütçe, durum, onaylayan, yayın yüzdesi) |
| Sohbet | `Conversation` (rol, başlık şifreli, özet şifreli, "iz bırakmayan" bayrağı), `Message` (içerik şifreli, durum: tamam/durduruldu/hata/reddedildi, rol sürümü), `Feedback` (puan, neden kodu) |
| Kullanım | `AiCall` (sağlayıcı, model, girdi/önbellek/çıktı token, sağlayıcı maliyeti mikro-$, düşülen kredi, ilk kelime süresi, idempotency anahtarı) |
| Kredi | `CreditBalance` (kullanılabilir, ayrılmış; veritabanı kısıtı ≥ 0), `LedgerEntry` (yalnız eklenir; tür: yükleme/hediye/ayırma/serbest bırakma/düşüm/düzeltme; idempotency anahtarı tekil) |
| Zincir | `Deposit` (chainId+txHash+logIndex tekil, gönderen, tutar `Decimal(78,0)`, durum: bekliyor/kesin/yüklendi/sahipsiz), `PriceSample` (havuz anlık fiyatı), `ExchangeRate` (uygulanan kur, bant, kaynak), `IndexerCursor` |
| Fiyat | `ModelPrice` (model, düzey, girdi/önbellek/çıktı fiyatı, geçerlilik tarihi), `PricingConfig` (kredi değeri, pay, hoş geldin kredisi, sınırlar, günlük bütçe) |
| Gelişim | `Signal` günlük özetleri, `EvalCase`, `EvalRun`, `ImprovementProposal`, `Experiment`, `UserMemory` (izinli, şifreli) |
| İşletim | `Report` (şikâyet), `AuditLog` (yönetici işlemleri) |

**Şifreleme:** Mesaj içeriği, başlık, özet ve bellek uygulama katmanında AES-256-GCM ile; her kullanıcıya ayrı veri anahtarı, ana anahtar ortam değişkeninden (zarf şifreleme). Hesap silinince kullanıcının anahtarı silinir: yedeklerdeki kopyalar dahil içerik okunamaz olur.

---

## 5. Kredi ve NoR ekonomisi

### 5.1 Birim ve fiyat
- **1 kredi = 0,001 $ değerinde yapay zekâ kullanımı.** Defter milikredi (1/1000 kredi) hassasiyetinde `bigint` tutar; yuvarlama israfı olmaz. Ekranda tek ondalıkla gösterilir ("3,8 kredi").
- Mesaj ücreti = sağlayıcının ölçtüğü token × `ModelPrice` × (1 + pay). Pay yönetici panelinden; varsayılan %25 (Habib bey'in onayına).
- Örnek (Gemini 3.8 Flash tanıtım fiyatı, ~3.000 girdi / ~600 çıktı token): ~0,003–0,004 $ → paylı ~4–5 kredi. 2027 fiyatıyla ~8–10 kredi.

### 5.2 Kredi defteri (altın kural 9)
1. **Ayır:** Çağrıdan önce en kötü durum tutarı (girdi tahmini + çıktı tavanı) bakiyeden "ayrılmış"a alınır. Yetmezse kullanıcıya "daha kısa yanıt" seçeneği veya yükleme önerilir.
2. **Akış:** Yanıt akar; kullanıcı durdurursa üretim kesilir.
3. **Kapat:** Sağlayıcının `usageMetadata` değeriyle gerçek ücret düşülür, artan geri verilir. Hata, ret, zaman aşımı → tamamı geri.
4. Her işlem tek veritabanı işleminde ve satır kilidiyle; aynı idempotency anahtarı ikinci kez işlenmez. Gece mutabakatı: defter toplamı = bakiye; sağlayıcı faturası ≈ `AiCall` toplamı (sapma uyarısı).

### 5.3 NoR yükleme (ADR-007)
- Kasa adresi Habib bey'in kontrolündeki bir cüzdan; **sunucuda özel anahtar yok**, sunucu yalnız izler.
- Kullanıcı tutarı girer → bugünkü kurla kredi karşılığını görür → "Cüzdanla gönder" (bağlı cüzdan veya gömülü cüzdan `transfer` çağrısı) ya da adres + QR.
- İşçi, NoR `Transfer` olaylarını (alıcı = kasa) kesinleşmiş bloktan okur; gönderen hesaba bağlıysa krediyi yazar, değilse "sahipsiz" bekletir; kullanıcı o cüzdanı imzayla bağlayınca yazılır. Aynı olay iki kez yazılamaz (chainId+txHash+logIndex).

### 5.4 Kur (ADR-006)
- Havuz türünden bağımsız: işçi her dakika Trader Joe NoR/WAVAX havuzunun anlık fiyatını okur; **son 30 dakikanın ortanca (medyan) değeri** × AVAX/USD (Chainlink AVAX/USD beslemesi). Ortanca, kısa süreli fiyat oynatmasını etkisiz bırakır.
- Yönetici bandı (alt-üst sınır): bant dışındaki kur bandın sınırından uygulanır, yönetici uyarılır. Son onaylı kurdan %20'den fazla sapma → uyarı.
- Kaynağa ulaşılamazsa son onaylı kur. Yükleme sınırı varsayılanı: tek seferde 50 $, günde 100 $ karşılığı; aşan kısım sonraki günlerin kuruyla sırayla krediye çevrilir (zincirdeki transfer reddedilemez).
- Staging (Fuji'de havuz yok) ve yerel: yöneticinin sabit kuru.

### 5.5 Bütçe ve kötüye kullanıma karşı
- Hoş geldin kredisi varsayılanı 200 kredi (~40–50 Hızlı mesaj); e-posta doğrulaması veya cüzdan imzası + IP/cihaz hız sınırı. NoRiba üyesine (zincirden doğrulanan) ek kredi, NoRiba dağıtımı ana ağa çıkınca.
- Kullanıcı günlük harcama sınırı (varsayılan 2.000 kredi, kullanıcı düşürebilir), dakikalık mesaj sınırı.
- Uygulama geneli günlük bütçe sigortası (test döneminde 10 $/gün): aşılırsa hoş geldin kredileri durur, yönetici uyarılır; ücretli krediler çalışmaya devam eder. Serviste aylık harcama sınırı ayrıca açılır.

---

## 6. Yapay zekâ katmanı ve token verimliliği

- **Sağlayıcı arayüzü** (`packages/ai`): `stream(request) → olaylar + kullanım`. İlk uyarlayıcı Gemini (`systemInstruction` alanı kullanılır; talimat asla kullanıcı mesajına karıştırılmaz). Model adları ve fiyatlar yapılandırmadan. Testlerde deterministik sahte sağlayıcı: CI'da gerçek harcama yok.
- **Bağlam kurucu:** `[platform kuralları ~300 token] + [rol talimatı ≤ 2.000 token] + [kişisel bellek ≤ 200 token, izinliyse] + [eski kısmın özeti] + [son ~6.000 token ham geçmiş] + [yeni mesaj]`. Sabit önek önbelleğe uygun sırada ve değişmeden; Gemini'nin örtük önbelleği isabet oranı `AiCall`'da ölçülür (iskelette resmi dokümandan doğrulanır).
- **Özetleme:** Pencere aşılınca işçi Hızlı modelle eski kısmı özetler; maliyet paya dahildir, kullanıcıdan ayrıca çekilmez.
- **Düzeyler:** Hızlı varsayılan (Flash sınıfı). Derin kullanıcı seçimiyle; rol sayfasında ve anahtarda yaklaşık fark gösterilir.
- **Tavanlar:** Her rolün çıktı tavanı; "devam et" ve "kısa yaz / detaylandır" düğmeleri.
- **Token bütçe testi:** Rol talimatı bütçeyi aşarsa test düşer.
- **Yapay zekâ gerektirmeyen yan işler:** Sohbet başlığı ilk mesajdan, rol önerisi yerel aramadan, başlangıç soruları sabit veriden.
- **Güvenli gösterim:** Markdown süzgeçli (ham HTML yok, yalnız `https:` ve `mailto:` bağlantıları), sıkı CSP.

---

## 7. Kendini geliştiren sistem (ADR-003)

1. **Sinyal:** beğeni/beğenmeme (neden: yanlış, eksik, uzun, üslup, güvensiz), yeniden üret, durdur, kopyala, yarıda bırakma, şikâyet. İçerik yalnız "iyileştirmeye katkı" izni verenlerden ve kişisel bilgiden arındırılarak.
2. **Ölçüm:** Rol sürümü başına günlük özet: memnuniyet, yeniden üretme oranı, sohbet başı kredi, güvenlik bayrakları.
3. **Test seti:** Her rolün 15–30 senaryosu (doğruluk, somutluk, uzmanlık derinliği, Türkiye'ye uygunluk, üslup, uzunluk; gereksiz uyarı ve kaçamak puan kaybettirir; can güvenliği kalıplarında acil durum kartının çıktığı da denetlenir). Rol değişen her PR'da ve haftalık koşar; değerlendirici Derin model; toplu işlem (batch) fiyatıyla.
4. **Öneri:** Haftalık iş, düşük puanlı örüntülerden talimat değişikliği önerir; test setinden ve token bütçesinden geçeni yönetim paneline koyar (gerekçe ve fark görünümüyle).
5. **Onay ve deney:** Yönetici onaylar → %10 trafikte 7 gün veya yeterli sohbet → iyileşirse herkese açılır, kötüleşirse kendiliğinden geri alınır.
6. **Kişisel bellek:** Kullanıcının izniyle tercihleri hatırlar (ör. "evim eski bina, sigortalar eski tip"); kullanıcı görür, düzeltir, siler.
7. Başlangıç sorularının sıralaması gibi düşük riskli ayarlar otomatik; talimat, güvenlik, fiyat ve kod insan onayıyla (altın kural 11).

---

## 8. Tasarım

- **Süreç:** 3 görsel yön (renk, yazı tipi çifti, biçim dili, örnek Keşfet ve Sohbet ekranı) özel bir tuvalde gösterilir; Yusuf seçer; ADR'ye yazılır. Yön adayları: "Kütüphane" (editoryal, sıcak kâğıt tonları, güçlü serif başlıklar), "Atölye" (zanaat hissi, dokulu nötrler, keskin vurgu rengi), "Gece Okuması" (derin koyu zemin, yüksek karşıtlık, rafine tipografi).
- **Kaçınılacaklar listesi** (ekran incelemesinde denetlenir): mor-indigo geçişler, bulanık ışık lekeleri, emoji ikon, aşırı rozet, cam efekti, her kartta gölge, genel "yapay zekâ parıltısı" ikonları, yapay zekâ üretimi yüz görselleri.
- **Görsel dil:** Yazarlar için tipografik monogram veya gravür çizgisi tarzında çizimler (gerçek kişi fotoğrafı ve üretilmiş yüz yok); meslekler için tek kalınlıkta özel çizgi ikonlar; hareket ölçülü ve anlamlı.
- **Sistem:** OKLCH renk tokenları, açık/koyu tema, her metin/zemin çifti WCAG 2.2 AA (otomatik denetim), Türkçe karakter kapsamı tam yazı tipleri kendi sunucumuzdan, tabular rakamlar.
- **Arayüz döngüsü:** CLAUDE.md'deki gibi her ekran 390 px ve 1440 px, açık/koyu, en az iki eleştiri turu.

---

## 9. Güvenlik ve KVKK

- SIWE nonce'u tek kullanımlık ve süreli; yöneticiler için SIWE + TOTP; yönetici adresleri ortam değişkeninde izin listesi.
- Çerezler httpOnly/Secure/SameSite, CSRF koruması, sıkı CSP (nonce), güvenlik başlıkları, hız sınırı (Redis), girdi doğrulama (zod), tutarlı hata gövdesi.
- Loglarda sohbet içeriği ve kişisel veri yok (pino maskeleme); yalnız ölçüm.
- Gizli bilgi: gitleaks (pre-commit + CI), GitHub gizli bilgi taraması ve itme koruması; yapay zekâ anahtarı yalnız sunucuda; kasa anahtarı hiçbir sunucuda değil.
- KVKK: aydınlatma metni, sağlık için açık rıza, iyileştirme ve bellek için ayrı izin; verimi indir, hesabı sil (kripto-imha); saklama: kullanıcı silene kadar, 12 ay hareketsiz hesapta sohbetler silinir (hukukçu onayına); "iz bırakmayan sohbet" sunucuda saklanmaz.
- Canlıda Gemini yalnız ücretli katman (ücretsiz katmanda içerik Google'ın ürün geliştirmesinde kullanılabilir).
- Hukukçu soruları H1–H6 (`docs/DECISIONS.md`) canlıdan önce cevaplanır.

---

## 10. Fazlar ve kabul ölçütleri

Her faz: dal → küçük commit'ler → testler, tip, lint → bağımsız inceleme → Türkçe sürüm notu → PR → Yusuf'un onayıyla birleştirme. Her faz başında o fazın ayrıntılı planı yazılır ve onaylanır.

| Faz | İçerik | Kabul ölçütü |
|---|---|---|
| **0 — İskelet** | Monorepo, Docker (postgres, redis, anvil), sahte NoR, env şeması, NoRiba'dan kopyalar, CI (tip, lint, test, gitleaks, boyut bütçesi), pre-commit, lisans bildirimi, `pnpm bootstrap`/`verify`; onayla `git init` ve GitHub'da herkese açık depo + gizli bilgi taraması ve itme koruması | Temiz makinede tek komutla kurulum; CI yeşil; gitleaks temiz |
| **1 — Tasarım yönü** (Faz 2 ile paralel) | 3 yönlü tuval → seçim → tokenlar, tipografi, ikonlar, temel bileşenler; Keşfet, Rol, Sohbet, Cüzdan ekranlarının yüksek doğruluklu tasarımı | Yusuf'un seçimi ADR'de; bileşen vitrini açık/koyu, AA denetimi geçiyor |
| **2 — Hesap ve giriş** | SIWE, e-posta + gömülü cüzdan, oturum, 18+ beyanı, izinler, yönetici girişi (TOTP) | Playwright ile iki giriş yolu; oturum yenileme ve iptal testleri |
| **3 — Kredi defteri ve fiyat** | `CreditBalance`/`LedgerEntry`, ayır-kapat, `ModelPrice`, `PricingConfig`, hoş geldin kredisi, sınırlar, bütçe sigortası, mutabakat işi | Eşzamanlı ayırmalarda bakiye asla eksiye düşmez (özellik tabanlı test); aynı istek iki kez ücretlenmez |
| **4 — Rol kataloğu ve sohbet** | `packages/personas` + ilk 15 rol, `packages/ai` + Gemini, bağlam kurucu, özetleme, akış, durdur, yeniden üret, geri bildirim, acil durum ön denetimi, güvenli Markdown, şifreli saklama, Keşfet ve yerel rol araması | Sahte sağlayıcıyla uçtan uca; gerçek anahtarla elle duman testi; ilk kelime ≤ 1,5 sn (Hızlı); token bütçe testleri geçiyor |
| **5 — NoR yükleme** | İzleyici (Anvil, Fuji), kur örnekleyici ve bant, yükleme ekranı, sahipsiz yükleme ve sonradan bağlama, yönetici kur ayarları | Anvil'de gönderilen sahte NoR krediye dönüşüyor; aynı olay iki kez yazılmıyor; bant ve sınır testleri |
| **6 — Yönetim ve güvenlik** | Rol/sürüm yönetimi, şikâyet kuyruğu, rol kapatma anahtarı, maliyet ve kalite panosu, denetim kaydı, KVKK akışları (indir, sil) | Yetki testleri; silinen hesabın içeriği okunamıyor |
| **7 — Kendini geliştirme** | Sinyaller, test setleri ve koşucu, öneri işi, deneyler, otomatik geri alma, kişisel bellek | Kötüleşen deney kendiliğinden geri alınıyor (testle); onaysız talimat değişmiyor |
| **8 — Katalog ve cila** | Rol sayısı ~50'ye, edebiyat modları, simülasyon puan karnesi, PWA (kurulum, bildirim), performans ve erişilebilirlik turu, hukuk metinleri | Lighthouse mobil hedefleri CI'da; axe temiz; tüm ekranlar iki tur eleştiriden geçmiş |
| **9 — Canlıya hazırlık** | Staging (Fuji), yük testi, bağımsız güvenlik incelemesi, hukukçu cevapları, ana ağ izleyicisini açma kontrol listesi (açık onayla) | Kontrol listesi tamam; Habib bey ve Yusuf onayı |
| **Sonra** | Mağaza uygulamaları (Expo; yükleme NoRiba cüzdanından, ADR-004), 13–17 yaş (ADR-011), ek sağlayıcı | Ayrı plan |

---

## 11. İstenmeyen ama ürünü güçlendirecek öneriler

1. **"Uzmana devret" → NoRiba pazar yeri:** Elektrik veya hukuk sohbetinin sonunda "Bu iş için yetkili usta/avukat bul" düğmesi NoRiba'daki hizmet ilanlarına götürür. YazeSim NoR ekonomisine müşteri taşır.
2. **Fotoğrafla sor:** Sigorta kutusu, kombi hata ekranı, bitki yaprağı fotoğrafı (Gemini görseli anlar). Kredi maliyeti önceden gösterilir. (v1.1)
3. **Sesle sor ve dinle:** Mobilde konuşarak soru, yanıtı sesli dinleme. (v1.1)
4. **Sohbet özeti ve yapılacaklar listesi:** "Avukata gitmeden önce özetim" gibi; PDF veya paylaşım bağlantısı (kişisel veri uyarısıyla).
5. **Maliyet şeffaflığı panosu:** Aylık kullanım, en çok kullanılan rol, "bugün 100 krediyi geçince sor" uyarısı.
6. **Çoklu karakter simülasyonu:** İki yazarın tartışması, ortak mülakat heyeti (kredi maliyeti açıkça gösterilerek).
7. **Paylaşılabilir sohbet bağlantısı** (salt okunur, kişisel bilgi temizleme uyarısıyla): büyüme kanalı.
8. **Durum sayfası ve kullanıcıya açık değişiklik notları.**

## 12. Maliyetler (kaçınılmaz, tahmini)

| Kalem | Tutar | Ne zaman |
|---|---|---|
| Gemini kullanımı | Geliştirmede Yusuf'un deneme kotası (1 milyon token ≈ 250–400 test mesajı); test döneminde ~100 kişiyle tahmini ayda 10–60 $ (şirket, ADR-008) | Faz 4'ten itibaren |
| Staging sunucusu | Ücretsiz katman araştırılır; olmazsa ~5–10 $/ay (onayla) | Faz 9 |
| Alan adı | ~10–15 $/yıl (Habib bey) | Faz 9 |
| Gömülü cüzdan | 1.000 aktif cüzdana kadar ücretsiz | — |
| Apple / Google | 99 $/yıl, 25 $ bir kez | Mağaza aşaması |

## 13. Açık konular (planı engellemez)

- Habib bey'in onayı: ADR-008 (fatura ve pay oranı), ADR-010 (lisans; hak sahibinin resmî adı).
- Gemini anahtarı: Yusuf `.env`'e girer. Anahtar resmî bir Google anahtarı değilse (aracı sitenin adresi/anahtarı) yalnız sahte verilerle denenir, gerçek kullanıcıda kullanılmaz. Derin modelin adı ve fiyatı anahtar gelince yapılandırmaya girer.
- Edebiyat ve uzman rol listesinin son hâli (Yusuf onayı), marka yazımı (YazeSim), alan adı, logo (Faz 1).
- Hukukçu soruları H1–H6.

## 14. Doğrulama

- **Her faz:** `pnpm verify` (tip, lint, birim + entegrasyon testleri, gitleaks, boyut bütçesi) yerelde ve CI'da yeşil.
- **Kredi doğruluğu:** özellik tabanlı eşzamanlılık testleri, idempotency testleri, gece mutabakatının test ortamında koşturulması.
- **Zincir:** Anvil'de sahte NoR ile uçtan uca yükleme (`pnpm deposit:test`), Fuji'de test NoR ile elle deneme.
- **Sohbet:** Sahte sağlayıcıyla Playwright akışları (gir → rol seç → yaz → akış → durdur → yeniden üret → kredi düşümü); gerçek Gemini anahtarıyla küçük bütçeli elle duman testi.
- **Arayüz:** Playwright ekran görüntüleri 390/1440 px, açık/koyu; axe erişilebilirlik; Lighthouse mobil profil.
- **Güvenlik:** XSS denemeleri (model çıktısına HTML/`javascript:` bağlantısı), CSRF, yetki atlama, hız sınırı testleri; faz sonu bağımsız inceleme.
- **Yusuf'a kalan elle denemeler:** gerçek telefon ve PWA kurulumu, gömülü cüzdanla e-posta girişi, Fuji'de gerçek cüzdandan yükleme.

## 15. Onaydan sonra ilk adımlar

1. Bu planı `docs/plans/yazesim-v1.md` olarak kaydet; CLAUDE.md "Durum" bölümünü güncelle.
2. Faz 0 ayrıntılı planı (`docs/plans/faz-0.md`) → onay → iskelet.
3. Faz 1 tasarım tuvali Faz 0 ile paralel hazırlanabilir.
