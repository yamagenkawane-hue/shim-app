import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "シム調整予測",
  description: "測定データからシム調整候補を提案するWebアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
