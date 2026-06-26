import {
  measurementLabels,
  measurementUnits,
  punchLabels,
  type MeasurementKey,
  type MeasurementValues,
  type PredictionSuggestion,
  type PunchCharacteristic,
  type PunchType,
  type ShimCandidate,
  type TargetRange,
} from "@/lib/types";

const candidateDeltas = [-0.02, -0.01, -0.005, 0.005, 0.01, 0.02];
const allPunches: PunchType[] = ["form", "ring", "reverse_push", "flat_push"];
const allMeasurementKeys: MeasurementKey[] = ["peak_load_g", "make_load_g", "click_rate_percent", "stroke_mm", "rlf_g"];

const sensitivityWeight = {
  high: 2.1,
  medium: 1,
  low: 0.35,
};

type GenerateInput = {
  current: MeasurementValues;
  targets: TargetRange[];
  characteristics: PunchCharacteristic[];
  currentShimText?: Partial<Record<PunchType, string>>;
};

export function generateShimSuggestions(input: GenerateInput): PredictionSuggestion[] {
  const relevantTargets = input.targets.filter((target) => input.current[target.key] !== undefined);
  if (relevantTargets.length === 0) return [];

  const plans = buildCandidatePlans(input.characteristics, input.currentShimText ?? {});
  const suggestions = plans.map((plan) => {
    const predictedMeasurements = applyPlan(input.current, plan, input.characteristics);
    const score = scorePrediction(predictedMeasurements, relevantTargets);
    const warnings = buildWarnings(plan, input.characteristics);
    return { rank: 0, score, shimPlan: plan, predictedMeasurements, warnings };
  });

  return suggestions
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((suggestion, index) => ({ ...suggestion, rank: index + 1 }));
}

function buildCandidatePlans(characteristics: PunchCharacteristic[], currentShimText: Partial<Record<PunchType, string>>) {
  const plans: ShimCandidate[][] = [];
  const activePunches = allPunches.filter((punch) => characteristics.some((item) => item.punch === punch));

  for (const punchA of activePunches) {
    for (const deltaA of candidateDeltas) {
      plans.push([candidateFor(punchA, deltaA, currentShimText[punchA])]);
    }
  }

  for (let i = 0; i < activePunches.length; i++) {
    for (let j = i + 1; j < activePunches.length; j++) {
      for (const deltaA of candidateDeltas) {
        for (const deltaB of candidateDeltas) {
          plans.push([
            candidateFor(activePunches[i], deltaA, currentShimText[activePunches[i]]),
            candidateFor(activePunches[j], deltaB, currentShimText[activePunches[j]]),
          ]);
        }
      }
    }
  }

  return plans;
}

function candidateFor(punch: PunchType, deltaMm: number, beforeText?: string): ShimCandidate {
  const before = beforeText?.trim() || "現状";
  const sign = deltaMm > 0 ? "+" : "";
  return {
    punch,
    beforeText: before,
    afterText: `${before}${sign}${formatDelta(deltaMm)}`,
    deltaMm,
  };
}

function applyPlan(current: MeasurementValues, plan: ShimCandidate[], characteristics: PunchCharacteristic[]) {
  const predicted: MeasurementValues = { ...current };
  for (const change of plan) {
    for (const key of allMeasurementKeys) {
      const base = predicted[key];
      if (base === undefined) continue;
      const characteristic = characteristics.find((item) => item.punch === change.punch && item.key === key);
      if (!characteristic || characteristic.direction === "none") continue;
      if (Math.abs(change.deltaMm) < characteristic.minEffectiveDeltaMm) continue;
      const direction = characteristic.direction === "increase" ? 1 : -1;
      const sensitivity = sensitivityWeight[characteristic.sensitivity];
      const unitScale = key === "stroke_mm" ? 0.015 : key === "click_rate_percent" ? 8 : 12;
      predicted[key] = round(base + direction * change.deltaMm * sensitivity * unitScale * 100);
    }
  }
  return predicted;
}

function scorePrediction(predicted: MeasurementValues, targets: TargetRange[]) {
  let total = 0;
  for (const target of targets) {
    const value = predicted[target.key];
    if (value === undefined) continue;
    if (value >= target.minValue && value <= target.maxValue) continue;
    const center = (target.minValue + target.maxValue) / 2;
    const width = Math.max(target.maxValue - target.minValue, 1);
    total += Math.abs(value - center) / width;
  }
  return round(total);
}

function buildWarnings(plan: ShimCandidate[], characteristics: PunchCharacteristic[]) {
  const warnings: string[] = [];
  for (const change of plan) {
    const punchRules = characteristics.filter((item) => item.punch === change.punch);
    const max = Math.min(...punchRules.map((item) => item.maxRecommendedDeltaMm).filter(Number.isFinite));
    if (Number.isFinite(max) && Math.abs(change.deltaMm) > max) {
      warnings.push(`${punchLabels[change.punch]}の変更量が推奨上限を超えています。`);
    }
  }
  return warnings;
}

export function formatSuggestion(suggestion: PredictionSuggestion) {
  const shimText = suggestion.shimPlan
    .map((change) => `${punchLabels[change.punch]} ${change.beforeText}→${change.afterText}`)
    .join(" / ");
  const measurementText = allMeasurementKeys
    .filter((key) => suggestion.predictedMeasurements[key] !== undefined)
    .map((key) => `${measurementLabels[key]} ${suggestion.predictedMeasurements[key]}${measurementUnits[key]}`)
    .join("、");
  return `${shimText}: ${measurementText}`;
}

function formatDelta(delta: number) {
  return delta.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
