import { Suspense } from "react";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import AccessGuard from "@/components/admin/AccessGuard";
import Logo from "@/components/Logo";
import {
  IconBolt,
  IconChart,
  IconGauge,
  IconGrid,
  IconLogOut,
  IconShield,
  IconUsers,
} from "@/components/icons";

export default function YonetimLayout({ children }: { children: React.ReactNode }) {
  // Satıcı paneliyle aynı gerekçe: layout hiçbir şeyi beklemiyor, erişim
  // kontrolü kendi Suspense sınırının arkasından geliyor.
  return (
    <div className="panel-scope flex min-h-screen flex-col bg-paper text-ink">
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 sm:px-8">
        <Link href="/yonetim" className="flex items-center gap-3">
          <Logo className="h-9 w-9" sizes="36px" />
          <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold tracking-wide text-accent-strong uppercase">
            <IconShield className="h-3.5 w-3.5" />
            Yönetim
          </span>
        </Link>

        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-hover"
          >
            <IconLogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Çıkış yap</span>
          </button>
        </form>
      </header>

      {/* Beş sayfalık bir panel; aktif sekmeyi işaretlemek için istemci
          bileşenine geçmeye değmiyor, bağlantılar yeterli. Dar ekranda sekmeler
          sığmıyor: sarmak yerine yana kaydırılıyorlar, sıra tek satırda kalsın. */}
      <nav className="border-b border-border bg-surface px-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-4xl gap-1 overflow-x-auto [&>a]:shrink-0 [&>a]:whitespace-nowrap">
          <Link
            href="/yonetim"
            className="flex items-center gap-2 px-3 py-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <IconUsers className="h-4 w-4" />
            Kullanıcılar
          </Link>
          <Link
            href="/yonetim/istatistik"
            className="flex items-center gap-2 px-3 py-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <IconChart className="h-4 w-4" />
            İstatistik
          </Link>
          <Link
            href="/yonetim/kullanim"
            className="flex items-center gap-2 px-3 py-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <IconGauge className="h-4 w-4" />
            Kullanım
          </Link>
          <Link
            href="/yonetim/guvenlik"
            className="flex items-center gap-2 px-3 py-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <IconShield className="h-4 w-4" />
            Güvenlik
          </Link>
          <Link
            href="/yonetim/yayin"
            className="flex items-center gap-2 px-3 py-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <IconBolt className="h-4 w-4" />
            Yayın
          </Link>

          {/* Yönetim sayfası değil, panelden çıkış: superuser'ın kendi satıcı
              hesabına geçtiği yer. Sıranın sonunda ve ayrı duruyor ki bir
              yönetim sekmesi sanılmasın. */}
          <Link
            href="/admin"
            className="ml-auto flex items-center gap-2 px-3 py-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <IconGrid className="h-4 w-4" />
            Satıcı paneli
          </Link>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-8 sm:py-12">{children}</main>

      <Suspense fallback={null}>
        <AccessGuard expect="superuser" />
      </Suspense>
    </div>
  );
}
