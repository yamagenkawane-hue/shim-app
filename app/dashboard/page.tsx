import { redirect } from "next/navigation";
import { readSessionUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/permissions";
import HeaderActions from "@/components/HeaderActions";
import MeasurementWorkspace from "@/components/MeasurementWorkspace";

export default async function DashboardPage() {
  const user = await readSessionUser();
  if (!user) redirect("/login");

  return (
    <>
      <header className="appHeader">
        <h1>シム調整予測</h1>
        <p>
          {user.displayName} / {user.role} - 携帯端末でも6件セットを1画面で入力できます。
        </p>
        <HeaderActions canManageSettings={canManageSettings(user)} />
      </header>
      <main className="page">
        <MeasurementWorkspace userRole={user.role} />
      </main>
    </>
  );
}
