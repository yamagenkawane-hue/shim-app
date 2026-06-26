import { NextResponse } from "next/server";
import { readSessionUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export async function GET() {
  const user = await readSessionUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "表示権限がありません。" }, { status: 403 });

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, login_id, display_name, role, can_manage_settings, line_user_id, is_active, created_at")
    .order("login_id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function POST(request: Request) {
  const user = await readSessionUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "更新権限がありません。" }, { status: 403 });

  const body = (await request.json()) as {
    id?: string;
    loginId?: string;
    password?: string;
    displayName?: string;
    role?: UserRole;
    canManageSettings?: boolean;
    lineUserId?: string;
    isActive?: boolean;
  };

  const loginId = body.loginId?.trim();
  const displayName = body.displayName?.trim();
  if (!loginId) return NextResponse.json({ error: "ログインIDを入力してください。" }, { status: 400 });
  if (!displayName) return NextResponse.json({ error: "表示名を入力してください。" }, { status: 400 });
  if (!body.id && !body.password) return NextResponse.json({ error: "新規ユーザーはパスワードを入力してください。" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const row: Record<string, unknown> = {
    login_id: loginId,
    display_name: displayName,
    role: body.role ?? "operator",
    can_manage_settings: Boolean(body.canManageSettings),
    line_user_id: body.lineUserId?.trim() || null,
    is_active: body.isActive ?? true,
    updated_at: new Date().toISOString(),
  };
  if (body.password) row.password_hash = await hashPassword(body.password);

  const query = body.id
    ? supabase.from("app_users").update(row).eq("id", body.id)
    : supabase.from("app_users").insert(row);

  const { data, error } = await query
    .select("id, login_id, display_name, role, can_manage_settings, line_user_id, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}
