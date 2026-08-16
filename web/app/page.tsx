import type { Metadata } from "next";
import Dashboard from "./Dashboard";

export const metadata: Metadata = {
  title: "FolioPulse｜看懂顶级投资者的每一次调仓",
  description: "基于 SEC 13F 文件生成的机构持仓变化仪表盘。",
};

export default function Home() {
  return <Dashboard />;
}
