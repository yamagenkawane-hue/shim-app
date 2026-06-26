import type {
  EffectDirection,
  MeasurementKey,
  MeasurementRowType,
  PunchCharacteristic,
  PunchType,
  SensitivityLevel,
  TargetRange,
} from "@/lib/types";

export type Customer = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  customerId: string;
  name: string;
  drawingNo?: string | null;
  note?: string | null;
};

export function mapTarget(row: {
  key: MeasurementKey;
  min_value: number | string;
  max_value: number | string;
}): TargetRange {
  return {
    key: row.key,
    minValue: Number(row.min_value),
    maxValue: Number(row.max_value),
  };
}

export function mapCharacteristic(row: {
  id?: string;
  punch: PunchType;
  key: MeasurementKey;
  direction: EffectDirection;
  sensitivity: SensitivityLevel;
  min_effective_delta_mm: number | string;
  max_recommended_delta_mm: number | string;
  note?: string | null;
}): PunchCharacteristic {
  return {
    id: row.id,
    punch: row.punch,
    key: row.key,
    direction: row.direction,
    sensitivity: row.sensitivity,
    minEffectiveDeltaMm: Number(row.min_effective_delta_mm),
    maxRecommendedDeltaMm: Number(row.max_recommended_delta_mm),
    note: row.note ?? undefined,
  };
}

export function toDbRowType(rowType: MeasurementRowType) {
  return rowType;
}
