"use client";

import { useEffect, useMemo, useState } from "react";
import {
  measurementLabels,
  measurementUnits,
  punchLabels,
  rowTypeLabels,
  type MeasurementKey,
  type MeasurementRowInput,
  type MeasurementRowType,
  type MeasurementValues,
  type PredictionSuggestion,
  type PunchCharacteristic,
  type PunchType,
  type TargetRange,
  type UserRole,
} from "@/lib/types";
import { formatSuggestion } from "@/lib/prediction";

type Customer = { id: string; name: string };
type Product = { id: string; customer_id: string; name: string; drawing_no?: string | null; note?: string | null };
type Toast = { message: string; tone: "success" | "error" | "info" };
type NotificationPayload = { measurementSetId?: string; customerName?: string; productName?: string };
type NotificationItem = {
  payload?: NotificationPayload | null;
};

const rowBlueprint: Array<{ rowType: MeasurementRowType; rowIndex: number }> = [
  { rowType: "flat_before", rowIndex: 1 },
  { rowType: "reverse_only", rowIndex: 1 },
  { rowType: "reverse_flat", rowIndex: 1 },
  { rowType: "reverse_flat", rowIndex: 2 },
  { rowType: "reverse_flat", rowIndex: 3 },
  { rowType: "washer", rowIndex: 1 },
];

const measurementKeys: MeasurementKey[] = ["peak_load_g", "make_load_g", "click_rate_percent", "stroke_mm", "rlf_g"];
const punchTypes: PunchType[] = ["form", "ring", "reverse_push", "flat_push"];

