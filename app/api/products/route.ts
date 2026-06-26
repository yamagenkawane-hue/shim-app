import { NextResponse } from "next/server";
import { readSessionUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const user = await readSessionUser();
  if (!user) return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });

  const customerId = new URL(request.url).searchParams.get("customerId");
  if (!customerId) return NextResponse.json({ products: [] });

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, customer_id, name, drawing_no, note")
    .eq("customer_id", customerId)
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}

export async function POST(request: Request) {
  const user = await readSessionUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "登録権限がありません。" }, { status: 403 });

  const body = (await request.json()) as { customerId?: string; name?: string; drawingNo?: string; note?: string };
  if (!body.customerId) return NextResponse.json({ error: "得意先を選択してください。" }, { status: 400 });
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "製品名を入力してください。" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("products")
    .upsert(
      { customer_id: body.customerId, name, drawing_no: body.drawingNo ?? null, note: body.note ?? null },
      { onConflict: "customer_id,name" },
    )
    .select("id, customer_id, name, drawing_no, note")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function PUT(request: Request) {
  const user = await readSessionUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "更新権限がありません。" }, { status: 403 });

  const body = (await request.json()) as { id?: string; customerId?: string; name?: string; drawingNo?: string; note?: string };
  const id = body.id?.trim();
  const name = body.name?.trim();
  if (!id) return NextResponse.json({ error: "製品IDがありません。" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "製品名を入力してください。" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("products")
    .update({ name, drawing_no: body.drawingNo ?? null, note: body.note ?? null })
    .eq("id", id)
    .select("id, customer_id, name, drawing_no, note")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function DELETE(request: Request) {
  const user = await readSessionUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "削除権限がありません。" }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "削除する製品IDがありません。" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
