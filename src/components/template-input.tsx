"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { getCaretCoordinates } from "@/lib/caret";

type AutoMode = "template" | "identifier";

type BaseProps = {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  className?: string;
  placeholder?: string;
  mode?: AutoMode;
};

function useAutocomplete<T extends HTMLTextAreaElement | HTMLInputElement>(suggestions: string[], value: string, onChange: (v: string) => void, mode: AutoMode = "template") {
  const ref = React.useRef<T>(null);
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<string[]>([]);
  const [active, setActive] = React.useState(0);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const tokenRef = React.useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const update = React.useCallback((e?: React.SyntheticEvent) => {
    const el = ref.current;
    if (!el) return;
    // Ignore nav keys on keyup so they don't clobber active-item selection
    if (e && "key" in (e.nativeEvent as any)) {
      const k = (e.nativeEvent as KeyboardEvent).key;
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === "Tab" || k === "Escape") return;
    }
    const caret = el.selectionStart ?? 0;
    const text = el.value;
    const before = text.slice(0, caret);

    let tokenStart: number;
    let tokenText: string;
    let pool = suggestions;

    if (mode === "template") {
      const lastOpen = before.lastIndexOf("{{");
      if (lastOpen < 0) return setOpen(false);
      const between = text.slice(lastOpen + 2, caret);
      if (between.includes("}}")) return setOpen(false);
      tokenStart = lastOpen + 2;
      tokenText = between;
    } else {
      // identifier mode: match a dotted identifier ending at caret; skip helper functions
      const m = /[\w.]*$/.exec(before);
      const seg = m?.[0] ?? "";
      if (seg.length === 0) return setOpen(false);
      tokenStart = caret - seg.length;
      tokenText = seg;
      pool = suggestions.filter((s) => !s.includes("("));
    }

    const q = tokenText.trim().toLowerCase();
    const filtered = pool.filter((s) => s.toLowerCase().includes(q)).slice(0, 12);
    if (filtered.length === 0) return setOpen(false);
    tokenRef.current = { start: tokenStart, end: caret };
    setItems(filtered);
    setActive(0);
    try {
      const c = getCaretCoordinates(el, caret);
      const rect = el.getBoundingClientRect();
      setPos({ top: rect.top + c.top + c.height + window.scrollY, left: rect.left + c.left + window.scrollX });
    } catch {
      const rect = el.getBoundingClientRect();
      setPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
    }
    setOpen(true);
  }, [suggestions]);

  const insert = (sug: string) => {
    const el = ref.current;
    if (!el) return;
    const { start, end } = tokenRef.current;
    let final: string;
    let caret: number;
    if (mode === "template") {
      const next = value.slice(0, start) + sug + value.slice(end);
      const closing = next.slice(start + sug.length, start + sug.length + 2);
      final = closing === "}}" ? next : next.slice(0, start + sug.length) + "}}" + next.slice(start + sug.length);
      caret = start + sug.length + 2;
    } else {
      final = value.slice(0, start) + sug + value.slice(end);
      caret = start + sug.length;
    }
    onChange(final);
    setOpen(false);
    requestAnimationFrame(() => {
      const el2 = ref.current;
      if (!el2) return;
      el2.focus();
      el2.setSelectionRange(caret, caret);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insert(items[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const dropdown = open && typeof document !== "undefined"
    ? createPortal(
        <div
          className="z-[60] max-h-64 w-72 overflow-y-auto border border-[var(--border)] bg-[var(--card)] text-[12px] shadow-md"
          style={{ position: "absolute", top: pos.top, left: pos.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {items.map((s, i) => (
            <div
              key={s}
              onClick={() => insert(s)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "mono cursor-pointer px-2 py-1",
                i === active ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "",
              )}
            >
              {s}
            </div>
          ))}
        </div>,
        document.body,
      )
    : null;

  return { ref, update, onKeyDown, dropdown, close: () => setOpen(false) };
}

export function TemplateTextarea({ value, onChange, suggestions, className, placeholder, minHeight, mode }: BaseProps & { minHeight?: string }) {
  const { ref, update, onKeyDown, dropdown, close } = useAutocomplete<HTMLTextAreaElement>(suggestions, value, onChange, mode);
  return (
    <>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setTimeout(update, 0);
        }}
        onClick={() => update()}
        onKeyUp={(e) => update(e)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(close, 150)}
        placeholder={placeholder}
        className={cn(
          "w-full border border-[var(--border)] bg-[var(--input)] px-3 py-2 font-mono text-[12px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]",
          className,
        )}
        style={{ minHeight: minHeight ?? "80px" }}
      />
      {dropdown}
    </>
  );
}

export function TemplateInput({ value, onChange, suggestions, className, placeholder, mode }: BaseProps) {
  const { ref, update, onKeyDown, dropdown, close } = useAutocomplete<HTMLInputElement>(suggestions, value, onChange, mode);
  return (
    <>
      <input
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setTimeout(update, 0);
        }}
        onClick={() => update()}
        onKeyUp={(e) => update(e)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(close, 150)}
        placeholder={placeholder}
        className={cn(
          "flex h-9 w-full border border-[var(--border)] bg-[var(--input)] px-3 py-1 font-mono text-[12px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]",
          className,
        )}
      />
      {dropdown}
    </>
  );
}
