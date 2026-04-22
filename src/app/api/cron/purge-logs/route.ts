import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { requestLogs } from "@/lib/db/schema";
import { lt } from "drizzle-orm";

export async function GET(req: Request) {
  // Simple shared-secret guard so only Railway cron can call this.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("key");
    if (provided !== secret) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.delete(requestLogs).where(lt(requestLogs.createdAt, cutoff));
  return NextResponse.json({ ok: true, cutoff: cutoff.toISOString() });
}

export const POST = GET;
