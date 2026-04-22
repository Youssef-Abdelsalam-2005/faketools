import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { projects, endpoints, requestLogs } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { EndpointEditor } from "./endpoint-editor";

export const dynamic = "force-dynamic";

export default async function EndpointPage({
  params,
}: {
  params: Promise<{ projectSlug: string; endpointSlug: string }>;
}) {
  const { projectSlug, endpointSlug } = await params;
  const project = await db.query.projects.findFirst({ where: eq(projects.slug, projectSlug) });
  if (!project) notFound();
  const endpoint = await db.query.endpoints.findFirst({
    where: and(eq(endpoints.projectId, project.id), eq(endpoints.slug, endpointSlug)),
  });
  if (!endpoint) notFound();

  const logs = await db
    .select()
    .from(requestLogs)
    .where(eq(requestLogs.endpointId, endpoint.id))
    .orderBy(desc(requestLogs.createdAt))
    .limit(50);

  const allProjects = await db.select({ id: projects.id, name: projects.name, slug: projects.slug }).from(projects);

  const appUrl = process.env.APP_URL ?? "";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="meta mb-2">
        <Link href="/projects" className="hover:underline">projects</Link>
        <span className="px-2">/</span>
        <Link href={`/projects/${project.slug}`} className="hover:underline">{project.slug}</Link>
        <span className="px-2">/</span>
        <span>{endpoint.slug}</span>
      </div>
      <EndpointEditor
        appUrl={appUrl}
        projectSlug={project.slug}
        endpoint={{
          ...endpoint,
          createdAt: endpoint.createdAt.toISOString(),
          updatedAt: endpoint.updatedAt.toISOString(),
        }}
        logs={logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))}
        projects={allProjects}
      />
    </div>
  );
}
