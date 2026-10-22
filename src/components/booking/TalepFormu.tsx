"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import "react-day-picker/style.css";
import { talepGonder, type TalepFormDurumu } from "@/app/product/[id]/talep";
import { daysByState, formatDateRange, unavailableDays, type Availability } from "@/lib/bookings";
import { DELIVERY_MODES, deliveryModeForCity, DELIVERY_MODE_LABEL, type DeliveryMode } from "@/lib/turnaround";
import AddressFields from "@/components/booking/AddressFields";
import AvailabilityLegend from "@/components/booking/AvailabilityLegend";

const baslangicDurumu: TalepFormDurumu = { hata: null };

/**
 * QR'ı okutan müşterinin rezervasyon talebi formu.
 *
 * Satıcının formundan (BookingForm) bilerek daha kısa: sepet, teminat ve bloke
 * aralığını elle değiştirme yok — bunlar satıcının kararı. Müşteri tarihini,
 * kendini ve teslim şeklini söylüyor; gerisini satıcı onaylarken görüyor.
 *
 * Takvim satıcınınkiyle aynı müsaitliği gösteriyor ve dolu günleri seçtirmiyor.
 * Hazırlık ve kargo günleri sunucuda satıcının kendi ayarlarıyla ayrıca
 * hesaplanıp denetleniyor; burada gösterilmiyor, çünkü ziyaretçi o ayarları
 * okuyamıyor ve yanlış bir önizleme göstermektense hiç göstermemek doğru.
 */
export default function TalepFormu({
  productId,
  availability,
  stock,
}: {
  productId: string;
  availability: Availability;
  stock: number;
}) {
  const [durum, formAction, bekliyor] = useActionState(talepGonder.bind(null, productId), baslangicDurumu);
  const [aralik, setAralik] = useState<DateRange | undefined>();
  const [il, setIl] = useState("");
  // null = ilden türetilen varsayılan. Müşteri elle seçtiği anda il değişse
  // de seçimi korunur.
  const [teslimSecimi, setTeslimSecimi] = useState<DeliveryMode | null>(null);

  const baslangic = aralik?.from ? format(aralik.from, "yyyy-MM-dd") : "";
  const bitis = aralik?.to ? format(aralik.to, "yyyy-MM-dd") : baslangic;
  const teslim: DeliveryMode = teslimSecimi ?? deliveryModeForCity(il);
  const gunler = daysByState(availability, stock);
  const kapali = unavailableDays(availability, stock);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="start_date" value={baslangic} />
      <input type="hidden" name="end_date" value={bitis} />

      <div>
        <p className="mb-2 text-sm text-ink-muted">Kiralamak istediğiniz ilk ve son günü seçin.</p>
        <div className="rdp-theme rounded-lg border border-border bg-card p-3">
          <DayPicker
            mode="range"
            locale={tr}
            excludeDisabled
            selected={aralik}
            onSelect={setAralik}
            disabled={[{ before: new Date(new Date().setHours(0, 0, 0, 0)) }, ...kapali]}
            modifiers={{
              booked: gunler.full,
              blocked: gunler.blocked,
              partly: gunler.partly,
              blockedPartly: gunler["partly-blocked"],
            }}
            modifiersClassNames={{
              booked: "rdp-booked",
              blocked: "rdp-blocked",
              partly: "rdp-partly",
              blockedPartly: "rdp-blocked-partly",
            }}
            numberOfMonths={1}
          />
          <AvailabilityLegend stock={stock} />
        </div>
        {baslangic && <p className="mt-2 text-sm font-medium text-ink">{formatDateRange(baslangic, bitis)}</p>}
      </div>

      <div>
        <label htmlFor="talep-ad" className="field-label">
          Adınız soyadınız
        </label>
        <input id="talep-ad" name="customer_name" required maxLength={80} autoComplete="name" className="input" />
      </div>

      <div>
        <label htmlFor="talep-telefon" className="field-label">
          Telefon
        </label>
        <input
          id="talep-telefon"
          name="customer_phone"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="0532 123 45 67"
          className="input"
        />
        <p className="mt-1 text-xs text-ink-muted">İşletme rezervasyon için bu numaradan size ulaşır.</p>
      </div>

      <AddressFields onCityChange={setIl} />

      <fieldset className="space-y-2">
        <legend className="field-label">Teslim şekli</legend>
        <div className="grid grid-cols-2 gap-2">
          {DELIVERY_MODES.map((secenek) => (
            <label
              key={secenek}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                teslim === secenek ? "border-accent bg-accent-soft text-ink" : "border-border bg-card text-ink-muted"
              }`}
            >
              <input
                type="radio"
                name="delivery_mode"
                value={secenek}
                checked={teslim === secenek}
                onChange={() => setTeslimSecimi(secenek)}
                className="accent-[var(--color-accent)]"
              />
              {DELIVERY_MODE_LABEL[secenek]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-2.5 text-sm text-ink-muted">
        <input type="checkbox" name="onay" required className="mt-0.5 accent-[var(--color-accent)]" />
        <span>
          Adımın, telefonumun ve adresimin rezervasyon için bu işletmeyle paylaşılmasını kabul ediyorum.{" "}
          <Link href="/gizlilik" className="link-underline text-accent" target="_blank">
            Gizlilik Sözleşmesi
          </Link>
        </span>
      </label>

      {durum.hata && (
        <p role="alert" className="text-sm text-danger">
          {durum.hata}
        </p>
      )}

      <button type="submit" disabled={bekliyor || !baslangic} className="btn btn-primary w-full">
        {bekliyor ? "Gönderiliyor…" : "Rezervasyon talebi gönder"}
      </button>
      <p className="text-center text-xs text-ink-muted">
        Talebiniz işletmeye iletilir. İşletme onayladığında rezervasyonunuz kesinleşir; durumu bir
        sonraki sayfadan takip edebilirsiniz.
      </p>
    </form>
  );
}
