"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import {
  measurementLabels,
  punchLabels,
  type MeasurementKey,
  type PunchCharacteristic,
  type PunchType,
  type TargetRange,
  type UserRole,
} from "@/lib/types";

type Customer = { id: string; name: string };
type Product = { id: string; customer_id: string; name: string; drawing_no?: string | null; note?: string | null };
type Toast = { message: string; tone: "success" | "error" | "info" };
type AppUser = {
  id?: string;
  login_id: string;
  display_name: string;
  role: UserRole;
  can_manage_settings: boolean;
  line_user_id?: string | null;
  is_active: boolean;
};

const measurementKeys: MeasurementKey[] = ["peak_load_g", "make_load_g", "click_rate_percent", "stroke_mm", "rlf_g"];
const punchTypes: PunchType[] = ["form", "ring", "reverse_push", "flat_push"];

const emptyCharacteristic: PunchCharacteristic = {
  punch: "form",
  key: "peak_load_g",
  direction: "decrease",
  sensitivity: "medium",
  minEffectiveDeltaMm: 0.001,
  maxRecommendedDeltaMm: 0.02,
};

const emptyUser: AppUser & { password?: string } = {
  login_id: "",
  display_name: "",
  role: "operator",
  can_manage_settings: false,
  line_user_id: "",
  is_active: true,
  password: "",
};

export function SettingsMenu() {
  const items = [
    { href: "/settings/customers", title: "得意先管理", body: "得意先の追加と一覧確認" },
    { href: "/settings/products", title: "製品管理", body: "得意先ごとの製品追加と一覧確認" },
    { href: "/settings/targets", title: "狙い値設定", body: "製品ごとの測定項目範囲" },
    { href: "/settings/punch-characteristics", title: "パンチ特性設定", body: "製品ごとのパンチ影響と感度" },
    { href: "/settings/users", title: "ユーザー管理", body: "ログイン権限と設定画面権限" },
  ];

  return (
    <div className="settingsMenu">
      {items.map((item) => (
        <Link className="settingsMenuItem" href={item.href} key={item.href}>
          <strong>{item.title}</strong>
          <span>{item.body}</span>
        </Link>
      ))}
    </div>
  );
}

