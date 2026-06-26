import { NextResponse } from "next/server";
import { readSessionUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await readSessionUser();
  if (!user)
    return NextResponse.json(
      { error: "ログインしてください。" },
      { status: 401 },
    );

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .order("name");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customers: data });
}

export async function POST(request: Request) {
  const user = await readSessionUser();
  if (!canManageSettings(user))
    return NextResponse.json(
      { error: "登録権限がありません。" },
      { status: 403 },
    );

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name)
    return NextResponse.json(
      { error: "得意先名を入力してください。" },
      { status: 400 },
    );

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .upsert({ name }, { onConflict: "name" })
    .select("id, name")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data });
}

export async function PUT(request: Request) {
  const user = await readSessionUser();
  if (!canManageSettings(user))
    return NextResponse.json(
      { error: "更新権限がありません。" },
      { status: 403 },
    );

  const body = (await request.json()) as { id?: string; name?: string };
  const id = body.id?.trim();
  const name = body.name?.trim();
  if (!id) return NextResponse.json({ error: "得意先IDがありません。" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "得意先名を入力してください。" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ name })
    .eq("id", id)
    .select("id, name")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data });
}

export async function DELETE(request: Request) {
  const user = await readSessionUser();
  if (!canManageSettings(user))
    return NextResponse.json(
      { error: "削除権限がありません。" },
      { status: 403 },
    );

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "削除する得意先IDがありません。" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
