import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FolioPulse",
  description: "追踪顶级投资者的美股持仓变化。",
  openGraph: {
    title: "FolioPulse｜看懂顶级投资者的每一次调仓",
    description: "基于 SEC 13F 文件生成的机构持仓变化仪表盘。",
    images: ["/folio-pulse-social.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/folio-pulse-social.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