export function CustomerSettings() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function loadCustomers() {
    const body = await api<{ customers: Customer[] }>("/api/customers");
    setCustomers(body.customers);
  }

  async function createCustomer() {
    if (!newCustomerName.trim()) return;
    try {
      await api<{ customer: Customer }>("/api/customers", {
        method: editingCustomerId ? "PUT" : "POST",
        body: editingCustomerId ? { id: editingCustomerId, name: newCustomerName } : { name: newCustomerName },
      });
      await loadCustomers();
      setNewCustomerName("");
      setEditingCustomerId(null);
      toast.show(editingCustomerId ? "得意先を修正しました。" : "得意先を保存しました。", "success");
    } catch (error) {
      toast.show(errorMessage(error), "error");
    }
  }

  async function deleteCustomer(id: string) {
    try {
      await api(`/api/customers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadCustomers();
      if (editingCustomerId === id) {
        setEditingCustomerId(null);
        setNewCustomerName("");
      }
      toast.show("得意先を削除しました。", "success");
    } catch (error) {
      toast.show(errorMessage(error), "error");
    }
  }

  function startEditCustomer(customer: Customer) {
    setEditingCustomerId(customer.id);
    setNewCustomerName(customer.name);
  }

  return (
    <SettingsShell toast={toast.node}>
      <section className="panel grid">
        <h2>得意先管理</h2>
        <div className="actions stackOnMobile">
          <input value={newCustomerName} onChange={(event) => setNewCustomerName(event.target.value)} placeholder="新しい得意先" />
          {editingCustomerId ? <button className="secondary" type="button" onClick={() => { setEditingCustomerId(null); setNewCustomerName(""); }}>修正取消</button> : null}
          <button type="button" onClick={createCustomer}>{editingCustomerId ? "修正保存" : "得意先追加"}</button>
        </div>
        <ListBlock count={customers.length} emptyText="得意先はまだ登録されていません。">
          {customers.map((customer) => (
            <div className="characteristicItem" key={customer.id}>
              <strong>{customer.name}</strong>
              <div className="actions characteristicActions">
                <button className="secondary compactButton" type="button" onClick={() => startEditCustomer(customer)}>修正</button>
                <button className="danger compactButton" type="button" onClick={() => deleteCustomer(customer.id)}>削除</button>
              </div>
            </div>
          ))}
        </ListBlock>
      </section>
    </SettingsShell>
  );
}

export function ProductSettings() {
  const selector = useCustomerProductSelector({ loadProductSettings: false });
  const [newProductName, setNewProductName] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    setEditingProductId(null);
    setNewProductName("");
  }, [selector.customerId]);

  async function createProduct() {
    if (!selector.customerId || !newProductName.trim()) return;
    try {
      await api<{ product: Product }>("/api/products", {
        method: editingProductId ? "PUT" : "POST",
        body: editingProductId
          ? { id: editingProductId, customerId: selector.customerId, name: newProductName }
          : { customerId: selector.customerId, name: newProductName },
      });
      await selector.loadProducts(selector.customerId);
      setNewProductName("");
      setEditingProductId(null);
      toast.show(editingProductId ? "製品を修正しました。" : "製品を保存しました。", "success");
    } catch (error) {
      toast.show(errorMessage(error), "error");
    }
  }

  async function deleteProduct(id: string) {
    try {
      await api(`/api/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await selector.loadProducts(selector.customerId);
      if (editingProductId === id) {
        setEditingProductId(null);
        setNewProductName("");
      }
      toast.show("製品を削除しました。", "success");
    } catch (error) {
      toast.show(errorMessage(error), "error");
    }
  }

  function startEditProduct(product: Product) {
    setEditingProductId(product.id);
    setNewProductName(product.name);
  }

  return (
    <SettingsShell toast={toast.node}>
      <section className="panel grid">
        <h2>製品管理</h2>
        <CustomerSelect selector={selector} />
        <div className="actions stackOnMobile">
          <input value={newProductName} onChange={(event) => setNewProductName(event.target.value)} placeholder="新しい製品" disabled={!selector.customerId} />
          {editingProductId ? <button className="secondary" type="button" onClick={() => { setEditingProductId(null); setNewProductName(""); }}>修正取消</button> : null}
          <button type="button" onClick={createProduct} disabled={!selector.customerId}>{editingProductId ? "修正保存" : "製品追加"}</button>
        </div>
        <ListBlock count={selector.products.length} emptyText="製品はまだ登録されていません。">
          {selector.products.map((product) => (
            <div className="characteristicItem" key={product.id}>
              <strong>{product.name}</strong>
              <div className="actions characteristicActions">
                <button className="secondary compactButton" type="button" onClick={() => startEditProduct(product)}>修正</button>
                <button className="danger compactButton" type="button" onClick={() => deleteProduct(product.id)}>削除</button>
              </div>
            </div>
          ))}
        </ListBlock>
      </section>
    </SettingsShell>
  );
}

export function TargetSettings() {
  const [targets, setTargets] = useState<TargetRange[]>([]);
  const toast = useToast();
  const selector = useCustomerProductSelector({
    loadProductSettings: true,
    onProductSettings: (body) => setTargets(body.targets),
  });

  async function saveTargets() {
    if (!selector.productId) {
      toast.show("製品を選択してください。", "error");
      return;
    }
    try {
      await api(`/api/products/${selector.productId}/targets`, { method: "PUT", body: { targets } });
      toast.show("狙い値を保存しました。", "success");
    } catch (error) {
      toast.show(errorMessage(error), "error");
    }
  }

  function updateTarget(key: MeasurementKey, side: "minValue" | "maxValue", value: string) {
    setTargets((current) => {
      const rest = current.filter((target) => target.key !== key);
      const existing = current.find((target) => target.key === key) ?? { key, minValue: NaN, maxValue: NaN };
      const next = { ...existing, [side]: value === "" ? NaN : Number(value) };
      if (!Number.isFinite(next.minValue) && !Number.isFinite(next.maxValue)) return rest;
      return [...rest, next];
    });
  }

  return (
    <SettingsShell toast={toast.node}>
      <section className="panel grid">
        <div className="sectionTitle">
          <h2>狙い値設定</h2>
          <button className="secondary compactButton" type="button" onClick={saveTargets}>狙い値保存</button>
        </div>
        <CustomerProductSelect selector={selector} />
        <div className="targetList">
          {measurementKeys.map((key) => {
            const target = targets.find((item) => item.key === key);
            return (
              <div className="row" key={key}>
                <label>
                  {measurementLabels[key]} 下限
                  <input className="numberInput" type="number" step="any" value={Number.isFinite(target?.minValue) ? target?.minValue : ""} onChange={(event) => updateTarget(key, "minValue", event.target.value)} />
                </label>
                <label>
                  {measurementLabels[key]} 上限
                  <input className="numberInput" type="number" step="any" value={Number.isFinite(target?.maxValue) ? target?.maxValue : ""} onChange={(event) => updateTarget(key, "maxValue", event.target.value)} />
                </label>
              </div>
            );
          })}
        </div>
      </section>
    </SettingsShell>
  );
}

