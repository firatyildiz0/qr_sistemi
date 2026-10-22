import type { Metadata } from "next";
import Link from "next/link";
import AuthAside from "@/components/AuthAside";
import { getCurrentUser } from "@/lib/auth";
import SifreYenileForm from "./SifreYenileForm";

export const metadata: Metadata = { title: "Yeni şifre — RentQR" };

/**
 * E-postadaki sıfırlama bağlantısının vardığı sayfa. Oturumu `/auth/confirm`
 * açıyor; oturum yoksa bağlantı geçersiz ya da süresi dolmuş demektir.
 */
export default async function SifreYenilePage() {
  const user = await getCurrentUser();

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <AuthAside />

      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-16">
        <div className="w-full max-w-sm">
          <span className="eyebrow text-accent">Satıcı girişi</span>
          <h1 className="mt-2 mb-1 text-xl font-semibold text-ink">Yeni şifre belirleyin</h1>

          {user ? (
            <>
              <p className="mb-6 text-sm text-ink-muted">
                Kaydettiğinizde diğer cihazlardaki oturumlarınız kapanır.
              </p>
              <SifreYenileForm />
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-ink-muted">
                Bu sayfa yalnızca e-postanıza gelen sıfırlama bağlantısıyla açılır. Bağlantının
                süresi dolmuş olabilir.
              </p>
              <Link href="/sifremi-unuttum" className="btn btn-primary w-full">
                Yeni bağlantı iste
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
