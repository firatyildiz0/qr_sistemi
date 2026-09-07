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
import ImageCropper from "@/components/admin/ImageCropper";
import { IconImage, IconPencil, IconStar, IconTrash, IconUpload } from "@/components/icons";

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
 * A picture waiting in the cropper. `replaceKey` is set when the seller is
 * re-cropping a picture that is already in a slot; otherwise it's a new one.
 */
type CropTask = { id: string; file: File; replaceKey: string | null };

/**
 * Uploads straight from the browser to Supabase Storage rather than through
 * the server action — Server Actions cap the request body at 1 MB, which a
 * single photo blows past. The form only ever submits the resulting URLs.
 *
 * Every picture goes through the cropper first: a phone camera frames for the
 * phone, not for a product card, so the seller gets to cut the shot down
 * before anything is uploaded. The cropped file is what lands in the bucket.
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
  const [queue, setQueue] = useState<CropTask[]>([]);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);
  // Mirrors `slots` so an upload that finishes later can tell what it is
  // replacing without closing over a stale render.
  const slotsRef = useRef(slots);

  const task = queue[0];
  const pendingNew = queue.filter((t) => t.replaceKey === null).length;
  const busy = slots.some((s) => s.status === "uploading") || queue.length > 0 || opening;
  const remaining = MAX_PRODUCT_IMAGES - slots.length - pendingNew;

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // Object URLs stay alive for the life of the form; released on unmount.
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function addFiles(fileList: FileList | null) {
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

    if (inputRef.current) inputRef.current.value = "";
    if (accepted.length === 0) return;

    // Straight into the cropper, one after another; each one uploads as it is
    // cropped.
    setQueue((prev) => [
      ...prev,
      ...accepted.map((file) => ({ id: crypto.randomUUID(), file, replaceKey: null })),
    ]);
  }

  async function uploadFile(file: File, replaceKey: string | null) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Görsel yüklemek için giriş yapmalısınız.");
      return;
    }

    const key = replaceKey ?? crypto.randomUUID();
    const replaced = replaceKey
      ? slotsRef.current.find((s) => s.key === replaceKey)
      : undefined;

    if (replaceKey && !replaced) return;

    const preview = URL.createObjectURL(file);
    objectUrls.current.push(preview);

    setSlots((prev) =>
      replaceKey
        ? prev.map((s) =>
            s.key === replaceKey
              ? { ...s, url: null, preview, status: "uploading", isNew: true }
              : s
          )
        : prev.length >= MAX_PRODUCT_IMAGES
          ? prev
          : [...prev, { key, url: null, preview, status: "uploading", isNew: true }]
    );

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, status: "error" } : s)));
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);

    setSlots((prev) =>
      prev.map((s) => (s.key === key ? { ...s, url: publicUrl, status: "done" } : s))
    );

    // Re-cropping an image that was itself uploaded in this session leaves the
    // previous object behind with nothing pointing at it. One already on the
    // product is left alone: the server action clears it when the form saves.
    if (replaced?.isNew && replaced.url) {
      const stale = storagePathFromUrl(replaced.url);
      if (stale) await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([stale]);
    }
  }

  /** Reopens a picture that is already in a slot in the cropper. */
  async function editSlot(slot: Slot) {
    if (slot.status !== "done" || !slot.url) return;

    setError(null);
    setOpening(true);
    try {
      // `preview` is the blob: URL for something uploaded in this session and
      // the public URL for a saved one — either way it reads back as a file,
      // and going through a blob keeps the canvas untainted.
      const res = await fetch(slot.preview);
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);

      const blob = await res.blob();
      const type = ACCEPTED_IMAGE_TYPES.includes(blob.type) ? blob.type : "image/jpeg";
      const name = slot.url.split("/").pop() || "gorsel.jpg";

      setQueue((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          file: new File([blob], decodeURIComponent(name), { type }),
          replaceKey: slot.key,
        },
      ]);
    } catch {
      setError("Görsel düzenlemek için açılamadı. Lütfen tekrar deneyin.");
    } finally {
      setOpening(false);
    }
  }

  async function removeSlot(slot: Slot) {
    setSlots((prev) => prev.filter((s) => s.key !== slot.key));
    setQueue((prev) => prev.filter((t) => t.replaceKey !== slot.key));
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

            <div className="absolute right-2 top-2 flex gap-1.5">
              {slot.status === "done" && (
                <button
                  type="button"
                  onClick={() => void editSlot(slot)}
                  disabled={opening || queue.length > 0}
                  aria-label="Görseli kırp"
                  title="Görseli kırp"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-ink-muted shadow-sm transition-all duration-200 hover:bg-accent hover:text-white disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <IconPencil className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => void removeSlot(slot)}
                aria-label="Görseli kaldır"
                title="Görseli kaldır"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-ink-muted shadow-sm transition-all duration-200 hover:bg-danger hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
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
              addFiles(e.dataTransfer.files);
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
        onChange={(e) => addFiles(e.target.files)}
      />

      <p className="mt-2 text-xs text-ink-muted">
        PNG, JPG veya WEBP · görsel başına en fazla 5 MB · ilk görsel kapak olarak kullanılır ·
        eklerken kırpabilirsiniz
      </p>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {task && (
        <ImageCropper
          key={task.id}
          file={task.file}
          title={task.replaceKey ? "Görseli düzenle" : "Görseli kırp"}
          applyLabel={task.replaceKey ? "Kırp ve değiştir" : "Kırp ve ekle"}
          onApply={(cropped) => {
            setQueue((prev) => prev.filter((t) => t.id !== task.id));
            void uploadFile(cropped, task.replaceKey);
          }}
          onCancel={() => setQueue((prev) => prev.filter((t) => t.id !== task.id))}
        />
      )}
    </div>
  );
}
