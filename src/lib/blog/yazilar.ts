import type { Yazi } from "@/lib/blog/tipler";

/**
 * Blog yazıları, en yeniden eskiye.
 *
 * Ürünle ilgili her cümle panelde çalışan bir özelliği anlatmalı. Yeni bir
 * cümle yazmadan önce ilgili ekranı ya da işlemi kodda aç; eski sayfa
 * metinleri kaynak değil.
 */
export const YAZILAR: Yazi[] = [
  {
    slug: "qr-kodlu-kiralama-takibi-nedir",
    baslik: "QR kodlu kiralama takibi nedir, nasıl çalışır?",
    aciklama:
      "QR kodlu kiralama takibi, her kiralık ürüne özel bir QR kod verip müsaitliği, rezervasyonları ve iadeleri tek panelden yönetmektir. Nasıl çalıştığını ve kimlere uygun olduğunu anlatıyoruz.",
    kisaCevap:
      "QR kodlu kiralama takibinde her kiralık ürüne kendine ait bir QR kod yapıştırılır. Müşteri kodu telefonuyla okuttuğunda ürünün hangi günler boş olduğunu görür ve rezervasyon talebi bırakır; işletme de bütün ürünlerin kimde olduğunu, ne zaman döneceğini ve hangi günlerin dolu olduğunu tek bir panelden izler.",
    yayin: "2026-10-26",
    guncelleme: "2026-10-26",
    etiketler: ["Kiralama yönetimi", "QR kod"],
    bolumler: [
      {
        id: "neden",
        baslik: "Kiralama işletmeleri neden takip sistemine ihtiyaç duyar?",
        bloklar: [
          {
            tur: "paragraf",
            metin:
              "Kostüm, kamera, kamp malzemesi, organizasyon ekipmanı ya da gelinlik kiralayan bir işletmede asıl soru hep aynıdır: **Bu ürün o tarihte boş mu?** Ürün sayısı birkaç taneyken bu soruyu bir defter ya da tablo cevaplar. Ürün çoğaldıkça, kargoyla gönderim ve iade gecikmeleri devreye girdikçe defter yetmez hale gelir.",
          },
          {
            tur: "liste",
            maddeler: [
              "Aynı ürün aynı tarihe iki müşteriye verilir (çift rezervasyon).",
              "Müşteri \"şu ürün müsait mi?\" diye yazar, cevap için rafa ya da deftere bakmak gerekir.",
              "Hangi ürünün kimde olduğu ve ne zaman döneceği takip edilemez.",
              "Ürünün iadeden sonra temizlik ya da kontrol için bekleyeceği günler hesaba katılmaz.",
            ],
          },
        ],
      },
      {
        id: "nasil-calisir",
        baslik: "QR kodlu kiralama takibi adım adım nasıl çalışır?",
        bloklar: [
          {
            tur: "adimlar",
            adimlar: [
              {
                baslik: "Ürün sisteme eklenir",
                metin:
                  "Ad, günlük fiyat, stok adedi ve görseller girilir. Her ürüne bir etiket numarası verilir; boş bırakılırsa sistem kendisi üretir.",
              },
              {
                baslik: "QR etiketi basılır",
                metin:
                  "Her ürünün QR kodu, altında ürün adı ve etiket numarasıyla baskıya hazır bir PDF olarak indirilir ve ürünün üzerine yapıştırılır.",
              },
              {
                baslik: "Müşteri kodu okutur",
                metin:
                  "Müşteri telefonunun kamerasıyla kodu okutur; uygulama indirmesi gerekmez. Açılan sayfada ürünün bilgilerini ve müsaitlik takvimini görür.",
              },
              {
                baslik: "Müşteri talep bırakır, işletme onaylar",
                metin:
                  "Müşteri istediği tarihleri seçip rezervasyon talebi bırakır. Talep işletmenin panelindeki Talepler ekranına düşer; onaylandığında takvimde o günler kapanır.",
              },
              {
                baslik: "Teslim ve iade takip edilir",
                metin:
                  "Hangi ürünün kimde olduğu ve ne zaman dönmesi gerektiği panelde görünür; iade günü gelen kiralamalar için bir gün önceden bildirim düşer.",
              },
            ],
          },
        ],
      },
      {
        id: "kimler-icin",
        baslik: "Hangi işletmeler için uygundur?",
        bloklar: [
          {
            tur: "paragraf",
            metin:
              "Fiziksel bir ürünü belirli günler için kiraya veren her işletme bu yöntemi kullanabilir. Özellikle ürün çeşidi fazla olan ve kargoyla çalışan işletmelerde fark büyüktür, çünkü elle takipte en çok hata gönderim ve iade günlerinde yapılır.",
          },
          {
            tur: "liste",
            maddeler: [
              "Kostüm, gelinlik, abiye ve kına kıyafeti kiralayanlar",
              "Kamera, lens, ses ve ışık ekipmanı kiralayanlar",
              "Kamp, outdoor ve spor malzemesi kiralayanlar",
              "Organizasyon, süsleme ve parti malzemesi kiralayanlar",
            ],
          },
        ],
      },
      {
        id: "defter-mi-sistem-mi",
        baslik: "Defter ya da Excel ile QR kodlu takip arasındaki fark nedir?",
        bloklar: [
          {
            tur: "tablo",
            basliklar: ["", "Defter / Excel", "QR kodlu takip"],
            satirlar: [
              ["Müsaitlik sorusu", "Elle bakılır, müşteri cevap bekler", "Müşteri kodu okutup takvimi kendisi görür"],
              ["Çift rezervasyon", "Gözden kaçabilir", "Dolu günler takvimde kapalıdır"],
              ["Kargo ve temizlik günleri", "Akılda tutulur", "Takvimde otomatik kapatılır"],
              ["Ürünü bulmak", "Ada göre aranır", "Etiket okutulur ya da etiket numarasıyla aranır"],
            ],
          },
        ],
      },
      {
        id: "rentqr",
        baslik: "RentQR bu işi nasıl yapıyor?",
        bloklar: [
          {
            tur: "paragraf",
            metin:
              "[RentQR](/), Voyo Labs'in kiralama işletmeleri için geliştirdiği QR kodlu takip sistemidir. Telefondan uygulama gibi kullanılır; ürün eklemek, etiket basmak, talepleri onaylamak ve kiralamaları izlemek aynı panelde yapılır. Etiketi düşmüş bir ürün, fotoğrafı çekilerek ya da etiket numarasıyla da bulunabilir. Paket içeriği ve fiyat için [Paketler](/paketler) sayfasına bakabilirsiniz.",
          },
        ],
      },
    ],
    sss: [
      {
        soru: "Müşterinin QR kodu okutmak için uygulama indirmesi gerekir mi?",
        cevap:
          "Hayır. Güncel telefonların kamerası QR kodu doğrudan okur ve ürün sayfasını tarayıcıda açar.",
      },
      {
        soru: "Müşteri kodu okuttuğunda rezervasyon kesinleşir mi?",
        cevap:
          "Hayır, müşteri bir talep bırakır. Talep işletmenin onayına düşer; işletme onayladığında rezervasyon oluşur ve takvimde o günler kapanır.",
      },
      {
        soru: "QR etiketi kopar ya da silinirse ürün nasıl bulunur?",
        cevap:
          "Etiketin altındaki numarayla arama yapılabilir. RentQR'da ayrıca ürünün fotoğrafı çekilerek görselden de bulunabilir.",
      },
      {
        soru: "QR kodlu kiralama takibi kaç ürünle anlamlı hale gelir?",
        cevap:
          "Kesin bir sayı yok. Genel olarak aynı tarihe iki müşteri düşmeye başladığında ya da müşterilerin müsaitlik sorularına cevap vermek gün içinde ciddi vakit almaya başladığında defterin yerini bir sistemin alması gerekir.",
      },
    ],
  },
  {
    slug: "kiralik-urunlerde-cift-rezervasyon-nasil-onlenir",
    baslik: "Kiralık ürünlerde çift rezervasyon nasıl önlenir?",
    aciklama:
      "Aynı ürünün aynı tarihe iki müşteriye verilmesi kiralama işletmelerinin en pahalı hatasıdır. Kargo, iade ve hazırlık günlerini hesaba katarak çift rezervasyonu önlemenin yolları.",
    kisaCevap:
      "Çift rezervasyonu önlemenin yolu, her ürün için tek bir takvim tutmak ve o takvimde yalnızca kiralama günlerini değil, kargoya verilme, iade yolculuğu ve temizlik günlerini de kapatmaktır. Müsaitlik bilgisi bu takvimden okunduğunda, ürün fiziksel olarak hazır olmadığı bir güne ikinci kez verilemez.",
    yayin: "2026-10-26",
    guncelleme: "2026-10-26",
    etiketler: ["Rezervasyon", "Kiralama yönetimi"],
    bolumler: [
      {
        id: "neden-olur",
        baslik: "Çift rezervasyon neden olur?",
        bloklar: [
          {
            tur: "paragraf",
            metin:
              "Çift rezervasyonun sebebi çoğu zaman dikkatsizlik değil, **bilginin birden çok yerde durmasıdır**. Bir rezervasyon WhatsApp'ta, biri defterde, biri telefonda konuşulup akılda kalmışsa, en dikkatli işletme sahibi bile bir gün ikisini çakıştırır.",
          },
          {
            tur: "paragraf",
            metin:
              "İkinci sebep, kiralama aralığının ürünün gerçekte meşgul olduğu süreyi anlatmamasıdır. Cumartesi günü kullanılacak bir kıyafet cuma kargoya verilir, pazartesi geri gönderilir, çarşamba gelir ve ütülenip kontrol edilmeden yeniden verilemez. Takvimde yalnızca cumartesi dolu görünüyorsa, perşembe günü başka bir müşteriye söz verilebilir.",
          },
        ],
      },
      {
        id: "hangi-gunler",
        baslik: "Takvimde hangi günler kapatılmalı?",
        bloklar: [
          {
            tur: "tablo",
            basliklar: ["Süre", "Ne anlatır?"],
            satirlar: [
              ["Gönderim", "Ürünün kiralama başlangıcından kaç gün önce elden çıkması gerektiği"],
              ["İade gecikmesi", "Müşterinin kiralama bitiminden kaç gün sonra ürünü geri gönderdiği"],
              ["İade yolculuğu", "Ürünün geri dönerken yolda geçirdiği gün sayısı"],
              ["Hazırlık", "Temizlik, ütü ve kontrol için gereken gün sayısı"],
            ],
          },
          {
            tur: "paragraf",
            metin:
              "Bu süreler kargoyla gönderilen ve elden teslim edilen ürünlerde farklıdır; elden teslimde gönderim ve iade yolculuğu çoğu zaman sıfırdır. O yüzden iki teslim şekli için ayrı ayrı tanımlanmalıdır.",
          },
        ],
      },
      {
        id: "adimlar",
        baslik: "Çift rezervasyonu önlemek için ne yapılmalı?",
        bloklar: [
          {
            tur: "adimlar",
            adimlar: [
              {
                baslik: "Tek kaynak belirleyin",
                metin:
                  "Bütün rezervasyonlar, hangi kanaldan gelirse gelsin, tek bir takvime işlenmeli. Telefonla gelen talep de Instagram'dan gelen talep de aynı yere yazılmalı.",
              },
              {
                baslik: "Ürün başına takvim tutun",
                metin:
                  "Takvim kategori değil ürün bazında olmalı. Aynı modelden birden fazla varsa, stok adedi kadar rezervasyon kabul edilmeli.",
              },
              {
                baslik: "Tampon günleri tanımlayın",
                metin:
                  "Gönderim, iade ve hazırlık sürelerini bir kez belirleyin; her rezervasyonda elle hesaplamayın.",
              },
              {
                baslik: "Müsaitliği müşteriye gösterin",
                metin:
                  "Müşteri dolu günleri kendisi gördüğünde, zaten dolu bir tarih için talep gelmez ve \"müsait mi?\" sorusuna cevap verme yükü azalır.",
              },
              {
                baslik: "Onaydan önce kontrol edin",
                metin:
                  "Talepleri doğrudan rezervasyona çevirmek yerine onaylayarak kabul edin; onay anında takvim yeniden kontrol edilmeli.",
              },
            ],
          },
        ],
      },
      {
        id: "rentqr",
        baslik: "RentQR'da bu nasıl çalışıyor?",
        bloklar: [
          {
            tur: "paragraf",
            metin:
              "[RentQR](/) panelinde kargo ve elden teslim için gönderim, iade gecikmesi, iade yolculuğu ve hazırlık günleri ayrı ayrı ayarlanır. Bir rezervasyon girildiğinde takvimde yalnızca kiralama günleri değil, bu sürelerin tamamı kapanır. Müşteri ürünün QR kodunu okuttuğunda bu takvimi görür ve yalnızca boş günler için talep bırakabilir; talep işletmenin onayına düşer.",
          },
        ],
      },
    ],
    sss: [
      {
        soru: "Aynı üründen birden fazla varsa ne olur?",
        cevap:
          "Ürünün stok adedi girilir. Aynı günler için stok adedi kadar rezervasyon kabul edilir; stok dolduğunda o günler kapanır.",
      },
      {
        soru: "Hazırlık süresi kaç gün olmalı?",
        cevap:
          "Ürüne ve işletmeye göre değişir. Temizlik, kuru temizleme, ütü ya da teknik kontrol için genellikle kaç gün beklediğinize bakarak belirleyin; kargo yavaşladığı dönemlerde süreleri artırmak gerekebilir.",
      },
      {
        soru: "Müşteri dolu bir gün için talep bırakabilir mi?",
        cevap:
          "Müşterinin gördüğü takvimde dolu günler kapalıdır. Talep yine de onaya düştüğü için işletme son kararı kendisi verir.",
      },
    ],
  },
  {
    slug: "kiralik-urunler-icin-qr-etiket-rehberi",
    baslik: "Kiralık ürünler için QR etiket nasıl hazırlanır ve nereye yapıştırılır?",
    aciklama:
      "Kiralık ürünlere yapıştırılan QR etiketlerin boyutu, malzemesi ve yeri okunabilirliği doğrudan etkiler. Etiketleri basmadan önce bilmeniz gerekenler.",
    kisaCevap:
      "Kiralık ürün etiketi; okutulacağı mesafeye göre yeterince büyük, etrafında boşluk bırakılmış, suya ve sürtünmeye dayanıklı malzemeye basılmış ve ürünün kolay görülen ama aşınmayan bir yerine yapıştırılmış olmalıdır. QR kodun altına ürün adı ve etiket numarası yazmak, kod okunmadığında ürünü yine de bulmayı sağlar.",
    yayin: "2026-10-26",
    guncelleme: "2026-10-26",
    etiketler: ["QR kod", "Etiketleme"],
    bolumler: [
      {
        id: "boyut",
        baslik: "QR etiket hangi boyutta olmalı?",
        bloklar: [
          {
            tur: "paragraf",
            metin:
              "Sık kullanılan pratik kural, QR kodun kenar uzunluğunun okutma mesafesinin yaklaşık onda biri kadar olmasıdır: 20 cm'den okutulacak bir kod için 2 cm civarı yeterlidir. Kiralık ürünlerde kod genellikle yakından, elde tutularak okutulduğu için **2 × 2 cm'nin altına inmemek** iyi bir başlangıçtır. Raf ya da askı gibi uzaktan okutulacak yerlerde daha büyük basın.",
          },
          {
            tur: "paragraf",
            metin:
              "Kodun etrafında beyaz bir boşluk bırakın. Bu boşluk, kameranın kodun nerede başlayıp bittiğini anlamasını sağlar; kodu etiketin kenarına kadar taşırmak okumayı zorlaştırır.",
          },
        ],
      },
      {
        id: "malzeme",
        baslik: "Etiket hangi malzemeye basılmalı?",
        bloklar: [
          {
            tur: "liste",
            maddeler: [
              "**Kumaş ürünler (kostüm, gelinlik):** Yıkamaya dayanıklı dokuma etiket ya da dikilebilen etiket kartı. Yapışkan etiket ilk temizlikte düşer.",
              "**Elektronik ve ekipman:** Sürtünmeye dayanıklı polyester ya da lamine yapışkan etiket.",
              "**Kamp ve dış mekân ürünleri:** Suya ve güneşe dayanıklı vinil etiket.",
              "**Kutular ve çantalar:** Normal yapışkan etiket yeterli; kutunun sık açılmayan bir yüzüne yapıştırın.",
            ],
          },
        ],
      },
      {
        id: "yer",
        baslik: "Etiket ürünün neresine yapıştırılmalı?",
        bloklar: [
          {
            tur: "paragraf",
            metin:
              "Etiket, ürün rafta ya da kutusundayken görülebilecek, ama kullanım sırasında sürtünmeyecek bir yerde olmalı. Kavisli yüzeylerde kod bükülürse okunması zorlaşır; mümkünse düz bir yüzey seçin. Müşterinin de kodu okutacağı ürünlerde etiketi teslimde ilk görülecek yere koyun.",
          },
        ],
      },
      {
        id: "kontrol",
        baslik: "Etiketleri basmadan önce neleri kontrol etmeli?",
        bloklar: [
          {
            tur: "adimlar",
            adimlar: [
              {
                baslik: "Bir deneme baskısı alın",
                metin: "Tüm etiketleri basmadan önce birini basıp gerçek boyutta okutun.",
              },
              {
                baslik: "Farklı telefonlarla okutun",
                metin: "Hem eski hem yeni bir telefonla, hem iyi hem loş ışıkta deneyin.",
              },
              {
                baslik: "Etiket numarasını görünür bırakın",
                metin:
                  "Kod çizilir ya da yırtılırsa ürünü bulmanın yolu etiket numarasıdır. Numarayı kodun hemen altına okunaklı yazın.",
              },
              {
                baslik: "Kodu okutup doğru ürünün açıldığını görün",
                metin: "Etiketin yanlış ürüne yapıştırılması, okunmayan bir koddan daha zor fark edilir.",
              },
            ],
          },
        ],
      },
      {
        id: "rentqr",
        baslik: "RentQR'da etiket nasıl hazırlanıyor?",
        bloklar: [
          {
            tur: "paragraf",
            metin:
              "[RentQR](/) panelinde her ürünün sayfasından QR etiketi indirilir. Etiket, ürünün QR kodunu, adını ve etiket numarasını içeren baskıya hazır bir PDF'tir; vektörel olduğu için hangi boyutta basılırsa basılsın keskin kalır. Etiket numarası ürün eklenirken girilebilir, boş bırakılırsa sistem kendisi verir. Etiketi düşmüş bir ürün panelde etiket numarasıyla ya da fotoğrafı çekilerek bulunabilir.",
          },
        ],
      },
    ],
    sss: [
      {
        soru: "QR etiketi normal yazıcıdan basılabilir mi?",
        cevap:
          "Evet. A4 yapışkan etiket kâğıdı ve normal bir lazer ya da mürekkep püskürtmeli yazıcı yeterlidir. Dış mekânda kullanılacak ürünler için suya dayanıklı etiket kâğıdı tercih edin.",
      },
      {
        soru: "Renkli QR kod kullanılabilir mi?",
        cevap:
          "Kullanılabilir ama kod ile zemin arasında güçlü bir kontrast olmalı. En güvenlisi beyaz zemin üzerine siyah koddur; açık renk zemin üzerine açık renk kod okunmayabilir.",
      },
      {
        soru: "Ürünün fiyatı değişince etiketi yeniden basmak gerekir mi?",
        cevap:
          "Hayır. QR kod ürünün sayfasını açar; fiyat, açıklama ve takvim o sayfada güncellendiği için etiket aynı kalır.",
      },
    ],
  },
];

export function yaziBul(slug: string) {
  return YAZILAR.find((y) => y.slug === slug);
}
