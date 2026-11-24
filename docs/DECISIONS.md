# YazeSim — Kararlar (ADR)

Her karar: tarih, durum, karar, gerekçe, alternatifler. Üst karar NoRiba'daki ADR-087'dir (YazeSim'in kuruluşu). Bu dosya herkese açık depoda durur: gizli bilgi ve önceki denemenin ayrıntıları buraya yazılmaz.

---

### ADR-001 — Rol kataloğu ve gerçek kişi, kutsal değer ilkesi · 2026-11-16
Durum: Yusuf seçti (2026-11-16). Habib bey'e bilgi olarak sunulur.
Karar:
- Ürünün omurgası **rol kataloğu**: kullanıcı ihtiyacına göre rol seçer. Üç ana bölüm: **Uzmanlar** (mesleğe göre kategoriler: Ev ve Yapı, Hukuk, Sağlık, Para ve İş, Teknoloji, Araç, Tarım, Eğitim, Kariyer…), **Edebiyat** (ADR-002) ve **Simülasyonlar** (gerçek hayat provaları, kurgu evrenler). Edebiyat, Yusuf'un verdiği alan örneklerinden biridir; katalog yeni alanlara açık tasarlanır.
- **Kutsal varlıklar, peygamberler, kutsal kitaplar ve mekânlar adına birinci şahısla konuşan rol olmaz.** Din konusundaki ihtiyaç, kaynak gösteren ve kendi adına konuşan bir uzman rolüyle (ör. "İlahiyat bilgisi") karşılanır; ayet ve hadisi yalnız güvenilir kaynaktan, kaynağıyla aktarır, uydurmaz.
- **Yaşayan siyasetçi rolü olmaz.**
- **Yaşayan gerçek kişi yalnız yazılı izniyle** canlandırılır (izin belgesi saklanır; kişi istediği an geri çekebilir).
- Özgün kurgu karakterler serbesttir.
Gerekçe: Yapay zekâ ayet ve hadis uydurabilir; dinî değerleri aşağılama (TCK 216/3), Cumhurbaşkanına hakaret (TCK 299) ve kişilik hakkı (TMK 24) riskleri; yapay zekâ servislerinin gerçek kişi taklidi ve siyasi içerik kısıtları; Apple ve Google mağaza reddi.
Alternatifler: yalnız siyasetçileri çıkarmak (dinî risk sürer); önceki denemedeki rolleri olduğu gibi tutmak (risk en yüksek).

### ADR-002 — Edebiyat rolleri: vefat etmiş yazarlar, alıntı yalnız telifi bitmiş eserlerden · 2026-11-16
Durum: Yusuf seçti (2026-11-16).
Karar:
- Türk ve dünya edebiyatından **vefat etmiş** yazarlar canlandırılır. Yaşayan yazar yok (ADR-001'deki yazılı izin istisnası hariç).
- Telif, yazarın ölümünü izleyen yılın başından itibaren 70 yıl sürer (FSEK). 2026 itibarıyla 1955 ve öncesinde ölen yazarların eserleri serbesttir: bu yazarların rolleri eserlerinden alıntı yapabilir.
- Telifi süren yazarlar "üslubundan esinlenen yapay zekâ canlandırması" olarak yer alır; eserlerinden uzun alıntı yapmaz, eserlerini yeniden üretmez. Hangi yazarın hangi sınıfta olduğu rol verisinde tutulur ve testle denetlenir.
- Her edebiyat rolü yapay zekâ canlandırması olduğunu açıkça söyler.
Gerekçe: Telif hakkı ve kişilik hakkı; büyük isimleri (telifi sürenler dahil) kapsamda tutmak.
Alternatifler: yalnız telifi bitmiş yazarlar (büyük isimler dışarıda kalır); yaşayan yazarlar (her biri için izin gerekir).

### ADR-003 — Kendini geliştiren sistem: öner, test et, onayla, kademeli yayınla · 2026-11-16
Durum: Yusuf seçti (2026-11-16).
Karar:
- Sistem kullanım sinyallerini (beğeni/beğenmeme ve nedeni, yeniden üretme, kopyalama, yarıda bırakma, şikâyet) toplar. Sohbet içeriği yalnız kullanıcı açıkça izin verdiyse ve kişisel bilgilerden arındırılarak incelemeye girer.
- Haftalık bir iş, sinyallerden rol talimatı iyileştirme önerileri üretir ve her öneriyi rolün otomatik test setinden (kalite ve güvenlik senaryoları) geçirir.
- Geçen öneri yönetici panelinde tek tıkla onaylanır; önce küçük bir kullanıcı grubunda denenir; ölçümler kötüleşirse kendiliğinden geri alınır, iyileşirse herkese açılır.
- İnsan onayı olmadan rol talimatı, güvenlik kuralı, fiyat veya kod değişmez (CLAUDE.md altın kural 11).
- Kullanıcının tercihlerini (izniyle) hatırlayan kişisel bellek, aynı bilgiyi her sohbette tekrar yazdırmayarak token da tasarruf ettirir.
Gerekçe: Sürekli iyileşme + güvenlik ve fiyatların sessizce bozulmaması.
Alternatifler: tam otomatik (güvenlik riski); yalnız rapor (yavaş gelişim).

### ADR-004 — Platform: önce web ve PWA; mağaza uygulamaları sonra · 2026-11-16
Durum: Yusuf seçti (2026-11-16). 2026-11-25: Aşağıda sözü geçen cüzdan **NoR Cüzdanı**dır; kullanıcı onun içinden, YazeSim'i açmadan da kasaya NoR gönderebilir (ADR-014).
Karar:
- İlk sürüm **web uygulaması**; telefona kurulabilen PWA olarak mobilde uygulama gibi çalışır. Mobil önce tasarlanır.
- Mağaza uygulamaları (Expo ile iOS ve Android) ikinci aşamada. Apple'ın 3.1.1 kuralı (dijital hizmetin kripto parayla uygulama içinde açılması yasak) ve Google Play'in ödeme kuralı nedeniyle mağaza uygulamasında NoR yükleme ekranı olmaz. Yusuf'un yönü: NoR yükleme, NoRiba'nın ayrı yazılacak cüzdanı (NoRiba ADR-086) içinden YazeSim hesabına yapılır; ek çözüm web sürümünden sonra araştırılır.
- Kod, web ile mobilin ortak mantığı paylaşabileceği biçimde yazılır (çerçeveden bağımsız ortak paket).
Gerekçe: Mağaza ücreti ve onayı olmadan hızlı çıkış; NoR yüklemenin ilk günden çalışması.
Alternatifler: ilk sürümde mağaza uygulaması (yükleme olmaz, ret riski); mağaza içi satın alma (komisyon, NoR dışı ödeme).

### ADR-005 — Yapay zekâ servisi: önce Gemini, sağlayıcı katmanı değiştirilebilir · 2026-11-16
Durum: Yusuf seçti (2026-11-16): deneme amaçlı bir Gemini kotası aldı, anahtarı bekliyor. Anahtarı Yusuf kendi `.env` dosyasına girer. **2026-11-17: ADR-013 ile güncellendi** (şimdilik aracı servis üzerinden Gemini; ilk uyarlayıcı OpenAI uyumlu).
Karar:
- İlk uyarlayıcı **Google Gemini API**. Sunucuda tek bir sağlayıcı arayüzü olur; başka servis (ör. Claude) yalnız yeni bir uyarlayıcıyla eklenir. Model adları ve fiyat tablosu koda gömülmez, yapılandırmadan gelir.
- İki kullanım düzeyi: "Hızlı" (varsayılan, ucuz Flash sınıfı model) ve "Derin" (üst model). Kullanıcı model adı görmez.
- Canlıda yalnız ücretli katman kullanılır: Gemini'nin ücretsiz katmanında gönderilen içerik Google tarafından ürün geliştirmede kullanılabilir; sohbetler kişisel veri olduğu için bu kabul edilemez (KVKK). Anahtar, şirketin kendi Google hesabından resmî yolla alınmalıdır.
- Fiyat bilgisi (2026-11-16, Google'ın fiyat sayfası): Gemini 3.8 Flash 1 milyon token için girdi 0,75 $, çıktı 3,75 $ (31 Aralık 2026'ya kadar tanıtım fiyatı; 1 Ocak 2027'den 1,50 $ / 7,50 $). Kredi fiyatlandırması bu tablodan hesaplanır ve tablo değişince yönetici panelinden güncellenir.
Gerekçe: Yusuf'un elindeki anahtar; servis değişse de kodun değişmemesi.
Alternatifler: Claude Haiku 5.5 + Sonnet 5.5 (hızlı modda belirgin şekilde daha ucuz; Claude'un 18 yaş altına koşullu izni var; ileride uyarlayıcı olarak eklenebilir); ikisi birden (iki fatura, iki politika).

### ADR-006 — NoR → kredi: yüklemede kilitlenen kur · 2026-11-16
Durum: Yusuf seçti (2026-11-16).
Karar:
- Kullanıcı bakiyesi **kredi** birimiyle tutulur (tam sayı). Kredi, yapay zekâ maliyetine bağlı sabit bir birimdir: mesaj fiyatı NoR fiyatı oynadıkça değişmez.
- NoR yüklendiğinde o anki kurla krediye çevrilir ve kur o yükleme için kilitlenir.
- Kur kaynağı: Trader Joe NoR/WAVAX havuzunun zaman ağırlıklı ortalama fiyatı (TWAP) × AVAX/USD. Yönetici bir alt-üst sınır bandı koyar; kur bandın dışına çıkarsa yüklemeler bandın sınırından çevrilir ve yönetici uyarılır. Kur kaynağına ulaşılamazsa yöneticinin son onayladığı kur kullanılır.
- Tek seferde ve günde yüklenebilecek tutara üst sınır konur (küçük havuzda fiyat oynatmaya karşı).
Gerekçe: Kullanıcıya öngörülebilir fiyat; havuz küçük (~25 bin $) olduğu için anlık fiyat kolay oynatılır.
Alternatifler: yöneticinin sabit kuru (piyasadan kopar); her mesajda anlık fiyat (manipülasyon, öngörülemez fiyat).

### ADR-007 — Ödeme: ön ödemeli kredi, NoR kasaya doğrudan gönderilir · 2026-11-16
Durum: Yusuf seçti (2026-11-16). **2026-11-25: ADR-014 ile netleşti:** kasaya gelen her NoR aktarımı, nereden başlatılmış olursa olsun, gönderen adrese yazılır; hesabı olmayan adresin NoR'u o adres ilk kez giriş yapınca yazılır; yükleme NoR Cüzdanı ile yapılır, Fuji denemesi başka cüzdanla.
Karar:
- Kullanıcı cüzdanından YazeSim kasa adresine NoR gönderir (tek işlem). Gönderen cüzdan imzayla hesaba bağlı olduğu için zincir izleyici yüklemeyi otomatik tanır ve yeterli onaydan sonra krediyi yazar. Yeni akıllı kontrat yazılmaz.
- Hesaba bağlı olmayan bir cüzdandan gelen yükleme bekletilir; kullanıcı o cüzdanı imzayla hesabına bağlayınca kredisi yazılır.
- NoRiba'nın cüzdanından da aynı yolla yüklenir (ADR-004).
- Kredi NoR'a geri çevrilmez (iade yok); tüketici mevzuatına uygunluğu hukukçuya sorulur.
- Geliştirmede yerel zincirde (Anvil) sahte NoR, staging'de Fuji'deki test NoR kullanılır; ana ağ kasa adresi ve izleyici ancak açık onayla açılır (CLAUDE.md altın kural 5).
Gerekçe: NoR'da `permit` olmadığından kontratla yatırma iki işlem ister; doğrudan gönderim tek işlem, kontrat denetimi gerekmez; iade olmaması emanetçi sayılma riskini azaltır.
Alternatifler: yatırma kontratı (iki işlem, denetim, emanet riski); her mesajda zincir işlemi (yavaş ve ücretli).

### ADR-008 — Servis faturası şirkette, toplanan NoR hazineye · 2026-11-16
Durum: Yusuf seçti (2026-11-16). Habib bey'in onayına sunulur (ücretli servis, sıfır maliyet kuralının istisnası).
Karar:
- Yapay zekâ servis faturasını Habib bey'in şirketi öder. Serviste aylık harcama sınırı açılır; uygulamada günlük bütçe sigortası olur (sınır aşılırsa ücretsiz deneme kredileri durur, yönetici uyarılır).
- Toplanan NoR satılmaz (havuz küçük, satış fiyatı çökertir); hazineye döner ve Habib bey'in yönetiminde kalır.
- Kredi fiyatı, servis maliyetinin üstüne yönetici panelinden ayarlanan bir pay eklenerek hesaplanır (varsayılan değer planda).
Gerekçe: Toplanan NoR dolar faturasını karşılayamaz; fatura tavanlı ve öngörülebilir olmalı.
Alternatifler: NoR'u yakmak (arz azalır, hazine yeniden kullanamaz).

### ADR-009 — Giriş: cüzdanla imza ve e-posta · 2026-11-16
Durum: Yusuf seçti (2026-11-16). **2026-11-25: ADR-014 ile değişti:** e-postayla giriş ve gömülü cüzdan kalktı, giriş yalnız NoR Cüzdanı ile. İmzayla giriş (SIWE), oturum ve NoRiba üyeliği maddeleri geçerli.
Karar:
- Cüzdanla imzalayarak giriş (SIWE, EIP-4361): NoRiba'da kullanılan cüzdanın aynısı çalışır.
- E-postayla giriş: arka planda gömülü cüzdan oluşur; sağlayıcı NoRiba'nın seçtiğiyle aynı (NoRiba K6: MetaMask Embedded Wallets, yedek Privy), ücretsiz katman sınırında kalınır.
- Oturum httpOnly, Secure, SameSite çerezlerinde kısa ömürlü erişim + dönen yenileme belirteci; durum değiştiren isteklerde CSRF koruması.
- NoRiba'nın sunucusuna bağımlılık yok. NoRiba üyeliği (dağıtım kontratından NoR almış adres) ana ağa çıktığında zincirden doğrulanıp hoş geldin kredisi verilebilir.
Gerekçe: Kripto bilmeyen kullanıcıyı kaybetmemek; NoRiba'nın canlıya çıkışını beklememek.
Alternatifler: yalnız NoRiba hesabı (NoRiba'ya dışa açık giriş servisi gerekir, bekletir); yalnız cüzdan (kullanıcı kaybı).

### ADR-010 — Lisans: tüm hakları saklı · 2026-11-16
Durum: Yusuf seçti (2026-11-16). Habib bey'in onayına sunulur (ADR-087'ye göre onun kararı).
Karar: Depo herkese açık olur ama serbest lisans verilmez: kod görünür, izinsiz kullanılamaz. Depoda "tüm hakları saklıdır" bildirimi bulunur; hak sahibinin resmî adı Habib bey'den alınır.
Gerekçe: Sonradan serbest lisansa geçmek kolaydır; serbest lisansla yayınlanan kod ise geri alınamaz.
Alternatifler: AGPL-3.0; MIT.

### ADR-011 — Yaş sınırı 18+, katmanlı içerik güvenliği · 2026-11-16
Durum: Yusuf seçti (2026-11-16). İlk tercih 13+ idi; Gemini'nin kullanım şartları 18 yaş altına yönelik ya da onların kullanması muhtemel uygulamaları yasakladığı ve 18 yaş altının cüzdan ve NoR ile ödemesi veli onayı gerektirdiği için ilk sürüm 18+ oldu.
Karar:
- İlk sürüm **18 yaş ve üstü**; kayıtta yaş beyanı, kullanım koşullarında açık hüküm.
- 13–17 yaş ileride, çocuklara koşullu izin veren bir servisle, veli onayı akışıyla ve kısıtlı rol listesiyle ayrıca açılır.
- Katmanlı koruma: servisin kendi güvenlik filtresi + kendi girdi/çıktı denetimimiz; kullanıcı başına hız ve günlük harcama sınırı; şikâyet düğmesi ve yönetici inceleme kuyruğu. (Uzman rollerindeki uyarı ve "uzmana danışın" sınırı ADR-012 ile kaldırıldı.)
Gerekçe: Servis şartları, çocuk verisi (KVKK) ve ödeme hukuku.
Alternatifler: 13+ Claude ile (Gemini anahtarı kullanılamaz); asgari koruma (önerilmedi).

### ADR-012 — Uzman rolleri kısıtlamasız ve somut yanıt verir; rol kalitesi en üst öncelik · 2026-11-16
Durum: Yusuf'un kararı (2026-11-16): "uzmanlıklarda tüm sınırlar geçilsin, sorumluluk bize ait; yapay zekâ bu cevapları verebiliyorsa biz neden kısıtlıyoruz. Roller çok iyi olmalı."
Karar:
- Uzman rolleri gerçek bir kıdemli usta, hekim, avukat, mali müşavir gibi **doğrudan, somut ve uygulanabilir** yanıt verir: adım adım iş tarifi, malzeme ve alet listesi, ilaç adı ve genel doz bilgisi, ilgili kanun maddesi ve dilekçe taslağı, hesap ve rakam. Bizim eklediğimiz kaçamak cevap, ret, "uzmana danışın" kalıbı ve yanıt sonu uyarı cümlesi **yok**. Arayüzde "yüksek riskli alan" işareti ve "ne yapamaz" listesi yok.
- Yapay zekâ servisinin ayarlanabilir güvenlik filtreleri izin verilen en serbest düzeye alınır. Servisin kapatılamayan çekirdek korumaları (ör. çocuk istismarı) ve kullanım politikası her durumda geçerlidir; bunlar bizim elimizde değildir.
- **Kalanlar (yanıtı kısıtlamaz):**
  - Can güvenliği durumunda (çarpılma, gaz kokusu, nefes darlığı gibi) yanıtın üstünde küçük, engellemeyen bir acil durum kartı (112 / 186 / 187) çıkar; yanıtın kendisi tam verilir ve ilk adımı gerçek bir uzmanın söyleyeceği gibi söyler (ör. "önce sigortayı kapat").
  - Kullanıcı açıkça "gerçek doktor musun?" diye sorarsa rol yapay zekâ olduğunu söyler (servisin kullanım politikası insan taklidiyle aldatmayı yasaklar). Yapay zekâ olduğu bilgisi her yanıtta değil, rol sayfasında ve kullanım koşullarında bir kez yer alır.
  - Sağlık sohbetleri için ilk girişte KVKK açık rızası (m.6) alınır: bu, yanıtı değil veriyi ilgilendiren yasal zorunluluktur.
  - Kullanım koşullarında sorumluluk maddesi bulunur (metni hukukçu yazar, H7).
- **Rol kalitesi:** Her uzman rolü bir "rol kartı" şartnamesine göre yazılır: kim olduğu ve kaç yıllık deneyimi, uzmanlık derinliği, Türkiye bağlamı (yürürlükteki mevzuat, yönetmelik ve standartlar, piyasa koşulları, kurumlar), yanıt yapısı (önce doğrudan cevap, sonra adımlar, gerekirse rakam ve kaynak), gerektiğinde ve yalnız gerektiğinde netleştirme sorusu, üslup. Rol talimatı bütçesi 2.000 token'a çıkar (sabit önek önbellekten indirimli faturalandığı için maliyet farkı küçüktür).
- Her rolün test setinde güvenlik senaryoları yerine **doğruluk, somutluk ve uzmanlık derinliği** senaryoları ağırlıklıdır; "gereksiz uyarı ve kaçamak" ayrıca puan kaybettirir.
- Hukuk rolleri için mevzuat metinleri (kanun ve yönetmelikler serbest kullanılabilir, FSEK m.31) bilgi tabanı olarak eklenir; böylece rol güncel madde numarasıyla konuşur (Faz 8).
- Öneri: Her kategoriden birkaç rolün yanıt örnekleri yayından önce gerçek bir meslek sahibine (usta, avukat, hekim) okutulur.
Gerekçe: Yusuf'un kararı; kısıtlanmış yanıt ürünün değerini düşürür, model bu bilgileri zaten verebilmektedir.
Alternatifler: önceki plan (yüksek riskli alan sınırları, uyarılar); hukukçu görüşüne kadar sınırları korumak.
Etkilenen: ADR-011 (katmanlı koruma maddesi), CLAUDE.md altın kural 10, plan §2.1–2.3, §6, §7.

### ADR-013 — Şimdilik KragaBridge aracı servisi; ilk uyarlayıcı OpenAI uyumlu · 2026-11-17
Durum: Yusuf'un kararı (2026-11-17): "şimdilik böyle kullanalım". Anahtar Yusuf'ta, yerel `.env` dosyasında.
Karar:
- Yapay zekâ istekleri şimdilik Google'a doğrudan değil, **KragaBridge** aracı servisi (`https://api.kraga.org/v1`) üzerinden gider. Servis OpenAI uyumlu (`/chat/completions`) ve Anthropic uyumlu (`/messages`) uç noktalar sunar; kimlik doğrulama `Authorization: Bearer`. Elimizdeki anahtar yalnız Gemini modellerini açar (ör. `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-pro`, `gemini-4-*`).
- İlk uyarlayıcı **OpenAI uyumlu sohbet arayüzü** ile yazılır; adres, anahtar ve model adları yapılandırmadan gelir. Google'ın Gemini API'si de OpenAI uyumlu uç nokta sunduğu için ileride doğrudan Google'a geçmek yalnız ayar değişikliği olur (ADR-005'in "servis değişse de kod değişmez" ilkesi korunur).
- Servis her yanıtta kendi birimiyle ölçülen kullanımı (`charged_tokens` ve hesap formülü) döndürür; kredi defteri gerçek kullanımı buradan alır.
- Ölçüm (2026-11-17, 18 deneme): bağlantı ~0,5 sn; ilk kelime **4–21 sn** (çoğu 6–16 sn); ilk kelimeden sonra yanıt 1–1,5 sn'de akarak tamamlanır. Bekleme servis tarafındadır: model, uç nokta ve düşünme ayarı değiştirmez. Bu, "ilk yanıt kelimesi ≤ 1,5 sn" hedefini karşılamaz; şimdilik kabul edildi. Arayüz bekleme süresini anında tepki ve "yazıyor" göstergesiyle karşılar.
- Canlıya geçmeden önce yeniden değerlendirilir: hız hedefi ve kişisel verinin aracı servisten geçmesi (KVKK değerlendirmesi Habib bey'de; H2).
Gerekçe: Yusuf'un elindeki anahtar; geliştirmeye beklemeden başlamak.
Alternatifler: doğrudan Google Gemini anahtarı (daha hızlı olması beklenir, ölçülmedi); servis sağlayıcısına gecikmeyi sormak.
Etkilenen: ADR-005 (ilk uyarlayıcı ve anahtar kaynağı), H2.

### ADR-014 — Giriş ve NoR yükleme yalnız NoR Cüzdanı ile · 2026-11-25
Durum: Yusuf'un kararı (2026-11-24): "YazeSim'e giriş NoR Cüzdanı ile olacak; harcamalar NoR Cüzdanı'ndan kasaya gönderilen NoR'a göre olacak." E-postalı girişin kalkıp kalkmayacağı 2026-11-25'te soruldu; Yusuf "Yalnız NoR Cüzdanı" seçeneğini seçti.
Karar:
- **Giriş yalnız NoR Cüzdanı ile.** Giriş ekranında tek düğme: "NoR Cüzdanı ile giriş". Cüzdan kendi sitesinde küçük bir pencerede açılır; kullanıcı bağlanır ve sunucumuzun ürettiği giriş metnini imzalar (SIWE, EIP-4361; `personal_sign`). Tipli veri imzası (EIP-712) kullanılmaz. Anahtar, şifre ve onaylar cüzdanın penceresinde kalır; YazeSim yalnız adresi ve imzayı görür. Hesap, cüzdan adresiyle tanınır.
- **E-postayla giriş ve gömülü cüzdan servisi kalkar** (ADR-009'un e-posta maddesi). Dış cüzdan servisine, onun ücretsiz katman sınırına ve saklanacak e-posta adresine gerek kalmaz.
- **Başka cüzdanlar** (MetaMask gibi tarayıcı cüzdanları) yalnız deneme ortamında bir ayarla açılır; canlıda kapalıdır. Giriş kodu genel cüzdan arayüzü (EIP-1193) üstüne yazılır; böylece NoR Cüzdanı'nın desteklemediği Fuji'de deneme başka bir cüzdanla yapılabilir.
- **Bağlantı paketi:** NoR Cüzdanı'nın küçük bağlantı paketi (`nor-cuzdan-connect`, ilk sürüm 0.1.0) web uygulamasına sürüm numaralı kopya olarak girer: modül, tip dosyaları ve paketle gelen `README.md`, değiştirilmeden. Yeni sürüm bilinçli olarak, ayrı bir commit'le alınır. Paket başka siteden bir şey yüklemez. NoR Cüzdanı ayrı ve özel bir projedir: bu açık depoya paketin ve README'sinin dışında NoR Cüzdanı'nın iç ayrıntıları yazılmaz.
- **NoR yükleme:** Yükleme, NoR Cüzdanı'ndan kasaya doğrudan NoR aktarımıdır (ADR-007). YazeSim'in Cüzdan ekranı aktarımı başlatır, kullanıcı cüzdan penceresinde onaylar. Kullanıcı YazeSim'i açmadan, cüzdanın içinden de kasaya NoR gönderebilir. Bu yüzden:
  - Kasaya gelen **her** NoR aktarımı, nereden başlatılmış olursa olsun, gönderen adrese kredi olarak yazılır; yalnız YazeSim'in kendi sayfasından başlatılanlar değil.
  - Henüz YazeSim hesabı olmayan adresten gelen NoR bekletilir; o adres ilk kez giriş yaptığında hesaba yazılır.
  - Kredi NoR'a geri çevrilmez.
- **Ağ:** NoR Cüzdanı yalnız Avalanche ana ağında ve kendi yerel kopyasında çalışır; Fuji'yi desteklemez. NoR Cüzdanı ile deneme yerel zincirde (Anvil), Fuji denemesi başka cüzdanla yapılır.
- **Telefon:** Cüzdan penceresi telefonda yeni sekmede açılır. Ana ekrana eklenmiş uygulamada (özellikle iPhone) bu bağ kopabilir; o durumda kullanıcıya siteyi tarayıcıda açmasını söyleyen bir not gösterilir. Mağaza uygulamaları (ADR-004) için bağlantı yolu sonra değerlendirilir.
- **NoR Cüzdanı'na iletilecekler** (Yusuf aracılığıyla, belli olunca): canlı kasa adresi; YazeSim'in tam kökenleri (`https://` ile, yol olmadan; web ve ana ekrana eklenen uygulama aynı kökendeyse tek satır); varsa en az yükleme tutarı. Cüzdan yalnız listesindeki kökenlere bağlanır.
Gerekçe: Yusuf'un kararı; tek cüzdan ve tek giriş yolu sade ve anlaşılırdır; NoRiba ile aynı cüzdan kullanılır; dış servis, ücret ve e-posta verisi olmaz. Cüzdanın kendi yükleme sayfası olduğu için krediyi yalnız kendi sayfamızdan başlatılan yüklemelere yazmak, kullanıcının gönderdiği NoR'u karşılıksız bırakırdı.
Alternatifler: NoR Cüzdanı önde, başka cüzdanlar canlıda da açık; NoR Cüzdanı + e-posta (ADR-009 olduğu gibi).
Sonuç: E-posta doğrulaması kalktığı için hoş geldin kredisinin çok sayıda adresle kötüye kullanılmasına karşı önlem Faz 3 planında yeniden ele alınır (cüzdan imzası, IP ve cihaz hız sınırı, günlük bütçe sigortası).
Etkilenen: ADR-004 (yükleme cüzdanı), ADR-007 (her aktarım kuralı ve bekletme), ADR-009 (e-posta girişi kalktı), plan §2.1, §3, §4, §5.3, §5.5, §9, §10 (Faz 2 ve 5, §10.1), §12–14.

---

## Hukukçuya sorulacaklar (canlıya çıkmadan önce cevaplanmalı)

| No | Soru | İlgili |
|---|---|---|
| H1 | NoR karşılığında yapay zekâ hizmeti (kredi) satmak, TCMB'nin _Ödemelerde Kripto Varlıkların Kullanılmamasına Dair Yönetmelik_'i (RG 16.04.2021) kapsamında "ödemede kripto varlık kullanımı" sayılır mı? (NoRiba'daki soru 1.1 ile aynı konu.) | ADR-007 |
| H2 | Sohbet içeriğinin yurt dışındaki yapay zekâ servisine gönderilmesi KVKK m.9 yurt dışı aktarımıdır: standart sözleşme ve bildirim nasıl yürütülmeli? Arada aracı servis (KragaBridge) olduğunda durum nedir? | ADR-005, ADR-013 |
| H3 | Sağlık sohbetleri özel nitelikli kişisel veridir (KVKK m.6): açık rıza metni ve saklama süresi ne olmalı? | ADR-001, ADR-011 |
| H4 | Kullanılmayan kredinin iade edilmemesi tüketici mevzuatına uygun mu? | ADR-007 |
| H5 | Telifi süren yazarlar için "üslubundan esinlenen canlandırma" ve yazar adının kullanımı (FSEK, kişilik hakkı, mirasçılar) sorun yaratır mı? | ADR-002 |
| H6 | Kasa adresine NoR toplanması, 7518 sayılı Kanun kapsamında kripto varlık hizmet sağlayıcılığı sayılır mı? | ADR-007 |
| H7 | Uzman rollerinin kısıtlamasız ve somut yanıt vermesi (ilaç ve doz bilgisi, hukuki görüş ve dilekçe — Avukatlık Kanunu m.35'teki hukuki danışmanlık tekeli dahil, elektrik ve gaz tesisatı tarifleri) için kullanım koşullarındaki sorumluluk maddesi nasıl yazılmalı; hangi ölçüde geçerli olur (TBK m.115)? | ADR-012 |
