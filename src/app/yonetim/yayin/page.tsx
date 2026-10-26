import { getProfile } from "@/lib/profile";
import {
  yayinDurumu,
  preprodDurumu,
  onizlemeAdresi,
  type PreprodDurumu,
  CANLI_DALI,
  IS_DALI_ONEKI,
  type DegisiklikTipi,
  type Karar,
} from "@/lib/github";
import YayinActions from "@/components/yonetim/YayinActions";
import RedGeriAl from "@/components/yonetim/RedGeriAl";
import PreprodGuncelle from "@/components/yonetim/PreprodGuncelle";
import { IconCheckCircle, IconExternal, IconX } from "@/components/icons";

/** Preprod'un sabit adresi; Vercel'de `preprod` dalına bağlı alan adı. */
const PREPROD_ADRESI = process.env.PREPROD_ADRESI ?? "https://preprod.voyolabs.com";

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

  // Test ortamında yayın kararı verilmiyor (bkz. actions.ts); listeyi
  // okumanın da anlamı yok, karar yeri canlıdaki panel.
  if (process.env.PREPROD_KILIDI === "1") {
    return (
      <>
        <span className="eyebrow text-accent">Yönetim</span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Yayın</h1>
        <p className="card mt-8 text-sm text-ink-muted">
          Burası preprod, yani test ortamı. Yayın kararları canlıdaki yönetim panelinden
          verilir; buradan canlıya bir şey alınamaz.
        </p>
      </>
    );
  }

  const [durum, preprod] = await Promise.all([yayinDurumu(), preprodDurumu()]);
  const preproddakiler = new Set(preprod.var ? preprod.dallar : []);

  return (
    <>
      <span className="eyebrow text-accent">Yönetim</span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Yayın</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Hazırlanan geliştirmeler ve düzeltmeler burada bekler. Her biri
        birbirinden bağımsız: istediğinizi, istediğiniz sırada canlıya
        alabilirsiniz. Verdiğiniz kararlar aşağıda kalır: canlıya aldıklarınız ve
        reddettikleriniz.
      </p>

      {"kurulum" in durum ? (
        <Kurulum mesaj={durum.kurulum} />
      ) : (
        <>
          <PreprodKarti
            preprod={preprod}
            bekleyenler={durum.degisiklikler.map((d) => d.dal)}
          />

          {durum.uyarilar.length > 0 && (
            <div className="card mt-8 border-warning/40 bg-warning/10 text-sm">
              <p className="font-semibold text-ink">
                Bu liste eksik olabilir
              </p>
              <ul className="mt-2 space-y-1 text-ink-muted">
                {durum.uyarilar.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          {durum.degisiklikler.length === 0 ? (
            <p className="card mt-8 flex items-center gap-3 text-sm text-ink-muted">
              <IconCheckCircle className="h-4 w-4 shrink-0" />
              {durum.uyarilar.length > 0
                ? "Bekleyen iş görünmüyor, ama yukarıdaki yüzünden bundan emin olamıyoruz."
                : "Canlı en güncel halde. Bekleyen iş yok."}
            </p>
          ) : (
            <section className="mt-8">
              <h2 className="text-sm font-semibold text-ink">
                Onay bekleyenler
                <span className="pill pill-warning ml-2">
                  {durum.degisiklikler.length}
                </span>
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
                        {preproddakiler.has(d.dal) && (
                          <span className="pill pill-success">Preprod&apos;da</span>
                        )}
                      </div>

                      {d.aciklama && (
                        <p className="mt-2 text-sm text-ink">{d.aciklama}</p>
                      )}

                      {d.dikkat && (
                        <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-ink">
                          <span className="font-semibold">Dikkat: </span>
                          {d.dikkat}
                        </p>
                      )}

                      <p className="mt-2 font-mono text-xs text-ink-muted">
                        {d.dal} · {dateFormat.format(new Date(d.tarih))}
                      </p>

                      {onizlemeAdresi(d.dal) && (
                        <a
                          href={onizlemeAdresi(d.dal)!}
                          target="_blank"
                          rel="noreferrer"
                          className="link-underline mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent"
                        >
                          Yalnız bu işi önizle
                          <IconExternal className="h-3.5 w-3.5" />
                        </a>
                      )}

                      <div className="mt-4">
                        <YayinActions dal={d.dal} baslik={d.baslik} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <Gecmis
            baslik="Canlıya alınanlar"
            bos="Henüz buradan canlıya alınmış bir iş yok."
            kararlar={durum.onaylananlar}
          />

          <Gecmis
            baslik="Reddedilenler"
            bos="Reddettiğiniz bir iş yok."
            kararlar={durum.reddedilenler}
            red
          />
        </>
      )}
    </>
  );
}

/**
 * Verilmiş kararların listesi. Kapalı açılır: sayfanın asıl işi bekleyenleri
 * göstermek, geçmiş sorulunca bakılan yer.
 */
function Gecmis({
  baslik,
  bos,
  kararlar,
  red = false,
}: {
  baslik: string;
  bos: string;
  kararlar: Karar[];
  red?: boolean;
}) {
  return (
    <details className="mt-8 group">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink">
        {red ? (
          <IconX className="h-4 w-4 text-ink-muted" />
        ) : (
          <IconCheckCircle className="h-4 w-4 text-ink-muted" />
        )}
        {baslik}
        <span className={`pill ${red ? "pill-muted" : "pill-success"}`}>
          {kararlar.length}
        </span>
      </summary>

      {kararlar.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{bos}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {kararlar.map((k) => {
            const etiket = k.tip ? TIP_ETIKET[k.tip] : null;

            return (
              <li key={k.dal} className="card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{k.baslik}</span>
                  {etiket && (
                    <span className={`pill ${etiket.pill}`}>{etiket.text}</span>
                  )}
                </div>

                {k.aciklama && <p className="mt-2 text-sm text-ink">{k.aciklama}</p>}

                {k.sebep && (
                  <p className="mt-2 text-sm text-ink-muted">
                    <span className="font-semibold">Not: </span>
                    {k.sebep}
                  </p>
                )}

                <p className="mt-2 font-mono text-xs text-ink-muted">
                  {k.dal} · {dateFormat.format(new Date(k.tarih))}
                </p>

                {red && (
                  <div className="mt-3">
                    <RedGeriAl dal={k.dal} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </details>
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

/**
 * Preprod'un durumu: hangi işler içinde, canlının gerisinde mi, bekleyen bir
 * iş dışarıda mı kalmış. Güncelleme düğmesi de burada.
 */
function PreprodKarti({
  preprod,
  bekleyenler,
}: {
  preprod: PreprodDurumu;
  bekleyenler: string[];
}) {
  const icerdekiler = new Set(preprod.var ? preprod.dallar : []);
  const disarida = bekleyenler.filter((d) => !icerdekiler.has(d));
  const guncel = preprod.var && !preprod.canlidanGeride && disarida.length === 0;

  return (
    <section className="card mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">Preprod</h2>
        {preprod.var ? (
          <span className={`pill ${guncel ? "pill-success" : "pill-warning"}`}>
            {guncel ? "Güncel" : "Güncellenmeli"}
          </span>
        ) : (
          <span className="pill pill-muted">Henüz kurulmadı</span>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-muted">
        Canlı ve onay bekleyen bütün işler bir arada, ayrı bir test veritabanıyla. Yalnızca
        superuser hesapları girebilir; orada yaptığınız hiçbir şey canlıya yansımaz.
      </p>

      {preprod.var && (
        <ul className="mt-3 space-y-1 text-sm text-ink-muted">
          <li>Son kurulum: {dateFormat.format(new Date(preprod.tarih))}</li>
          {preprod.canlidanGeride && <li>Kurulduktan sonra canlıya yeni bir iş alındı.</li>}
          {disarida.length > 0 && (
            <li>Preprod&apos;da olmayan bekleyen iş: {disarida.join(", ")}</li>
          )}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-start gap-3">
        <PreprodGuncelle />
        {preprod.var && (
          <a
            href={PREPROD_ADRESI}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            Preprod&apos;u aç
            <IconExternal className="h-4 w-4" />
          </a>
        )}
      </div>
    </section>
  );
}
