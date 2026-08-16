import { whatsappNumber } from "@/lib/customers";
import { IconPhone, IconWhatsApp } from "@/components/icons";

/**
 * Numara ve yanında iki kısayol: cihazın çeviricisini açan arama düğmesi ve
 * WhatsApp sohbetini açan düğme.
 *
 * Rezervasyon hatırlatmaları bu iki dokunuşa bakıyor. Numarayı seçip
 * kopyalamak masaüstünde bile zahmetli, telefonda ise satıcının en sık yaptığı
 * işin en yavaş adımıydı.
 *
 * Düğmeler `relative`: satırın tamamını kaplayan bir bağlantı katmanının
 * (rezervasyon geçmişi kartları böyle) altında kalmasınlar diye.
 */
export default function PhoneActions({
  phone,
  /** Erişilebilir etikette geçen müşteri adı; okuyucu hangi numarayı aradığını bilsin. */
  name,
  className = "",
}: {
  phone: string;
  name?: string;
  className?: string;
}) {
  const wa = whatsappNumber(phone);
  // Bazı Android çeviricileri boşluklu numarayı eksik alıyor; `tel:` yalnızca
  // rakamları ve varsa baştaki ülke kodu işaretini görüyor.
  const dial = phone.replace(/[^\d+]/g, "");
  const who = name ? `${name} — ${phone}` : phone;

  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      <span className="tabular-nums">{phone}</span>

      <a
        href={`tel:${dial}`}
        aria-label={`${who} numarasını ara`}
        title="Ara"
        className={ACTION_CLASS}
      >
        <IconPhone className="h-3.5 w-3.5" />
      </a>

      {wa && (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${who} numarasına WhatsApp'tan yaz`}
          title="WhatsApp'tan yaz"
          className={ACTION_CLASS}
        >
          <IconWhatsApp className="h-3.5 w-3.5" />
        </a>
      )}
    </span>
  );
}

const ACTION_CLASS =
  "tab-press relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-ink-muted transition-colors hover:border-accent hover:text-accent-hover";
