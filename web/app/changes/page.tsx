import type { Metadata } from "next";
import ExplorerPage from "../ExplorerPage";

const title = "季度调仓｜FolioPulse";
const description = "按新建、增持、减持和清仓查看伯克希尔最新季度资金动作。";

export const metadata: Metadata = {
  title, description,
  openGraph: { title, description, images: [] },
  twitter: { title, description, images: [] },
};

export default function ChangesPage() { return <ExplorerPage view="changes" />; }
