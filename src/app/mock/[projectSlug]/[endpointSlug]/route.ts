import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { projects, endpoints, requestLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { findMatchingRule } from "@/lib/rules";
import { renderTemplate, type TemplateCtx } from "@/lib/template";
import { fieldsToZod } from "@/lib/validation";
import { sleep } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function handle(req: Request, ctx: { params: Promise<{ projectSlug: string; endpointSlug: string }> }) {
  const started = Date.now();
  const { projectSlug, endpointSlug } = await ctx.params;
  const url = new URL(req.url);

  const project = await db.query.projects.findFirst({ where: eq(projects.slug, projectSlug) });
  if (!project) return NextResponse.json({ error: "project not found" }, { status: 404 });

  const endpoint = await db.query.endpoints.findFirst({
    where: and(eq(endpoints.projectId, project.id), eq(endpoints.slug, endpointSlug)),
  });
  if (!endpoint) return NextResponse.json({ error: "endpoint not found" }, { status: 404 });

  // Collect headers & query (normalized lowercase headers)
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });

  // Parse body
  let body: unknown = null;
  const ct = headers["content-type"] ?? "";
  try {
    if (ct.includes("application/json")) {
      const text = await req.text();
      body = text ? JSON.parse(text) : null;
    } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const obj: Record<string, unknown> = {};
      form.forEach((v, k) => { obj[k] = typeof v === "string" ? v : "(file)"; });
      body = obj;
    } else {
      const text = await req.text();
      body = text || null;
    }
  } catch {
    body = null;
  }

  let responseStatus = endpoint.statusCode;
  let responseBody: unknown = null;
  let matchedRuleIndex: number | null = null;
  let error: string | null = null;
  let respHeaders: Record<string, string> = { ...(endpoint.responseHeaders ?? {}) };

  try {
    if (!endpoint.enabled) {
      responseStatus = 503;
      responseBody = { error: "endpoint disabled" };
    } else if (endpoint.method !== "ANY" && endpoint.method !== req.method) {
      responseStatus = 405;
      responseBody = { error: `method not allowed, expected ${endpoint.method}` };
      respHeaders["Allow"] = endpoint.method;
    } else if (endpoint.requireApiKey && !checkAuth(endpoint, headers)) {
      responseStatus = 401;
      responseBody = { error: "invalid api key" };
    } else if (endpoint.validateInput && endpoint.inputSchema?.fields?.length) {
      const parsed = fieldsToZod(endpoint.inputSchema.fields).safeParse(body ?? {});
      if (!parsed.success) {
        responseStatus = 400;
        responseBody = { error: "input validation failed", issues: parsed.error.issues };
      } else {
        ({ responseStatus, responseBody, matchedRuleIndex } = resolveResponse(endpoint, body, query, headers));
      }
    } else {
      ({ responseStatus, responseBody, matchedRuleIndex } = resolveResponse(endpoint, body, query, headers));
    }
  } catch (e: any) {
    error = e?.message ?? "render error";
    responseStatus = 500;
    responseBody = { error: "internal error", detail: error };
  }

  // Latency
  const delay = endpoint.delayMode === "range"
    ? randomInt(endpoint.delayMinMs, endpoint.delayMaxMs)
    : endpoint.delayMs;
  if (delay > 0) await sleep(delay);

  const latencyMs = Date.now() - started;

  // Log (don't fail the response if this fails)
  db.insert(requestLogs).values({
    endpointId: endpoint.id,
    method: req.method,
    path: url.pathname,
    query,
    headers,
    body: body as any,
    matchedRuleIndex,
    responseStatus,
    responseBody: responseBody as any,
    latencyMs,
    error,
  }).catch(() => {});

  return NextResponse.json(responseBody, { status: responseStatus, headers: respHeaders });
}

function checkAuth(endpoint: typeof endpoints.$inferSelect, headers: Record<string, string>): boolean {
  const name = (endpoint.authHeaderName || "x-api-key").toLowerCase();
  const provided = headers[name];
  if (!provided) return false;
  if (endpoint.authScheme === "bearer") {
    const m = provided.match(/^Bearer\s+(.+)$/i);
    if (!m) return false;
    return m[1] === endpoint.apiKey;
  }
  return provided === endpoint.apiKey;
}

function resolveResponse(
  endpoint: typeof endpoints.$inferSelect,
  body: unknown,
  query: Record<string, string>,
  headers: Record<string, string>,
) {
  const ctx: TemplateCtx = { input: body, query, headers };
  const match = findMatchingRule(endpoint.rules ?? [], body);
  if (match) {
    const rendered = renderTemplate(match.rule.thenBody, ctx);
    return {
      responseStatus: match.rule.thenStatus ?? endpoint.statusCode,
      responseBody: rendered,
      matchedRuleIndex: match.index,
    };
  }
  return {
    responseStatus: endpoint.statusCode,
    responseBody: renderTemplate(endpoint.outputTemplate, ctx),
    matchedRuleIndex: null as number | null,
  };
}

function randomInt(a: number, b: number) {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return Math.floor(lo + Math.random() * (hi - lo + 1));
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
