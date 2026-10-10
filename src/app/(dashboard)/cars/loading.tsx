import { Skeleton } from "@/components/ui/skeleton";

export default function CarsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <Skeleton className="h-4 w-5" />
          <Skeleton className="h-4 w-32" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-slate-50 px-3 py-3 last:border-0"
          >
            <Skeleton className="h-4 w-6 shrink-0" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-4 w-20 hidden md:block" />
            <Skeleton className="h-4 w-12 hidden md:block" />
            <Skeleton className="h-4 w-28 font-mono" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24 font-mono" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}