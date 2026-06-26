import crypto from "crypto";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/types";

const cookieName = "shim_session";

export type SessionUser = {
  id: string;
  loginId: string;
  displayName: string;
  role: UserRole;
  canManageSettings?: boolean;
};

export async function createSessionCookie(user: SessionUser) {
  const secret = getSecret();
  const payload = Buffer.from(JSON.stringify({ user, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString("base64url");
  const signature = sign(payload, secret);
  const cookieStore = await cookies();
  cookieStore.set(cookieName, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function readSessionUser() {
  const cookieStore = await cookies();
  const value = cookieStore.get(cookieName)?.value;
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || sign(payload, getSecret()) !== signature) return null;
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { user: SessionUser; exp: number };
  if (decoded.exp < Date.now()) return null;
  return decoded.user;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.includes("replace-with")) {
    if (process.env.NODE_ENV !== "production") return "development-demo-session-secret";
    throw new Error("SESSION_SECRETが設定されていません。");
  }
  return secret;
}
