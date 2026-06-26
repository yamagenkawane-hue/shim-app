import { redirect } from "next/navigation";
import { readSessionUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/permissions";
import HeaderActions from "@/components/HeaderActions";
import HistoryWorkspace from "@/components/HistoryWorkspace";

export default async function HistoryPage() {
  const user = await readSessionUser();
  if (!user) redirect("/login");

  return (
    <>
      <header className="appHeader">
        <h1>履歴</h1>
        <p>{user.displayName} / 保存された測定データを確認します。</p>
        <HeaderActions canManageSettings={canManageSettings(user)} showHome showHistory={false} />
      </header>
      <main className="page">
        <HistoryWorkspace />
      </main>
    </>
  );
}