export default function MeasurementWorkspace({ userRole }: { userRole: UserRole }) {
  const canEdit = userRole !== "viewer";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [rows, setRows] = useState<MeasurementRowInput[]>(createEmptyRows);
  const [targets, setTargets] = useState<TargetRange[]>([]);
  const [characteristics, setCharacteristics] = useState<PunchCharacteristic[]>([]);
  const [currentShimText, setCurrentShimText] = useState<Partial<Record<PunchType, string>>>({});
  const [suggestions, setSuggestions] = useState<PredictionSuggestion[]>([]);

  const currentValues = useMemo(() => averageRows(rows), [rows]);

  useEffect(() => {
    void loadCustomers();
  }, []);

  useEffect(() => {
    setProductId("");
    setProducts([]);
    if (customerId) void loadProducts(customerId);
  }, [customerId]);

  useEffect(() => {
    if (productId) void loadProductSettings(productId);
  }, [productId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadCustomers() {
    const body = await api<{ customers: Customer[] }>("/api/customers");
    setCustomers(body.customers);
  }

  async function loadProducts(selectedCustomerId: string) {
    const body = await api<{ products: Product[] }>(`/api/products?customerId=${encodeURIComponent(selectedCustomerId)}`);
    setProducts(body.products);
  }

  async function loadProductSettings(selectedProductId: string) {
    const [targetBody, characteristicBody] = await Promise.all([
      api<{ targets: TargetRange[] }>(`/api/products/${selectedProductId}/targets`),
      api<{ characteristics: PunchCharacteristic[] }>(`/api/products/${selectedProductId}/punch-characteristics`),
    ]);
    setTargets(targetBody.targets);
    setCharacteristics(characteristicBody.characteristics);
  }

  async function saveMeasurementSet() {
    if (!customerId || !productId) {
      showToast("得意先と製品を選択してください。", "error");
      return;
    }
    try {
      await api("/api/measurement-sets", { method: "POST", body: { customerId, productId, rows, currentShimText } });
      setRows(createEmptyRows());
      showToast("測定6件を保存しました。", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    }
  }

  async function runPrediction() {
    try {
      const measurementSetId = await loadLatestNotificationMeasurementSetId();
      if (!measurementSetId && (!customerId || !productId)) {
        showToast("通知履歴、または得意先と製品を選択してください。", "error");
        return;
      }
      const body = await api<{ suggestions: PredictionSuggestion[] }>("/api/predict", {
        method: "POST",
        body: { customerId, productId, measurementSetId, current: currentValues, targets, characteristics, currentShimText },
      });
      setSuggestions(body.suggestions);
      showToast(measurementSetId ? "通知履歴の最新データからシム提案を計算しました。" : "最新保存データからシム提案を計算しました。", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    }
  }

  async function loadLatestNotificationMeasurementSetId() {
    const body = await api<{ notifications: NotificationItem[] }>("/api/notifications?page=1&pageSize=1");
    return body.notifications[0]?.payload?.measurementSetId ?? null;
  }

  function updateRow(index: number, key: MeasurementKey, value: string) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, values: { ...row.values, [key]: value === "" ? undefined : Number(value) } } : row,
      ),
    );
  }

  function showToast(message: string, tone: Toast["tone"]) {
    setToast({ message, tone });
  }

  return (
    <div className="workspaceShell">
      {toast ? <div className={`toast ${toast.tone}`}>{toast.message}</div> : null}
      <div className="grid dashboardGrid">
        <div className="grid dashboardSide">
          <section className="panel grid">
            <div className="sectionTitle">
              <h2>得意先・製品</h2>
            </div>
            <label>
              得意先
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                <option value="">選択してください</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </label>
            <label>
              製品
              <select value={productId} onChange={(event) => setProductId(event.target.value)} disabled={!customerId}>
                <option value="">選択してください</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
          </section>

          <section className="panel grid">
            <h2>シム提案</h2>
            <div className="actions">
              <button className="blue" type="button" onClick={runPrediction}>提案を計算</button>
              <button className="secondary" type="button" onClick={() => setSuggestions([])}>クリア</button>
            </div>
            <div className="suggestionList">
              {suggestions.length === 0 ? <p className="muted">提案結果はまだありません。</p> : null}
              {suggestions.map((suggestion) => (
                <div className="suggestion" key={suggestion.rank}>
                  <strong>候補 {suggestion.rank} / score {suggestion.score}</strong>
                  <p>{formatSuggestion(suggestion)}</p>
                  {suggestion.warnings.map((warning) => <p className="warningText" key={warning}>{warning}</p>)}
                </div>
              ))}
            </div>
          </section>

        </div>

        <section className="panel grid measurementPanel">
          <h2>測定データ 6件セット</h2>
          <div className="sixRows">
            {rows.map((row, index) => (
              <div className="measurementCard" key={`${row.rowType}-${row.rowIndex}`}>
                <h3>{rowTypeLabels[row.rowType]}{row.rowType === "reverse_flat" ? ` ${row.rowIndex}` : ""}</h3>
                <div className="fields mobileMeasurementFields">
                  {measurementKeys.map((key) => (
                    <label key={key}>
                      {measurementLabels[key]} ({measurementUnits[key]})
                      <input className="numberInput" inputMode="decimal" type="number" step="any" value={row.values[key] ?? ""} onChange={(event) => updateRow(index, key, event.target.value)} disabled={!canEdit} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="sectionTitle">
            <h2>現在シム</h2>
          </div>
          <div className="row">
            {punchTypes.map((punch) => (
              <label key={punch}>
                {punchLabels[punch]}
                <input value={currentShimText[punch] ?? ""} onChange={(event) => setCurrentShimText((current) => ({ ...current, [punch]: event.target.value }))} placeholder="0.1+0.03" disabled={!canEdit} />
              </label>
            ))}
          </div>
          {canEdit ? <button type="button" onClick={saveMeasurementSet}>測定6件セットを保存</button> : null}
        </section>
      </div>
    </div>
  );
}

async function api<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(path, {
    method: options?.method ?? "GET",
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "APIエラーが発生しました。");
  return body as T;
}

function createEmptyRows() {
  return rowBlueprint.map((row) => ({ ...row, values: {}, note: "" }));
}

function averageRows(rows: MeasurementRowInput[]) {
  const result: MeasurementValues = {};
  for (const key of measurementKeys) {
    const values = rows.map((row) => row.values[key]).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (values.length > 0) result[key] = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1000) / 1000;
  }
  return result;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "処理に失敗しました。";
}
