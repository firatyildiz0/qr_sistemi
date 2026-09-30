import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="page-header flex h-auto flex-col gap-1 border-b border-border bg-paper px-4 py-4 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Bildirimler</h1>
          <Skeleton className="mt-1 h-4 w-44" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-4 sm:p-8">
        <Skeleton className="h-[108px] w-full rounded-lg" />
        <div className="flex gap-2">
          {["w-16", "w-24", "w-20", "w-14"].map((w) => (
            <Skeleton key={w} className={`h-9 rounded-full ${w}`} />
          ))}
        </div>
        <ul className="overflow-hidden rounded-lg border border-border bg-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-start gap-4 border-b border-border p-4 last:border-b-0">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
