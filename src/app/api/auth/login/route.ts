import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/projects") || "/projects";

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.redirect(new URL("/login?error=server", req.url), 303);
  }

  if (password !== expected) {
    return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(next)}`, req.url), 303);
  }

  const session = await getSession();
  session.authed = true;
  session.at = Date.now();
  await session.save();

  return NextResponse.redirect(new URL(next, req.url), 303);
}
