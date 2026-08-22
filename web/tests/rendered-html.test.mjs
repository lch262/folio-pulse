import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the FolioPulse dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /FolioPulse/);
  assert.match(html, /伯克希尔·哈撒韦/);
  assert.match(html, /持仓与变化/);
  assert.match(html, /仅看变动/);
  assert.match(html, /本季持仓量/);
  assert.match(html, /投资人网络已启用/);
  assert.match(html, /导入快照/);
  assert.match(html, /SEC 13F/);
  assert.match(html, /href="\/holdings"/);
  assert.match(html, /href="\/holding\/AAPL"/);
  assert.match(html, /追踪更多投资人/);
  assert.match(html, /href="\/managers"/);
  assert.doesNotMatch(html, /Your site is taking shape|SkeletonPreview/);
});

for (const [path, heading, description] of [
  ["/holdings", "完整持仓", "查看伯克希尔 13F 的完整持仓、市值、股数和季度变化。"],
  ["/changes", "季度调仓", "按新建、增持、减持和清仓查看伯克希尔最新季度资金动作。"],
  ["/methodology", "数据说明", "了解 FolioPulse 如何读取 SEC 13F、比较季度持仓并解释数据时效。"],
  ["/managers", "投资人中心", "搜索、关注并查看知名投资机构的 SEC 13F 持仓档案与数据接入状态。"],
]) {
  test(`renders ${path} with route-specific metadata`, async () => {
    const response = await render(path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(heading));
    assert.match(html, new RegExp(description));
    assert.doesNotMatch(html, /folio-pulse-social\.png/);
  });
}

for (const [path, title, description, visibleCopy] of [
  ["/manager/berkshire", "伯克希尔·哈撒韦｜FolioPulse", "Berkshire Hathaway：以长期持有、高质量企业和集中组合著称。当前已接入最新 SEC 13F 持仓快照。", "前五大持仓"],
  ["/manager/scion", "Scion 资产管理｜FolioPulse", "Scion Asset Management：关注逆向机会、估值错配和高确信度仓位。当前已接入其最新公开 SEC 13F，并明确标注期权方向。", "PLTR PUT"],
  ["/manager/ark", "ARK Invest（木头姐）｜FolioPulse", "ARK Investment Management：由 Cathie Wood（木头姐）创立，以颠覆式创新主题和高频主动调仓著称。当前已接入 ARK 最新公开 SEC 13F。", "TSLA"],
  ["/manager/hh-international", "H&amp;H International（段永平相关）｜FolioPulse", "H&amp;H International Investment：公开数据来自 H&amp;H International Investment 的 SEC 13F；该主体常被用于观察段永平相关的美股配置。", "不代表段永平个人全部资产"],
  ["/manager/bridgewater", "桥水基金｜FolioPulse", "Bridgewater Associates：从跨资产和宏观周期视角观察机构配置。当前已接入 Bridgewater 最新公开 SEC 13F。", "SPY"],
  ["/manager/pershing-square", "潘兴广场｜FolioPulse", "Pershing Square Capital Management：以少量核心仓位和主动参与公司价值提升为特点。当前已接入 SEC 最新可用公开 13F。", "BN"],
  ["/manager/appaloosa", "Appaloosa（David Tepper）｜FolioPulse", "Appaloosa LP：关注市场错价、周期机会与资本结构变化。当前已接入 Appaloosa LP 最新公开 SEC 13F。", "AMZN"],
  ["/manager/duquesne", "Duquesne（Stanley Druckenmiller）｜FolioPulse", "Duquesne Family Office：结合宏观判断与公司选择。当前已接入 Duquesne 最新公开 SEC 13F 和期权方向。", "申报单位校正"],
]) {
  test(`renders ${path} with manager-specific metadata`, async () => {
    const response = await render(path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(title));
    assert.match(html, new RegExp(description));
    assert.match(html, new RegExp(visibleCopy));
    assert.match(html, /季度增减持折线图/);
    assert.doesNotMatch(html, /folio-pulse-social\.png/);
  });
}

for (const [path, title, description] of [
  ["/holding/AAPL", "AAPL 持仓未变｜FolioPulse", "APPLE INC：2026-03-31 至 2026-06-30 的持仓量、变化量与披露市值。"],
  ["/holding/GOOGL", "GOOGL 增持｜FolioPulse", "ALPHABET INC：2026-03-31 至 2026-06-30 的持仓量、变化量与披露市值。"],
  ["/holding/PLTR%20PUT?manager=scion", "PLTR PUT 新建仓｜FolioPulse", "PALANTIR TECHNOLOGIES INC：2025-06-30 至 2025-09-30 的持仓量、变化量与披露市值。"],
  ["/holding/TSLA?manager=ark", "TSLA 减持｜FolioPulse", "Tesla Inc：2026-03-31 至 2026-06-30 的持仓量、变化量与披露市值。"],
  ["/holding/AAPL?manager=hh-international", "AAPL 减持｜FolioPulse", "APPLE INC：2026-03-31 至 2026-06-30 的持仓量、变化量与披露市值。"],
  ["/holding/SPY?manager=bridgewater", "SPY 增持｜FolioPulse", "STATE STR SPDR S&amp;P 500 ETF T：2026-03-31 至 2026-06-30 的持仓量、变化量与披露市值。"],
  ["/holding/MSFT?manager=pershing-square", "MSFT 新建仓｜FolioPulse", "MICROSOFT CORP：2025-12-31 至 2026-03-31 的持仓量、变化量与披露市值。"],
  ["/holding/AMZN?manager=appaloosa", "AMZN 增持｜FolioPulse", "AMAZON COM INC：2026-03-31 至 2026-06-30 的持仓量、变化量与披露市值。"],
  ["/holding/NTRA?manager=duquesne", "NTRA 增持｜FolioPulse", "Natera Inc：2026-03-31 至 2026-06-30 的持仓量、变化量与披露市值。"],
]) {
  test(`renders ${path} with record-specific metadata`, async () => {
    const response = await render(path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(title));
    assert.match(html, new RegExp(description));
    assert.match(html, /持股数量变化/);
    assert.match(html, /复制页面链接/);
    assert.doesNotMatch(html, /folio-pulse-social\.png/);
  });
}
