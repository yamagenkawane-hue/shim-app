import type { SessionUser } from "@/lib/auth/session";

export function canManageSettings(user: SessionUser | null) {
  return Boolean(user?.canManageSettings || user?.role === "admin");
}
