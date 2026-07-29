import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="page-header flex h-auto items-center border-b border-border bg-paper px-4 py-4 sm:h-20 sm:px-8 sm:py-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Ayarlar</h1>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8 lg:flex-row lg:gap-8">
        <div className="flex gap-2 lg:w-56 lg:shrink-0 lg:flex-col">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-32 lg:w-full" />
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-3/4" />
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-24" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
