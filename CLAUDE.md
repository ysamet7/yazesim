# CLAUDE.md — YazeSim

Bu dosya, bu klasörde çalışan Claude Code için kalıcı talimatlardır. Her oturumun başında oku ve uy.
Bu klasör GitHub'da **herkese açık** bir depo olacak; bu dosyaya da gizli bilgi veya kişisel veri yazılmaz.

## Proje

YazeSim, NoRiba.Finance'e bağlı bir yapay zekâ sohbet ve simülasyon uygulamasıdır. Web ve mobilde çalışır.
Kullanıcının harcadığı her yapay zekâ kullanım birimi (servisin "token" dediği metin parçası) NoR ile ödenir; ödeme kullanıcının cüzdanından alınır.

Ürün, tasarımı ve işleviyle **baştan** yaratılır (Yusuf, 2026-11-16). Önceki deneme yalnız ne yapılmaması gerektiğini gösteren bir örnektir; kodu, görünümü ve akışları örnek alınmaz.

### Ürünün omurgası: rol kataloğu

Kullanıcı ihtiyacına göre bir **rol** seçer ve onunla sohbet eder. Roller üç ana bölümde, kategorilere ayrılmış durur:

1. **Uzmanlar (mesleğe göre):** Ev ve Yapı (ör. elektrik tesisatı, sıhhi tesisat), Hukuk, Sağlık, Para ve İş, Teknoloji, Araç, Tarım, Eğitim, Kariyer… Kullanıcı sorununu yazar veya kategoriden seçer; doğru uzman rolüne ulaşır.
2. **Edebiyat:** Türk ve dünya edebiyatının önde gelen isimleri. Sohbet, birlikte yazma, metni değerlendirme, eser üzerine konuşma.
3. **Simülasyonlar:** Gerçek hayat provaları ve kurgu evrenler (ör. iş mülakatı, pazarlık, zor konuşma, dil pratiği, tarihî olay canlandırma).

Rol tanımları koddan ayrı, sürümlü veridir: her rolün kategorisi, talimatı, token bütçesi, güvenlik sınıfı, test seti ve sürüm geçmişi olur. Kapsam ayrıntısı (hangi roller, kimler) kararlarla ve planla netleşir.

### Ürün ilkeleri (Yusuf, 2026-11-16)

- **Roller çok iyi olmalı (ürünün kalbi):** Her rol gerçek bir kıdemli meslek sahibi kadar bilgili, Türkiye bağlamını (mevzuat, standartlar, piyasa, kurumlar) bilen, doğrudan ve somut konuşan bir "rol kartı" şartnamesiyle yazılır ve test setinde doğruluk, somutluk ve derinlikle ölçülür (ADR-012).
- **Görünüm:** Çok üst düzey ve özgün; "yapay zekâya yaptırılmış" gibi durmaz. Hazır şablon görünümü, mor-indigo geçişler, bulanık ışık lekeleri, emoji ikonlar, her yerde rozet ve gereksiz parıltı yok. Tipografi, boşluk, hiyerarşi ve hareket bilinçli seçilir.
- **Kullanım kolaylığı:** İlk açılıştan sonra en geç iki dokunuşta doğru rolle sohbete başlanır. Teknik dil (model adı, token, kimlik kodu) kullanıcıya gösterilmez; sade Türkçe kullanılır.
- **Mobil önce:** Tasarım önce telefon için yapılır; klavye, güvenli alan (çentik), tek elle kullanım, dokunmatik hedef ≥ 44 px.
- **Hız:** Yanıtlar akarak (streaming) gelir; arayüz anında tepki verir (iyimser güncelleme, iskelet yükleme).
- **Token ve kredi verimliliği:** Kullanıcıdan gereksiz kredi çekilmez (aşağıdaki kurallar).
- **Kendini geliştiren sistem:** Arka planda kullanım sinyallerinden öğrenip iyileştirme önerir, test eder; yayına alma insan onayıyla (altın kural 11).
- **NoR ve kredi dengesi:** Kullanıcı ödediği NoR'un karşılığını adil ve öngörülebilir biçimde alır; NoR fiyatındaki oynama ve manipülasyon kredi sistemini bozamaz; şirketin yapay zekâ faturası tavanlıdır.

