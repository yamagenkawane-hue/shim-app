import { NextResponse } from "next/server";
import { readSessionUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { mapTarget } from "@/lib/db/mappers";
import type { MeasurementKey, TargetRange } from "@/lib/types";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await readSessionUser();
  if (!user) return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });
  const { id } = await context.params;
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("product_targets").select("key, min_value, max_value").eq("product_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ targets: data.map(mapTarget) });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await readSessionUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "更新権限がありません。" }, { status: 403 });
  const { id } = await context.params;
  const body = (await request.json()) as { targets: TargetRange[] };
  const targets = body.targets.filter((target) => Number.isFinite(target.minValue) && Number.isFinite(target.maxValue));
  const invalid = targets.find((target) => target.minValue > target.maxValue);
  if (invalid) return NextResponse.json({ error: "狙い値範囲の下限は上限以下にしてください。" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { error: deleteError } = await supabase.from("product_targets").delete().eq("product_id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  if (targets.length === 0) return NextResponse.json({ targets: [] });

  const { data, error } = await supabase
    .from("product_targets")
    .insert(targets.map((target) => ({ product_id: id, key: target.key as MeasurementKey, min_value: target.minValue, max_value: target.maxValue })))
    .select("key, min_value, max_value");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ targets: data.map(mapTarget) });
}
