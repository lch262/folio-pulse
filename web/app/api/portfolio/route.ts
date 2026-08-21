import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getLatestPortfolio, savePortfolio } from "../../../db/portfolio";
import { getPortfolioSnapshotByCik, portfolioSnapshot, type PortfolioSnapshot } from "../../lib/portfolio-data";

export async function GET(request: Request) {
  const cik = new URL(request.url).searchParams.get("cik") ?? portfolioSnapshot.cik;
  if (!/^\d{10}$/.test(cik)) return Response.json({ error: "CIK 必须是 10 位数字。" }, { status: 400 });
  const fallback = getPortfolioSnapshotByCik(cik);
  if (!fallback) return Response.json({ error: "该机构尚未接入持仓数据。" }, { status: 404 });
  try {
    const data = await getLatestPortfolio(cik);
    return Response.json({ data, meta: { status: "persistent", message: "数据已从 FolioPulse 持久化存储读取。" } });
  } catch (error) {
    console.error("Portfolio database unavailable", error);
    return Response.json({ data: fallback, meta: { status: "fallback", message: "数据库暂不可用，正在显示内置 SEC 快照。" } });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "需要登录后才能导入数据。" }, { status: 401 });
  const admin = env as unknown as {
    FOLIOPULSE_ADMIN_USER_ID?: string;
    FOLIOPULSE_ADMIN_EMAIL?: string;
  };
  const matchesUserId =
    !!admin.FOLIOPULSE_ADMIN_USER_ID &&
    user.userId === admin.FOLIOPULSE_ADMIN_USER_ID;
  const matchesEmail =
    !!admin.FOLIOPULSE_ADMIN_EMAIL &&
    user.email.toLowerCase() === admin.FOLIOPULSE_ADMIN_EMAIL.toLowerCase();
  if (!matchesUserId && !matchesEmail) {
    return Response.json({ error: "当前账号没有导入权限。" }, { status: 403 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON 格式无效。" }, { status: 400 }); }
  if (!isPortfolioSnapshot(body)) return Response.json({ error: "持仓快照字段不完整。" }, { status: 400 });
  await savePortfolio(body, "imported");
  return Response.json({ data: await getLatestPortfolio(body.cik), meta: { status: "imported", importedBy: user.email } });
}

function isPortfolioSnapshot(value: unknown): value is PortfolioSnapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PortfolioSnapshot>;
  return typeof item.manager === "string" && typeof item.managerShort === "string" &&
    typeof item.cik === "string" && /^\d{10}$/.test(item.cik) &&
    typeof item.previousReportDate === "string" && typeof item.reportDate === "string" &&
    typeof item.filedAt === "string" &&
    typeof item.totalValue === "number" && Number.isFinite(item.totalValue) &&
    typeof item.positionCount === "number" && Array.isArray(item.positions) && !!item.changes &&
    ["NEW", "ADDED", "REDUCED", "EXIT", "UNCHANGED"].every((key) => typeof item.changes?.[key as keyof typeof item.changes] === "number");
}
