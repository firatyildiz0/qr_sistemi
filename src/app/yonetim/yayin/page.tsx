import { getProfile } from "@/lib/profile";
import { yayinDurumu, CANLI_DALI, IS_DALI_ONEKI, type DegisiklikTipi } from "@/lib/github";
import YayinActions from "@/components/yonetim/YayinActions";
import { IconCheckCircle } from "@/components/icons";

const TIP_ETIKET: Record<DegisiklikTipi, { text: string; pill: string }> = {
  ozellik: { text: "Yeni özellik", pill: "pill-accent" },
  hata: { text: "Hata düzeltme", pill: "pill-danger" },
  guvenlik: { text: "Güvenlik", pill: "pill-warning" },
  iyilestirme: { text: "İyileştirme", pill: "pill-success" },
};

const dateFormat = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function YayinPage() {
  // Yetki önce: `yayinDurumu()` depoya yazma yetkisi olan bir anahtarla
  // konuşuyor, onu yetkisiz bir istekle hiç çalıştırmıyoruz.
  const me = await getProfile();
  if (me?.role !== "superuser" || me.status !== "approved") return null;

  const durum = await yayinDurumu();

  return (
    <>
      <span className="eyebrow text-accent">Yönetim</span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Yayın</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Hazırlanan geliştirmeler ve düzeltmeler burada bekler. Her biri
        birbirinden bağımsız: istediğinizi, istediğiniz sırada canlıya
        alabilirsiniz.
      </p>

      {"kurulum" in durum ? (
        <Kurulum mesaj={durum.kurulum} />
      ) : durum.degisiklikler.length === 0 ? (
        <p className="card mt-8 flex items-center gap-3 text-sm text-ink-muted">
          <IconCheckCircle className="h-4 w-4 shrink-0" />
          Canlı en güncel halde. Bekleyen iş yok.
        </p>
      ) : (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink">
            Onay bekleyenler
            <span className="pill pill-warning ml-2">{durum.degisiklikler.length}</span>
          </h2>

          <ul className="mt-3 space-y-3">
            {durum.degisiklikler.map((d) => {
              const etiket = d.tip ? TIP_ETIKET[d.tip] : null;

              return (
                <li key={d.dal} className="card">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{d.baslik}</span>
                    {etiket ? (
                      <span className={`pill ${etiket.pill}`}>{etiket.text}</span>
                    ) : (
                      <span className="pill pill-muted">Açıklama yok</span>
                    )}
                  </div>

                  {d.aciklama && <p className="mt-2 text-sm text-ink">{d.aciklama}</p>}

                  {d.dikkat && (
                    <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-ink">
                      <span className="font-semibold">Dikkat: </span>
                      {d.dikkat}
                    </p>
                  )}

                  <p className="mt-2 font-mono text-xs text-ink-muted">
                    {d.dal} · {dateFormat.format(new Date(d.tarih))}
                  </p>

                  <div className="mt-4">
                    <YayinActions dal={d.dal} baslik={d.baslik} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

function Kurulum({ mesaj }: { mesaj: string }) {
  return (
    <div className="card mt-8 text-sm">
      <p className="font-semibold text-ink">Bu ekran henüz kurulmamış</p>
      <p className="mt-1 text-ink-muted">{mesaj}</p>
      <p className="mt-4 text-ink-muted">
        Vercel &gt; Settings &gt; Environment Variables altına iki değer eklenmeli:
      </p>
      <ul className="mt-2 space-y-1 text-ink-muted">
        <li>
          <span className="font-mono text-xs text-ink">GITHUB_REPO</span> — depo adı,
          örneğin <span className="font-mono text-xs">firatyildiz0/qr_sistemi</span>
        </li>
        <li>
          <span className="font-mono text-xs text-ink">GITHUB_TOKEN</span> — GitHub
          erişim anahtarı; yalnızca bu depoya, yalnızca &quot;Contents: Read and
          write&quot; yetkisiyle
        </li>
      </ul>
      <p className="mt-4 text-ink-muted">
        Panel <span className="font-mono text-xs">{IS_DALI_ONEKI}</span> ile başlayan
        dallarda bekleyen işleri gösterir ve onayladığınızda o dalı{" "}
        <span className="font-mono text-xs">{CANLI_DALI}</span> dalına birleştirir.
      </p>
    </div>
  );
}
