import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <span className="eyebrow text-accent">Yönetim</span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">İstatistik</h1>
      <Skeleton className="mt-3 h-4 w-72" />
      <Skeleton className="mt-6 h-11 w-64" />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <Skeleton className="mt-4 h-8 w-20" />
            <Skeleton className="mt-3 h-3 w-24" />
          </div>
        ))}
      </section>

      <section className="card mt-6">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="mt-4 h-4 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="mt-5 h-28 w-full" />
        ))}
      </section>
    </>
  );
}