### Bağlam

- **NoR:** Avalanche C-Chain'de canlı bir ERC-20 token'ı: `0x5782b954d9dc46168458a7e02db49b01e5a1a669`, 18 ondalık, sabit arz, `permit` yok. Trader Joe'da NoR/WAVAX havuzu var (küçük: 2026-11-14'te ~25 bin $).
- **NoR Cüzdanı:** NoRiba ve YazeSim'in ortak cüzdanı; ayrı ve özel bir proje. YazeSim'e giriş ve NoR yükleme yalnız onunla (ADR-014). Bu açık depoya NoR Cüzdanı'ndan yalnız bağlantı paketi ve paketle gelen `README.md` girer; iç ayrıntıları ve notları yazılmaz. NoR Cüzdanı'nın klasöründe değişiklik yapılmaz.
- **Kararların kaynağı:** NoRiba'nın özel deposundaki ADR-087 (`~/Desktop/noriba/docs/DECISIONS.md`); YazeSim'in kendi kararları `docs/DECISIONS.md`'de. NoRiba'nın kuralları ve yığını için `~/Desktop/noriba/CLAUDE.md` ve `docs/SPEC.md` okunabilir; NoRiba klasöründe değişiklik yapılmaz.
- **Depo:** https://github.com/ysamet7/yazesim (herkese açık, 2026-11-17). `main` korumalı; her iş `main`'den açılan dalda ve PR ile, birleştirme Yusuf'un onayıyla.

## Durum ve sıradaki iş

Adım adım ilerleme **`docs/PHASES.md`** dosyasındadır: her commit'ten sonra güncellenir, yeni oturum oradaki "Şu an" bölümünden devam eder. Oturumlarda öğrenilen pratik dersler `docs/runbooks/AGENT-NOTES.md`'de.

