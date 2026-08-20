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
  manager: "BERKSHIRE HATHAWAY INC",
  managerShort: "伯克希尔·哈撒韦",
  cik: "0001067983",
  previousReportDate: "2026-03-31",
  reportDate: "2026-06-30",
  filedAt: "2026-08-14",
  source: "SEC 13F-HR",
  totalValue: 299.253556246,
  positionCount: 29,
  changes: { NEW: 1, ADDED: 7, REDUCED: 6, EXIT: 1, UNCHANGED: 15 },
  positions: [
    { issuer: "APPLE INC", ticker: "AAPL", sector: "未分类", value: 65.950296923, weight: 22.038267, shares: 227917808, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "AMERICAN EXPRESS CO", ticker: "AXP", sector: "未分类", value: 51.282319275, weight: 17.136745, shares: 151610700, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "COCA COLA CO", ticker: "KO", sector: "未分类", value: 32.508, weight: 10.863029, shares: 400000000, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "ALPHABET INC", ticker: "GOOGL", sector: "未分类", value: 28.157599351, weight: 9.409278, shares: 78791167, shareChange: 24541369, changePercent: 45.2377, changeType: "ADDED" },
    { issuer: "BANK OF AMER CORP", ticker: "BAC", sector: "未分类", value: 27.543790975, weight: 9.204165, shares: 483394015, shareChange: -30230150, changePercent: -5.8857, changeType: "REDUCED" },
    { issuer: "CHEVRON CORPORATION", ticker: "CVX", sector: "未分类", value: 13.98614189, weight: 4.673676, shares: 84375856, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "OCCIDENTAL PETE CORP", ticker: "OXY", sector: "未分类", value: 12.868205304, weight: 4.300101, shares: 264941431, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "CHUBB LIMITED", ticker: "CB", sector: "未分类", value: 11.670066615, weight: 3.899725, shares: 34249183, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "MOODYS CORP", ticker: "MCO", sector: "未分类", value: 11.173435852, weight: 3.733769, shares: 24669778, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "ALPHABET INC", ticker: "GOOG", sector: "未分类", value: 9.606489032, weight: 3.21015, shares: 27188433, shareChange: 23603218, changePercent: 658.3487, changeType: "ADDED" },
    { issuer: "KRAFT HEINZ CO", ticker: "KHC", sector: "未分类", value: 7.691494401, weight: 2.570227, shares: 325634818, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "DAVITA INC", ticker: "DVA", sector: "未分类", value: 6.425268898, weight: 2.147099, shares: 28880209, shareChange: -1220376, changePercent: -4.0543, changeType: "REDUCED" },
    { issuer: "DELTA AIR LINES INC", ticker: "DAL", sector: "未分类", value: 5.3685912, weight: 1.793994, shares: 57320000, shareChange: 17510544, changePercent: 43.9859, changeType: "ADDED" },
    { issuer: "SIRIUSXM HOLDINGS INC", ticker: "SIRI", sector: "未分类", value: 3.686802237, weight: 1.231999, shares: 124807117, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "VERISIGN INC", ticker: "VRSN", sector: "未分类", value: 2.261494212, weight: 0.755712, shares: 8989880, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "KROGER CO", ticker: "KR", sector: "未分类", value: 2.16567, weight: 0.723691, shares: 39000000, shareChange: -11000000, changePercent: -22, changeType: "REDUCED" },
    { issuer: "ALLY FINL INC", ticker: "ALLY", sector: "未分类", value: 1.24065, weight: 0.414582, shares: 27000000, shareChange: -2000000, changePercent: -6.8966, changeType: "REDUCED" },
    { issuer: "LENNAR CORP", ticker: "LEN", sector: "未分类", value: 1.186481443, weight: 0.39648, shares: 13111741, shareChange: 3012099, changePercent: 29.8238, changeType: "ADDED" },
    { issuer: "LIBERTY LIVE HOLDINGS INC", ticker: "LLYVK", sector: "未分类", value: 1.118425787, weight: 0.373739, shares: 10587143, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "NEW YORK TIMES CO MTN BE", ticker: "NYT", sector: "未分类", value: 1.098686, weight: 0.367142, shares: 15700000, shareChange: 553465, changePercent: 3.6541, changeType: "ADDED" },
    { issuer: "CAPITAL ONE FINL CORP", ticker: "COF", sector: "未分类", value: 0.60186, weight: 0.20112, shares: 3000000, shareChange: -4150000, changePercent: -58.042, changeType: "REDUCED" },
    { issuer: "LIBERTY LIVE HOLDINGS INC", ticker: "LLYVA", sector: "未分类", value: 0.504941901, weight: 0.168734, shares: 4986588, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "LOUISIANA PAC CORP", ticker: "LPX", sector: "未分类", value: 0.445592617, weight: 0.148901, shares: 5664793, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "NUCOR CORP", ticker: "NUE", sector: "未分类", value: 0.413814258, weight: 0.138282, shares: 1857752, shareChange: -2049323, changePercent: -52.4516, changeType: "REDUCED" },
    { issuer: "MACYS INC", ticker: "M", sector: "未分类", value: 0.173031882, weight: 0.057821, shares: 7347426, shareChange: 4309071, changePercent: 141.8225, changeType: "ADDED" },
    { issuer: "NVR INC", ticker: "NVR", sector: "未分类", value: 0.075710501, weight: 0.0253, shares: 11112, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "LENNAR CORP", ticker: "LEN.B", sector: "未分类", value: 0.026445959, weight: 0.008837, shares: 298117, shareChange: 60414, changePercent: 25.4157, changeType: "ADDED" },
    { issuer: "JEFFERIES FINANCIAL GROUP IN", ticker: "JEF", sector: "未分类", value: 0.021669229, weight: 0.007241, shares: 433558, shareChange: 0, changePercent: 0, changeType: "UNCHANGED" },
    { issuer: "D R HORTON INC", ticker: "DHI", sector: "未分类", value: 0.000580504, weight: 0.000194, shares: 3564, shareChange: 3564, changePercent: null, changeType: "NEW" },
    { issuer: "CONSTELLATION BRANDS INC", ticker: "STZ", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -632890, changePercent: null, changeType: "EXIT" },
  ],
};

