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
  ["/manager/bridgewater", "桥水基金｜FolioPulse", "Bridgewater Associates：从跨资产和宏观周期视角观察机构配置，适合与价值型组合进行对照。", "原始文件正在排队接入"],
]) {
  test(`renders ${path} with manager-specific metadata`, async () => {
    const response = await render(path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, new RegExp(title));
    assert.match(html, new RegExp(description));
    assert.match(html, new RegExp(visibleCopy));
    assert.doesNotMatch(html, /folio-pulse-social\.png/);
  });
}

for (const [path, title, description] of [
  ["/holding/AAPL", "AAPL 持仓未变｜FolioPulse", "APPLE INC：2026-03-31 至 2026-06-30 的持仓量、变化量与披露市值。"],
  ["/holding/GOOGL", "GOOGL 增持｜FolioPulse", "ALPHABET INC：2026-03-31 至 2026-06-30 的持仓量、变化量与披露市值。"],
  ["/holding/PLTR%20PUT?manager=scion", "PLTR PUT 新建仓｜FolioPulse", "PALANTIR TECHNOLOGIES INC：2025-06-30 至 2025-09-30 的持仓量、变化量与披露市值。"],
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
