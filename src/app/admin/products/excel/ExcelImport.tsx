"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  previewProductImport,
  recheckProductImport,
  saveProductImport,
  type ImportState,
} from "@/app/admin/products/excel/actions";
import { IconCheckCircle, IconDownload, IconPencil, IconTrash, IconUpload } from "@/components/icons";
import { formatPrice } from "@/lib/format";
import type { ImportRow, RawRow } from "@/lib/urun-excel";

/**
 * Şablonu indir → doldur → yükle → önizle (satırları düzelt, sil) → ekle.
 *
 * Önizlemedeki satırlar düzenlenebildiği için "Ekle" dosyayı değil satırları
 * gönderiyor; sunucu onları eklemeden önce baştan doğruluyor.
 */
export default function ExcelImport() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ImportState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  /** Önizleme dururken çıkan hata; tabloyu ve yapılan düzeltmeleri silmesin diye ayrı. */
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<RawRow | null>(null);
  // Arka arkaya silinen satırlarda geç dönen eski bir doğrulama yenisinin üstüne yazmasın.
  const checkId = useRef(0);

  function choose(chosen: File | undefined) {
    if (!chosen) return;
    setFile(chosen);
    setNotice(null);
    setEditing(null);
    const data = new FormData();
    data.set("file", chosen);
    checkId.current++;
    startTransition(async () => {
      setState(await previewProductImport(state, data));
    });
  }

  /** Satırları hemen değiştirir, sonra sunucuya yeniden doğrulatır. */
  function update(next: ImportRow[]) {
    setState({ status: "preview", rows: next });
    setNotice(null);
    const id = ++checkId.current;
    startTransition(async () => {
      const result = await recheckProductImport(next.map((r) => r.raw));
      if (id !== checkId.current) return;
      if (result.status === "error") setNotice(result.error);
      else setState(result);
    });
  }

  function remove(row: number) {
    update(rows.filter((r) => r.row !== row));
  }

  function saveEdit(raw: RawRow) {
    setEditing(null);
    update(rows.map((r) => (r.row === raw.row ? { ...r, name: raw.name.trim(), raw } : r)));
  }

  function save() {
    setNotice(null);
    setSaving(true);
    checkId.current++;
    startTransition(async () => {
      const result = await saveProductImport(rows.map((r) => r.raw));
      setSaving(false);
      if (result.status === "error") setNotice(result.error);
      else setState(result);
    });
  }

  function reset() {
    setFile(null);
    setNotice(null);
    setEditing(null);
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
              disabled={pending || valid === 0 || editing !== null}
              onClick={save}
              className="btn btn-primary shrink-0"
            >
              {saving ? "Ekleniyor…" : `${valid} ürünü ekle`}
            </button>
          </div>

          {notice && (
            <p className="mx-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
              {notice}
            </p>
          )}

          {editing !== null ? (
            <p className="px-4 text-sm text-ink-muted">
              Eklemeden önce açık düzenlemeyi kaydedin ya da vazgeçin.
            </p>
          ) : (
            invalid > 0 && (
              <p className="px-4 text-sm text-ink-muted">
                Hatalı satırlar eklenmez. Kalem simgesiyle burada düzeltebilir, çöp kutusuyla listeden
                çıkarabilirsiniz; düzeltmeden devam ederseniz yalnızca hatasız satırlar eklenir.
              </p>
            )
          )}

          {rows.length === 0 ? (
            <p className="px-4 pb-6 text-sm text-ink-muted">
              Tüm satırları çıkardınız. Eklemek için dosyayı yeniden seçin.
            </p>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-4 py-2 font-semibold">Satır</th>
                  <th className="px-4 py-2 font-semibold">Ürün adı</th>
                  <th className="px-4 py-2 font-semibold">Günlük fiyat</th>
                  <th className="px-4 py-2 font-semibold">Stok</th>
                  <th className="px-4 py-2 font-semibold">Etiket no</th>
                  <th className="px-4 py-2 font-semibold">Durum</th>
                  <th className="px-4 py-2">
                    <span className="sr-only">İşlemler</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) =>
                  editing?.row === r.row ? (
                    <EditRow
                      key={r.row}
                      draft={editing}
                      onChange={setEditing}
                      onSave={() => saveEdit(editing)}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
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
                    <td className="px-2 py-1">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing({ ...r.raw, price: String(r.raw.price) })}
                          disabled={editing !== null || saving}
                          aria-label={`${r.row}. satırı düzenle`}
                          title="Düzenle"
                          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-hover disabled:pointer-events-none disabled:opacity-40"
                        >
                          <IconPencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(r.row)}
                          disabled={editing !== null || saving}
                          aria-label={`${r.row}. satırı sil`}
                          title="Sil"
                          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-40"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          )}
        </section>
      )}
    </div>
  );
}

const FIELDS = [
  { key: "name", label: "Ürün adı", span: "sm:col-span-2", inputMode: undefined },
  { key: "price", label: "Günlük fiyat (₺)", span: "", inputMode: "decimal" },
  { key: "stock", label: "Stok", span: "", inputMode: "numeric" },
  { key: "barcode", label: "Etiket no", span: "", inputMode: undefined },
  { key: "features", label: "Özellikler (virgülle ayırın)", span: "sm:col-span-3", inputMode: undefined },
] as const;

/** Önizlemede bir satırın yerinde açılan düzenleme alanları. */
function EditRow({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: RawRow;
  onChange: (next: RawRow) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <tr className="border-b border-border bg-accent-soft/40 last:border-0">
      <td colSpan={7} className="px-4 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
          className="flex flex-col gap-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {draft.row}. satırı düzenle
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            {FIELDS.map((f, i) => (
              <label key={f.key} className={f.span}>
                <span className="field-label">{f.label}</span>
                <input
                  className="input"
                  value={String(draft[f.key])}
                  inputMode={f.inputMode}
                  placeholder={f.key === "barcode" ? "Boş bırakılırsa otomatik" : undefined}
                  autoFocus={i === 0}
                  onChange={(e) => onChange({ ...draft, [f.key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary">
              Kaydet
            </button>
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Vazgeç
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}
