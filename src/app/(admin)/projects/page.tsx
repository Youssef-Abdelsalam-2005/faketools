import Link from "next/link";
import { db } from "@/lib/db/client";
import { projects, endpoints } from "@/lib/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import { NewProjectDialog } from "./new-project-dialog";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      name: projects.name,
      createdAt: projects.createdAt,
      endpointCount: sql<number>`count(${endpoints.id})`.mapWith(Number),
    })
    .from(projects)
    .leftJoin(endpoints, eq(endpoints.projectId, projects.id))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-end justify-between">
        <div>
          <div className="meta mb-2">archive</div>
          <h1 className="serif text-[56px] leading-none tracking-tight">Projects</h1>
        </div>
        <NewProjectDialog />
      </div>

      <div className="mt-12 border-t border-[var(--border)]">
        {rows.length === 0 && (
          <div className="py-16 text-center text-[var(--muted-foreground)]">
            <div className="meta mb-3">empty</div>
            <div className="serif text-2xl">No projects yet.</div>
          </div>
        )}
        {rows.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.slug}`}
            className="group flex items-end justify-between border-b border-[var(--border)] px-1 py-5 transition-colors hover:bg-[var(--border)]/30"
          >
            <div>
              <div className="serif text-3xl">{p.name}</div>
              <div className="meta mt-1">/{p.slug}</div>
            </div>
            <div className="text-right">
              <div className="meta">endpoints</div>
              <div className="mono text-2xl">{String(p.endpointCount ?? 0).padStart(2, "0")}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
