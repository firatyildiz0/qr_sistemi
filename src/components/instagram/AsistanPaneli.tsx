"use client";

import { useState, useTransition } from "react";
import {
  asistaniDene,
  ayarlariKaydet,
} from "@/app/admin/instagram-paneli/actions";
import {
  SINIRLAR,
  type Hitap,
  type InstagramAyarlari,
  type Uslup,
} from "@/lib/instagram/ayarlar";
import type { GecmisMesaj } from "@/lib/instagram/tipler";
import { IconAlertTriangle, IconCheckCircle, IconPlus, IconTrash } from "@/components/icons";

/**
 * Instagram asistanının yönetim formu.
 *
 * Form tek bir durum nesnesi tutuyor ve kaydederken onu olduğu gibi
 * gönderiyor; doğrulama sunucuda (`ayarlariOku`). "Dene" kutusu da aynı
 * nesneyi kullanıyor, yani satıcı kaydetmeden önce değişikliğin etkisini
 * görebiliyor.
 */
export default function AsistanPaneli({
  baslangic,
  asistanHazir,
}: {
  baslangic: InstagramAyarlari;
  asistanHazir: boolean;
}) {
  const [ayarlar, setAyarlar] = useState(baslangic);
  const [kayitli, setKayitli] = useState(baslangic);
  const [durum, setDurum] = useState<{ iyi: boolean; metin: string } | null>(null);
  const [kaydediliyor, startKaydet] = useTransition();

  const degisti = JSON.stringify(ayarlar) !== JSON.stringify(kayitli);

  function guncelle<K extends keyof InstagramAyarlari>(alan: K, deger: InstagramAyarlari[K]) {
    setAyarlar((onceki) => ({ ...onceki, [alan]: deger }));
    setDurum(null);
  }

  function kaydet() {
    startKaydet(async () => {
      const sonuc = await ayarlariKaydet(ayarlar);
      if (sonuc.hata || !sonuc.ayarlar) {
        setDurum({ iyi: false, metin: sonuc.hata ?? "Kaydedilemedi." });
        return;
      }
      setAyarlar(sonuc.ayarlar);
      setKayitli(sonuc.ayarlar);
      setDurum({ iyi: true, metin: "Kaydedildi. Asistan bundan sonraki mesajlarda bunlara göre cevap verecek." });
    });
  }

  return (
    <div className="space-y-6">
      {!asistanHazir && (
        <p className="notice-warning flex items-start gap-2 text-sm">
          <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Soru cevaplama bu kurulumda yapılandırılmamış (yapay zekâ anahtarı tanımlı değil).
          Rezervasyon akışı ve buradaki sabit mesajlar yine çalışır.
        </p>
      )}

      <Bolum
        baslik="Genel"
        aciklama="Asistan neleri yapsın, müşteriye nasıl hitap etsin."
      >
        <div className="space-y-5">
          <Anahtar
            checked={ayarlar.soruCevapAcik}
            onChange={(v) => guncelle("soruCevapAcik", v)}
            label="Sorulara cevap ver"
            description="Fiyat, kargo, kapora, beden gibi sorulara aşağıdaki bilgilere dayanarak kısa cevap verir. Mesaj istekleri kutusuna düşenler dahil."
          />
          <Anahtar
            checked={ayarlar.rezervasyonAcik}
            onChange={(v) => guncelle("rezervasyonAcik", v)}
            label="Mesajdan rezervasyon al"
            description="Müşteri ürün kodunu yazınca tarih, ad, telefon ve adres sorulur; talep Talepler ekranına düşer."
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Secim<Hitap>
              label="Hitap"
              value={ayarlar.hitap}
              onChange={(v) => guncelle("hitap", v)}
              secenekler={[
                { deger: "siz", ad: "Siz" },
                { deger: "sen", ad: "Sen" },
              ]}
            />
            <Secim<Uslup>
              label="Üslup"
              value={ayarlar.uslup}
              onChange={(v) => guncelle("uslup", v)}
              secenekler={[
                { deger: "samimi", ad: "Samimi" },
                { deger: "dengeli", ad: "Dengeli" },
                { deger: "resmi", ad: "Resmi" },
              ]}
            />
            <div>
              <label htmlFor="min-gun" className="field-label">
                En az kiralama (gün)
              </label>
              <input
                id="min-gun"
                type="number"
                inputMode="numeric"
                min={1}
                max={SINIRLAR.minGun}
                placeholder="Sınır yok"
                value={ayarlar.minGun ?? ""}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  guncelle("minGun", e.target.value && n > 1 ? Math.min(n, SINIRLAR.minGun) : null);
                }}
                className="input"
              />
            </div>
          </div>
        </div>
      </Bolum>

      <Bolum
        baslik="İlk mesaj"
        aciklama="Size ilk kez yazan müşteriye giden karşılama. Boş bırakırsanız varsayılan kullanılır."
      >
        <Metin
          id="karsilama"
          rows={3}
          sinir={SINIRLAR.kisaMetin}
          value={ayarlar.karsilama}
          onChange={(v) => guncelle("karsilama", v)}
          placeholder={
            ayarlar.rezervasyonAcik
              ? "Merhaba! 👋 Merak ettiğiniz bir şey varsa yazabilirsiniz. Rezervasyon için ürünün kodunu yazmanız yeterli."
              : "Merhaba! 👋 Merak ettiğiniz bir şey varsa yazabilirsiniz."
          }
        />
      </Bolum>

      <Bolum
        baslik="İşletme bilgisi"
        aciklama="Asistanın bildiği her şey burası. Müşterilerin sık sorduğu ne varsa yazın; ne kadar net yazarsanız cevaplar o kadar doğru olur."
      >
        <Metin
          id="isletme"
          rows={8}
          sinir={SINIRLAR.uzunMetin}
          value={ayarlar.isletmeBilgisi}
          onChange={(v) => guncelle("isletmeBilgisi", v)}
          placeholder={[
            "Örneğin:",
            "- Ne kiralıyoruz: abiye, nişan elbisesi, bebek arabası...",
            "- Adres ve çalışma saatleri: Nilüfer/Bursa, hafta içi 10:00-19:00, pazar kapalı",
            "- Teslimat: Bursa içi elden teslim, diğer illere kargo (kargo ücreti müşteriye ait)",
            "- Ödeme: nakit, havale, kart. Kapora %30.",
            "- Temizlik ücreti fiyata dahil. Tadilat yapılmıyor.",
          ].join("\n")}
        />
      </Bolum>

      <Bolum
        baslik="Kurallar, şartlar ve istisnalar"
        aciklama="Esnetilmeyecek şeyler. Asistan müşteri ısrar etse de bunların dışına çıkmaz."
      >
        <Metin
          id="kurallar"
          rows={6}
          sinir={SINIRLAR.uzunMetin}
          value={ayarlar.kurallar}
          onChange={(v) => guncelle("kurallar", v)}
          placeholder={[
            "Örneğin:",
            "- Kapora alınmadan rezervasyon kesinleşmez.",
            "- Ürün en geç kiralama bitişinden sonraki gün iade edilir, gecikmenin günlüğü ayrıca alınır.",
            "- Gelinlikler yalnızca elden teslim edilir, kargoyla gönderilmez.",
            "- Bayram haftasında en az 3 gün kiralanır.",
            "- İndirim ya da pazarlık yapılmaz.",
          ].join("\n")}
        />
      </Bolum>

      <Bolum
        baslik="Örnek konuşmalar"
        aciklama="Sık gelen sorulara sizin nasıl cevap verdiğinizi yazın. Asistan hem bilgiyi hem üslubu buradan öğrenir."
      >
        <OrnekListesi
          ornekler={ayarlar.ornekler}
          onChange={(v) => guncelle("ornekler", v)}
        />
      </Bolum>

      <Bolum
        baslik="Asla yapmasın"
        aciklama="Asistanın konuşmaması gereken konular ya da vermemesi gereken sözler."
      >
        <Metin
          id="yasaklar"
          rows={3}
          sinir={SINIRLAR.uzunMetin}
          value={ayarlar.yasaklar}
          onChange={(v) => guncelle("yasaklar", v)}
          placeholder="Örneğin: Telefon numaramızı verme, müşteri ararsa mesajdan yazmasını söyle. Rakip firmalar hakkında konuşma."
        />
      </Bolum>

      <Bolum
        baslik="Hazır mesajlar"
        aciklama="Rezervasyon akışında müşteriye giden sabit mesajlar. Boş bırakılanlar varsayılan metni kullanır."
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="talep-alindi" className="field-label">
              Talep alındığında
            </label>
            <Metin
              id="talep-alindi"
              rows={2}
              sinir={SINIRLAR.kisaMetin}
              value={ayarlar.talepAlindi}
              onChange={(v) => guncelle("talepAlindi", v)}
              placeholder="Talebiniz satıcıya iletildi. ✅ Satıcı onayladığı anda buradan haber vereceğiz."
            />
          </div>
          <div>
            <label htmlFor="onay-notu" className="field-label">
              Rezervasyonu onayladığınızda (mesajın sonuna eklenir)
            </label>
            <Metin
              id="onay-notu"
              rows={2}
              sinir={SINIRLAR.kisaMetin}
              value={ayarlar.onayNotu}
              onChange={(v) => guncelle("onayNotu", v)}
              placeholder="Teslimat için satıcı sizinle iletişime geçecek."
            />
          </div>
        </div>
      </Bolum>

      <Deneme ayarlar={ayarlar} asistanHazir={asistanHazir} />

      <Bolum
        baslik="Mesaj istekleri kutusu"
        aciklama="Sizi takip etmeyen biri yazınca mesajı Instagram'da istekler kutusuna düşer. Asistanın onlara da cevap verebilmesi için bir kez şu ayarı açın:"
      >
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-muted">
          <li>Instagram uygulamasında profilinize gidin → Ayarlar ve hareketler.</li>
          <li>Mesajlar ve hikâye yanıtları → Mesaj kontrolleri.</li>
          <li>
            &quot;Bağlı araçlar&quot; altında <span className="font-medium text-ink">Mesajlara erişime izin ver</span> seçeneğini açın.
          </li>
        </ol>
        <p className="mt-3 text-sm text-ink-muted">
          Asistan cevap verince sohbet istekler kutusundan ana gelen kutusuna taşınır.
        </p>
      </Bolum>

      {/* Kaydet çubuğu formun altında yapışık duruyor: uzun formda en alta
          inmeden kaydedilebilsin. Mobilde sekme çubuğunun üstünde. */}
      <div className="sticky bottom-20 z-30 md:bottom-4">
        <div className="card flex items-center justify-between gap-3 px-4 py-3 shadow-lg">
          <p
            className={`flex min-w-0 items-center gap-2 text-sm ${
              durum ? (durum.iyi ? "text-success" : "text-danger") : "text-ink-muted"
            }`}
          >
            {durum?.iyi && <IconCheckCircle className="h-4 w-4 shrink-0" />}
            <span className="truncate">
              {durum?.metin ?? (degisti ? "Kaydedilmemiş değişiklikler var." : "Her şey kayıtlı.")}
            </span>
          </p>
          <button
            type="button"
            onClick={kaydet}
            disabled={kaydediliyor || !degisti}
            className="btn btn-primary shrink-0"
          >
            {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Bolum({
  baslik,
  aciklama,
  children,
}: {
  baslik: string;
  aciklama: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="font-semibold text-ink">{baslik}</h2>
        <p className="mt-1 text-sm text-ink-muted">{aciklama}</p>
      </div>
      {children}
    </section>
  );
}

function Metin({
  id,
  value,
  onChange,
  rows,
  sinir,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  sinir: number;
  placeholder?: string;
}) {
  return (
    <div>
      <textarea
        id={id}
        rows={rows}
        maxLength={sinir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
      />
      {value.length > sinir * 0.8 && (
        <p className="mt-1 text-right text-xs text-ink-muted">
          {value.length} / {sinir}
        </p>
      )}
    </div>
  );
}

function Anahtar({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="relative flex cursor-pointer items-start gap-4">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none opacity-0"
      />
      <span className="mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border border-border bg-paper p-0.5 transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
        <span
          className={`h-4.5 w-4.5 rounded-full bg-card shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-sm text-ink-muted">{description}</span>
      </span>
    </label>
  );
}

function Secim<T extends string>({
  label,
  value,
  onChange,
  secenekler,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  secenekler: { deger: T; ad: string }[];
}) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-lg bg-surface p-1">
        {secenekler.map((s) => (
          <button
            key={s.deger}
            type="button"
            role="radio"
            aria-checked={value === s.deger}
            onClick={() => onChange(s.deger)}
            className={`flex-1 rounded-md px-2 py-2 text-sm font-semibold transition ${
              value === s.deger ? "bg-card text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            {s.ad}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrnekListesi({
  ornekler,
  onChange,
}: {
  ornekler: InstagramAyarlari["ornekler"];
  onChange: (v: InstagramAyarlari["ornekler"]) => void;
}) {
  function degistir(sira: number, alan: "soru" | "cevap", deger: string) {
    onChange(ornekler.map((o, i) => (i === sira ? { ...o, [alan]: deger } : o)));
  }

  return (
    <div className="space-y-3">
      {ornekler.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-ink-muted">
          Henüz örnek yok. Örneğin müşteri &quot;Kargo kaç günde gelir?&quot; diye sorunca siz ne
          yazıyorsanız onu ekleyin.
        </p>
      )}

      {ornekler.map((o, i) => (
        <div key={i} className="rounded-lg border border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`soru-${i}`} className="field-label">
                Müşteri yazar
              </label>
              <textarea
                id={`soru-${i}`}
                rows={2}
                maxLength={SINIRLAR.ornekMetin}
                value={o.soru}
                onChange={(e) => degistir(i, "soru", e.target.value)}
                placeholder="Kargo kaç günde gelir?"
                className="input"
              />
            </div>
            <div>
              <label htmlFor={`cevap-${i}`} className="field-label">
                Siz cevaplarsınız
              </label>
              <textarea
                id={`cevap-${i}`}
                rows={2}
                maxLength={SINIRLAR.ornekMetin}
                value={o.cevap}
                onChange={(e) => degistir(i, "cevap", e.target.value)}
                placeholder="Genelde ertesi gün elinizde oluyor 😊 Kiralama tarihinden 2 gün önce kargoluyoruz."
                className="input"
              />
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => onChange(ornekler.filter((_, j) => j !== i))}
              className="btn btn-ghost !min-h-9 !px-3 text-sm"
            >
              <IconTrash className="h-4 w-4" />
              Sil
            </button>
          </div>
        </div>
      ))}

      {ornekler.length < SINIRLAR.ornekSayisi && (
        <button
          type="button"
          onClick={() => onChange([...ornekler, { soru: "", cevap: "" }])}
          className="btn btn-secondary"
        >
          <IconPlus className="h-4 w-4" />
          Örnek ekle
        </button>
      )}
    </div>
  );
}

/**
 * Satıcının asistanı kendi yazarak denediği kutu. Yazılan her şey yalnızca
 * burada kalıyor; Instagram'a hiçbir şey gitmiyor.
 */
function Deneme({
  ayarlar,
  asistanHazir,
}: {
  ayarlar: InstagramAyarlari;
  asistanHazir: boolean;
}) {
  const [gecmis, setGecmis] = useState<GecmisMesaj[]>([]);
  const [mesaj, setMesaj] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, startGonder] = useTransition();

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    const metin = mesaj.trim();
    if (!metin) return;

    setHata(null);
    setMesaj("");
    const onceki = gecmis;
    setGecmis([...onceki, { kim: "musteri", metin }]);

    startGonder(async () => {
      const sonuc = await asistaniDene(ayarlar, onceki, metin);
      if (sonuc.cevap) {
        setGecmis([...onceki, { kim: "musteri", metin }, { kim: "biz", metin: sonuc.cevap }]);
      } else {
        setHata(sonuc.hata);
      }
    });
  }

  return (
    <Bolum
      baslik="Dene"
      aciklama="Müşteri gibi yazın, asistanın ne cevap vereceğini görün. Kaydetmediğiniz değişiklikler de hesaba katılır; Instagram'a hiçbir şey gitmez."
    >
      <div className="space-y-2 rounded-lg bg-surface p-3">
        {gecmis.length === 0 && (
          <p className="py-6 text-center text-sm text-ink-muted">
            Örneğin: &quot;Kapora ne kadar?&quot; ya da &quot;Siyah abiye var mı?&quot;
          </p>
        )}
        {gecmis.map((m, i) => (
          <div key={i} className={`flex ${m.kim === "musteri" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${
                m.kim === "musteri" ? "bg-accent text-white" : "bg-card text-ink shadow-sm"
              }`}
            >
              {m.metin}
            </p>
          </div>
        ))}
        {bekliyor && <p className="text-sm text-ink-muted">Yazıyor…</p>}
      </div>

      {hata && <p className="text-sm text-danger">{hata}</p>}

      <form onSubmit={gonder} className="flex gap-2">
        <input
          value={mesaj}
          onChange={(e) => setMesaj(e.target.value)}
          placeholder={asistanHazir ? "Müşteri mesajı yazın…" : "Soru cevaplama yapılandırılmamış"}
          disabled={!asistanHazir}
          aria-label="Deneme mesajı"
          className="input"
        />
        <button type="submit" disabled={!asistanHazir || bekliyor} className="btn btn-primary shrink-0">
          Gönder
        </button>
        {gecmis.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setGecmis([]);
              setHata(null);
            }}
            className="btn btn-ghost shrink-0"
          >
            Temizle
          </button>
        )}
      </form>
    </Bolum>
  );
}
