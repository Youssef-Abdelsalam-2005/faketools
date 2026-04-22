"use client";
import * as React from "react";

const RAMP = " .:-=+*#%@";

export function AsciiSpinner({ size = 7, speed = 1.4 }: { size?: number; speed?: number }) {
  const [frame, setFrame] = React.useState("");
  React.useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = ((now - start) / 1000) * speed;
      let out = "";
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size * 2; x++) {
          const dx = (x - size) / size;
          const dy = (y - size / 2) / (size / 2);
          const r = Math.sqrt(dx * dx + dy * dy);
          const a = Math.atan2(dy, dx);
          const v = 0.5 + 0.5 * Math.sin(a * 3 + t * 2 - r * 4);
          const band = Math.max(0, 1 - Math.abs(r - 0.6) * 2);
          const idx = Math.min(RAMP.length - 1, Math.max(0, Math.floor(v * band * (RAMP.length - 1))));
          out += RAMP[idx];
        }
        out += "\n";
      }
      setFrame(out);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size, speed]);
  return <pre className="mono text-[10px] leading-[10px] text-[var(--foreground)]">{frame}</pre>;
}
