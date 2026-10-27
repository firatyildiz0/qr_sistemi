import Link from "next/link";
import type { Blok } from "@/lib/blog/tipler";

/** `**kalın**` ve `[bağlantı](/adres)` biçimlerini öğelere çevirir. */
export function Satir({ metin }: { metin: string }) {
  const parcalar = metin.split(/(\*\*.+?\*\*|\[.+?\]\(.+?\))/g);
  return (
    <>
      {parcalar.map((parca, i) => {
        const kalin = parca.match(/^\*\*(.+)\*\*$/);
        if (kalin) {
          return (
            <strong key={i} className="font-semibold text-ink">
              {kalin[1]}
            </strong>
          );
        }
        const baglanti = parca.match(/^\[(.+)\]\((.+)\)$/);
        if (baglanti) {
          return (
            <Link key={i} href={baglanti[2]} className="link-underline font-medium text-accent">
              {baglanti[1]}
            </Link>
          );
        }
        return parca;
      })}
    </>
  );
}

export function BlokGoster({ blok }: { blok: Blok }) {
  switch (blok.tur) {
    case "paragraf":
      return (
        <p className="leading-relaxed text-ink-muted">
          <Satir metin={blok.metin} />
        </p>
      );
    case "liste":
      return (
        <ul className="space-y-2 text-ink-muted">
          {blok.maddeler.map((madde, i) => (
            <li key={i} className="flex gap-2.5 leading-relaxed">
              <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
              <span>
                <Satir metin={madde} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "adimlar":
      return (
        <ol className="space-y-4">
          {blok.adimlar.map((adim, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-hover">
                {i + 1}
              </span>
              <div className="pt-1">
                <p className="font-semibold text-ink">{adim.baslik}</p>
                <p className="mt-1 leading-relaxed text-ink-muted">
                  <Satir metin={adim.metin} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      );
    case "tablo":
      return (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-surface text-ink">
              <tr>
                {blok.basliklar.map((b, i) => (
                  <th key={i} scope="col" className="px-4 py-3 font-semibold">
                    {b}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {blok.satirlar.map((satir, i) => (
                <tr key={i} className="border-t border-border">
                  {satir.map((hucre, j) =>
                    j === 0 ? (
                      <th key={j} scope="row" className="px-4 py-3 font-semibold text-ink">
                        {hucre}
                      </th>
                    ) : (
                      <td key={j} className="px-4 py-3 text-ink-muted">
                        {hucre}
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
