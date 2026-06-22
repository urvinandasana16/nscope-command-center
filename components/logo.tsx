import { brand } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary ring-1 ring-white/10">
        <img src={brand.logoPath} alt="N-SCOPE logo" className="h-full w-full object-cover" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{brand.product}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{brand.company}</p>
        </div>
      )}
    </div>
  );
}
