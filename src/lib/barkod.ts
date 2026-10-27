/**
 * Etiket numarasının kuralı. Veritabanındaki `products_barcode_shape`
 * kısıtıyla (bkz. 0022) aynı; okutulan bir metnin numara olabilip
 * olamayacağına buradan bakılıyor.
 */
export const BARCODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,31}$/;

// Code 128'in 107 sembolü: her biri sırasıyla çubuk, boşluk, çubuk… genişlikleri
// (modül cinsinden). Sonuncusu bitiş sembolü ve 7 parçalı.
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_B = 104;
const START_C = 105;
const STOP = 106;

/** Code 128 için önerilen sessiz alan: iki yanda en az 10 modül boşluk. */
export const QUIET_ZONE = 10;

export type Code128 = {
  /** Siyah çubuklar: sol kenarı ve genişliği, modül cinsinden. */
  bars: { x: number; width: number }[];
  /** Sessiz alanlar hariç toplam genişlik, modül cinsinden. */
  modules: number;
};

/**
 * Numarayı Code 128 çubuklarına çevirir.
 *
 * Yalnızca rakamdan oluşan çift haneli numaralar (sistemin ürettiği altı
 * haneliler dahil) C kümesiyle kodlanıyor: her iki rakam tek sembol, çizgi
 * yarı yarıya kısalıyor ve aynı genişliğe kalın çubuklarla basılıyor —
 * kameranın uzaktan okuyabildiği şey de bu. Geri kalanı B kümesiyle.
 */
export function code128(text: string): Code128 {
  const values: number[] = [];

  if (/^(\d\d)+$/.test(text)) {
    values.push(START_C);
    for (let i = 0; i < text.length; i += 2) values.push(Number(text.slice(i, i + 2)));
  } else {
    values.push(START_B);
    for (const char of text) {
      const code = char.charCodeAt(0);
      if (code < 32 || code > 127) throw new Error(`Code 128 B dışında karakter: ${char}`);
      values.push(code - 32);
    }
  }

  const checksum = values.reduce((sum, value, i) => sum + value * Math.max(i, 1), 0) % 103;
  values.push(checksum, STOP);

  const bars: Code128["bars"] = [];
  let x = 0;
  for (const value of values) {
    [...PATTERNS[value]].forEach((digit, i) => {
      const width = Number(digit);
      if (i % 2 === 0) bars.push({ x, width });
      x += width;
    });
  }
  return { bars, modules: x };
}
