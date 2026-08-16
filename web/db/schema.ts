import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const funds = sqliteTable("funds", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  nameZh: text("name_zh").notNull(),
  cik: text("cik").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_funds_cik").on(table.cik)]);

export const filings = sqliteTable("filings", {
  id: text("id").primaryKey(),
  fundId: text("fund_id").notNull().references(() => funds.id, { onDelete: "cascade" }),
  reportDate: text("report_date").notNull(),
  filedAt: text("filed_at").notNull(),
  source: text("source").notNull(),
  totalValueUsd: integer("total_value_usd").notNull(),
  positionCount: integer("position_count").notNull(),
  newCount: integer("new_count").notNull(),
  addedCount: integer("added_count").notNull(),
  reducedCount: integer("reduced_count").notNull(),
  exitCount: integer("exit_count").notNull(),
  unchangedCount: integer("unchanged_count").notNull(),
  dataStatus: text("data_status").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_filings_fund_report").on(table.fundId, table.reportDate),
  index("idx_filings_report_date").on(table.reportDate),
]);

export const positions = sqliteTable("positions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filingId: text("filing_id").notNull().references(() => filings.id, { onDelete: "cascade" }),
  issuer: text("issuer").notNull(),
  ticker: text("ticker").notNull(),
  sector: text("sector").notNull(),
  valueUsd: integer("value_usd").notNull(),
  weight: real("weight").notNull(),
  shares: integer("shares").notNull(),
  shareChange: integer("share_change").notNull(),
  changePercent: real("change_percent"),
  changeType: text("change_type").notNull(),
}, (table) => [
  index("idx_positions_filing_weight").on(table.filingId, table.weight),
  index("idx_positions_filing_change").on(table.filingId, table.changeType),
]);
