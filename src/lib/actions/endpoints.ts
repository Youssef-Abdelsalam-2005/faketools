"use server";
import { db } from "@/lib/db/client";
import { endpoints, projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { slugify, generateApiKey } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth/session";
import type { InputSchema, Rule } from "@/lib/db/schema";

async function assertAuth() {
  if (!(await isAuthed())) throw new Error("unauthorized");
}

async function uniqueEndpointSlug(projectId: string, base: string): Promise<string> {
  const s = slugify(base) || "endpoint";
  let candidate = s;
  let n = 1;
  while (true) {
    const existing = await db.query.endpoints.findFirst({
      where: and(eq(endpoints.projectId, projectId), eq(endpoints.slug, candidate)),
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${s}-${n}`;
  }
}

export async function createEndpoint(projectSlug: string, formData: FormData) {
  await assertAuth();
  const project = await db.query.projects.findFirst({ where: eq(projects.slug, projectSlug) });
  if (!project) throw new Error("project not found");

  const name = String(formData.get("name") ?? "").trim();
  const method = String(formData.get("method") ?? "POST").toUpperCase();
  if (!name) return;
  const slug = await uniqueEndpointSlug(project.id, name);
  const [row] = await db
    .insert(endpoints)
    .values({
      projectId: project.id,
      slug,
      name,
      method,
      apiKey: generateApiKey(),
      outputTemplate: { ok: true },
    })
    .returning();
  revalidatePath(`/projects/${project.slug}`);
  redirect(`/projects/${project.slug}/${row.slug}`);
}

export type EndpointPatch = Partial<{
  name: string;
  method: string;
  enabled: boolean;
  requireApiKey: boolean;
  authHeaderName: string;
  authScheme: "raw" | "bearer";
  inputMode: "json" | "form";
  inputSchema: InputSchema;
  validateInput: boolean;
  outputTemplate: unknown;
  statusCode: number;
  responseHeaders: Record<string, string>;
  rules: Rule[];
  delayMode: "fixed" | "range";
  delayMs: number;
  delayMinMs: number;
  delayMaxMs: number;
}>;

export async function updateEndpoint(endpointId: string, patch: EndpointPatch) {
  await assertAuth();
  await db.update(endpoints).set({ ...patch, updatedAt: new Date() }).where(eq(endpoints.id, endpointId));
  revalidatePath("/projects", "layout");
}

export async function rotateApiKey(endpointId: string) {
  await assertAuth();
  const key = generateApiKey();
  await db.update(endpoints).set({ apiKey: key, updatedAt: new Date() }).where(eq(endpoints.id, endpointId));
  revalidatePath("/projects", "layout");
  return key;
}

export async function deleteEndpoint(endpointId: string, projectSlug: string) {
  await assertAuth();
  await db.delete(endpoints).where(eq(endpoints.id, endpointId));
  revalidatePath(`/projects/${projectSlug}`);
  redirect(`/projects/${projectSlug}`);
}

export async function duplicateEndpoint(endpointId: string, toProjectId: string, newName: string) {
  await assertAuth();
  const src = await db.query.endpoints.findFirst({ where: eq(endpoints.id, endpointId) });
  if (!src) throw new Error("source not found");
  const project = await db.query.projects.findFirst({ where: eq(projects.id, toProjectId) });
  if (!project) throw new Error("target project not found");
  const slug = await uniqueEndpointSlug(toProjectId, newName || `${src.name} copy`);
  const [row] = await db
    .insert(endpoints)
    .values({
      projectId: toProjectId,
      slug,
      name: newName || `${src.name} copy`,
      method: src.method,
      enabled: src.enabled,
      requireApiKey: src.requireApiKey,
      apiKey: generateApiKey(),
      authHeaderName: src.authHeaderName,
      authScheme: src.authScheme,
      inputMode: src.inputMode,
      inputSchema: src.inputSchema,
      validateInput: src.validateInput,
      outputTemplate: src.outputTemplate,
      statusCode: src.statusCode,
      responseHeaders: src.responseHeaders,
      rules: src.rules,
      delayMode: src.delayMode,
      delayMs: src.delayMs,
      delayMinMs: src.delayMinMs,
      delayMaxMs: src.delayMaxMs,
    })
    .returning();
  revalidatePath(`/projects/${project.slug}`);
  redirect(`/projects/${project.slug}/${row.slug}`);
}
