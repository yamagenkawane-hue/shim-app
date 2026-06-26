import { NextResponse } from "next/server";
import { readSessionUser } from "@/lib/auth/session";
import { generateShimSuggestions } from "@/lib/prediction";
import { mapCharacteristic, mapTarget } from "@/lib/db/mappers";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { MeasurementKey, MeasurementValues, PunchCharacteristic, PunchType, TargetRange } from "@/lib/types";

const measurementKeys: MeasurementKey[] = ["peak_load_g", "make_load_g", "click_rate_percent", "stroke_mm", "rlf_g"];

type MeasurementRowRecord = Record<MeasurementKey, number | string | null>;

export async function POST(request: Request) {
  const user = await readSessionUser();
  if (!user) return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });

  const body = (await request.json()) as {
    customerId?: string;
    productId?: string;
    measurementSetId?: string | null;
    current?: MeasurementValues;
    targets?: TargetRange[];
    characteristics?: PunchCharacteristic[];
    currentShimText?: Partial<Record<PunchType, string>>;
  };

  const supabase = createSupabaseServiceClient();
  const source = await resolvePredictionSource(supabase, {
    measurementSetId: body.measurementSetId ?? undefined,
    customerId: body.customerId,
    productId: body.productId,
    fallbackCurrent: body.current ?? {},
  });

  if ("error" in source) return NextResponse.json({ error: source.error }, { status: source.status });

  const [{ count }, targetResult, characteristicResult] = await Promise.all([
    supabase
      .from("measurement_sets")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", source.customerId)
      .eq("product_id", source.productId),
    supabase.from("product_targets").select("key, min_value, max_value").eq("product_id", source.productId),
    supabase
      .from("punch_characteristics")
      .select("id, punch, key, direction, sensitivity, min_effective_delta_mm, max_recommended_delta_mm, note")
      .eq("product_id", source.productId),
  ]);

  if (targetResult.error) return NextResponse.json({ error: targetResult.error.message }, { status: 500 });
  if (characteristicResult.error) return NextResponse.json({ error: characteristicResult.error.message }, { status: 500 });

  const savedTargets = targetResult.data.map(mapTarget);
  const savedCharacteristics = characteristicResult.data.map(mapCharacteristic);
  const targets = savedTargets.length ? savedTargets : body.targets ?? [];
  const characteristics = savedCharacteristics.length ? savedCharacteristics : body.characteristics ?? [];
  const currentShimText = hasAnyShim(body.currentShimText) ? body.currentShimText : source.currentShimText;
  const suggestions = generateShimSuggestions({ current: source.current, targets, characteristics, currentShimText });

  const warnings = [
    ...(count && count > 0 ? [] : ["同じ得意先+製品の過去測定データがまだありません。パンチ特性のみで提案しています。"]),
    ...(source.sourceSetId ? ["最新保存測定データを基準にしています。"] : ["画面入力値を基準にしています。"]),
  ];

  return NextResponse.json({
    suggestions: suggestions.map((suggestion) => ({ ...suggestion, warnings: [...warnings, ...suggestion.warnings] })),
    historyCount: count ?? 0,
    sourceMeasurementSetId: source.sourceSetId,
  });
}

async function resolvePredictionSource(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  input: {
    measurementSetId?: string;
    customerId?: string;
    productId?: string;
    fallbackCurrent: MeasurementValues;
  },
) {
  let setId = input.measurementSetId;
  let customerId = input.customerId;
  let productId = input.productId;
  let currentShimText: Partial<Record<PunchType, string>> = {};

  if (setId) {
    const { data, error } = await supabase
      .from("measurement_sets")
      .select("id, customer_id, product_id, current_shims")
      .eq("id", setId)
      .single();
    if (error) return { error: error.message, status: 500 as const };
    customerId = data.customer_id;
    productId = data.product_id;
    currentShimText = normalizeShimText(data.current_shims);
  } else if (customerId && productId) {
    const { data, error } = await supabase
      .from("measurement_sets")
      .select("id, current_shims")
      .eq("customer_id", customerId)
      .eq("product_id", productId)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { error: error.message, status: 500 as const };
    setId = data?.id;
    currentShimText = normalizeShimText(data?.current_shims);
  }

  if (!customerId || !productId) {
    return { error: "通知履歴、または得意先と製品を選択してください。", status: 400 as const };
  }

  if (!setId) {
    return { customerId, productId, current: input.fallbackCurrent, currentShimText, sourceSetId: null };
  }

  const { data: rows, error: rowsError } = await supabase
    .from("measurement_rows")
    .select("peak_load_g, make_load_g, click_rate_percent, stroke_mm, rlf_g")
    .eq("measurement_set_id", setId);
  if (rowsError) return { error: rowsError.message, status: 500 as const };

  const current = averageSavedRows((rows ?? []) as MeasurementRowRecord[]);
  return { customerId, productId, current, currentShimText, sourceSetId: setId };
}

function averageSavedRows(rows: MeasurementRowRecord[]) {
  const result: MeasurementValues = {};
  for (const key of measurementKeys) {
    const values = rows
      .map((row) => Number(row[key]))
      .filter((value) => Number.isFinite(value));
    if (values.length > 0) result[key] = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1000) / 1000;
  }
  return result;
}

function hasAnyShim(value?: Partial<Record<PunchType, string>>) {
  return Object.values(value ?? {}).some((text) => typeof text === "string" && text.trim() !== "");
}

function normalizeShimText(value: unknown): Partial<Record<PunchType, string>> {
  if (!value || typeof value !== "object") return {};
  const result: Partial<Record<PunchType, string>> = {};
  for (const key of ["form", "ring", "reverse_push", "flat_push"] as PunchType[]) {
    const text = (value as Record<string, unknown>)[key];
    if (typeof text === "string" && text.trim()) result[key] = text.trim();
  }
  return result;
}
