"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  previewProductImport,
  saveProductImport,
  type ImportState,
} from "@/app/admin/products/excel/actions";
import { IconCheckCircle, IconDownload, IconUpload } from "@/components/icons";
import { formatPrice } from "@/lib/format";

/**
 * Şablonu indir → doldur → yükle → önizle → ekle.
 *
 * Seçilen dosya tarayıcıda tutuluyor ve "Ekle"de yeniden gönderiliyor;
 * sunucu önizlemede gösterdiği satırlara güvenmiyor, dosyayı baştan okuyor.
 */
export default function ExcelImport() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ImportState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  function send(
    action: (prev: ImportState, data: FormData) => Promise<ImportState>,
    chosen: File
  ) {
    const data = new FormData();
    data.set("file", chosen);
    startTransition(async () => {
      setState(await action(state, data));
    });
  }

  function choose(chosen: File | undefined) {
    if (!chosen) return;
    setFile(chosen);
    send(previewProductImport, chosen);
  }

  function reset() {
    setFile(null);
    setState({ status: "idle" });
  }

  if (state.status === "saved") {
    return (
      <div className="card flex flex-col items-center gap-4 py-12 text-center">
        <IconCheckCircle className="h-12 w-12 text-success" />
        <div>
          <p className="text-lg font-semibold text-ink">{state.created} ürün eklendi</p>
          {state.skipped > 0 && (
            <p className="mt-1 text-sm text-ink-muted">
              Hatalı {state.skipped} satır eklenmedi; düzeltip yalnızca onları yeniden yükleyebilirsiniz.
            </p>
          )}
          <p className="mt-1 text-sm text-ink-muted">
            Görselleri her ürünün düzenleme ekranından ekleyebilirsiniz.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/admin/products" className="btn btn-primary">
            Ürünlere git
          </Link>
          <button type="button" onClick={reset} className="btn btn-secondary">
            Başka dosya yükle
          </button>
        </div>
      </div>
    );
  }

  const rows = state.status === "preview" ? state.rows : [];
  const valid = rows.filter((r) => r.errors.length === 0).length;
  const invalid = rows.length - valid;

  return (
    <div className="flex flex-col gap-6">
      <ol className="grid gap-4 sm:grid-cols-2">
        <li className="card flex flex-col gap-3">
          <p className="text-sm font-semibold text-ink">1. Şablonu indirin</p>
          <p className="text-sm text-ink-muted">
            Ürün adı ve günlük fiyat zorunlu; stok, etiket no ve özellikler isteğe bağlı. Başlık
            hücrelerinin üstüne gelince açıklama görünür.
          </p>
          <a href="/api/products/excel-sablonu" download className="btn btn-secondary mt-auto w-fit">
            <IconDownload className="h-4 w-4" />
            Şablonu indir (.xlsx)
          </a>
        </li>
        <li className="card flex flex-col gap-3">
          <p className="text-sm font-semibold text-ink">2. Doldurup yükleyin</p>
          <p className="text-sm text-ink-muted">
            Eklemeden önce her satırı görüp kontrol edebilirsiniz. Bir dosyada en fazla 500 ürün.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              choose(e.target.files?.[0]);
              // Aynı dosya düzeltilip yeniden seçilebilsin.
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className="btn btn-primary mt-auto w-fit"
          >
            <IconUpload className="h-4 w-4" />
            {pending && state.status !== "preview" ? "Okunuyor…" : file ? "Başka dosya seç" : "Dosya seç"}
          </button>
        </li>
      </ol>

      {state.status === "error" && (
        <p className="card border-danger/40 bg-danger-soft text-sm text-danger">{state.error}</p>
      )}

      {state.status === "preview" && (
        <section className="card flex flex-col gap-4 p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">{file?.name}</p>
              <p className="text-sm text-ink-muted">
                {rows.length} satır · <span className="text-success">{valid} eklenmeye hazır</span>
                {invalid > 0 && <span className="text-danger"> · {invalid} hatalı</span>}
              </p>
            </div>
            <button
              type="button"
              disabled={pending || valid === 0 || !file}
              onClick={() => file && send(saveProductImport, file)}
              className="btn btn-primary shrink-0"
            >
              {pending ? "Ekleniyor…" : `${valid} ürünü ekle`}
            </button>
          </div>

          {invalid > 0 && (
            <p className="px-4 text-sm text-ink-muted">
              Hatalı satırlar eklenmez. İsterseniz dosyayı düzeltip yeniden seçin; düzeltmeden devam
              ederseniz yalnızca hatasız satırlar eklenir.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-2 font-semibold">Satır</th>
                  <th className="px-4 py-2 font-semibold">Ürün adı</th>
                  <th className="px-4 py-2 font-semibold">Günlük fiyat</th>
                  <th className="px-4 py-2 font-semibold">Stok</th>
                  <th className="px-4 py-2 font-semibold">Etiket no</th>
                  <th className="px-4 py-2 font-semibold">Durum</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.row}
                    className={`border-b border-border last:border-0 ${r.errors.length ? "bg-danger-soft/40" : ""}`}
                  >
                    <td className="px-4 py-2 tabular-nums text-ink-muted">{r.row}</td>
                    <td className="px-4 py-2 text-ink">{r.name || "—"}</td>
                    <td className="px-4 py-2 tabular-nums text-ink">
                      {r.dailyPrice != null ? formatPrice(r.dailyPrice) : "—"}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-ink">{r.stock ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-ink">
                      {r.barcode ?? <span className="font-sans text-ink-muted">Otomatik</span>}
                    </td>
                    <td className="px-4 py-2">
                      {r.errors.length === 0 ? (
                        <span className="pill pill-success">Hazır</span>
                      ) : (
                        <ul className="space-y-0.5 text-xs text-danger">
                          {r.errors.map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
