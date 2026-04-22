// Mustache-ish template renderer: walks JSON and replaces {{expr}} tokens.
// Supported expressions:
//   input.path.to.value (also: body.path, query.path, headers.path)
//   now | now.iso | now.unix
//   uuid
//   random.int(a,b) | random.float(a,b) | random.pick(a,b,...) | random.bool | random.string(n)
//   upper(input.x) | lower(input.x) | base64(input.x) | json(input.x)

export type TemplateCtx = {
  input: unknown; // parsed body
  query: Record<string, string>;
  headers: Record<string, string>;
};

function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function ctxGet(ctx: TemplateCtx, ref: string): unknown {
  const [root, ...rest] = ref.split(".");
  const path = rest.join(".");
  if (root === "input" || root === "body") return getPath(ctx.input, path);
  if (root === "query") return getPath(ctx.query, path);
  if (root === "headers") return getPath(ctx.headers, path);
  return undefined;
}

function randomString(n: number) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function parseArgs(s: string): string[] {
  // naive CSV split; supports strings in quotes
  const out: string[] = [];
  let cur = "";
  let inStr: false | '"' | "'" = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === inStr) inStr = false;
      else cur += c;
    } else if (c === '"' || c === "'") {
      inStr = c;
    } else if (c === ",") {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  if (cur.trim() !== "" || out.length > 0) out.push(cur.trim());
  return out;
}

function parseScalar(s: string): unknown {
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null") return null;
  return s;
}

function evalExpr(expr: string, ctx: TemplateCtx): unknown {
  const e = expr.trim();
  if (e === "now" || e === "now.iso") return new Date().toISOString();
  if (e === "now.unix") return Math.floor(Date.now() / 1000);
  if (e === "uuid") return crypto.randomUUID();
  if (e === "random.bool") return Math.random() < 0.5;

  const fn = e.match(/^([a-zA-Z][a-zA-Z0-9_.]*)\((.*)\)$/);
  if (fn) {
    const name = fn[1];
    const args = parseArgs(fn[2]);
    switch (name) {
      case "random.int": {
        const a = Number(args[0] ?? 0),
          b = Number(args[1] ?? 100);
        const lo = Math.min(a, b), hi = Math.max(a, b);
        return Math.floor(lo + Math.random() * (hi - lo + 1));
      }
      case "random.float": {
        const a = Number(args[0] ?? 0),
          b = Number(args[1] ?? 1);
        return a + Math.random() * (b - a);
      }
      case "random.pick": {
        const vals = args.map(parseScalar);
        return vals[Math.floor(Math.random() * vals.length)];
      }
      case "random.string": {
        return randomString(Math.max(0, Math.min(1024, Number(args[0] ?? 8))));
      }
      case "upper": {
        const v = ctxGet(ctx, args[0] ?? "");
        return typeof v === "string" ? v.toUpperCase() : v;
      }
      case "lower": {
        const v = ctxGet(ctx, args[0] ?? "");
        return typeof v === "string" ? v.toLowerCase() : v;
      }
      case "base64": {
        const v = ctxGet(ctx, args[0] ?? "");
        const s = typeof v === "string" ? v : JSON.stringify(v ?? null);
        return Buffer.from(s, "utf8").toString("base64");
      }
      case "json": {
        return ctxGet(ctx, args[0] ?? "");
      }
      default:
        return undefined;
    }
  }

  return ctxGet(ctx, e);
}

function renderString(str: string, ctx: TemplateCtx): unknown {
  const re = /\{\{\s*([^}]+?)\s*\}\}/g;
  // Whole-string single token => preserve value type (number, object, etc.)
  const wholeMatch = str.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
  if (wholeMatch) return evalExpr(wholeMatch[1], ctx);
  return str.replace(re, (_, expr: string) => {
    const v = evalExpr(expr, ctx);
    if (v == null) return "";
    if (typeof v === "string") return v;
    return JSON.stringify(v);
  });
}

export function renderTemplate(tpl: unknown, ctx: TemplateCtx): unknown {
  if (tpl == null) return tpl;
  if (typeof tpl === "string") return renderString(tpl, ctx);
  if (Array.isArray(tpl)) return tpl.map((x) => renderTemplate(x, ctx));
  if (typeof tpl === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(tpl as Record<string, unknown>)) out[k] = renderTemplate(v, ctx);
    return out;
  }
  return tpl;
}
