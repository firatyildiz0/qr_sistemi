import type { Metadata } from "next";
import AuthAside from "@/components/AuthAside";
import SifremiUnuttumForm from "./SifremiUnuttumForm";

export const metadata: Metadata = { title: "Şifremi unuttum — RentQR" };

/** Giriş ekranıyla aynı düzen: solda tanıtım paneli, sağda tek form. */
export default async function SifremiUnuttumPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <AuthAside />

      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-16">
        <div className="w-full max-w-sm">
          <span className="eyebrow text-accent">Satıcı girişi</span>
          <h1 className="mt-2 mb-1 text-xl font-semibold text-ink">Şifremi unuttum</h1>
          <p className="mb-6 text-sm text-ink-muted">
            Kullanıcı adınızı ya da e-postanızı yazın; kayıtlı adresinize şifrenizi yenilemeniz
            için bir bağlantı gönderelim.
          </p>
          <SifremiUnuttumForm gecersiz={hata === "gecersiz"} />
        </div>
      </div>
    </main>
  );
}
