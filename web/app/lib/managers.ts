export type ManagerStatus = "live" | "queued";

export type ManagerProfile = {
  slug: string;
  initials: string;
  name: string;
  nameZh: string;
  vehicle: string;
  description: string;
  tags: string[];
  status: ManagerStatus;
  coverage: string;
  disclosure?: string;
};

export const managerProfiles: ManagerProfile[] = [
  {
    slug: "berkshire", initials: "BH", name: "Berkshire Hathaway", nameZh: "伯克希尔·哈撒韦",
    vehicle: "长期价值投资", description: "以长期持有、高质量企业和集中组合著称。当前已接入最新 SEC 13F 持仓快照。",
    tags: ["价值", "集中持仓", "长期"], status: "live", coverage: "持仓与季度变化已接入",
  },
  {
    slug: "ark", initials: "ARK", name: "ARK Investment Management", nameZh: "ARK Invest（木头姐）",
    vehicle: "颠覆式创新与成长", description: "由 Cathie Wood（木头姐）创立，以颠覆式创新主题和高频主动调仓著称。当前已接入 ARK 最新公开 SEC 13F。",
    tags: ["创新成长", "科技", "主动交易"], status: "live", coverage: "ARK 公开申报持仓与季度变化已接入",
    disclosure: "本页展示季度 SEC 13F 机构申报，不是实时交易记录；SPACEX 是私有证券的页面显示标识，并非交易所股票代码。",
  },
  {
    slug: "hh-international", initials: "H&H", name: "H&H International Investment", nameZh: "H&H International（段永平相关）",
    vehicle: "长期价值与集中持仓", description: "公开数据来自 H&H International Investment 的 SEC 13F；该主体常被用于观察段永平相关的美股配置。",
    tags: ["价值", "集中持仓", "中概股"], status: "live", coverage: "H&H 公开申报主体持仓与季度变化已接入",
    disclosure: "本页展示 H&H International Investment 的机构申报，不代表段永平个人全部资产、其他账户或实时持仓。",
  },
  {
    slug: "bridgewater", initials: "BW", name: "Bridgewater Associates", nameZh: "桥水基金",
    vehicle: "全球宏观", description: "从跨资产和宏观周期视角观察机构配置。当前已接入 Bridgewater 最新公开 SEC 13F。",
    tags: ["宏观", "跨资产", "分散"], status: "live", coverage: "美股与 ETF 公开申报、季度变化已接入",
    disclosure: "13F 只覆盖符合申报范围的美国上市证券，不包含桥水完整的全球宏观、期货、外汇或场外衍生品敞口。",
  },
  {
    slug: "scion", initials: "SA", name: "Scion Asset Management", nameZh: "Scion 资产管理",
    vehicle: "逆向与事件驱动", description: "关注逆向机会、估值错配和高确信度仓位。当前已接入其最新公开 SEC 13F，并明确标注期权方向。",
    tags: ["逆向", "事件驱动", "高确信度"], status: "live", coverage: "持仓、期权方向与季度变化已接入",
  },
  {
    slug: "pershing-square", initials: "PS", name: "Pershing Square Capital Management", nameZh: "潘兴广场",
    vehicle: "集中型主动投资", description: "以少量核心仓位和主动参与公司价值提升为特点。当前已接入 SEC 最新可用公开 13F。",
    tags: ["集中", "主动投资", "质量"], status: "live", coverage: "最新可用持仓与季度变化已接入",
    disclosure: "截至本次更新，SEC 最新可用报告期为 2026-03-31；页面不会用预测数据代替尚未公开的新季度申报。",
  },
  {
    slug: "appaloosa", initials: "AP", name: "Appaloosa LP", nameZh: "Appaloosa（David Tepper）",
    vehicle: "机会型投资", description: "关注市场错价、周期机会与资本结构变化。当前已接入 Appaloosa LP 最新公开 SEC 13F。",
    tags: ["机会型", "周期", "灵活配置"], status: "live", coverage: "持仓、期权方向与季度变化已接入",
    disclosure: "公开数据来自 Appaloosa LP 的机构申报，不等于 David Tepper 的个人全部资产或实时交易。",
  },
  {
    slug: "duquesne", initials: "DQ", name: "Duquesne Family Office", nameZh: "Duquesne（Stanley Druckenmiller）",
    vehicle: "宏观与成长", description: "结合宏观判断与公司选择。当前已接入 Duquesne 最新公开 SEC 13F 和期权方向。",
    tags: ["成长", "宏观", "行业轮动"], status: "live", coverage: "持仓、期权方向与季度变化已接入",
    disclosure: "该期申报市值与持股量呈明显千倍单位偏差；页面将申报市值乘以 1,000 以便阅读，并保留原始持股数量与季度变化。",
  },
];

export function getManager(slug: string) {
  return managerProfiles.find((manager) => manager.slug === slug);
}
