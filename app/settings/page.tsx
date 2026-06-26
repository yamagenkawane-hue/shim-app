import { redirect } from "next/navigation";
import { readSessionUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/permissions";
import HeaderActions from "@/components/HeaderActions";
import { SettingsMenu } from "@/components/SettingsWorkspace";

export default async function SettingsPage() {
  const user = await readSessionUser();
  if (!user) redirect("/login");
  if (!canManageSettings(user)) redirect("/dashboard");

  return (
    <>
      <header className="appHeader">
        <h1>設定</h1>
        <p>{user.displayName} / 得意先・製品・狙い値・パンチ特性・ユーザー管理</p>
        <HeaderActions canManageSettings={canManageSettings(user)} showSettings={false} showHome />
      </header>
      <main className="page">
        <SettingsMenu />
      </main>
    </>
  );
}
