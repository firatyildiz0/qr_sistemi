/**
 * Üç takvim de aynı renkleri kullanıyor; anlamları da tek yerden gelsin.
 *
 * "Kargo / hazırlık" ayrı bir renk, çünkü o günlerde kiralama yok ama ürün de
 * elde değil — bu ayrım olmadan satıcı takvimde boşuna kapalı görünen günler
 * sanıyor.
 */
export default function AvailabilityLegend({ stock }: { stock: number }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted">
      {/* Kutucuklar takvimin kendi sınıflarını kullanıyor, böylece renkler tek
          bir yerde tanımlı kalıyor ve efsane hiç kaymıyor. */}
      <Item swatch="rdp-booked" label="Kirada" />
      <Item swatch="rdp-blocked" label="Kargo / hazırlık" />
      {stock > 1 && <Item swatch="rdp-partly" label="Kısmen dolu" />}
      <Item swatch="" label="Müsait" />
    </div>
  );
}

function Item({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm border border-border ${swatch}`} />
      {label}
    </span>
  );
}
