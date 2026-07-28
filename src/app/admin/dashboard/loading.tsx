import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-paper px-4 py-4 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">İstatistik</h1>
        <Skeleton className="h-10 w-28" />
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 p-4 sm:gap-16 sm:p-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card flex items-start gap-4">
              <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