export const scionPortfolioSnapshot: PortfolioSnapshot = {
  manager: "Scion Asset Management, LLC",
  managerShort: "Scion 资产管理",
  cik: "0001649339",
  previousReportDate: "2025-06-30",
  reportDate: "2025-09-30",
  filedAt: "2025-11-03",
  source: "SEC 13F-HR",
  totalValue: 1.381198076,
  positionCount: 8,
  changes: { NEW: 7, ADDED: 1, REDUCED: 0, EXIT: 14, UNCHANGED: 0 },
  positions: [
    { issuer: "PALANTIR TECHNOLOGIES INC", ticker: "PLTR PUT", sector: "未分类", value: 0.9121, weight: 66.036872, shares: 5000000, shareChange: 5000000, changePercent: null, changeType: "NEW" },
    { issuer: "NVIDIA CORPORATION", ticker: "NVDA PUT", sector: "未分类", value: 0.18658, weight: 13.508562, shares: 1000000, shareChange: 1000000, changePercent: null, changeType: "NEW" },
    { issuer: "PFIZER INC", ticker: "PFE CALL", sector: "未分类", value: 0.15288, weight: 11.068651, shares: 6000000, shareChange: 6000000, changePercent: null, changeType: "NEW" },
    { issuer: "HALLIBURTON CO", ticker: "HAL CALL", sector: "未分类", value: 0.0615, weight: 4.452656, shares: 2500000, shareChange: 2500000, changePercent: null, changeType: "NEW" },
    { issuer: "MOLINA HEALTHCARE INC", ticker: "MOH", sector: "未分类", value: 0.02392, weight: 1.73183, shares: 125000, shareChange: 125000, changePercent: null, changeType: "NEW" },
    { issuer: "LULULEMON ATHLETICA INC", ticker: "LULU", sector: "未分类", value: 0.017793, weight: 1.288229, shares: 100000, shareChange: 50000, changePercent: 100, changeType: "ADDED" },
    { issuer: "SLM CORP", ticker: "SLM", sector: "未分类", value: 0.013287895, weight: 0.962056, shares: 480054, shareChange: 480054, changePercent: null, changeType: "NEW" },
    { issuer: "BRUKER CORP", ticker: "116794207", sector: "未分类", value: 0.013137181, weight: 0.951144, shares: 48334, shareChange: 48334, changePercent: null, changeType: "NEW" },
    { issuer: "ALIBABA GROUP HLDG LTD", ticker: "BABA CALL", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -250000, changePercent: null, changeType: "EXIT" },
    { issuer: "ASML HOLDING N V", ticker: "ASML CALL", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -25000, changePercent: null, changeType: "EXIT" },
    { issuer: "BRUKER CORP", ticker: "BRKR", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -250000, changePercent: null, changeType: "EXIT" },
    { issuer: "JD.COM INC", ticker: "JD CALL", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -1000000, changePercent: null, changeType: "EXIT" },
    { issuer: "LAUDER ESTEE COS INC", ticker: "EL CALL", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -500000, changePercent: null, changeType: "EXIT" },
    { issuer: "LAUDER ESTEE COS INC", ticker: "EL", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -150000, changePercent: null, changeType: "EXIT" },
    { issuer: "LULULEMON ATHLETICA INC", ticker: "LULU CALL", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -400000, changePercent: null, changeType: "EXIT" },
    { issuer: "MERCADOLIBRE INC", ticker: "MELI", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -3000, changePercent: null, changeType: "EXIT" },
    { issuer: "META PLATFORMS INC", ticker: "META CALL", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -100000, changePercent: null, changeType: "EXIT" },
    { issuer: "REGENERON PHARMACEUTICALS", ticker: "REGN CALL", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -200000, changePercent: null, changeType: "EXIT" },
    { issuer: "REGENERON PHARMACEUTICALS", ticker: "REGN", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -15000, changePercent: null, changeType: "EXIT" },
    { issuer: "UNITEDHEALTH GROUP INC", ticker: "UNH CALL", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -350000, changePercent: null, changeType: "EXIT" },
    { issuer: "UNITEDHEALTH GROUP INC", ticker: "UNH", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -20000, changePercent: null, changeType: "EXIT" },
    { issuer: "V F CORP", ticker: "VFC CALL", sector: "未分类", value: 0, weight: 0, shares: 0, shareChange: -1500000, changePercent: null, changeType: "EXIT" },
  ],
};

export const portfolioSnapshotsByManager: Record<string, PortfolioSnapshot> = {
  berkshire: portfolioSnapshot,
  scion: scionPortfolioSnapshot,
};

export function getPortfolioSnapshotForManager(slug: string) {
  return portfolioSnapshotsByManager[slug];
}

export function getPortfolioSnapshotByCik(cik: string) {
  return Object.values(portfolioSnapshotsByManager).find((snapshot) => snapshot.cik === cik);
}
