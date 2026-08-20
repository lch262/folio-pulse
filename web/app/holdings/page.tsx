import type { Metadata } from "next";
import ExplorerPage from "../ExplorerPage";

const title = "完整持仓｜FolioPulse";
const description = "查看伯克希尔 13F 的完整持仓、市值、股数和季度变化。";

export const metadata: Metadata = {
  title, description,
  openGraph: { title, description, images: [] },
  twitter: { title, description, images: [] },
};

export default function HoldingsPage() { return <ExplorerPage view="holdings" />; }
