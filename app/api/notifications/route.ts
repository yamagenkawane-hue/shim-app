import { NextResponse } from "next/server";
import { readSessionUser } from "@/lib/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const user = await readSessionUser();
  if (!user) return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });

  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "1";
  const page = Math.max(Number(url.searchParams.get("page") ?? "1"), 1);
  const pageSize = all ? 1000 : Math.min(Math.max(Number(url.searchParams.get("pageSize") ?? "5"), 1), 20);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createSupabaseServiceClient();
  const { data, error, count } = await supabase
    .from("notifications")
    .select("id, title, body, status, error_message, sent_at, created_at, payload", { count: "exact" })
    .eq("recipient_user_id", user.id)
    .order("created_at", { ascending: false })
    .range(all ? 0 : from, all ? 999 : to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data, page, pageSize, total: count ?? 0 });
}

export async function DELETE(request: Request) {
  const user = await readSessionUser();
  if (!user) return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "削除する履歴を指定してください。" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("recipient_user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
