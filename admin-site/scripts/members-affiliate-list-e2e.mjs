/**
 * Affiliate members list E2E (stage 4).
 * Run: node scripts/members-affiliate-list-e2e.mjs
 * Requires admin-site on ADMIN_BASE (default http://localhost:3000).
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require(path.resolve(here, "../../website/node_modules/playwright"));

const BASE = process.env.ADMIN_BASE || "http://localhost:3000";
const STORAGE_KEY = "aos.admin.members.affiliates.prototype.v1";
const results = [];

function ok(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await page.goto(`${BASE}/members/affiliates`, { waitUntil: "networkidle" });
  await page.evaluate((key) => sessionStorage.removeItem(key), STORAGE_KEY);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".member-affiliate-table tbody tr");

  ok(
    "페이지 제목",
    await page.getByRole("heading", { name: "제휴여행사 관리", level: 1 }).isVisible(),
  );
  ok("브레드크럼", await page.locator(".member-affiliate-breadcrumb").innerText().then((t) => t.includes("제휴여행사")));
  ok("프로토타입 안내", await page.locator(".member-affiliate-proto-note").isVisible());

  const totalsText = await page.locator(".member-affiliate-totals").innerText();
  ok("집계 전체 8건", totalsText.includes("전체") && totalsText.includes("8"));
  ok("집계 승인대기", totalsText.includes("승인대기") && totalsText.includes("3"));
  ok("집계 보완요청", totalsText.includes("보완요청") && totalsText.includes("2"));

  const resultCount = await page.locator(".member-affiliate-list-head strong b").innerText();
  ok("검색결과 8건", resultCount.trim() === "8");

  const menuChildren = await page.locator(".nav-group").filter({ hasText: "회원관리" }).locator(".subnav button").allInnerTexts();
  ok(
    "메뉴 순서 웹회원→제휴여행사",
    menuChildren[0]?.includes("웹회원관리") && menuChildren[1]?.includes("제휴여행사"),
    menuChildren.join(" | "),
  );
  ok(
    "제휴여행사 하위 활성",
    await page.locator(".subnav button.current").innerText().then((t) => t.includes("제휴여행사")),
  );

  const rowCount = await page.locator(".member-affiliate-table tbody tr").count();
  ok("시드 행 8건", rowCount === 8);

  const firstIdCell = await page.locator(".member-affiliate-table tbody tr").first().locator(".member-affiliate-id-cell").innerText();
  ok(
    "최신순 접수번호(승인 전)",
    firstIdCell.includes("AOS-P-20260903-1003") && !firstIdCell.includes("AFF-"),
    firstIdCell.replace(/\s+/g, " ").trim(),
  );

  const detailHref = await page.locator(".member-affiliate-table tbody tr").first().locator("a.member-detail-button").getAttribute("href");
  ok("상세 href AFA-003", detailHref === "/members/affiliates/AFA-003", detailHref || "");

  const approvedRow = page.locator(".member-affiliate-table tbody tr").filter({ hasText: "AFF-102" }).first();
  ok("승인 후 AFF 코드", await approvedRow.locator(".member-affiliate-id-cell strong").innerText().then((t) => t.includes("AFF-102")));
  ok(
    "승인 후 보조 접수번호",
    await approvedRow.locator(".member-affiliate-id-cell small").innerText().then((t) => t.includes("AOS-P-")),
  );
  ok(
    "복수 그룹 요약",
    await approvedRow.locator(".member-affiliate-groups").innerText().then((t) => t.includes("외") && t.includes("개")),
  );

  const maskedBiz = await page.locator(".member-affiliate-biz").first().innerText();
  ok("사업자번호 마스킹", /^\d{3}-\*\*-\*{5}$/.test(maskedBiz.trim()), maskedBiz);

  const bodyHtml = await page.content();
  ok("수락대기 미사용", !bodyHtml.includes("수락대기"));

  // Draft change should not apply until search
  await page.fill("#affiliate-keyword", "블루하버");
  await page.waitForTimeout(150);
  ok(
    "draft만 변경 시 결과 유지",
    (await page.locator(".member-affiliate-list-head strong b").innerText()).trim() === "8",
  );

  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page.waitForTimeout(200);
  ok(
    "여행사명 검색",
    (await page.locator(".member-affiliate-list-head strong b").innerText()).trim() === "1",
  );

  await page.fill("#affiliate-keyword", "AOS-P-20260902-1002");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  ok(
    "Enter 접수번호 검색",
    (await page.locator(".member-affiliate-list-head strong b").innerText()).trim() === "1",
  );

  await page.fill("#affiliate-keyword", "AFF-101");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector(".member-affiliate-list-head strong b")?.textContent?.trim() === "1",
    null,
    { timeout: 3000 },
  ).catch(() => null);
  const affHits = (await page.locator(".member-affiliate-list-head strong b").innerText()).trim();
  ok("제휴코드 검색", affHits === "1", affHits);

  await page.fill("#affiliate-keyword", "1018111111");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page.waitForTimeout(200);
  ok(
    "사업자번호 숫자 검색",
    (await page.locator(".member-affiliate-list-head strong b").innerText()).trim() === "1",
  );

  await page.fill("#affiliate-keyword", "이담당");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page.waitForTimeout(200);
  const contactHits = Number((await page.locator(".member-affiliate-list-head strong b").innerText()).trim());
  ok("담당자명 검색", contactHits >= 1);

  await page.selectOption("#affiliate-app-status", "승인대기");
  await page.fill("#affiliate-keyword", "");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page.waitForTimeout(200);
  ok(
    "가입상태 필터 승인대기",
    (await page.locator(".member-affiliate-list-head strong b").innerText()).trim() === "3",
  );

  await page.selectOption("#affiliate-partnership-status", "활성");
  await page.selectOption("#affiliate-app-status", "전체");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page.waitForTimeout(200);
  ok(
    "제휴관계 활성 필터",
    (await page.locator(".member-affiliate-list-head strong b").innerText()).trim() === "2",
  );

  await page.fill("#affiliate-from", "2026-09-03");
  await page.fill("#affiliate-to", "2026-09-01");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page.waitForTimeout(200);
  ok("날짜 오류 표시", await page.locator("#affiliate-date-error").isVisible());
  ok(
    "날짜 오류 시 이전 결과 유지",
    (await page.locator(".member-affiliate-list-head strong b").innerText()).trim() === "2",
  );

  await page.getByRole("button", { name: "초기화", exact: true }).click();
  await page.waitForTimeout(200);
  ok(
    "초기화 후 8건",
    (await page.locator(".member-affiliate-list-head strong b").innerText()).trim() === "8",
  );

  await page.fill("#affiliate-keyword", "존재하지않는여행사XYZ");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await page.waitForTimeout(200);
  ok("빈 결과 문구", await page.getByText("검색조건에 맞는 제휴여행사가 없습니다.").isVisible());
  await page.getByRole("button", { name: "검색조건 초기화" }).click();
  await page.waitForTimeout(200);
  ok(
    "빈결과 초기화 복원",
    (await page.locator(".member-affiliate-list-head strong b").innerText()).trim() === "8",
  );

  // Sample reset dialog
  await page.getByRole("button", { name: "샘플 초기화" }).click();
  ok("초기화 다이얼로그", await page.getByRole("dialog", { name: "샘플 데이터 초기화" }).isVisible());
  await page.getByRole("button", { name: "취소" }).click();
  ok("초기화 취소", !(await page.getByRole("dialog", { name: "샘플 데이터 초기화" }).isVisible()));

  await page.evaluate((key) => {
    sessionStorage.setItem(
      key,
      JSON.stringify({ version: 1, overrides: { "AFA-001": { broken: true } } }),
    );
  }, STORAGE_KEY);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".member-affiliate-table tbody tr");
  ok(
    "잘못된 storage에도 목록 표시",
    (await page.locator(".member-affiliate-list-head strong b").innerText()).trim() === "8",
  );

  await page.getByRole("button", { name: "샘플 초기화" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "샘플 초기화" }).click();
  await page.waitForTimeout(300);
  ok("샘플 초기화 토스트", await page.locator(".toast").isVisible());
  const keyAfterReset = await page.evaluate((key) => sessionStorage.getItem(key), STORAGE_KEY);
  ok("전용 storage 삭제", keyAfterReset === null);
  ok(
    "초기화 후 시드 집계",
    await page.locator(".member-affiliate-totals").innerText().then((t) => t.includes("전체") && t.includes("8") && t.includes("승인대기") && t.includes("3") && t.includes("보완요청") && t.includes("2")),
  );
  ok(
    "초기화 후 AFF-101 복원",
    await page.locator(".member-affiliate-table").getByText("AFF-101").count().then((n) => n >= 1),
  );
  ok(
    "초기화 후 AFF-102 복원",
    await page.locator(".member-affiliate-table").getByText("AFF-102").count().then((n) => n >= 1),
  );

  // Responsive: no body overflow at 1280 / 1024
  for (const width of [1440, 1280, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(100);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    ok(`body 가로스크롤 없음 ${width}`, !overflow);
  }

  // Other pages still 200
  const webRes = await page.goto(`${BASE}/members/web`, { waitUntil: "domcontentloaded" });
  ok("/members/web 200", webRes?.status() === 200);
  ok(
    "웹회원관리 활성 유지",
    await page.locator(".subnav button.current").innerText().then((t) => t.includes("웹회원관리")),
  );

  const productsRes = await page.goto(`${BASE}/products`, { waitUntil: "domcontentloaded" });
  ok("/products 200", productsRes?.status() === 200);

  const filteredConsole = consoleErrors.filter(
    (text) => !text.includes("Download the React DevTools") && !text.includes("favicon"),
  );
  ok("콘솔 오류 없음", filteredConsole.length === 0 && pageErrors.length === 0, filteredConsole.join(" | ") || pageErrors.join(" | "));

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
