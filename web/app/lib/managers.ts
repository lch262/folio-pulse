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
};

export const managerProfiles: ManagerProfile[] = [
  {
    slug: "berkshire", initials: "BH", name: "Berkshire Hathaway", nameZh: "伯克希尔·哈撒韦",
    vehicle: "长期价值投资", description: "以长期持有、高质量企业和集中组合著称。当前已接入最新 SEC 13F 持仓快照。",
    tags: ["价值", "集中持仓", "长期"], status: "live", coverage: "持仓与季度变化已接入",
  },
  {
    slug: "bridgewater", initials: "BW", name: "Bridgewater Associates", nameZh: "桥水基金",
    vehicle: "全球宏观", description: "从跨资产和宏观周期视角观察机构配置，适合与价值型组合进行对照。",
    tags: ["宏观", "跨资产", "分散"], status: "queued", coverage: "SEC 数据排队接入",
  },
  {
    slug: "scion", initials: "SA", name: "Scion Asset Management", nameZh: "Scion 资产管理",
    vehicle: "逆向与事件驱动", description: "关注逆向机会、估值错配和高确信度仓位。当前已接入其最新公开 SEC 13F，并明确标注期权方向。",
    tags: ["逆向", "事件驱动", "高确信度"], status: "live", coverage: "持仓、期权方向与季度变化已接入",
  },
  {
    slug: "pershing-square", initials: "PS", name: "Pershing Square Capital Management", nameZh: "潘兴广场",
    vehicle: "集中型主动投资", description: "以少量核心仓位和主动参与公司价值提升为特点，适合追踪集中度变化。",
    tags: ["集中", "主动投资", "质量"], status: "queued", coverage: "SEC 数据排队接入",
  },
  {
    slug: "appaloosa", initials: "AM", name: "Appaloosa Management", nameZh: "阿帕卢萨管理",
    vehicle: "机会型投资", description: "关注市场错价、周期机会与资本结构变化，可用于观察风险偏好的转折。",
    tags: ["机会型", "周期", "灵活配置"], status: "queued", coverage: "SEC 数据排队接入",
  },
  {
    slug: "duquesne", initials: "DF", name: "Duquesne Family Office", nameZh: "杜肯家族办公室",
    vehicle: "宏观与成长", description: "结合宏观判断与公司选择，适合追踪成长仓位和行业轮动线索。",
    tags: ["成长", "宏观", "行业轮动"], status: "queued", coverage: "SEC 数据排队接入",
  },
];

export function getManager(slug: string) {
  return managerProfiles.find((manager) => manager.slug === slug);
}
