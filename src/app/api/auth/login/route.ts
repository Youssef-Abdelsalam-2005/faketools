import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { absoluteUrl } from "@/lib/abs-url";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/projects") || "/projects";

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.redirect(absoluteUrl(req, "/login?error=server"), 303);
  }

  if (password !== expected) {
    return NextResponse.redirect(absoluteUrl(req, `/login?error=1&next=${encodeURIComponent(next)}`), 303);
  }

  const session = await getSession();
  session.authed = true;
  session.at = Date.now();
  await session.save();

  return NextResponse.redirect(absoluteUrl(req, next), 303);
}
