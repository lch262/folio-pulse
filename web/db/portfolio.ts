import { env } from "cloudflare:workers";
import { portfolioSnapshot, type ChangeType, type PortfolioSnapshot } from "../app/lib/portfolio-data";

type FilingRow = {
  id: string; manager: string; manager_short: string; cik: string;
  report_date: string; filed_at: string; source: string; total_value_usd: number;
  position_count: number; new_count: number; added_count: number;
  reduced_count: number; exit_count: number; unchanged_count: number;
};
type PositionRow = {
  issuer: string; ticker: string; sector: string; value_usd: number; weight: number;
  shares: number; share_change: number; change_percent: number | null; change_type: ChangeType;
};

let schemaPromise: Promise<void> | undefined;

function database(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export function ensurePortfolioSchema(): Promise<void> {
  if (!schemaPromise) schemaPromise = initializeSchema().catch((error) => {
    schemaPromise = undefined;
    throw error;
  });
  return schemaPromise;
}

async function initializeSchema() {
  const db = database();
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS funds (id TEXT PRIMARY KEY, name TEXT NOT NULL, name_zh TEXT NOT NULL, cik TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_funds_cik ON funds(cik)"),
    db.prepare("CREATE TABLE IF NOT EXISTS filings (id TEXT PRIMARY KEY, fund_id TEXT NOT NULL REFERENCES funds(id) ON DELETE CASCADE, report_date TEXT NOT NULL, filed_at TEXT NOT NULL, source TEXT NOT NULL, total_value_usd INTEGER NOT NULL, position_count INTEGER NOT NULL, new_count INTEGER NOT NULL, added_count INTEGER NOT NULL, reduced_count INTEGER NOT NULL, exit_count INTEGER NOT NULL, unchanged_count INTEGER NOT NULL, data_status TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_filings_fund_report ON filings(fund_id, report_date)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_filings_report_date ON filings(report_date)"),
    db.prepare("CREATE TABLE IF NOT EXISTS positions (id INTEGER PRIMARY KEY AUTOINCREMENT, filing_id TEXT NOT NULL REFERENCES filings(id) ON DELETE CASCADE, issuer TEXT NOT NULL, ticker TEXT NOT NULL, sector TEXT NOT NULL, value_usd INTEGER NOT NULL, weight REAL NOT NULL, shares INTEGER NOT NULL, share_change INTEGER NOT NULL, change_percent REAL, change_type TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_positions_filing_weight ON positions(filing_id, weight)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_positions_filing_change ON positions(filing_id, change_type)"),
  ]);
  await db.prepare("PRAGMA optimize").run();
}

export async function getLatestPortfolio(): Promise<PortfolioSnapshot> {
  await ensurePortfolioSchema();
  const db = database();
  const latest = await db.prepare(`
    SELECT filings.id, funds.name AS manager, funds.name_zh AS manager_short, funds.cik,
      filings.report_date, filings.filed_at, filings.source, filings.total_value_usd,
      filings.position_count, filings.new_count, filings.added_count,
      filings.reduced_count, filings.exit_count, filings.unchanged_count
    FROM filings JOIN funds ON funds.id = filings.fund_id
    ORDER BY filings.report_date DESC LIMIT 1
  `).first<FilingRow>();

  if (!latest) {
    await savePortfolio(portfolioSnapshot, "persistent-demo");
    return getLatestPortfolio();
  }

  const positionResult = await db.prepare(`
    SELECT issuer, ticker, sector, value_usd, weight, shares, share_change,
      change_percent, change_type
    FROM positions WHERE filing_id = ? ORDER BY weight DESC
  `).bind(latest.id).all<PositionRow>();

  return {
    manager: latest.manager, managerShort: latest.manager_short, cik: latest.cik,
    reportDate: latest.report_date, filedAt: latest.filed_at, source: latest.source,
    totalValue: latest.total_value_usd / 1_000_000_000,
    positionCount: latest.position_count,
    changes: { NEW: latest.new_count, ADDED: latest.added_count, REDUCED: latest.reduced_count, EXIT: latest.exit_count, UNCHANGED: latest.unchanged_count },
    positions: positionResult.results.map((row) => ({
      issuer: row.issuer, ticker: row.ticker, sector: row.sector,
      value: row.value_usd / 1_000_000_000, weight: row.weight, shares: row.shares,
      shareChange: row.share_change, changePercent: row.change_percent, changeType: row.change_type,
    })),
  };
}

export async function savePortfolio(snapshot: PortfolioSnapshot, dataStatus = "imported") {
  await ensurePortfolioSchema();
  const db = database();
  const fundId = `fund:${snapshot.cik}`;
  const filingId = `${snapshot.cik}:${snapshot.reportDate}`;
  const now = new Date().toISOString();
  const writes: D1PreparedStatement[] = [
    db.prepare("INSERT INTO funds (id, name, name_zh, cik, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, name_zh=excluded.name_zh, cik=excluded.cik").bind(fundId, snapshot.manager, snapshot.managerShort, snapshot.cik, now),
    db.prepare("INSERT INTO filings (id, fund_id, report_date, filed_at, source, total_value_usd, position_count, new_count, added_count, reduced_count, exit_count, unchanged_count, data_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET filed_at=excluded.filed_at, source=excluded.source, total_value_usd=excluded.total_value_usd, position_count=excluded.position_count, new_count=excluded.new_count, added_count=excluded.added_count, reduced_count=excluded.reduced_count, exit_count=excluded.exit_count, unchanged_count=excluded.unchanged_count, data_status=excluded.data_status, updated_at=excluded.updated_at").bind(filingId, fundId, snapshot.reportDate, snapshot.filedAt, snapshot.source, Math.round(snapshot.totalValue * 1_000_000_000), snapshot.positionCount, snapshot.changes.NEW, snapshot.changes.ADDED, snapshot.changes.REDUCED, snapshot.changes.EXIT, snapshot.changes.UNCHANGED, dataStatus, now),
    db.prepare("DELETE FROM positions WHERE filing_id = ?").bind(filingId),
  ];
  for (const position of snapshot.positions) {
    writes.push(db.prepare("INSERT INTO positions (filing_id, issuer, ticker, sector, value_usd, weight, shares, share_change, change_percent, change_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(filingId, position.issuer, position.ticker, position.sector, Math.round(position.value * 1_000_000_000), position.weight, position.shares, position.shareChange, position.changePercent, position.changeType));
  }
  await db.batch(writes);
  await db.prepare("PRAGMA optimize").run();
}
