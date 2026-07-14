"use client";

import { useEffect, useState } from "react";
import {
  measurementLabels,
  measurementUnits,
  punchLabels,
  rowTypeLabels,
  type MeasurementKey,
  type MeasurementRowType,
  type PunchType,
} from "@/lib/types";

type Customer = { id: string; name: string };
type NotificationPayload = { measurementSetId?: string; customerId?: string; customerName?: string; productName?: string };
type NotificationItem = {
  id: string;
  title: string;
  body: string;
  status: string;
  error_message?: string | null;
  created_at: string;
  payload?: NotificationPayload | null;
};
type MeasurementDetailRow = {
  row_type: MeasurementRowType;
  row_index: number;
  peak_load_g: number | string | null;
  make_load_g: number | string | null;
  click_rate_percent: number | string | null;
  stroke_mm: number | string | null;
  rlf_g: number | string | null;
};
type MeasurementDetail = {
  id: string;
  customerName: string;
  productName: string;
  measuredAt: string;
  currentShimText: Partial<Record<PunchType, string>>;
  rows: MeasurementDetailRow[];
};
type Toast = { message: string; tone: "success" | "error" | "info" };

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
const notificationPageSize = 5;

export default function HistoryWorkspace() {
  const [toast, setToast] = useState<Toast | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [measurementDetails, setMeasurementDetails] = useState<Record<string, MeasurementDetail>>({});

  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const filteredNotifications = notifications.filter((notification) => {
    if (!selectedCustomer) return true;
    return notification.payload?.customerId === selectedCustomer.id || notification.payload?.customerName === selectedCustomer.name;
  });
  const useAllRows = showAll || Boolean(customerId);
  const notificationPageCount = Math.max(1, Math.ceil(notificationTotal / notificationPageSize));

  useEffect(() => {
    void loadCustomers();
  }, []);

  useEffect(() => {
    void loadNotifications(useAllRows ? 1 : notificationPage);
  }, [notificationPage, showAll, customerId]);

  useEffect(() => {
    setNotificationPage(1);
    setExpandedSetId(null);
  }, [showAll, customerId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadCustomers() {
    const body = await api<{ customers: Customer[] }>("/api/customers");
    setCustomers(body.customers);
  }

  async function loadNotifications(page = notificationPage) {
    const allParam = useAllRows ? "&all=1" : "";
    const body = await api<{ notifications: NotificationItem[]; total: number }>(
      `/api/notifications?page=${page}&pageSize=${notificationPageSize}${allParam}`,
    );
    setNotifications(body.notifications);
    setNotificationTotal(body.total);
  }

  async function toggleMeasurementDetail(notification: NotificationItem) {
    const setId = notification.payload?.measurementSetId;
    if (!setId) return;
    if (expandedSetId === setId) {
      setExpandedSetId(null);
      return;
    }
    setExpandedSetId(setId);
    if (measurementDetails[setId]) return;
    try {
      const body = await api<{ measurementSet: MeasurementDetail }>(`/api/measurement-sets/${setId}`);
      setMeasurementDetails((current) => ({ ...current, [setId]: body.measurementSet }));
    } catch (error) {
      setToast({ message: errorMessage(error), tone: "error" });
    }
  }

  async function deleteNotification(notification: NotificationItem) {
    const ok = window.confirm("この履歴を削除しますか？測定データ本体は削除されません。");
    if (!ok) return;

    try {
      await api<{ ok: boolean }>(`/api/notifications?id=${encodeURIComponent(notification.id)}`, { method: "DELETE" });
      if (expandedSetId === notification.payload?.measurementSetId) setExpandedSetId(null);
      setToast({ message: "履歴を削除しました。", tone: "success" });
      const nextTotal = Math.max(notificationTotal - 1, 0);
      const nextPageCount = Math.max(1, Math.ceil(nextTotal / notificationPageSize));
      const nextPage = Math.min(notificationPage, nextPageCount);
      if (nextPage !== notificationPage) {
        setNotificationPage(nextPage);
      } else {
        await loadNotifications(useAllRows ? 1 : nextPage);
      }
    } catch (error) {
      setToast({ message: errorMessage(error), tone: "error" });
    }
  }

  return (
    <div className="workspaceShell">
      {toast ? <div className={`toast ${toast.tone}`}>{toast.message}</div> : null}
      <section className="panel grid notificationPanel">
        <div className="sectionTitle">
          <h2>履歴</h2>
          <button className="secondary compactButton" type="button" onClick={() => loadNotifications(notificationPage)}>更新</button>
        </div>
        <div className="historyControls">
          <label>
            得意先で絞り込み
            <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="">すべて</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
          </label>
          <label className="checkLabel">
            <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
            全件表示
          </label>
        </div>
        <div className="notificationList">
          {filteredNotifications.length === 0 ? <p className="muted">履歴はありません。</p> : null}
          {filteredNotifications.map((notification) => {
            const setId = notification.payload?.measurementSetId;
            const detail = setId ? measurementDetails[setId] : undefined;
            return (
              <div className="notificationItem" key={notification.id}>
                <div className="notificationSummary">
                  <div>
                    <strong>{notification.payload?.customerName ?? "得意先未設定"} / {notification.payload?.productName ?? "製品未設定"}</strong>
                    {notification.error_message ? <p className="warningText">{notification.error_message}</p> : null}
                  </div>
                  <div className="notificationActions">
                    <button className="linkButton" type="button" onClick={() => toggleMeasurementDetail(notification)} disabled={!setId}>
                      {formatDateTime(notification.created_at)}
                    </button>
                    <button className="danger compactButton" type="button" onClick={() => deleteNotification(notification)}>
                      削除
                    </button>
                  </div>
                </div>
                {expandedSetId === setId ? (
                  <div className="measurementDetail">
                    {detail ? <MeasurementDetailTable detail={detail} /> : <p className="muted">読み込み中...</p>}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {useAllRows ? (
          <p className="muted">{filteredNotifications.length}件表示</p>
        ) : (
          <div className="pagination">
            <button className="secondary compactButton" type="button" onClick={() => setNotificationPage((page) => Math.max(1, page - 1))} disabled={notificationPage <= 1}>前へ</button>
            <span>{notificationPage} / {notificationPageCount}</span>
            <button className="secondary compactButton" type="button" onClick={() => setNotificationPage((page) => Math.min(notificationPageCount, page + 1))} disabled={notificationPage >= notificationPageCount}>次へ</button>
          </div>
        )}
      </section>
    </div>
  );
}

function MeasurementDetailTable({ detail }: { detail: MeasurementDetail }) {
  const sortedRows = [...detail.rows].sort((a, b) => rowOrder(a) - rowOrder(b));
  return (
    <div className="detailTableWrap">
      <div className="shimSnapshot">
        {punchTypes.map((punch) => detail.currentShimText[punch] ? <span key={punch}>{punchLabels[punch]} {detail.currentShimText[punch]}</span> : null)}
      </div>
      <table className="detailTable">
        <thead>
          <tr>
            <th>区分</th>
            {measurementKeys.map((key) => <th key={key}>{measurementLabels[key]}</th>)}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={`${row.row_type}-${row.row_index}`}>
              <td>{rowTypeLabels[row.row_type]}{row.row_type === "reverse_flat" ? ` ${row.row_index}` : ""}</td>
              {measurementKeys.map((key) => <td key={key}>{formatMeasurementCell(row, key)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMeasurementCell(row: MeasurementDetailRow, key: MeasurementKey) {
  const dbKey = key as keyof MeasurementDetailRow;
  const value = row[dbKey];
  if (value === null || value === undefined || value === "") return "";
  return `${value}${measurementUnits[key]}`;
}

function rowOrder(row: MeasurementDetailRow) {
  const index = rowBlueprint.findIndex((item) => item.rowType === row.row_type && item.rowIndex === row.row_index);
  return index === -1 ? 99 : index;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "処理に失敗しました。";
}
