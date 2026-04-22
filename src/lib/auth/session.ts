import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type Session = { authed?: boolean; at?: number };

export function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  }
  return {
    password,
    cookieName: "faketools_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export async function getSession() {
  const store = await cookies();
  return getIronSession<Session>(store, sessionOptions());
}

export async function isAuthed() {
  const s = await getSession();
  return !!s.authed;
}
