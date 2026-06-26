export default function DemoAccountPage() {
  return (
    <main className="loginPage">
      <section className="panel loginBox grid">
        <h1>仕様確認用ログイン</h1>
        <p>Supabase設定前でも、以下のアカウントで画面確認できます。</p>
        <div className="measurementCard">
          <p>
            <strong>ログインID:</strong> demo
          </p>
          <p>
            <strong>パスワード:</strong> demo1234
          </p>
        </div>
        <p className="muted">本番利用では `.env.local` と Supabase の初期管理者を設定してください。</p>
      </section>
    </main>
  );
}
