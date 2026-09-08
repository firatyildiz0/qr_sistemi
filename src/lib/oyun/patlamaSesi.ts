/**
 * 404 sayfasındaki balon oyununun sesleri.
 *
 * Hiçbir ses dosyası yok: patlama da kaçış da Web Audio ile o anda üretiliyor.
 * Bunun iki sebebi var — indirilecek bir varlık eklemiyor ve her patlama biraz
 * farklı çıkıyor. Aynı örneği üst üste çalmak, bir oyunu ucuz gösteren ilk
 * şeydir; buradaki perde ve tını her seferinde rastgele biraz kayıyor.
 *
 * Bağlam ilk kullanıcı dokunuşuna kadar kurulmuyor: tarayıcılar sessiz açılışı
 * zorunlu tutuyor ve erken kurulan bir bağlam "suspended" takılı kalıyor.
 */

type SesliPencere = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let baglamOnbellek: AudioContext | null = null;
let gurultuOnbellek: AudioBuffer | null = null;

function baglam(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Kurucu = window.AudioContext ?? (window as SesliPencere).webkitAudioContext;
  if (!Kurucu) return null;
  try {
    baglamOnbellek ??= new Kurucu();
  } catch {
    return null;
  }
  if (baglamOnbellek.state === "suspended") void baglamOnbellek.resume();
  return baglamOnbellek;
}

/* Patlamanın "kabuk" katmanı beyaz gürültüden geliyor. Tampon bir kez üretilip
   saklanıyor; her patlamada yeniden doldurmak saniyede birkaç kez 4800 sayı
   üretmek olurdu. */
function gurultu(c: AudioContext): AudioBuffer {
  if (!gurultuOnbellek) {
    const uzunluk = Math.floor(c.sampleRate * 0.12);
    gurultuOnbellek = c.createBuffer(1, uzunluk, c.sampleRate);
    const veri = gurultuOnbellek.getChannelData(0);
    for (let i = 0; i < uzunluk; i += 1) {
      // Sona doğru sönümlenen gürültü: patlama bir "şşş" değil, bir "pat".
      veri[i] = (Math.random() * 2 - 1) * (1 - i / uzunluk) ** 2;
    }
  }
  return gurultuOnbellek;
}

/**
 * Balon patlaması: kısa bir gürültü kabuğu ve altında hızla düşen bir gövde.
 * İkisi birlikte lastiğin yırtılması ve içindeki havanın boşalması oluyor.
 */
export function balonSesi() {
  const c = baglam();
  if (!c) return;
  const t = c.currentTime;

  const cikis = c.createGain();
  cikis.gain.value = 0.55;
  cikis.connect(c.destination);

  const kabuk = c.createBufferSource();
  kabuk.buffer = gurultu(c);
  kabuk.playbackRate.value = 0.85 + Math.random() * 0.5;
  const bant = c.createBiquadFilter();
  bant.type = "bandpass";
  bant.frequency.value = 1300 + Math.random() * 1100;
  bant.Q.value = 0.9;
  const kabukSes = c.createGain();
  kabukSes.gain.setValueAtTime(0.0001, t);
  kabukSes.gain.exponentialRampToValueAtTime(0.9, t + 0.004);
  kabukSes.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  kabuk.connect(bant).connect(kabukSes).connect(cikis);
  kabuk.start(t);
  kabuk.stop(t + 0.14);

  const govde = c.createOscillator();
  govde.type = "sine";
  govde.frequency.setValueAtTime(340 + Math.random() * 140, t);
  govde.frequency.exponentialRampToValueAtTime(72, t + 0.1);
  const govdeSes = c.createGain();
  govdeSes.gain.setValueAtTime(0.0001, t);
  govdeSes.gain.exponentialRampToValueAtTime(0.5, t + 0.005);
  govdeSes.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
  govde.connect(govdeSes).connect(cikis);
  govde.start(t);
  govde.stop(t + 0.2);
}

/**
 * Patlamadan hemen sonra çıkan ürünün küçük "tın"ı. Patlamayla aynı anda değil,
 * 90 ms sonra çalınıyor: önce balon gidiyor, sonra içinden bir şey çıkıyor.
 */
export function urunSesi(zincir: number) {
  const c = baglam();
  if (!c) return;
  const t = c.currentTime + 0.09;
  // Zincir uzadıkça perde bir majör dizide yukarı tırmanıyor — arka arkaya
  // patlatmanın ödülü sayının yanında kulakta da duyuluyor.
  const perdeler = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  const frekans = perdeler[Math.min(zincir, perdeler.length - 1)];

  const cikis = c.createGain();
  cikis.gain.value = 0.3;
  cikis.connect(c.destination);

  for (const [kat, ses] of [
    [1, 0.5],
    [2, 0.16],
  ] as const) {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = frekans * kat;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(ses, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    osc.connect(g).connect(cikis);
    osc.start(t);
    osc.stop(t + 0.3);
  }
}

/** Balon yere değdiğinde: aşağı düşen, boğuk bir iki nota. */
export function kacisSesi() {
  const c = baglam();
  if (!c) return;
  const t = c.currentTime;

  const cikis = c.createGain();
  cikis.gain.value = 0.32;
  cikis.connect(c.destination);

  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.28);
  const suz = c.createBiquadFilter();
  suz.type = "lowpass";
  suz.frequency.setValueAtTime(1400, t);
  suz.frequency.exponentialRampToValueAtTime(320, t + 0.28);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  osc.connect(suz).connect(g).connect(cikis);
  osc.start(t);
  osc.stop(t + 0.36);
}
