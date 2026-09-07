"use client";

import { useEffect, useRef, useState } from "react";
import type { RezervasyonPlani } from "@/lib/asistan/araclar";
import {
  olaydanMetin,
  seslendir,
  seslendirmeDestekleniyor,
  seslendirmeyiDurdur,
  seslendirmeyiHazirla,
  tanimaDestekleniyor,
  taniyiciKur,
  type Taniyici,
} from "@/lib/asistan/ses";
import {
  IconCheck,
  IconMic,
  IconMicOff,
  IconSend,
  IconSparkles,
  IconVolume,
  IconVolumeOff,
  IconX,
} from "@/components/icons";

/**
 * Asistanın sohbet penceresi.
 *
 * İki ayrı geçmiş tutuluyor ve bu bilerek: `mesajlarRef` modelin gördüğü ham
 * geçmiş (araç çağrıları, araç sonuçları, hepsi), `balonlar` ise ekranda görünen
 * konuşma. Model geçmişini ekrana basmak, satıcıya kimlik dizileri ve JSON
 * göstermek olurdu; ekran geçmişini modele göndermek ise onu kendi araç
 * çağrılarından habersiz bırakırdı.
 *
 * Ham geçmiş her istekte sunucuya geri gidiyor. Sunucu tarafı durumsuz kalıyor
 * böylece; sohbeti orada saklamak, kullanılmayan sekmeler için bellek tutmak
 * demekti.
 */

type Balon = { rol: "sen" | "veyro"; metin: string };

type Yanit =
  | { tip: "yanit"; metin: string; mesajlar: unknown[]; kalan: number }
  | {
      tip: "onay";
      metin: string;
      plan: RezervasyonPlani;
      arac_id: string;
      mesajlar: unknown[];
      kalan: number;
    };

const KARSILAMA =
  "Merhaba. Ürün arayabilir, tarihlerin boş olup olmadığına bakabilir ve " +
  "rezervasyon oluşturabilirim. Ne yapalım?";

const ORNEKLER = [
  "12 Ekim'den 15 Ekim'e Ayşe Yılmaz'a kırmızı gelinlik ayır",
  "Bu hafta sonu hangi gelinlikler boş?",
  "Mehmet Demir daha önce ne kiralamıştı?",
];

