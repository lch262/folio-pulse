import { portfolioSnapshot } from "../../lib/portfolio-data";

export async function GET() {
  return Response.json({
    data: portfolioSnapshot,
    meta: { status: "demo", message: "演示快照；接入实时 SEC 抓取任务后将自动更新。" },
  });
}