export function PunchCharacteristicSettings() {
  const [characteristics, setCharacteristics] = useState<PunchCharacteristic[]>([]);
  const [characteristicDraft, setCharacteristicDraft] = useState<PunchCharacteristic>(emptyCharacteristic);
  const toast = useToast();
  const selector = useCustomerProductSelector({
    loadProductSettings: true,
    onProductSettings: (body) => setCharacteristics(body.characteristics),
  });

  async function saveCharacteristic() {
    if (!selector.productId) {
      toast.show("製品を選択してください。", "error");
      return;
    }
    try {
      const body = await api<{ characteristic: PunchCharacteristic }>(`/api/products/${selector.productId}/punch-characteristics`, {
        method: "POST",
        body: { characteristic: characteristicDraft },
      });
      setCharacteristics((current) => upsertCharacteristic(current, body.characteristic));
      setCharacteristicDraft(emptyCharacteristic);
      toast.show(characteristicDraft.id ? "パンチ特性を修正しました。" : "パンチ特性を1件保存しました。", "success");
    } catch (error) {
      toast.show(errorMessage(error), "error");
    }
  }

  async function deleteCharacteristic(id?: string) {
    if (!selector.productId || !id) return;
    try {
      await api(`/api/products/${selector.productId}/punch-characteristics?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setCharacteristics((current) => current.filter((item) => item.id !== id));
      toast.show("パンチ特性を削除しました。", "success");
    } catch (error) {
      toast.show(errorMessage(error), "error");
    }
  }

  return (
    <SettingsShell toast={toast.node}>
      <section className="panel grid">
        <div className="sectionTitle">
          <h2>パンチ特性設定</h2>
          <div className="actions">
            {characteristicDraft.id ? <button className="secondary compactButton" type="button" onClick={() => setCharacteristicDraft(emptyCharacteristic)}>修正取消</button> : null}
            <button className="secondary compactButton" type="button" onClick={saveCharacteristic}>{characteristicDraft.id ? "修正保存" : "1件保存"}</button>
          </div>
        </div>
        <CustomerProductSelect selector={selector} />
        <div className="characteristicEditor">
          <label>
            パンチ
            <select value={characteristicDraft.punch} onChange={(event) => setCharacteristicDraft((current) => ({ ...current, punch: event.target.value as PunchType }))}>
              {punchTypes.map((punch) => <option key={punch} value={punch}>{punchLabels[punch]}</option>)}
            </select>
          </label>
          <label>
            項目
            <select value={characteristicDraft.key} onChange={(event) => setCharacteristicDraft((current) => ({ ...current, key: event.target.value as MeasurementKey }))}>
              {measurementKeys.map((key) => <option key={key} value={key}>{measurementLabels[key]}</option>)}
            </select>
          </label>
          <label>
            +方向の変化
            <select value={characteristicDraft.direction} onChange={(event) => setCharacteristicDraft((current) => ({ ...current, direction: event.target.value as PunchCharacteristic["direction"] }))}>
              <option value="increase">増える</option>
              <option value="decrease">減る</option>
              <option value="none">影響なし</option>
            </select>
          </label>
          <label>
            感度
            <select value={characteristicDraft.sensitivity} onChange={(event) => setCharacteristicDraft((current) => ({ ...current, sensitivity: event.target.value as PunchCharacteristic["sensitivity"] }))}>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </label>
          <label>
            有効最小 mm
            <input className="numberInput" type="number" step="0.001" value={characteristicDraft.minEffectiveDeltaMm} onChange={(event) => setCharacteristicDraft((current) => ({ ...current, minEffectiveDeltaMm: Number(event.target.value) }))} />
          </label>
          <label>
            推奨上限 mm
            <input className="numberInput" type="number" step="0.001" value={characteristicDraft.maxRecommendedDeltaMm} onChange={(event) => setCharacteristicDraft((current) => ({ ...current, maxRecommendedDeltaMm: Number(event.target.value) }))} />
          </label>
        </div>
        <ListBlock count={characteristics.length} emptyText="登録済みのパンチ特性はありません。">
          {characteristics.map((item) => (
            <div className="characteristicItem" key={item.id ?? `${item.punch}-${item.key}`}>
              <div>
                <strong>{punchLabels[item.punch]} / {measurementLabels[item.key]}</strong>
                <p>{directionLabel(item.direction)}・感度 {sensitivityLabel(item.sensitivity)}・有効 {item.minEffectiveDeltaMm}mm・上限 {item.maxRecommendedDeltaMm}mm</p>
              </div>
              <div className="actions characteristicActions">
                <button className="secondary compactButton" type="button" onClick={() => setCharacteristicDraft({ ...item })}>修正</button>
                <button className="danger compactButton" type="button" onClick={() => deleteCharacteristic(item.id)}>削除</button>
              </div>
            </div>
          ))}
        </ListBlock>
      </section>
    </SettingsShell>
  );
}

export function UserSettings() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [userDraft, setUserDraft] = useState<AppUser & { password?: string }>(emptyUser);
  const toast = useToast();

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    const body = await api<{ users: AppUser[] }>("/api/users");
    setUsers(body.users);
  }

  async function saveUser() {
    try {
      const body = await api<{ user: AppUser }>("/api/users", {
        method: "POST",
        body: {
          id: userDraft.id,
          loginId: userDraft.login_id,
          password: userDraft.password,
          displayName: userDraft.display_name,
          role: userDraft.role,
          canManageSettings: userDraft.can_manage_settings,
          lineUserId: userDraft.line_user_id,
          isActive: userDraft.is_active,
        },
      });
      setUsers((current) => upsertUser(current, body.user));
      setUserDraft(emptyUser);
      toast.show("ユーザーを保存しました。", "success");
    } catch (error) {
      toast.show(errorMessage(error), "error");
    }
  }

  return (
    <SettingsShell toast={toast.node}>
      <section className="panel grid">
        <div className="sectionTitle">
          <h2>ユーザー管理</h2>
          <div className="actions">
            {userDraft.id ? <button className="secondary compactButton" type="button" onClick={() => setUserDraft(emptyUser)}>修正取消</button> : null}
            <button className="secondary compactButton" type="button" onClick={saveUser}>{userDraft.id ? "修正保存" : "ユーザー追加"}</button>
          </div>
        </div>
        <div className="characteristicEditor">
          <label>
            ログインID
            <input value={userDraft.login_id} onChange={(event) => setUserDraft((current) => ({ ...current, login_id: event.target.value }))} />
          </label>
          <label>
            表示名
            <input value={userDraft.display_name} onChange={(event) => setUserDraft((current) => ({ ...current, display_name: event.target.value }))} />
          </label>
          <label>
            パスワード
            <input type="password" value={userDraft.password ?? ""} onChange={(event) => setUserDraft((current) => ({ ...current, password: event.target.value }))} placeholder={userDraft.id ? "変更時のみ入力" : ""} />
          </label>
          <label>
            権限
            <select value={userDraft.role} onChange={(event) => setUserDraft((current) => ({ ...current, role: event.target.value as UserRole }))}>
              <option value="admin">admin</option>
              <option value="operator">operator</option>
              <option value="viewer">viewer</option>
            </select>
          </label>
          <label className="checkLabel">
            <input type="checkbox" checked={userDraft.can_manage_settings} onChange={(event) => setUserDraft((current) => ({ ...current, can_manage_settings: event.target.checked }))} />
            設定画面を使用できる
          </label>
          <label className="checkLabel">
            <input type="checkbox" checked={userDraft.is_active} onChange={(event) => setUserDraft((current) => ({ ...current, is_active: event.target.checked }))} />
            有効
          </label>
          <label>
            LINE userId
            <input value={userDraft.line_user_id ?? ""} onChange={(event) => setUserDraft((current) => ({ ...current, line_user_id: event.target.value }))} />
          </label>
        </div>
        <ListBlock count={users.length} emptyText="ユーザーはまだ登録されていません。">
          {users.map((user) => (
            <div className="characteristicItem" key={user.id}>
              <div>
                <strong>{user.login_id} / {user.display_name}</strong>
                <p>{user.role}・設定 {user.can_manage_settings ? "可" : "不可"}・{user.is_active ? "有効" : "無効"}</p>
              </div>
              <button className="secondary compactButton" type="button" onClick={() => setUserDraft({ ...user, password: "" })}>修正</button>
            </div>
          ))}
        </ListBlock>
      </section>
    </SettingsShell>
  );
}

function SettingsShell({ toast, children }: { toast: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="workspaceShell">
      {toast}
      <div className="grid settingsSingle">{children}</div>
    </div>
  );
}

function CustomerProductSelect({ selector }: { selector: CustomerProductSelector }) {
  return (
    <div className="row">
      <CustomerSelect selector={selector} />
      <ProductSelect selector={selector} />
    </div>
  );
}

function CustomerSelect({ selector }: { selector: CustomerProductSelector }) {
  return (
    <label>
      得意先
      <select value={selector.customerId} onChange={(event) => selector.setCustomerId(event.target.value)}>
        <option value="">選択してください</option>
        {selector.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
      </select>
    </label>
  );
}

function ProductSelect({ selector }: { selector: CustomerProductSelector }) {
  return (
    <label>
      製品
      <select value={selector.productId} onChange={(event) => selector.setProductId(event.target.value)} disabled={!selector.customerId}>
        <option value="">選択してください</option>
        {selector.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
      </select>
    </label>
  );
}

function ListBlock({ count, emptyText, children }: { count: number; emptyText: string; children: React.ReactNode }) {
  return <div className="userList">{count === 0 ? <p className="muted">{emptyText}</p> : children}</div>;
}

type ProductSettingsPayload = {
  targets: TargetRange[];
  characteristics: PunchCharacteristic[];
};

type CustomerProductSelector = ReturnType<typeof useCustomerProductSelector>;

function useCustomerProductSelector(options: {
  loadProductSettings: boolean;
  onProductSettings?: (body: ProductSettingsPayload) => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");

  useEffect(() => {
    void loadCustomers();
  }, []);

  useEffect(() => {
    setProductId("");
    setProducts([]);
    if (customerId) void loadProducts(customerId);
  }, [customerId]);

  useEffect(() => {
    if (options.loadProductSettings && productId) void loadProductSettings(productId);
  }, [productId]);

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
    options.onProductSettings?.({ targets: targetBody.targets, characteristics: characteristicBody.characteristics });
  }

  return { customers, products, customerId, productId, setCustomerId, setProductId, loadProducts };
}

function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return {
    show(message: string, tone: Toast["tone"]) {
      setToast({ message, tone });
    },
    node: toast ? <div className={`toast ${toast.tone}`}>{toast.message}</div> : null,
  };
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

function upsertCharacteristic(items: PunchCharacteristic[], next: PunchCharacteristic) {
  const exists = items.some((item) => item.id === next.id || (item.punch === next.punch && item.key === next.key));
  if (!exists) return [...items, next];
  return items.map((item) => (item.id === next.id || (item.punch === next.punch && item.key === next.key) ? next : item));
}

function upsertUser(items: AppUser[], next: AppUser) {
  const exists = items.some((item) => item.id === next.id);
  if (!exists) return [...items, next];
  return items.map((item) => (item.id === next.id ? next : item));
}

function directionLabel(value: PunchCharacteristic["direction"]) {
  if (value === "increase") return "+方向で増える";
  if (value === "decrease") return "+方向で減る";
  return "影響なし";
}

function sensitivityLabel(value: PunchCharacteristic["sensitivity"]) {
  if (value === "high") return "高";
  if (value === "low") return "低";
  return "中";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "処理に失敗しました。";
}
