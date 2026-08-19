export type ChangeType = "NEW" | "ADDED" | "REDUCED" | "EXIT" | "UNCHANGED";

export type Position = {
  issuer: string;
  ticker: string;
  sector: string;
  value: number;
  weight: number;
  shares: number;
  shareChange: number;
  changePercent: number | null;
  changeType: ChangeType;
};

export type PortfolioSnapshot = {
  manager: string;
  managerShort: string;
  cik: string;
  previousReportDate: string;
  reportDate: string;
  filedAt: string;
  source: string;
  totalValue: number;
  positionCount: number;
  changes: Record<ChangeType, number>;
  positions: Position[];
};

export const portfolioSnapshot: PortfolioSnapshot = {
  manager: "Berkshire Hathaway",
  managerShort: "伯克希尔·哈撒韦",
  cik: "0001067983",
  previousReportDate: "2026-03-31",
  reportDate: "2026-06-30",
  filedAt: "2026-08-14",
  source: "SEC 13F-HR",
  totalValue: 267.18,
  positionCount: 41,
  changes: { NEW: 3, ADDED: 5, REDUCED: 7, EXIT: 2, UNCHANGED: 24 },
  positions: [
    { issuer: "Apple Inc.", ticker: "AAPL", sector: "科技", value: 62.31, weight: 23.32, shares: 280000000, shareChange: -20000000, changePercent: -6.67, changeType: "REDUCED" },
    { issuer: "American Express", ticker: "AXP", sector: "金融", value: 45.72, weight: 17.11, shares: 151610700, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "Bank of America", ticker: "BAC", sector: "金融", value: 28.64, weight: 10.72, shares: 680000000, shareChange: -42000000, changePercent: -5.82, changeType: "REDUCED" },
    { issuer: "Coca-Cola Co.", ticker: "KO", sector: "消费", value: 27.38, weight: 10.25, shares: 400000000, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "Chevron Corp.", ticker: "CVX", sector: "能源", value: 18.93, weight: 7.08, shares: 118610534, shareChange: 2400000, changePercent: 2.06, changeType: "ADDED" },
    { issuer: "Occidental Petroleum", ticker: "OXY", sector: "能源", value: 12.16, weight: 4.55, shares: 255281524, shareChange: 7631500, changePercent: 3.08, changeType: "ADDED" },
    { issuer: "Constellation Brands", ticker: "STZ", sector: "消费", value: 3.82, weight: 1.43, shares: 19650000, shareChange: 19650000, changePercent: null, changeType: "NEW" },
    { issuer: "T-Mobile US", ticker: "TMUS", sector: "通信", value: 2.96, weight: 1.11, shares: 12750000, shareChange: -1150000, changePercent: -8.27, changeType: "REDUCED" },
    { issuer: "Domino's Pizza", ticker: "DPZ", sector: "消费", value: 1.21, weight: 0.45, shares: 2450000, shareChange: 320000, changePercent: 15.02, changeType: "ADDED" },
    { issuer: "Ulta Beauty", ticker: "ULTA", sector: "消费", value: 0, weight: 0, shares: 0, shareChange: -690106, changePercent: -100, changeType: "EXIT" },
  ],
};
