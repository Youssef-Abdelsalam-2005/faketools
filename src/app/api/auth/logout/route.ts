import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { absoluteUrl } from "@/lib/abs-url";

export async function POST(req: Request) {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(absoluteUrl(req, "/login"), 303);
}
