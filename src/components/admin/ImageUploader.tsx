"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_PRODUCT_IMAGES,
  PRODUCT_IMAGES_BUCKET,
  storagePathFromUrl,
} from "@/lib/storage";
import { IconImage, IconStar, IconTrash, IconUpload } from "@/components/icons";

type Slot = {
  key: string;
  /** Public URL — null while the upload is still in flight. */
  url: string | null;
  /** Object URL for a fresh file, or the public URL for a saved one. */
  preview: string;
  status: "uploading" | "done" | "error";
  /** Uploaded in this session, so removing it can delete the object outright. */
  isNew: boolean;
};

/**
 * Uploads straight from the browser to Supabase Storage rather than through
 * the server action — Server Actions cap the request body at 1 MB, which a
 * single photo blows past. The form only ever submits the resulting URLs.
 */
export default function ImageUploader({
  initialImages = [],
  onBusyChange,
}: {
  initialImages?: string[];
  onBusyChange?: (busy: boolean) => void;
}) {
  const [slots, setSlots] = useState<Slot[]>(() =>
    initialImages.slice(0, MAX_PRODUCT_IMAGES).map((url, i) => ({
      key: `saved-${i}-${url}`,
      url,
      preview: url,
      status: "done" as const,
      isNew: false,
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);

  const busy = slots.some((s) => s.status === "uploading");
  const remaining = MAX_PRODUCT_IMAGES - slots.length;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Object URLs stay alive for the life of the form; released on unmount.
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  async function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setError(null);

    if (files.length > remaining) {
      setError(
        remaining === 0
          ? `En fazla ${MAX_PRODUCT_IMAGES} görsel ekleyebilirsiniz.`
          : `Yalnızca ${remaining} görsel daha ekleyebilirsiniz.`
      );
      if (remaining === 0) return;
    }

    const accepted = files.slice(0, remaining).filter((file) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError("Yalnızca PNG, JPG veya WEBP dosyaları yüklenebilir.");
        return false;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError("Her görsel en fazla 5 MB olabilir.");
        return false;
      }
      return true;
    });

    if (accepted.length === 0) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Görsel yüklemek için giriş yapmalısınız.");
      return;
    }

    for (const file of accepted) {
      const key = crypto.randomUUID();
      const preview = URL.createObjectURL(file);
      objectUrls.current.push(preview);

      setSlots((prev) =>
        prev.length >= MAX_PRODUCT_IMAGES
          ? prev
          : [...prev, { key, url: null, preview, status: "uploading", isNew: true }]
      );

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${key}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        setSlots((prev) =>
          prev.map((s) => (s.key === key ? { ...s, status: "error" } : s))
        );
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);

      setSlots((prev) =>
        prev.map((s) => (s.key === key ? { ...s, url: publicUrl, status: "done" } : s))
      );
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  async function removeSlot(slot: Slot) {
    setSlots((prev) => prev.filter((s) => s.key !== slot.key));
    setError(null);

    // A file uploaded in this session and then removed was never saved to the
    // product, so nothing else will ever clean it up. Images already on the
    // product are deleted by the server action once the change is saved.
    if (slot.isNew && slot.url) {
      const path = storagePathFromUrl(slot.url);
      if (path) {
        const supabase = createClient();
        await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
      }
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="field-label mb-0">Görseller</span>
        <span className="text-xs text-ink-muted">
          {slots.length}/{MAX_PRODUCT_IMAGES}
        </span>
      </div>

      {slots.map(
        (slot) =>
          slot.status === "done" &&
          slot.url && (
            <input key={slot.key} type="hidden" name="images" value={slot.url} />
          )
      )}

      <div className="grid grid-cols-2 gap-3">
        {slots.map((slot, index) => (
          <figure
            key={slot.key}
            className="group relative aspect-4/3 overflow-hidden rounded-md border border-border bg-surface"
          >
            {/* Previews are blob: URLs mid-upload, which next/image can't optimize. */}
            {/* object-contain so the seller sees the whole image at its own
                proportions — the same way it renders on the public page. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slot.preview}
              alt=""
              className={`h-full w-full object-contain p-2 transition-opacity duration-200 ${
                slot.status === "done" ? "opacity-100" : "opacity-50"
              }`}
            />

            {slot.status === "uploading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/40">
                <span className="nav-spinner h-6 w-6 rounded-full border-2 border-border border-t-accent" />
              </div>
            )}

            {slot.status === "error" && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/80 px-2 text-center text-xs font-semibold text-danger">
                Yüklenemedi
              </div>
            )}

            {index === 0 && slot.status === "done" && (
              <figcaption className="pill pill-accent absolute left-2 top-2">
                <IconStar className="h-3 w-3" />
                Kapak
              </figcaption>
            )}

            <button
              type="button"
              onClick={() => removeSlot(slot)}
              aria-label="Görseli kaldır"
              title="Görseli kaldır"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-card text-ink-muted shadow-sm transition-all duration-200 hover:bg-danger hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </figure>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void addFiles(e.dataTransfer.files);
            }}
            className={`flex aspect-4/3 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-3 text-center transition-colors duration-200 ${
              dragging
                ? "border-accent bg-accent-soft text-accent-hover"
                : "border-border bg-surface text-ink-muted hover:border-accent hover:bg-accent-soft/40 hover:text-accent-hover"
            }`}
          >
            {slots.length === 0 ? (
              <IconImage className="h-6 w-6" />
            ) : (
              <IconUpload className="h-6 w-6" />
            )}
            <span className="text-sm font-semibold">
              {slots.length === 0 ? "Görsel ekle" : "Bir görsel daha"}
            </span>
            <span className="hidden text-xs sm:block">Sürükleyip bırakın veya seçin</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        className="sr-only"
        onChange={(e) => void addFiles(e.target.files)}
      />

      <p className="mt-2 text-xs text-ink-muted">
        PNG, JPG veya WEBP · görsel başına en fazla 5 MB · ilk görsel kapak olarak kullanılır
      </p>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
