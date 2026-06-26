import { NextResponse } from "next/server";
import { readSessionUser } from "@/lib/auth/session";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await readSessionUser();
  if (!user) return NextResponse.json({ error: "ログインしてください。" }, { status: 401 });

  const { id } = await context.params;
  const supabase = createSupabaseServiceClient();
  const { data: set, error: setError } = await supabase
    .from("measurement_sets")
    .select("id, customer_id, product_id, measured_at, current_shims, created_by, customers(name), products(name)")
    .eq("id", id)
    .single();

  if (setError) return NextResponse.json({ error: setError.message }, { status: 500 });
  if (user.role !== "admin" && set.created_by !== user.id) {
    return NextResponse.json({ error: "表示権限がありません。" }, { status: 403 });
  }

  const { data: rows, error: rowsError } = await supabase
    .from("measurement_rows")
    .select("row_type, row_index, peak_load_g, make_load_g, click_rate_percent, stroke_mm, rlf_g, note")
    .eq("measurement_set_id", id)
    .order("row_type", { ascending: true })
    .order("row_index", { ascending: true });

  if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 });

  return NextResponse.json({
    measurementSet: {
      id: set.id,
      customerName: extractName(set.customers),
      productName: extractName(set.products),
      measuredAt: set.measured_at,
      currentShimText: set.current_shims ?? {},
      rows: rows ?? [],
    },
  });
}

function extractName(value: unknown) {
  if (Array.isArray(value)) return String(value[0]?.name ?? "");
  if (value && typeof value === "object" && "name" in value) return String(value.name ?? "");
  return "";
}
