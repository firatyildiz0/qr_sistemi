import { IconCalendar, IconQrCode } from "@/components/icons";
import Wordmark from "@/components/Wordmark";

/** Giriş ve üye ol sayfalarının ortak sol paneli. */
export default function AuthAside() {
  return (
    <div className="relative flex flex-col justify-center overflow-hidden bg-deep px-8 py-16 text-on-deep lg:w-3/5 lg:px-16">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(#F2F1ED 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative z-10 max-w-md">
        {/* Not a link: with the landing page parked, "/" only comes back here. */}
        <span className="font-display text-xl font-extrabold">
          <Wordmark />
        </span>
        <h1 className="mt-8 text-3xl font-bold leading-tight sm:text-4xl">
          Kiralamalarınızı tek bir yerden yönetin
        </h1>
        <p className="mt-4 text-on-deep/70">
          Fiziksel ekipmanlar için tasarlanmış tek bir pratik panelden ürünleri, rezervasyonları
          ve QR kodlarını takip edin.
        </p>

        <div className="mt-12 hidden flex-col gap-4 sm:flex">
          <div className="drift card w-64 border-white/10 bg-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/20 text-accent">
                <IconCalendar className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-on-deep">3 yeni rezervasyon talebi</p>
                <p className="text-xs text-on-deep/60">Trek Marlin 8 &middot; bu hafta</p>
              </div>
            </div>
          </div>
          <div
            className="drift card ml-10 w-64 border-white/10 bg-white/5 backdrop-blur-sm"
            style={{ animationDelay: "1.5s" }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/20 text-accent">
                <IconQrCode className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-on-deep">QR kod yazdırılmaya hazır</p>
                <p className="text-xs text-on-deep/60">Sony A7 III</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
