import type { InputField } from "@/lib/db/schema";

const HELPERS = [
  "now",
  "now.iso",
  "now.unix",
  "uuid",
  "random.bool",
  "random.int(1, 100)",
  "random.float(0, 1)",
  "random.pick(\"a\", \"b\", \"c\")",
  "random.string(8)",
  "upper(input.x)",
  "lower(input.x)",
  "base64(input.x)",
  "json(input.x)",
];

function walkPaths(obj: unknown, prefix: string, out: string[]) {
  if (obj == null || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    out.push(prefix);
    return;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const p = prefix ? `${prefix}.${k}` : k;
    out.push(p);
    if (v && typeof v === "object" && !Array.isArray(v)) walkPaths(v, p, out);
  }
}

export function buildSuggestions(opts: {
  fields?: InputField[];
  sample?: unknown;
}): string[] {
  const paths = new Set<string>();
  for (const f of opts.fields ?? []) {
    if (f.name) paths.add(`input.${f.name}`);
  }
  const sampled: string[] = [];
  walkPaths(opts.sample, "", sampled);
  for (const p of sampled) paths.add(`input.${p}`);
  // generic hints
  paths.add("query.");
  paths.add("headers.");
  const inputs = Array.from(paths).sort();
  return [...inputs, ...HELPERS];
}
