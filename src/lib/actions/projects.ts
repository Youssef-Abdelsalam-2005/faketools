"use server";
import { db } from "@/lib/db/client";
import { projects, endpoints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { slugify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth/session";

async function assertAuth() {
  if (!(await isAuthed())) throw new Error("unauthorized");
}

async function uniqueProjectSlug(base: string): Promise<string> {
  const s = slugify(base) || "project";
  let candidate = s;
  let n = 1;
  while (true) {
    const existing = await db.query.projects.findFirst({ where: eq(projects.slug, candidate) });
    if (!existing) return candidate;
    n += 1;
    candidate = `${s}-${n}`;
  }
}

export async function createProject(formData: FormData) {
  await assertAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const slug = await uniqueProjectSlug(name);
  const [row] = await db.insert(projects).values({ name, slug }).returning();
  revalidatePath("/projects");
  redirect(`/projects/${row.slug}`);
}

export async function renameProject(id: string, name: string) {
  await assertAuth();
  await db.update(projects).set({ name }).where(eq(projects.id, id));
  revalidatePath("/projects");
}

export async function deleteProject(id: string) {
  await assertAuth();
  await db.delete(projects).where(eq(projects.id, id));
  revalidatePath("/projects");
  redirect("/projects");
}
