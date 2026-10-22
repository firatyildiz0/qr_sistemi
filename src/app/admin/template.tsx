import { kapakBaslik } from "@/components/admin/kapak/font";
import "@/components/admin/kapak/kapak.css";

/**
 * Panelin her bölümünü saran katman. Layout'tan farkı, bölüm değiştikçe
 * yeniden kurulması (Ürünler → Rezervasyonlar); `.sayfa-gecis` animasyonu da
 * bu sayede her geçişte yeniden oynuyor. Kenar çubuğu layout'ta kaldığı için
 * yerinden kıpırdamıyor, yalnızca içerik giriyor.
 *
 * Başlık ailesinin değişkeni de burada bağlanıyor: büyük başlıklar yalnızca
 * içerik alanında.
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className={`sayfa-gecis ${kapakBaslik.variable} flex min-w-0 flex-1 flex-col`}>{children}</div>
  );
}
