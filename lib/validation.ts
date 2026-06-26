import type { MeasurementKey, MeasurementRowInput, MeasurementValues, ShimChange } from "@/lib/types";

const measurementKeys: MeasurementKey[] = ["peak_load_g", "make_load_g", "click_rate_percent", "stroke_mm", "rlf_g"];

export function parseNumber(value: FormDataEntryValue | null) {
  if (value === null || String(value).trim() === "") return null;
  const number = Number(String(value));
  return Number.isFinite(number) ? number : NaN;
}

export function validateMeasurementValues(values: MeasurementValues) {
  const errors: string[] = [];
  for (const key of measurementKeys) {
    const value = values[key];
    if (value === undefined) continue;
    if (!Number.isFinite(value)) errors.push(`${key} は数値で入力してください。`);
    if (key === "click_rate_percent" && value !== undefined && (value < 0 || value > 100)) {
      errors.push("クリック率は0〜100%で入力してください。");
    }
  }
  return errors;
}

export function validateMeasurementRows(rows: MeasurementRowInput[]) {
  const errors: string[] = [];
  if (rows.length !== 6) errors.push("測定データは6件入力してください。");
  for (const row of rows) {
    errors.push(...validateMeasurementValues(row.values).map((error) => `${row.rowType}-${row.rowIndex}: ${error}`));
  }
  return errors;
}

export function validateShimChanges(changes: ShimChange[]) {
  const errors: string[] = [];
  for (const change of changes) {
    if (!change.beforeText.trim()) errors.push(`${change.punch}: 変更前シムを入力してください。`);
    if (!change.afterText.trim()) errors.push(`${change.punch}: 変更後シムを入力してください。`);
  }
  return errors;
}
