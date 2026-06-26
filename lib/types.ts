export type UserRole = "admin" | "operator" | "viewer";
export type MeasurementRowType = "flat_before" | "reverse_only" | "reverse_flat" | "washer";
export type PunchType = "form" | "ring" | "reverse_push" | "flat_push";
export type MeasurementKey = "peak_load_g" | "make_load_g" | "click_rate_percent" | "stroke_mm" | "rlf_g";
export type EffectDirection = "increase" | "decrease" | "none";
export type SensitivityLevel = "high" | "medium" | "low";

export const measurementLabels: Record<MeasurementKey, string> = {
  peak_load_g: "ピーク荷重",
  make_load_g: "メイク荷重",
  click_rate_percent: "クリック率",
  stroke_mm: "ストローク",
  rlf_g: "RLF",
};

export const measurementUnits: Record<MeasurementKey, string> = {
  peak_load_g: "g",
  make_load_g: "g",
  click_rate_percent: "%",
  stroke_mm: "mm",
  rlf_g: "g",
};

export const rowTypeLabels: Record<MeasurementRowType, string> = {
  flat_before: "平前",
  reverse_only: "逆のみ",
  reverse_flat: "逆平",
  washer: "ワッシャ",
};

export const punchLabels: Record<PunchType, string> = {
  form: "フォーム",
  ring: "リング",
  reverse_push: "逆押",
  flat_push: "平押",
};

export type MeasurementValues = Partial<Record<MeasurementKey, number>>;

export type TargetRange = {
  key: MeasurementKey;
  minValue: number;
  maxValue: number;
};

export type MeasurementRowInput = {
  rowType: MeasurementRowType;
  rowIndex: number;
  values: MeasurementValues;
  note?: string;
};

export type PunchCharacteristic = {
  id?: string;
  punch: PunchType;
  key: MeasurementKey;
  direction: EffectDirection;
  sensitivity: SensitivityLevel;
  minEffectiveDeltaMm: number;
  maxRecommendedDeltaMm: number;
  note?: string;
};

export type ShimChange = {
  punch: PunchType;
  beforeText: string;
  afterText: string;
};

export type ShimCandidate = {
  punch: PunchType;
  beforeText: string;
  afterText: string;
  deltaMm: number;
};

export type PredictionSuggestion = {
  rank: number;
  score: number;
  shimPlan: ShimCandidate[];
  predictedMeasurements: MeasurementValues;
  warnings: string[];
};
