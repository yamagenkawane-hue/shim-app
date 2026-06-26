import { redirect } from "next/navigation";
import { readSessionUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/permissions";
import HeaderActions from "@/components/HeaderActions";
import { UserSettings } from "@/components/SettingsWorkspace";

export default async function UsersSettingsPage() {
  const user = await readSessionUser();
  if (!user) redirect("/login");
  if (!canManageSettings(user)) redirect("/dashboard");

  return (
    <>
      <header className="appHeader">
        <h1>ユーザー管理</h1>
        <p>{user.displayName} / ログイン情報と設定画面権限を管理します。</p>
        <HeaderActions canManageSettings={canManageSettings(user)} showSettings={false} showSettingsMenu showHome />
      </header>
      <main className="page">
        <UserSettings />
      </main>
    </>
  );
}
