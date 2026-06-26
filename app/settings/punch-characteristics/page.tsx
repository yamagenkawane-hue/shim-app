import { redirect } from "next/navigation";
import { readSessionUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/permissions";
import HeaderActions from "@/components/HeaderActions";
import { PunchCharacteristicSettings } from "@/components/SettingsWorkspace";

export default async function PunchCharacteristicsSettingsPage() {
  const user = await readSessionUser();
  if (!user) redirect("/login");
  if (!canManageSettings(user)) redirect("/dashboard");

  return (
    <>
      <header className="appHeader">
        <h1>パンチ特性設定</h1>
        <p>{user.displayName} / 得意先と製品を選択してパンチ特性を設定します。</p>
        <HeaderActions canManageSettings={canManageSettings(user)} showSettings={false} showSettingsMenu showHome />
      </header>
      <main className="page">
        <PunchCharacteristicSettings />
      </main>
    </>
  );
}
