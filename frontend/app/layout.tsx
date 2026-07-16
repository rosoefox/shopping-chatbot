import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "ReviewTalk | AI 리뷰 분석", description: "쇼핑 리뷰 분석 챗봇" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