export default function AsistanPanel({ onClose }: { onClose: () => void }) {
  const [balonlar, setBalonlar] = useState<Balon[]>([
    { rol: "veyro", metin: KARSILAMA },
  ]);
  const [bekleyenPlan, setBekleyenPlan] = useState<{
    plan: RezervasyonPlani;
    aracId: string;
  } | null>(null);

  const [girdi, setGirdi] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const [dinliyor, setDinliyor] = useState(false);
  const [sesliYanit, setSesliYanit] = useState(false);
  /** Eller serbest kip: cevap okunduktan sonra mikrofon kendiliğinden açılır. */
  const [sesliKip, setSesliKip] = useState(false);

  // Tarayıcı yetenekleri ilk render'da okunuyor. Panel yalnızca kullanıcı
  // düğmeye bastığında monte edildiği için burada sunucu tarafı hiç çalışmıyor;
  // yine de iki denetim de `window` yokluğuna karşı korumalı (bkz. ses.ts).
  const [sesVar] = useState(tanimaDestekleniyor);
  const [okumaVar] = useState(seslendirmeDestekleniyor);

  /**
   * Modelin gördüğü ham geçmiş. Ekranda hiç görünmediği için durum değil ref:
   * her turda değişiyor ama tek bir pikseli bile yeniden çizdirmiyor.
   */
  const mesajlarRef = useRef<unknown[]>([]);
  /**
   * `yukleniyor` durumunun ref ikizi. Durumun kendisi düğmeleri kilitliyor;
   * ref ise mikrofonun geri çağrısının "istek sürüyor mu" sorusuna bayat
   * olmayan bir cevap verebilmesi için.
   */
  const yukleniyorRef = useRef(false);
  const taniyiciRef = useRef<Taniyici | null>(null);
  const listeRef = useRef<HTMLDivElement>(null);
  const girdiRef = useRef<HTMLInputElement>(null);
  /** Panel kapandıktan sonra gelen geri çağrılar durumu değiştirmesin. */
  const canliRef = useRef(true);

  useEffect(() => {
    seslendirmeyiHazirla();

    return () => {
      canliRef.current = false;
      seslendirmeyiDurdur();
      taniyiciRef.current?.abort();
    };
  }, []);

  // Yeni balon geldiğinde en alta kaydır.
  useEffect(() => {
    listeRef.current?.scrollTo({
      top: listeRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [balonlar, bekleyenPlan, yukleniyor]);

  /** Mikrofonu kapat — hem kullanıcı istediğinde hem cevap okunmadan önce. */
  function dinlemeyiDurdur() {
    taniyiciRef.current?.abort();
    taniyiciRef.current = null;
    setDinliyor(false);
  }

  /**
   * Sunucuya bir tur atar.
   *
   * `govde` ya yeni bir kullanıcı mesajı taşıyor ya da onay kartının cevabını.
   * İkisi de aynı uca gidiyor çünkü ikisi de sohbetin bir adımı — onay,
   * modelin beklediği araç sonucundan başka bir şey değil.
   *
   * Bu üç fonksiyon (`tur`, `gonder`, `dinlemeyiBaslat`) birbirini çağırıyor:
   * tanıma biter → gönderilir → cevap okunur → tanıma yeniden başlar. Döngü
   * gerçek, çünkü sesli sohbetin kendisi bir döngü. Bildirim olarak yazılmış
   * fonksiyonlar (`function`, `const` değil) yukarı taşındığı için sıra derdi
   * olmadan birbirlerine erişiyorlar.
   */
  async function tur(govde: Record<string, unknown>) {
    setYukleniyor(true);
    setHata(null);

    try {
      const cevap = await fetch("/api/asistan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(govde),
      });

      if (!canliRef.current) return;

      if (!cevap.ok) {
        const { hata: mesaj } = (await cevap.json().catch(() => ({}))) as {
          hata?: string;
        };
        setHata(mesaj ?? "Asistana ulaşılamadı.");
        return;
      }

      const yanit = (await cevap.json()) as Yanit;
      if (!canliRef.current) return;

      // Geçmiş ref'te duruyor: sesli kipte mikrofonun geri çağrısı kurulduğu
      // render'ın kapanışını taşıyor ve oradaki geçmiş bir tur sonra bayat
      // olurdu.
      mesajlarRef.current = yanit.mesajlar;

      if (yanit.tip === "onay") {
        setBekleyenPlan({ plan: yanit.plan, aracId: yanit.arac_id });
        // Kart ekranda; okunacak bir cümle yok, karar görsel olarak veriliyor.
        return;
      }

      setBekleyenPlan(null);
      if (yanit.metin) {
        setBalonlar((onceki) => [...onceki, { rol: "veyro", metin: yanit.metin }]);
      }

      if (sesliYanit && yanit.metin) {
        setYukleniyor(false);
        await seslendir(yanit.metin);
        if (!canliRef.current) return;
        // Eller serbest kipte söz tekrar kullanıcıda: mikrofon açılıyor.
        // Okuma bitmeden açılsaydı asistan kendi sesini duyardı.
        if (sesliKip) dinlemeyiBaslat();
      }
    } catch {
      if (canliRef.current) setHata("Bağlantı kurulamadı.");
    } finally {
      if (canliRef.current) setYukleniyor(false);
    }
  }

  function gonder(metin: string) {
    const temiz = metin.trim();
    if (!temiz || yukleniyorRef.current) return;

    yukleniyorRef.current = true;
    setGirdi("");
    setBalonlar((onceki) => [...onceki, { rol: "sen", metin: temiz }]);

    // Bugünün tarihi kullanıcı mesajının yanında gidiyor, sistem talimatında
    // değil: talimat sabit kalırsa önbelleğe giriyor ve maliyet onda birine
    // düşüyor. Tarihi oraya koymak önbelleği her gece geçersiz kılardı.
    const bugun = new Date();
    const damga =
      `[bugün ${bugun.toLocaleDateString("tr-TR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })}, ${bugun.toISOString().slice(0, 10)}]\n` + temiz;

    const yeni = [...mesajlarRef.current, { role: "user", content: damga }];

    void tur({ mesajlar: yeni }).finally(() => {
      yukleniyorRef.current = false;
    });
  }

  /** Mikrofonu açar. */
  function dinlemeyiBaslat() {
    if (yukleniyorRef.current || taniyiciRef.current) return;

    const taniyici = taniyiciKur();
    if (!taniyici) {
      setHata("Bu tarayıcı sesli girişi desteklemiyor.");
      return;
    }

    // Okuma sürerken mikrofon açılırsa asistan kendi cevabını dinler.
    seslendirmeyiDurdur();

    let sonMetin = "";

    taniyici.onstart = () => {
      if (canliRef.current) setDinliyor(true);
    };

    taniyici.onresult = (olay) => {
      const { metin, bitti } = olaydanMetin(olay);
      if (!canliRef.current) return;

      sonMetin = metin;
      setGirdi(metin);

      if (bitti && metin) {
        // Tanıma bitti: cümle olduğu gibi gönderiliyor. `onend` de gelecek ama
        // orada tekrar göndermemek için metin sıfırlanıyor.
        sonMetin = "";
        taniyiciRef.current = null;
        setDinliyor(false);
        gonder(metin);
      }
    };

    taniyici.onerror = (olay) => {
      if (!canliRef.current) return;
      setDinliyor(false);
      taniyiciRef.current = null;

      // `no-speech` ve `aborted` hata değil: kullanıcı susmuş ya da mikrofonu
      // kendisi kapatmış. Kırmızı bir uyarı göstermek yanıltıcı olurdu.
      if (olay.error === "no-speech" || olay.error === "aborted") return;

      setHata(
        olay.error === "not-allowed"
          ? "Mikrofon izni verilmedi. Tarayıcı ayarlarından açabilirsin."
          : "Ses alınamadı. Yazarak deneyebilirsin."
      );
      setSesliKip(false);
    };

    taniyici.onend = () => {
      if (!canliRef.current) return;
      setDinliyor(false);
      taniyiciRef.current = null;
      // Kullanıcı konuşup sustuysa ama tanıma "final" vermediyse eldeki metin
      // yine de gönderiliyor — cümle kaybolmasın.
      if (sonMetin) {
        const metin = sonMetin;
        sonMetin = "";
        gonder(metin);
      }
    };

    taniyiciRef.current = taniyici;

    try {
      taniyici.start();
    } catch {
      taniyiciRef.current = null;
      setDinliyor(false);
    }
  }

  function onayla(kabul: boolean) {
    if (!bekleyenPlan) return;

    setBalonlar((onceki) => [
      ...onceki,
      { rol: "sen", metin: kabul ? "Onaylıyorum." : "Vazgeçtim." },
    ]);

    const { plan, aracId } = bekleyenPlan;
    setBekleyenPlan(null);

    yukleniyorRef.current = true;
    void tur({
      mesajlar: mesajlarRef.current,
      onay: { arac_id: aracId, kabul, plan },
    }).finally(() => {
      yukleniyorRef.current = false;
    });
  }

  function sesliKipiDegistir() {
    const yeni = !sesliKip;
    setSesliKip(yeni);

    if (yeni) {
      // Eller serbest kip sesli cevap olmadan anlamsız; ikisi birlikte açılıyor.
      setSesliYanit(true);
      dinlemeyiBaslat();
    } else {
      dinlemeyiDurdur();
      seslendirmeyiDurdur();
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Veyro asistan"
      className="asistan-panel fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
    >
      <header className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white">
          <IconSparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">Veyro</p>
          <p className="truncate text-xs text-ink-muted">
            {dinliyor ? "Dinliyorum…" : yukleniyor ? "Düşünüyorum…" : "Panel asistanı"}
          </p>
        </div>

        {okumaVar && (
          <button
            type="button"
            onClick={() => {
              const yeni = !sesliYanit;
              setSesliYanit(yeni);
              if (!yeni) {
                seslendirmeyiDurdur();
                setSesliKip(false);
              }
            }}
            title={sesliYanit ? "Sesli yanıtı kapat" : "Sesli yanıtı aç"}
            aria-pressed={sesliYanit}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              sesliYanit ? "bg-accent/15 text-accent" : "text-ink-muted hover:bg-card"
            }`}
          >
            {sesliYanit ? (
              <IconVolume className="h-4 w-4" />
            ) : (
              <IconVolumeOff className="h-4 w-4" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Asistanı kapat"
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-card hover:text-ink"
        >
          <IconX className="h-4 w-4" />
        </button>
      </header>

      <div ref={listeRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {balonlar.map((balon, i) => (
          <div
            key={i}
            className={balon.rol === "sen" ? "flex justify-end" : "flex justify-start"}
          >
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                balon.rol === "sen"
                  ? "rounded-br-sm bg-accent text-white"
                  : "rounded-bl-sm bg-surface text-ink"
              }`}
            >
              {balon.metin}
            </p>
          </div>
        ))}

        {balonlar.length === 1 && (
          <div className="space-y-1.5 pt-1">
            {ORNEKLER.map((ornek) => (
              <button
                key={ornek}
                type="button"
                onClick={() => gonder(ornek)}
                className="block w-full rounded-lg border border-border px-3 py-2 text-left text-xs text-ink-muted transition-colors hover:border-accent hover:text-ink"
              >
                {ornek}
              </button>
            ))}
          </div>
        )}

        {bekleyenPlan && <OnayKarti plan={bekleyenPlan.plan} onCevap={onayla} />}

        {yukleniyor && (
          <div className="flex justify-start">
            <span className="flex gap-1 rounded-2xl rounded-bl-sm bg-surface px-3.5 py-3">
              <Nokta gecikme="0ms" />
              <Nokta gecikme="150ms" />
              <Nokta gecikme="300ms" />
            </span>
          </div>
        )}

        {hata && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {hata}
          </p>
        )}
      </div>

      <form
        onSubmit={(olay) => {
          olay.preventDefault();
          gonder(girdi);
        }}
        className="flex items-center gap-2 border-t border-border px-3 py-2.5"
      >
        {sesVar && (
          <button
            type="button"
            onClick={dinliyor ? dinlemeyiDurdur : dinlemeyiBaslat}
            disabled={yukleniyor}
            aria-pressed={dinliyor}
            title={dinliyor ? "Dinlemeyi durdur" : "Konuşarak anlat"}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
              dinliyor
                ? "asistan-dinliyor bg-danger text-white"
                : "bg-surface text-ink-muted hover:text-ink"
            }`}
          >
            {dinliyor ? <IconMicOff className="h-4 w-4" /> : <IconMic className="h-4 w-4" />}
          </button>
        )}

        <input
          ref={girdiRef}
          value={girdi}
          onChange={(olay) => setGirdi(olay.target.value)}
          placeholder={dinliyor ? "Dinliyorum…" : "Ne yapmamı istersin?"}
          disabled={yukleniyor}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={yukleniyor || !girdi.trim()}
          aria-label="Gönder"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-opacity disabled:opacity-30"
        >
          <IconSend className="h-4 w-4" />
        </button>
      </form>

      {sesVar && okumaVar && (
        <button
          type="button"
          onClick={sesliKipiDegistir}
          aria-pressed={sesliKip}
          className={`border-t border-border px-4 py-2 text-xs font-medium transition-colors ${
            sesliKip ? "bg-accent/10 text-accent" : "text-ink-muted hover:text-ink"
          }`}
        >
          {sesliKip
            ? "Eller serbest kip açık — dokunmadan konuşabilirsin"
            : "Eller serbest kipi başlat"}
        </button>
      )}
    </div>
  );
}

function Nokta({ gecikme }: { gecikme: string }) {
  return (
    <span
      className="asistan-nokta h-1.5 w-1.5 rounded-full bg-ink-muted"
      style={{ animationDelay: gecikme }}
    />
  );
}

/**
 * Onay kartı — asistanın yazma yetkisinin durduğu yer.
 *
 * Model buraya kadar gelebiliyor; kaydı açan tıklama satıcının. Kartın işi
 * kararı verilebilir kılmak, o yüzden anlaşılan her şey yazılı: hangi ürün,
 * hangi tarihler, kime, nereye, ve ürünün kargo dahil kaç gün kapanacağı.
 * Model tarihi yanlış anladıysa satıcı burada görür.
 */
function OnayKarti({
  plan,
  onCevap,
}: {
  plan: RezervasyonPlani;
  onCevap: (kabul: boolean) => void;
}) {
  const gun = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
    });

  const blokeFarkli =
    plan.bloke_baslangic !== plan.baslangic || plan.bloke_bitis !== plan.bitis;

  return (
    <div className="rounded-xl border border-accent/40 bg-accent/5 p-3.5">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-accent">
        Onayın bekleniyor
      </p>

      <dl className="space-y-1.5 text-sm">
        <Satir etiket="Ürün">
          {plan.urun_adi}
          {plan.adet > 1 ? ` · ${plan.adet} adet` : ""}
        </Satir>
        <Satir etiket="Tarih">
          {gun(plan.baslangic)} – {gun(plan.bitis)}
          <span className="text-ink-muted"> · {plan.gece} gece</span>
        </Satir>
        <Satir etiket="Müşteri">
          {plan.musteri_adi}
          {plan.telefon ? <span className="text-ink-muted"> · {plan.telefon}</span> : null}
        </Satir>
        <Satir etiket="Teslimat">
          {plan.ilce}/{plan.il}
          {plan.adres ? <span className="text-ink-muted"> · {plan.adres}</span> : null}
        </Satir>
        {plan.toplam !== null && (
          <Satir etiket="Tutar">{plan.toplam.toLocaleString("tr-TR")} ₺</Satir>
        )}
        {blokeFarkli && (
          <Satir etiket="Bloke">
            {gun(plan.bloke_baslangic)} – {gun(plan.bloke_bitis)}
            <span className="text-ink-muted"> · kargo ve hazırlık dahil</span>
          </Satir>
        )}
      </dl>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onCevap(true)}
          className="btn btn-primary h-9 flex-1 gap-1.5 text-sm"
        >
          <IconCheck className="h-4 w-4" />
          Onayla
        </button>
        <button
          type="button"
          onClick={() => onCevap(false)}
          className="h-9 rounded-lg border border-border px-3 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
}

function Satir({ etiket, children }: { etiket: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-xs text-ink-muted">{etiket}</dt>
      <dd className="min-w-0 flex-1 text-ink">{children}</dd>
    </div>
  );
}
