"use client";

import { useId, useState } from "react";
import { PROVINCES, districtsOf } from "@/lib/turkiye";

/**
 * İl → ilçe → açık adres. İlçe listesi seçili ile bağlı olduğu için ikisi de
 * kontrollü: il değişince eski ilçe artık geçerli değildir ve sıfırlanır.
 *
 * İl ve ilçe zorunludur: ürünün takvimde kaç gün bloke kalacağı teslimatın
 * Bursa içinde mi dışında mı olduğuna bağlı, o yüzden il olmadan rezervasyon
 * hesaplanamaz. Açık adres opsiyonel. Sunucu tarafı ikisini de tekrar doğrular.
 *
 * `onCityChange` ile seçilen il yukarı bildirilir; form teslimat şeklini ve
 * bloke aralığı önizlemesini buna göre günceller.
 */
export default function AddressFields({
  defaultCity = "",
  defaultDistrict = "",
  defaultAddress = "",
  onCityChange,
}: {
  defaultCity?: string | null;
  defaultDistrict?: string | null;
  defaultAddress?: string | null;
  onCityChange?: (city: string) => void;
}) {
  const id = useId();
  const [city, setCity] = useState(defaultCity ?? "");
  const [district, setDistrict] = useState(defaultDistrict ?? "");
  const districts = districtsOf(city);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-city`} className="field-label">
            İl
          </label>
          <select
            id={`${id}-city`}
            name="customer_city"
            aria-label="İl"
            required
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setDistrict("");
              onCityChange?.(e.target.value);
            }}
            className="input"
          >
            <option value="">İl seçin</option>
            {PROVINCES.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${id}-district`} className="field-label">
            İlçe
          </label>
          <select
            id={`${id}-district`}
            name="customer_district"
            aria-label="İlçe"
            required
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            disabled={!city}
            className="input disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">{city ? "İlçe seçin" : "Önce il seçin"}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-address`} className="field-label">
          Açık adres (opsiyonel)
        </label>
        <textarea
          id={`${id}-address`}
          name="customer_address"
          rows={2}
          maxLength={500}
          defaultValue={defaultAddress ?? ""}
          placeholder="Mahalle, cadde / sokak, bina ve daire no"
          aria-label="Açık adres"
          className="input resize-y"
        />
      </div>
    </div>
  );
}
