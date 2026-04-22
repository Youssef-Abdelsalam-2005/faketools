import { cn } from "@/lib/utils";

export type Origin = "you" | "ai";

export function ChangeBadge({ origin, className }: { origin?: Origin; className?: string }) {
  if (!origin) return null;
  const isAI = origin === "ai";
  return (
    <span
      className={cn(
        "mono ml-2 inline-flex items-center border px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-[0.12em]",
        isAI
          ? "border-amber-400/60 bg-amber-400/10 text-amber-700 dark:text-amber-300"
          : "border-sky-500/60 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        className,
      )}
    >
      {isAI ? "AI" : "YOU"}
    </span>
  );
}

export function changedBorderClass(origin?: Origin) {
  if (!origin) return "";
  return origin === "ai"
    ? "!border-amber-400/70 ring-1 ring-amber-400/30"
    : "!border-sky-500/70 ring-1 ring-sky-500/30";
}
