import Link from "next/link";
import LoginForm from "./LoginForm";
import { IconCalendar, IconQrCode } from "@/components/icons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <div className="relative flex flex-col justify-center overflow-hidden bg-deep px-8 py-16 text-paper lg:w-3/5 lg:px-16">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(#F2F1ED 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative z-10 max-w-md">
          <Link href="/" className="font-display text-xl font-extrabold">
            RentQR
          </Link>
          <h1 className="mt-8 text-3xl font-bold leading-tight sm:text-4xl">
            Kiralamalarınızı tek bir yerden yönetin
          </h1>
          <p className="mt-4 text-paper/70">
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
                  <p className="text-sm font-semibold text-paper">3 yeni rezervasyon talebi</p>
                  <p className="text-xs text-paper/60">Trek Marlin 8 &middot; bu hafta</p>
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
                  <p className="text-sm font-semibold text-paper">QR kod yazdırılmaya hazır</p>
                  <p className="text-xs text-paper/60">Sony A7 III</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-16">
        <div className="w-full max-w-sm">
          <span className="eyebrow text-accent">Satıcı girişi</span>
          <h2 className="mt-2 mb-1 text-xl font-semibold text-ink">Giriş yap</h2>
          <p className="mb-6 text-sm text-ink-muted">
            Kiralama ürünlerinizi ve rezervasyonlarınızı yönetin.
          </p>
          <LoginForm next={next ?? "/admin"} />
        </div>
      </div>
    </main>
  );
}
