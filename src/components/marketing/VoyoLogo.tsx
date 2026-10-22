/**
 * Voyo Labs'in işareti: katlanmış bir şerit gibi duran V.
 *
 * İki kanat iki ton: sol kanat ışığa dönük, bu yüzden kırmızının açılmış hâli;
 * sağ kanat gölgede ve markanın kırmızısını taşıyor. Ortadaki dikey ek yeri
 * ikisini tek bir katlanmış parça gibi gösteriyor. `koyu` koyu zemin için:
 * iki ton da bir adım açılıyor ki bordo üstünde kaybolmasın.
 */
export function VoyoIsaret({ koyu = false, className }: { koyu?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path d="M5 8H17.5L24 25.5V42Z" fill={koyu ? "#ff8a82" : "#f05a4f"} />
      <path d="M43 8H30.5L24 25.5V42Z" fill={koyu ? "#ff4d42" : "#d11414"} />
    </svg>
  );
}

/** İşaret ve ad yan yana; "Voyo" kalın, "Labs" ince. */
export default function VoyoLogo({ koyu = false }: { koyu?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <VoyoIsaret koyu={koyu} className="h-8 w-8" />
      <span className="vitrin-baslik text-xl">
        <b className="font-extrabold">Voyo</b> <span className="font-medium">Labs</span>
      </span>
    </span>
  );
}
