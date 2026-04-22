import type { Rule, RuleOperator } from "@/lib/db/schema";
import type { TemplateCtx } from "@/lib/template";

function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const [root, ...rest] = path.split(".");
  let base: any;
  if (root === "input" || root === "body") base = (obj as any);
  else return undefined;
  let cur: any = base;
  for (const p of rest) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function compare(op: RuleOperator, left: unknown, right: unknown): boolean {
  switch (op) {
    case "eq":
      return String(left) === String(right);
    case "neq":
      return String(left) !== String(right);
    case "contains":
      if (Array.isArray(left)) return left.some((v) => String(v) === String(right));
      return String(left ?? "").includes(String(right ?? ""));
    case "not_contains":
      if (Array.isArray(left)) return !left.some((v) => String(v) === String(right));
      return !String(left ?? "").includes(String(right ?? ""));
    case "exists":
      return left !== undefined && left !== null;
    case "not_exists":
      return left === undefined || left === null;
    case "gt":
      return Number(left) > Number(right);
    case "lt":
      return Number(left) < Number(right);
    case "gte":
      return Number(left) >= Number(right);
    case "lte":
      return Number(left) <= Number(right);
  }
}

export function matchRule(rule: Rule, input: unknown): boolean {
  if (!rule.when || rule.when.length === 0) return true;
  return rule.when.every((c) => compare(c.op, getPath(input, c.path), c.value));
}

export function findMatchingRule(rules: Rule[], input: unknown): { rule: Rule; index: number } | null {
  for (let i = 0; i < rules.length; i++) {
    if (matchRule(rules[i], input)) return { rule: rules[i], index: i };
  }
  return null;
}
