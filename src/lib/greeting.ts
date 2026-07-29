/**
 * Saate göre selamlama. Saat dilimi sabit `Europe/Istanbul`: sunucu UTC'de
 * koşuyor, satıcılar ise Türkiye'de — sunucunun kendi saatiyle hesaplamak
 * akşamüstünü öğlen gösterirdi.
 */
export function greetingFor(date: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("tr-TR", {
      hour: "numeric",
      // `hour12: false` tek başına bazı ortamlarda gece yarısını 24 veriyor;
      // h23 saati 0–23 aralığına sabitliyor.
      hourCycle: "h23",
      timeZone: "Europe/Istanbul",
    }).format(date)
  );

  if (hour >= 5 && hour < 12) return "Günaydın";
  if (hour < 18) return "Tünaydın";
  if (hour < 23) return "İyi akşamlar";
  return "İyi geceler";
}