Özet (2026-11-16; kararlar 2026-11-25'e kadar): İnceleme, kararlar (`docs/DECISIONS.md` ADR-001…014) ve v1 planı (`docs/plans/yazesim-v1.md`) tamam. Faz 0 (iskelet) tamam ve `main`'de (PR #1). Faz 1 tasarım tuvali ayrı oturumda hazırlanıyor. Yapay zekâ anahtarı şimdilik KragaBridge aracı servisinden (ADR-013). Bekleyenler: Habib bey'in ADR-008 ve ADR-010 onayı; hukukçu soruları H1–H7 (`docs/DECISIONS.md` sonunda). Önceki denemenin inceleme raporu `external/inceleme-raporu.md` (git dışı).

## Altın kurallar (asla ihlal etme)

1. **Gizli bilgi yok:** Özel anahtar, kurtarma kelimesi, API anahtarı ve şifre; koda, teste, commit'e, log'a ve dokümana yazılmaz. `.env` dosyaları okunmaz ve elle yazılmaz; `.env.example` yazılır. Depo herkese açık olacağı için her commit'te ve CI'da gitleaks çalışır, GitHub'da gizli bilgi taraması ve itme koruması (push protection) açılır.
2. **Yapay zekâ servisinin anahtarı yalnız sunucuda durur.** Web ve mobil istemcinin içine asla konmaz; uygulamanın içi indirilip okunabilir.
3. **`external/` içindeki kod çalıştırılmaz:** `php`, `composer`, `npm` ve içindeki betikler dahil; yalnız okunur. İçindeki gizli bilgiler sızmış sayılır: yeni sistemde kullanılmaz, gerekirse yalnız adları `.env.example`'a yazılır.
4. **`external/` içeriği ve inceleme raporu açık depoya taşınmaz:** Koddan kopya, dosya adları, karakter metinleri, gizli bilgi ayrıntısı açık dokümanlara veya commit mesajlarına girmez. Yeni ürün baştan yazılır.
5. **Ana ağ:** NoR canlıda (Avalanche mainnet, chainId 43114). Geliştirme ve test yerelde Anvil'de, staging'de Fuji'de yapılır. Ana ağa işlem gönderen hiçbir şey açık onay olmadan çalıştırılmaz; yayın betikleri 43114'te `ALLOW_MAINNET=true` olmadan çalışmayı reddeder.
6. **Miktarlar:** NoR tutarları TypeScript'te `bigint`, veritabanında `Decimal(78,0)` olarak tutulur (en küçük birim). Kredi de tam sayı birimle tutulur. Asla `number` veya float.
7. **Kişisel veri:** Sohbet içerikleri kişisel veridir, sağlık sohbetleri özel nitelikli kişisel veridir: loglanmaz, uygulama katmanında şifrelenir; saklama süresi ve silme planda netleşir (KVKK).
8. **Ana dala doğrudan push yok.** Her iş bir dalda ve PR ile yapılır; birleştirme proje sahibinin onayıyla.
9. **Her yapay zekâ çağrısı kredi defterinden geçer.** Çağrıdan önce tahmini tutar ayrılır, yanıt bitince servisin ölçtüğü gerçek kullanım düşülür, artan geri verilir. Bakiye eksiye düşmez; aynı istek iki kez ücretlendirilmez; servis hatası, reddedilen yanıt ve sistem kaynaklı kesinti ücretlendirilmez. Defter yalnız eklenerek yazılır (kayıt silinmez, düzeltme yeni kayıtla yapılır).
10. **Uzman rolleri kısıtlanmaz (ADR-012):** Gerçek bir kıdemli uzman gibi doğrudan, somut ve uygulanabilir yanıt verir (adım adım tarif, ilaç ve doz bilgisi, kanun maddesi, dilekçe, hesap). Bizim tarafımızdan ret, kaçamak, "uzmana danışın" kalıbı, yanıt sonu uyarısı veya "yüksek riskli alan" işareti eklenmez. Kalan tek şey yanıtı engellemeyen acil durum kartıdır (can güvenliği durumunda 112 / 186 / 187); servisin kendi kapatılamayan korumaları bizim elimizde değildir.
11. **Kendini geliştirme sistemi insan onayı olmadan** rol talimatlarını, güvenlik kurallarını, fiyatları veya kodu değiştirmez; önerir, test eder, onaylanırsa kademeli yayınlar, kötüleşirse geri alır (ADR-003).
12. **Roller ve gerçek kişiler (ADR-001, ADR-002):** Kutsal varlıklar, peygamberler, kutsal kitaplar ve mekânlar adına birinci şahısla konuşan rol yok; yaşayan siyasetçi rolü yok; yaşayan gerçek kişi yalnız yazılı izniyle. Edebiyat rollerinde eser alıntısı yalnız telifi bitmiş eserlerden. Rol, kullanıcı açıkça sorarsa yapay zekâ olduğunu söyler; bu bilgi her yanıtta değil, rol sayfasında ve kullanım koşullarında yer alır.
13. **Yaş:** İlk sürüm 18+ (ADR-011). 18 yaş altına yönelik özellik, servis şartları ve veli onayı akışı netleşmeden eklenmez.

## Token verimliliği (her yapay zekâ özelliğinde uygulanır)

- Sabit önek (platform kuralları + rol talimatı) önbelleğe uygun sırada ve değişmeden gönderilir; içine tarih, kullanıcı adı gibi değişken bilgi konmaz. Önbellek isabeti ölçülür.
- Uzun sohbette eski kısım özetlenir; bütün geçmiş her mesajda ham hâliyle gönderilmez.
- Varsayılan hızlı ve ucuz model; derin model kullanıcının seçimiyle ya da açık gerekçeyle. Her rolün çıktı tavanı vardır.
- Rol talimatlarının token bütçesi testle denetlenir; bütçeyi aşan rol testten geçmez.
- Durdur düğmesiyle yalnız üretilen kadar ücret alınır. Sohbet başlığı gibi yan işler için yapay zekâ çağrısı gerekmiyorsa yapılmaz.
- Kullanıcı mesajın yaklaşık maliyetini görür; gerçek maliyet mesajdan sonra sade biçimde gösterilir.

## Teknoloji yönü (ADR-087 önerisi, plan onayıyla kesinleşir)

TypeScript (`strict`); web için Next.js (ilk sürüm web + PWA, ADR-004), mobil mağaza uygulamaları ikinci aşamada React Native (Expo) ile, sunucu için NestJS; yapay zekâ servisi önce Gemini, değiştirilebilir sağlayıcı katmanıyla (ADR-005); zincir için viem, doğrulama için zod. NoRiba ile aynı yığın. NoRiba özel depo olduğundan onun `packages/shared` kodundan gereken kısım bağımlılık olarak değil kopya olarak alınır. Bağımlılıkların güncel kararlı sürümü kullanılır; sürüm seçmeden önce paketin resmi dokümanına bakılır. Terk edilmiş veya az bilinen paket eklenmez.

## Kalite çıtası

- **Hedef:** Dünyadaki en iyi yapay zekâ sohbet uygulamalarıyla yarışan ürün kalitesi; demo değil. Canlıya geçiş yalnız ortam ve ayar değişikliğidir.
- **Arayüz döngüsü:** Her ekran için tasarla → uygula → Playwright ile mobil (390 px) ve masaüstü (1440 px), açık ve koyu temada ekran görüntüsü al → kendin eleştir (hiza, boşluk, tipografi, kontrast, hiyerarşi, boş/yükleniyor/hata/yetkisiz durumları, uzun metin, Türkçe karakterler, "şablon gibi duruyor mu?") → düzelt. Ekran gerçekten parlatılana kadar en az iki tur.
- **Performans hedefleri** (plan kesinleştirir): mobilde 4G'de ilk anlamlı içerik ≤ 2 sn, etkileşim gecikmesi (INP) ≤ 200 ms, hızlı modda ilk yanıt kelimesi ≤ 1,5 sn. Hedefler CI'da ölçülür.
- **Erişilebilirlik:** WCAG 2.2 AA; yakınlaştırma asla kapatılmaz; azaltılmış hareket tercihine saygı.
- **Bağımsız inceleme:** Her faz sonunda bağlamı temiz bir alt ajan "kodu sen yazmadın" rolüyle güvenlik, kredi defteri doğruluğu, test eksikleri ve kaliteyi inceler; kritik ve yüksek bulgular önce bulguyu yeniden üreten bir testle düzeltilir.

## Çalışma şekli

- **Dil:** Yusuf İngilizce okumuyor. Proje sahibine görünen her şey Türkçe: yanıtlar, sorular, özetler, PR açıklamaları. Teknik terimleri kısaca ve sade Türkçeyle açıkla. Kod, isimler ve commit mesajları İngilizce (Conventional Commits).
- **Kararlar:** Uygulama ayrıntılarını sormadan yap. Gerçek kararları (ürün, tasarım, kapsam, ücretli servis) tek seferde, seçenekli ve önerinle sor; kararı `docs/DECISIONS.md`'ye ADR olarak yaz.
- **Her zaman sor:** gizli bilgiler, ücretli servisler, yeni dış dosya indirme, birleştirme, herkese açık olan her şey (depoyu public açmak dahil), Habib bey'in iş kararları.
- **Sıfır maliyet:** Canlıya kadar ücretli servis ve abonelik yok. Kaçınılmaz maliyeti tahmini tutarıyla açıkça söyle: yapay zekâ servisinin kullanım ücreti, Apple geliştirici hesabı yılda 99 $, Google Play bir kerelik 25 $.
- **Kalite:** Testler yazılır ve geçer; tip kontrolü ve lint temiz; boş, yükleniyor, hata ve yetkisiz durumları ele alınır.
- **Oturum sürekliliği:** "YazeSim'e kaldığın yerden devam et" denince önce bu dosya, sonra `docs/PHASES.md` ("Şu an" bölümü), sonra o fazın planı (`docs/plans/faz-N.md`) ve `docs/runbooks/AGENT-NOTES.md` okunur; v1 planının tamamı yalnız gerektiğinde okunur. Her commit'ten sonra `docs/PHASES.md` güncellenir; kalıcı bir ders öğrenilince AGENT-NOTES'a bir satır eklenir.
