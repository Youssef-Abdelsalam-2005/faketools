"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  HTMLButtonElement,
  { checked?: boolean; onCheckedChange?: (v: boolean) => void; disabled?: boolean; className?: string }
>(({ checked = false, onCheckedChange, disabled, className }, ref) => (
  <button
    ref={ref}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange?.(!checked)}
    className={cn(
      "relative inline-flex h-5 w-9 items-center border border-[var(--border)] transition-colors",
      checked ? "bg-[var(--accent)]" : "bg-[var(--input)]",
      className,
    )}
  >
    <span
      className={cn(
        "block h-3 w-3 transition-transform",
        checked ? "translate-x-5 bg-[var(--accent-foreground)]" : "translate-x-1 bg-[var(--foreground)]",
      )}
    />
  </button>
));
Switch.displayName = "Switch";
