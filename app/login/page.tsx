"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "ログインできません。" }));
      setError(body.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="loginPage">
      <form className="panel loginBox grid" onSubmit={submit}>
        <div>
          <h1>シム調整予測</h1>
          <p className="muted">ログインIDとパスワードを入力してください。</p>
        </div>
        <label>
          ログインID
          <input value={loginId} onChange={(event) => setLoginId(event.target.value)} autoComplete="username" required />
        </label>
        <label>
          パスワード
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}
        <button type="submit">ログイン</button>
      </form>
    </main>
  );
}
