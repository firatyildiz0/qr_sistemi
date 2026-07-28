import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex h-auto flex-col gap-3 border-b border-border bg-paper px-4 py-4 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Bildirimler</h1>
        <Skeleton className="h-10 w-40" />
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-8">
        <ul className="overflow-hidden rounded-lg border border-border bg-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-start gap-4 border-b border-border p-4 last:border-b-0">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
