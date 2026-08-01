/** Formats a number as Turkish Lira, e.g. 1500 -> "1.500 ₺", 12.5 -> "12,50 ₺". */
export function formatPrice(amount: number) {
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ₺`;
}

/**
 * Yazarken kullanılan biçim: binlik ayıracı nokta, ondalık ayıracı virgül.
 * "1500" -> "1.500", "1500,5" -> "1.500,5". Yarım yazılmış değerleri
 * (sondaki virgül gibi) bozmadan bırakır.
 */
export function formatPriceInput(raw: string) {
  const cleaned = raw.replace(/[^\d,]/g, "");
  const [intPart = "", ...rest] = cleaned.split(",");
  const digits = intPart.replace(/^0+(?=\d)/, "");
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (rest.length === 0) return grouped;
  return `${grouped || "0"},${rest.join("").slice(0, 2)}`;
}

/**
 * `PriceField`'in gönderdiği değeri sunucu tarafında okur. Boş bırakılan alan
 * null olur ("belirtilmemiş"), dolu olan sayıya çevrilir. Negatif ya da sayı
 * olmayan değerler `undefined` döner — çağıran taraf bunu hata olarak bildirir.
 */
export function readPriceField(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const price = Number(trimmed);
  if (!Number.isFinite(price) || price < 0) return undefined;
  return price;
}

/** Ekrandaki biçimi sunucuya gidecek sayıya çevirir: "1.500,5" -> "1500.5". */
export function parsePriceInput(display: string) {
  const cleaned = display.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return cleaned.replace(/\.$/, "");
}
