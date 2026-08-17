"use client";

import { useEffect, useRef, useState } from "react";

/**
 * iyzico ödeme formunu sayfaya yerleştirir.
 *
 * Neden bu kadar dolambaçlı: iyzico formu bir URL olarak vermiyor, sayfaya
 * gömülecek bir HTML+script parçacığı olarak veriyor. React'in
 * `dangerouslySetInnerHTML`'i ise script etiketlerini **çalıştırmıyor** —
 * tarayıcı `innerHTML` ile eklenen script'leri güvenlik gereği yürütmez. O
 * yüzden parçacık ayrıştırılıp script'ler `document.createElement` ile
 * yeniden kuruluyor; ancak böyle çalışıyorlar.
 *
 * `nonce` şart: sayfanın CSP'si `script-src 'self' 'nonce-...' 'strict-dynamic'`.
 * Nonce'suz eklenen script bloke olur. Nonce'u taşıyan script'in *kendi*
 * eklediği paket ise `strict-dynamic` sayesinde ayrıca izin gerektirmiyor —
 * iyzico'nun parçacığı tam olarak bunu yapıyor (`createElement` + `appendChild`).
 *
 * Bir de sıra meselesi: iyzico'nun paketi yükleneceği kabı (`div`) DOM'da
 * arıyor. Bu yüzden script olmayan düğümler önce, script'ler sonra ekleniyor.
 */
export default function CheckoutFrame({
  content,
  nonce,
}: {
  content: string;
  nonce?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Parçacık `<script>` ve genellikle bir kap `<div>` içeriyor. `template`
    // ile ayrıştırılıyor: içindekiler ayrıştırma anında çalıştırılmaz ve
    // yüklenmez, yani ne script yürür ne görsel istek gider — kontrol bizde
    // kalır.
    const template = document.createElement("template");
    template.innerHTML = content;

    const scripts: HTMLScriptElement[] = [];
    const injected: Node[] = [];

    for (const node of Array.from(template.content.childNodes)) {
      if (node.nodeName === "SCRIPT") {
        scripts.push(node as HTMLScriptElement);
      } else {
        host.appendChild(node);
        injected.push(node);
      }
    }

    // Kabı parçacık kendisi getirmediyse iyzico'nun beklediği kimlikle biz
    // kuruyoruz; getirmişse yukarıdaki döngüde zaten eklendi.
    if (!host.querySelector("#iyzipay-checkout-form")) {
      const mount = document.createElement("div");
      mount.id = "iyzipay-checkout-form";
      mount.className = "responsive";
      host.appendChild(mount);
      injected.push(mount);
    }

    for (const original of scripts) {
      const script = document.createElement("script");

      // Öz nitelikler korunuyor (`type`, `src`, `async`), üstüne nonce.
      for (const { name, value } of Array.from(original.attributes)) {
        script.setAttribute(name, value);
      }
      if (nonce) script.setAttribute("nonce", nonce);
      script.textContent = original.textContent;

      // Harici script yüklenemezse kullanıcı boş bir kutuya bakmasın.
      if (script.src) script.addEventListener("error", () => setFailed(true));

      host.appendChild(script);
      injected.push(script);
    }

    return () => {
      // Bileşen kaldırıldığında iyzico'nun bıraktıklarını da topluyoruz;
      // yoksa kullanıcı formu kapatıp yeniden açtığında iki form üst üste
      // binerdi.
      for (const node of injected) node.parentNode?.removeChild(node);
    };
  }, [content, nonce]);

  return (
    <div className="space-y-4">
      {failed && (
        <p
          role="alert"
          className="rounded-[--radius-md] border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          Ödeme formu yüklenemedi. Reklam engelleyicinizi kapatıp sayfayı
          yenilemeyi deneyin.
        </p>
      )}

      {/* Form iyzico'nun kendi alanından geliyor; yüksekliği içeriğine göre
          değişiyor, o yüzden sabit bir boy verilmiyor. */}
      <div ref={hostRef} />
    </div>
  );
}
