import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <>
      <span className="eyebrow text-accent">Yönetim</span>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Yayın</h1>
      <Skeleton className="mt-3 h-4 w-80" />

      <Skeleton className="mt-8 h-4 w-36" />

      <div className="mt-3 space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
            <Skeleton className="mt-3 h-3 w-40" />
            <Skeleton className="mt-4 h-10 w-52" />
          </div>
        ))}
      </div>
    </>
  );
}
