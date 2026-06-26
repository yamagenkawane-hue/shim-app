import { NextResponse } from "next/server";
import { readSessionUser } from "@/lib/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { validateMeasurementRows } from "@/lib/validation";
import type { MeasurementRowInput, PunchType } from "@/lib/types";
import { createMeasurementSavedNotifications } from "@/lib/notifications/measurement";

export async function POST(request: Request) {
  const user = await readSessionUser();
  if (!user || user.role === "viewer") {
    return NextResponse.json({ error: "登録権限がありません。" }, { status: 403 });
  }

  const body = (await request.json()) as {
    customerId: string;
    productId: string;
    rows: MeasurementRowInput[];
    currentShimText?: Partial<Record<PunchType, string>>;
    note?: string;
  };

  const errors = validateMeasurementRows(body.rows);
  if (!body.customerId) errors.push("得意先を選択してください。");
  if (!body.productId) errors.push("製品を選択してください。");
  if (errors.length > 0) return NextResponse.json({ error: errors.join("\n") }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { data: set, error: setError } = await supabase
    .from("measurement_sets")
    .insert({
      customer_id: body.customerId,
      product_id: body.productId,
      current_shims: cleanShimText(body.currentShimText),
      note: body.note ?? "",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (setError) return NextResponse.json({ error: setError.message }, { status: 500 });

  const rows = body.rows.map((row) => ({
    measurement_set_id: set.id,
    row_type: row.rowType,
    row_index: row.rowIndex,
    peak_load_g: row.values.peak_load_g ?? null,
    make_load_g: row.values.make_load_g ?? null,
    click_rate_percent: row.values.click_rate_percent ?? null,
    stroke_mm: row.values.stroke_mm ?? null,
    rlf_g: row.values.rlf_g ?? null,
    note: row.note ?? "",
  }));

  const { error: rowsError } = await supabase.from("measurement_rows").insert(rows);
  if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 });

  const { data: names } = await supabase
    .from("products")
    .select("name, customers(name)")
    .eq("id", body.productId)
    .single();

  await createMeasurementSavedNotifications({
    measurementSetId: set.id,
    customerId: body.customerId,
    productId: body.productId,
    customerName: extractCustomerName(names?.customers) || "未設定",
    productName: names?.name || "未設定",
    rows: body.rows,
    createdByUserId: user.id,
  });

  return NextResponse.json({ id: set.id });
}

function extractCustomerName(value: unknown) {
  if (Array.isArray(value)) return value[0]?.name as string | undefined;
  if (value && typeof value === "object" && "name" in value) return String(value.name);
  return "";
}

function cleanShimText(value?: Partial<Record<PunchType, string>>) {
  const result: Partial<Record<PunchType, string>> = {};
  if (!value) return result;
  for (const [key, text] of Object.entries(value) as Array<[PunchType, string | undefined]>) {
    const trimmed = text?.trim();
    if (trimmed) result[key] = trimmed;
  }
  return result;
}
