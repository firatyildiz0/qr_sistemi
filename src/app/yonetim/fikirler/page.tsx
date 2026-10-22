import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import FikirActions from "@/components/yonetim/FikirActions";
import { IconInbox } from "@/components/icons";
import type { FikirDurumu } from "./actions";

type Fikir = {
  id: string;
  ad: string;
  isletme: string | null;
  eposta: string | null;
  telefon: string | null;
  mesaj: string;
  durum: FikirDurumu;
  created_at: string;
};

const tarihBicimi = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

/** `05321234567` → `0532 123 45 67`, okunurken kolay seçilsin. */
function telefonGoster(t: string): string {
  return `${t.slice(0, 4)} ${t.slice(4, 7)} ${t.slice(7, 9)} ${t.slice(9)}`;
}

/**
 * Anasayfadaki "Fikriniz mi var?" formundan gelen öneriler. Yeniler üstte;
 * okunanlar altta, arşivlenenler en sonda kapalı bir bölümde.
 */
export default async function FikirlerPage() {
  // Yetki önce: panelin geri kalanındaki düzenin aynısı. Okuma RLS'le
  // (fikirler_select_superuser) yapılıyor, service role gerekmiyor.
  const me = await getProfile();
  if (me?.role !== "superuser" || me.status !== "approved") return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("fikirler")
    .select("id, ad, isletme, eposta, telefon, mesaj, durum, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const fikirler = (data ?? []) as Fikir[];
  const yeniler = fikirler.filter((f) => f.durum === "yeni");
  const okunanlar = fikirler.filter((f) => f.durum === "okundu");
  const arsiv = fikirler.filter((f) => f.durum === "arsiv");

  return (
    <>
      <span className="eyebrow text-accent">Yönetim</span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Fikirler</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Anasayfadaki &ldquo;Fikriniz mi var?&rdquo; formundan gönderilen öneriler. Size dönülmesini bekleyen
        kişinin iletişim bilgisi her kartta.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">
          Yeni
          {yeniler.length > 0 && <span className="pill pill-warning ml-2">{yeniler.length}</span>}
        </h2>
        {yeniler.length === 0 ? (
          <p className="card mt-3 flex items-center gap-3 text-sm text-ink-muted">
            <IconInbox className="h-4 w-4 shrink-0" />
            Yeni öneri yok.
          </p>
        ) : (
          <FikirListesi fikirler={yeniler} />
        )}
      </section>

      {okunanlar.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-ink">Okunanlar</h2>
          <FikirListesi fikirler={okunanlar} />
        </section>
      )}

      {arsiv.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm font-semibold text-ink-muted">
            Arşiv ({arsiv.length})
          </summary>
          <FikirListesi fikirler={arsiv} />
        </details>
      )}
    </>
  );
}

function FikirListesi({ fikirler }: { fikirler: Fikir[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {fikirler.map((f) => (
        <li key={f.id} className="card flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{f.ad}</span>
                {f.isletme && <span className="pill pill-muted">{f.isletme}</span>}
                {f.durum === "yeni" && <span className="pill pill-accent">Yeni</span>}
              </div>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {f.eposta && (
                  <a href={`mailto:${f.eposta}`} className="link-underline break-all text-accent">
                    {f.eposta}
                  </a>
                )}
                {f.telefon && (
                  <a href={`tel:${f.telefon}`} className="link-underline text-accent">
                    {telefonGoster(f.telefon)}
                  </a>
                )}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">{tarihBicimi.format(new Date(f.created_at))}</p>
            </div>
            <FikirActions id={f.id} durum={f.durum} />
          </div>
          <p className="whitespace-pre-line break-words text-sm leading-relaxed text-ink">{f.mesaj}</p>
        </li>
      ))}
    </ul>
  );
}
