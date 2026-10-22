import { nightsBetween } from "@/lib/bookings";
import { deliveryModeForCity, isDeliveryMode, type DeliveryMode } from "@/lib/turnaround";
import { isDistrictOf, isProvince } from "@/lib/turkiye";

/**
 * Rezervasyon formlarının ortak alan doğrulaması: satıcının panelden açtığı
 * rezervasyon da müşterinin QR etiketten bıraktığı talep de aynı il/ilçe,
 * teslimat ve tarih kurallarından geçiyor. "use server" dosyasından ayrı
 * duruyor çünkü oradan yalnızca sunucu eylemleri dışa açılabiliyor.
 */

export const MAX_ADDRESS_LENGTH = 500;

export type AddressFields = {
  customer_city: string;
  customer_district: string;
  customer_address: string | null;
};

/**
 * İl ve ilçe artık zorunlu: ürünün kaç gün bloke kalacağı teslimatın Bursa
 * içinde mi dışında mı olduğuna bağlı, dolayısıyla il olmadan takvim doğru
 * hesaplanamaz. Açık adres opsiyonel kalır.
 *
 * Tarayıcıdaki seçim listesi tutarlılığı zaten sağlıyor; buradaki kontroller
 * elle atılan isteğe karşı.
 */
export function readAddress(
  formData: FormData
): { error: string } | { values: AddressFields } {
  const city = String(formData.get("customer_city") ?? "").trim();
  const district = String(formData.get("customer_district") ?? "").trim();
  const address = String(formData.get("customer_address") ?? "").trim();

  if (!city) {
    return { error: "İl seçimi zorunludur — teslimat süresi buna göre hesaplanıyor." };
  }
  if (!isProvince(city)) {
    return { error: "Geçersiz il seçimi." };
  }
  if (!district) {
    return { error: "İlçe seçimi zorunludur." };
  }
  if (!isDistrictOf(city, district)) {
    return { error: `${district}, ${city} iline ait bir ilçe değil.` };
  }
  if (address.length > MAX_ADDRESS_LENGTH) {
    return { error: `Açık adres en fazla ${MAX_ADDRESS_LENGTH} karakter olabilir.` };
  }

  return {
    values: {
      customer_city: city,
      customer_district: district,
      customer_address: address || null,
    },
  };
}

/**
 * Teslimat şekli ilden türetilir, ama satıcı bunu değiştirebilir: İstanbul'dan
 * gelip ürünü elden alan müşteri de var, Bursa'nın uzak ilçesine kargolanan
 * ürün de. Form alanı yoksa (ya da tanınmayan bir değer geldiyse) il kazanır.
 */
export function readDeliveryMode(formData: FormData, city: string): DeliveryMode {
  const raw = formData.get("delivery_mode");
  return isDeliveryMode(raw) ? raw : deliveryModeForCity(city);
}

/** Guards the per-day availability scan against an absurdly long range. */
const MAX_BOOKING_DAYS = 366;

export function validateDates(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return "Başlangıç ve bitiş tarihi gereklidir.";
  if (endDate < startDate) return "Bitiş tarihi başlangıç tarihiyle aynı veya sonrasında olmalıdır.";
  if (nightsBetween(startDate, endDate) + 1 > MAX_BOOKING_DAYS) {
    return `Bir rezervasyon en fazla ${MAX_BOOKING_DAYS} gün sürebilir.`;
  }
  return null;
}
