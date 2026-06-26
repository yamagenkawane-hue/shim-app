"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HeaderActions({
  canManageSettings,
  showSettings = true,
  showSettingsMenu = false,
  showHome = false,
  showHistory = true,
}: {
  canManageSettings: boolean;
  showSettings?: boolean;
  showSettingsMenu?: boolean;
  showHome?: boolean;
  showHistory?: boolean;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="headerNav">
      {showSettingsMenu ? <Link href="/settings">設定メニュー</Link> : null}
      {canManageSettings && showSettings ? <Link href="/settings">設定</Link> : null}
      {showHome ? <Link href="/dashboard">ホーム</Link> : null}
      {showHistory ? <Link href="/history">履歴</Link> : null}
      <button className="headerButton" type="button" onClick={logout}>ログアウト</button>
    </nav>
  );
}
