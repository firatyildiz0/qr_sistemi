import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <span className="eyebrow text-accent">Yönetim</span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Supabase kullanımı</h1>
      <Skeleton className="mt-3 h-4 w-80" />

      <Skeleton className="mt-6 h-11 w-40" />
      <Skeleton className="mt-4 h-4 w-48" />

      <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card flex flex-col items-center">
            <Skeleton className="h-4 w-24 self-start" />
            <Skeleton className="mt-4 h-32 w-32 rounded-full" />
            <Skeleton className="mt-3 h-4 w-28" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </section>

      <section className="card mt-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-2 h-3 w-64" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="mt-5 h-8 w-full" />
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-2 h-3 w-56" />
            <Skeleton className="mt-5 h-32 w-full" />
          </div>
        ))}
      </section>
    </>
  );
}
