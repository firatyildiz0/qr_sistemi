import type { ReactNode } from "react";
import { IconCheck } from "@/components/icons";

/**
 * Rezervasyon formunun bir adımı: numara, başlık ve o adımda ne seçildiğini
 * anlatan tek satır.
 *
 * Form telefonda tek parça bir duvardı — takvim, sepet, müşteri alanları ve
 * teslimat ayarları arka arkaya geliyor, satıcı nerede olduğunu ve daha ne
 * kaldığını göremiyordu. Numaralar sırayı, özet satırı da geride bıraktığı
 * adımda ne seçtiğini yukarı kaydırmadan gösteriyor.
 *
 * Adımlar gizlenmiyor, yalnızca işaretleniyor: alanların hepsi tek bir form
 * gönderiminde okunuyor ve tarayıcının kendi doğrulaması gizli alanlara
 * ulaşamaz.
 */
export default function FormStep({
  index,
  title,
  /** Adım tamamlanmadan görünen yönlendirme. */
  hint,
  /** Adım tamamlandıysa ne seçildiği; verildiğinde ipucunun yerini alır. */
  summary,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  summary?: ReactNode;
  children: ReactNode;
}) {
  const done = summary != null;

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className={`step-badge ${done ? "is-done" : ""}`}>
          {done ? <IconCheck className="h-3 w-3" /> : index}
        </span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>

      {(summary || hint) && (
        <p
          className={`mb-2 pl-[30px] text-xs ${
            done ? "font-medium text-ink" : "text-ink-muted"
          }`}
        >
          {summary ?? hint}
        </p>
      )}

      {children}
    </section>
  );
}
