import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { projects, endpoints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NewEndpointDialog } from "./new-endpoint-dialog";
import { ProjectActions } from "./project-actions";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ projectSlug: string }> }) {
  const { projectSlug } = await params;
  const project = await db.query.projects.findFirst({ where: eq(projects.slug, projectSlug) });
  if (!project) notFound();

  const rows = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.projectId, project.id))
    .orderBy(desc(endpoints.createdAt));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="meta mb-2">
        <Link href="/projects" className="hover:underline">
          projects
        </Link>
        <span className="px-2">/</span>
        <span>{project.slug}</span>
      </div>
      <div className="flex items-end justify-between">
        <h1 className="serif text-[56px] leading-none tracking-tight">{project.name}</h1>
        <div className="flex items-center gap-2">
          <ProjectActions projectId={project.id} name={project.name} />
          <NewEndpointDialog projectSlug={project.slug} />
        </div>
      </div>

      <div className="mt-12 border-t border-[var(--border)]">
        {rows.length === 0 && (
          <div className="py-16 text-center text-[var(--muted-foreground)]">
            <div className="meta mb-3">empty</div>
            <div className="serif text-2xl">No endpoints in this project.</div>
          </div>
        )}
        {rows.map((e) => (
          <Link
            key={e.id}
            href={`/projects/${project.slug}/${e.slug}`}
            className="flex items-center justify-between border-b border-[var(--border)] px-1 py-5 transition-colors hover:bg-[var(--border)]/30"
          >
            <div className="flex items-center gap-4">
              <span className="mono w-16 text-xs font-semibold">{e.method}</span>
              <div>
                <div className="serif text-2xl">{e.name}</div>
                <div className="meta mt-0.5">/mock/{project.slug}/{e.slug}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="meta">{e.enabled ? "enabled" : "disabled"}</span>
              <span className="meta">
                {e.delayMode === "fixed" ? `${e.delayMs}ms` : `${e.delayMinMs}–${e.delayMaxMs}ms`}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
