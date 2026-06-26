import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { createSupabaseServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { loginId?: string; password?: string };
    const loginId = body.loginId?.trim();
    const password = body.password ?? "";
    if (!loginId || !password) {
      return NextResponse.json({ error: "ログインIDとパスワードを入力してください。" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      if (process.env.NODE_ENV !== "production" && loginId === "demo" && password === "demo1234") {
        await createSessionCookie({
          id: "demo-user",
          loginId: "demo",
          displayName: "仕様確認ユーザー",
          role: "admin",
          canManageSettings: true,
        });
        return NextResponse.json({ ok: true, demo: true });
      }
      return NextResponse.json(
        { error: "Supabase未設定です。仕様確認は demo / demo1234 でログインできます。" },
        { status: 503 },
      );
    }

    const supabase = createSupabaseServiceClient();
    const { data: user, error } = await supabase
      .from("app_users")
      .select("id, login_id, display_name, role, password_hash, is_active, can_manage_settings")
      .eq("login_id", loginId)
      .maybeSingle();

    if (error) throw error;
    if (!user || !user.is_active || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: "ログインIDまたはパスワードが違います。" }, { status: 401 });
    }

    await createSessionCookie({
      id: user.id,
      loginId: user.login_id,
      displayName: user.display_name,
      role: user.role as UserRole,
      canManageSettings: Boolean(user.can_manage_settings),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ログイン処理でエラーが発生しました。" }, { status: 500 });
  }
}
