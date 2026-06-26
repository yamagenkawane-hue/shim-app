import { redirect } from "next/navigation";
import { readSessionUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/permissions";
import HeaderActions from "@/components/HeaderActions";
import { TargetSettings } from "@/components/SettingsWorkspace";

export default async function TargetsSettingsPage() {
  const user = await readSessionUser();
  if (!user) redirect("/login");
  if (!canManageSettings(user)) redirect("/dashboard");

  return (
    <>
      <header className="appHeader">
        <h1>狙い値設定</h1>
        <p>{user.displayName} / 得意先と製品を選択して狙い値範囲を設定します。</p>
        <HeaderActions canManageSettings={canManageSettings(user)} showSettings={false} showSettingsMenu showHome />
      </header>
      <main className="page">
        <TargetSettings />
      </main>
    </>
  );
}
