import Link from "next/link";
import { db } from "@/lib/db/client";
import { requestLogs, endpoints, projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const rows = await db
    .select({
      id: requestLogs.id,
      method: requestLogs.method,
      status: requestLogs.responseStatus,
      latency: requestLogs.latencyMs,
      createdAt: requestLogs.createdAt,
      endpointName: endpoints.name,
      endpointSlug: endpoints.slug,
      projectSlug: projects.slug,
    })
    .from(requestLogs)
    .leftJoin(endpoints, eq(endpoints.id, requestLogs.endpointId))
    .leftJoin(projects, eq(projects.id, endpoints.projectId))
    .orderBy(desc(requestLogs.createdAt))
    .limit(200);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="meta mb-2">archive</div>
      <h1 className="serif text-[56px] leading-none tracking-tight">Logs</h1>
      <p className="mt-3 meta">retained for 24 hours · most recent 200 shown</p>

      <div className="mt-12 border-t border-[var(--border)]">
        {rows.length === 0 && (
          <div className="py-16 text-center text-[var(--muted-foreground)]">
            <div className="meta mb-3">empty</div>
            <div className="serif text-2xl">No requests logged yet.</div>
          </div>
        )}
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/projects/${r.projectSlug}/${r.endpointSlug}`}
            className="grid grid-cols-[80px_80px_1fr_120px_160px] items-center gap-4 border-b border-[var(--border)] px-1 py-3 transition-colors hover:bg-[var(--border)]/30"
          >
            <span className="mono text-[12px] font-semibold">{r.method}</span>
            <span className={`mono text-[12px] ${r.status >= 400 ? "text-[var(--destructive)]" : ""}`}>{r.status}</span>
            <div>
              <div className="text-sm">{r.endpointName}</div>
              <div className="meta">{r.projectSlug} / {r.endpointSlug}</div>
            </div>
            <span className="mono text-[12px]">{r.latency}ms</span>
            <span className="meta text-right">{new Date(r.createdAt).toLocaleString()}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
