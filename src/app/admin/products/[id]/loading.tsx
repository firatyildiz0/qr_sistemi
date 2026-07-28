import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-56" />
      </div>

      <Skeleton className="mb-6 h-8 w-64 sm:mb-8" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_300px]">
        <div className="card flex flex-col gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <Skeleton className="h-11 w-48" />
        </div>

        <div className="space-y-6">
          <div className="card flex flex-col items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-40 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="card">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="mb-6 text-lg font-semibold text-ink">Müsaitlik</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-80 w-full" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-24" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
