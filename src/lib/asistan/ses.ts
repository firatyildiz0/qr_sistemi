/**
 * Tarayıcının konuşma tanıma ve seslendirme yetenekleri.
 *
 * İkisi de tarayıcının içinde; ne sunucuya ses gidiyor ne de bir servise para
 * ödeniyor. Tanıma `SpeechRecognition` ile yapılıyor — Chrome, Edge ve Safari'de
 * var, Firefox'ta yok. Yoksa mikrofon düğmesi hiç görünmüyor ve asistan yazıyla
 * çalışmaya devam ediyor; sesli giriş bir kolaylık, tek yol değil.
 *
 * Tip tanımları elle yazılı: `SpeechRecognition` standartlaşmadığı için
 * TypeScript'in DOM kütüphanesinde yok, tarayıcılarda da `webkit` önekiyle
 * duruyor.
 */

type TanimaSonucu = {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { readonly transcript: string };
};

type TanimaOlayi = {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: TanimaSonucu };
};

type HataOlayi = { readonly error: string };

export type Taniyici = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((olay: TanimaOlayi) => void) | null;
  onerror: ((olay: HataOlayi) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type TaniyiciKurucu = new () => Taniyici;

function kurucu(): TaniyiciKurucu | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: TaniyiciKurucu;
    webkitSpeechRecognition?: TaniyiciKurucu;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function tanimaDestekleniyor(): boolean {
  return kurucu() !== null;
}

export function seslendirmeDestekleniyor(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Yeni bir tanıyıcı kurar.
 *
 * `continuous` kapalı: kullanıcı sustuğunda tanıma kendiliğinden bitsin ve
 * cümle gönderilsin isteniyor — sürekli dinleyen bir mikrofon, arka plandaki
 * konuşmayı da yazıya döker. `interimResults` açık, çünkü kullanıcı ne
 * anlaşıldığını konuşurken görmeli; yanlış anlaşıldığını fark edip durabilsin.
 */
export function taniyiciKur(): Taniyici | null {
  const Kurucu = kurucu();
  if (!Kurucu) return null;

  const taniyici = new Kurucu();
  taniyici.lang = "tr-TR";
  taniyici.continuous = false;
  taniyici.interimResults = true;
  taniyici.maxAlternatives = 1;
  return taniyici;
}

/**
 * Tanıma olayından o ana kadarki metni çıkarır.
 *
 * Olay bütün sonuçları taşıyor, sonuncusu değil: uzun bir cümlede tarayıcı
 * kesinleşen parçaları arkada bırakıp yenilerini ekliyor. Hepsi birleştirilmezse
 * cümlenin başı kaybolur.
 */
export function olaydanMetin(olay: TanimaOlayi): { metin: string; bitti: boolean } {
  let metin = "";
  let bitti = false;

  for (let i = 0; i < olay.results.length; i++) {
    const sonuc = olay.results[i];
    metin += sonuc[0]?.transcript ?? "";
    if (sonuc.isFinal) bitti = true;
  }

  return { metin: metin.trim(), bitti };
}

let seslendirmeHazir = false;

/**
 * Türkçe bir ses bulur.
 *
 * Sesler tarayıcıya eşzamansız geliyor: ilk `getVoices()` çağrısı çoğu zaman
 * boş dizi verir ve liste `voiceschanged` ile dolar. Bulunamazsa null dönüyor
 * ve seslendirme tarayıcının varsayılan sesiyle yapılıyor — aksanı bozuk olur
 * ama sessiz kalmaktan iyidir.
 */
function turkceSes(): SpeechSynthesisVoice | null {
  const sesler = window.speechSynthesis.getVoices();
  return sesler.find((ses) => ses.lang.toLowerCase().startsWith("tr")) ?? null;
}

/** Ses listesini erkenden doldurur ki ilk cevap sessiz kalmasın. */
export function seslendirmeyiHazirla(): void {
  if (seslendirmeHazir || !seslendirmeDestekleniyor()) return;
  seslendirmeHazir = true;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

/**
 * Metni okur ve bittiğinde çözülür.
 *
 * Söz her zaman çözülüyor, hata durumunda da: çağıran taraf okuma bitince
 * mikrofonu tekrar açıyor, ve okuma bir şekilde düşerse asistan sağır kalmasın.
 */
export function seslendir(metin: string): Promise<void> {
  if (!seslendirmeDestekleniyor() || !metin.trim()) return Promise.resolve();

  return new Promise((cozumle) => {
    // Önceki okuma sürüyorsa kesiliyor: iki cevap üst üste binmemeli.
    window.speechSynthesis.cancel();

    const konusma = new SpeechSynthesisUtterance(metin);
    konusma.lang = "tr-TR";
    const ses = turkceSes();
    if (ses) konusma.voice = ses;
    konusma.rate = 1.05;

    let bitti = false;
    const bitir = () => {
      if (bitti) return;
      bitti = true;
      cozumle();
    };

    konusma.onend = bitir;
    konusma.onerror = bitir;

    window.speechSynthesis.speak(konusma);
  });
}

/** Süren okumayı keser. Panel kapanırken ve kullanıcı sesi kapattığında. */
export function seslendirmeyiDurdur(): void {
  if (seslendirmeDestekleniyor()) window.speechSynthesis.cancel();
}
