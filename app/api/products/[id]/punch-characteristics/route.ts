import { NextResponse } from "next/server";
import { readSessionUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { mapCharacteristic } from "@/lib/db/mappers";
import type { PunchCharacteristic } from "@/lib/types";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await readSessionUser();
  if (!user) return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });

  const { id } = await context.params;
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("punch_characteristics")
    .select("id, punch, key, direction, sensitivity, min_effective_delta_mm, max_recommended_delta_mm, note")
    .eq("product_id", id)
    .order("punch", { ascending: true })
    .order("key", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ characteristics: data.map(mapCharacteristic) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await readSessionUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "更新権限がありません。" }, { status: 403 });

  const { id } = await context.params;
  const body = (await request.json()) as { characteristic: PunchCharacteristic };
  const characteristic = body.characteristic;
  if (!characteristic?.punch || !characteristic.key || !characteristic.direction || !characteristic.sensitivity) {
    return NextResponse.json({ error: "パンチ特性を入力してください。" }, { status: 400 });
  }

  const row = {
    product_id: id,
    punch: characteristic.punch,
    key: characteristic.key,
    direction: characteristic.direction,
    sensitivity: characteristic.sensitivity,
    min_effective_delta_mm: characteristic.minEffectiveDeltaMm,
    max_recommended_delta_mm: characteristic.maxRecommendedDeltaMm,
    note: characteristic.note ?? null,
  };

  const supabase = createSupabaseServiceClient();
  if (characteristic.id) {
    const { data, error } = await supabase
      .from("punch_characteristics")
      .update(row)
      .eq("product_id", id)
      .eq("id", characteristic.id)
      .select("id, punch, key, direction, sensitivity, min_effective_delta_mm, max_recommended_delta_mm, note")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ characteristic: mapCharacteristic(data) });
  }

  const { data, error } = await supabase
    .from("punch_characteristics")
    .upsert(row, { onConflict: "product_id,punch,key" })
    .select("id, punch, key, direction, sensitivity, min_effective_delta_mm, max_recommended_delta_mm, note")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ characteristic: mapCharacteristic(data) });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await readSessionUser();
  if (!canManageSettings(user)) return NextResponse.json({ error: "削除権限がありません。" }, { status: 403 });

  const { id: productId } = await context.params;
  const url = new URL(request.url);
  const characteristicId = url.searchParams.get("id");
  if (!characteristicId) return NextResponse.json({ error: "削除する特性IDがありません。" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("punch_characteristics")
    .delete()
    .eq("product_id", productId)
    .eq("id", characteristicId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
