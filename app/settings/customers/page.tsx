import { redirect } from "next/navigation";
import { readSessionUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/permissions";
import HeaderActions from "@/components/HeaderActions";
import { CustomerSettings } from "@/components/SettingsWorkspace";

export default async function CustomersSettingsPage() {
  const user = await readSessionUser();
  if (!user) redirect("/login");
  if (!canManageSettings(user)) redirect("/dashboard");

  return (
    <>
      <header className="appHeader">
        <h1>得意先管理</h1>
        <p>{user.displayName} / 得意先を追加・確認します。</p>
        <HeaderActions canManageSettings={canManageSettings(user)} showSettings={false} showSettingsMenu showHome />
      </header>
      <main className="page">
        <CustomerSettings />
      </main>
    </>
  );
}
