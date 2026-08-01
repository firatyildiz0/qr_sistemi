"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Kök layout'un kendisi çökerse React buraya düşer. Sentry'nin bu sınırı ayrıca
 * görmesi gerekiyor: `onRequestError` sunucu hatalarını yakalıyor, buradaki
 * tarayıcıda oluşan render hatalarını.
 *
 * Kök layout devre dışı kaldığı için `html`/`body` burada yeniden kuruluyor.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Bir şeyler ters gitti</h1>
          <p style={{ marginTop: "0.5rem", color: "#666" }}>
            Hata kaydedildi. Sayfayı yenileyip tekrar deneyebilirsiniz.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1.25rem",
              borderRadius: "0.375rem",
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            Yenile
          </button>
        </div>
      </body>
    </html>
  );
}
