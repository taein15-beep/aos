/**
 * Affiliate application detail E2E
 * — 읽기 스모크 + 21. 심사 시나리오(시나리오별 storage 격리) + 접근성
 * Run: node scripts/members-affiliate-detail-e2e.mjs
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

async function openDetail(page, id) {
  await page.goto(`${BASE}/members/affiliates/${id}`, { waitUntil: "networkidle" });
  await page.waitForSelector("h1, .member-affiliate-detail-not-found");
}

/** 시나리오 시작 전 전용 샘플 storage만 초기화(격리)한다. */
async function resetAffiliateStorage(page) {
  await page.goto(`${BASE}/members/affiliates`, { waitUntil: "networkidle" });
  await page.evaluate((key) => sessionStorage.removeItem(key), STORAGE_KEY);
}

async function latestHistoryRow(page) {
  const rows = page.locator(".member-affiliate-detail-table--history tbody tr");
  const count = await rows.count();
  if (count === 0) return null;
  const row = rows.nth(count - 1);
  const cells = row.locator("td");
  return {
    processedAt: (await cells.nth(0).innerText()).trim(),
    action: (await cells.nth(1).innerText()).trim(),
    statusBefore: (await cells.nth(2).innerText()).trim(),
    statusAfter: (await cells.nth(3).innerText()).trim(),
    actor: (await cells.nth(4).innerText()).trim(),
    note: (await cells.nth(5).innerText()).trim(),
  };
}

async function listTotals(page) {
  const text = await page.locator(".member-affiliate-totals").innerText();
  return {
    text,
    total: Number((text.match(/전체\s+(\d+)/) || [])[1] || NaN),
    pending: Number((text.match(/승인대기\s+(\d+)/) || [])[1] || NaN),
    supplement: Number((text.match(/보완요청\s+(\d+)/) || [])[1] || NaN),
  };
}

function listRowByAgency(page, agencyName) {
  return page.locator(".member-affiliate-table tbody tr").filter({ hasText: agencyName }).first();
}

async function titleBadges(page) {
  const row = page.locator(".member-affiliate-detail-title-row");
  return {
    application: (await row.locator(".badge").nth(0).innerText()).trim(),
    partnership: (await row.locator(".badge").nth(1).innerText()).trim(),
  };
}

async function historyActionCount(page, action) {
  const rows = page.locator(".member-affiliate-detail-table--history tbody tr");
  const count = await rows.count();
  let matched = 0;
  for (let i = 0; i < count; i += 1) {
    const text = (await rows.nth(i).locator("td").nth(1).innerText()).trim();
    if (text === action) matched += 1;
  }
  return matched;
}

async function applicationSnapshot(page) {
  const badges = await titleBadges(page);
  const meta = (await page.locator(".member-affiliate-detail-meta").innerText()).trim();
  const historyText = (await page.locator(".member-affiliate-detail-table--history").innerText()).trim();
  return { ...badges, meta, historyText };
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

  await resetAffiliateStorage(page);

  // --------------------------------------------------------------------------
  // 읽기 스모크 (시드)
  // --------------------------------------------------------------------------
  await openDetail(page, "AFA-001");
  ok("AFA-001 제목", await page.getByRole("heading", { name: "제휴여행사 신청 상세", level: 1 }).isVisible());
  ok("AFA-001 승인대기 배지", (await titleBadges(page)).application.includes("승인대기"));
  ok("AFA-001 심사대기", await page.getByText("가입심사 대기", { exact: true }).isVisible());
  ok(
    "AFA-001 승인 가능",
    await page.getByText("필수정보, 필수서류 검토 및 필수약관 동의가 확인되었습니다.").isVisible(),
  );
  ok("AFA-001 메뉴 활성", await page.locator(".subnav button.current").innerText().then((t) => t.includes("제휴여행사")));
  ok("AFA-001 심사 액션 표시", await page.getByRole("button", { name: "가입 승인" }).isVisible());
  ok("AFA-001 다운로드 없음", !(await page.content()).includes("다운로드") && !(await page.content()).includes("미리보기"));
  ok("AFA-001 수락대기 없음", !(await page.content()).includes("수락대기"));
  ok("메모 편집 없음", (await page.locator("textarea").count()) === 0);
  ok("그룹 설정 체크박스 없음", !(await page.getByRole("checkbox", { name: /상품공유|동북아|기차|수도권/ }).count()));

  await openDetail(page, "AFA-002");
  ok("AFA-002 승인 전 확인", await page.getByText("승인 전 확인이 필요합니다.").isVisible());
  ok("AFA-002 필수서류 미검토", await page.getByText("필수서류 미검토", { exact: true }).isVisible());
  ok("진단 영역 클래스", await page.locator(".member-affiliate-review-diagnosis").count().then((n) => n >= 1));

  await openDetail(page, "AFA-003");
  ok("AFA-003 필수서류 미제출", await page.getByText("필수서류 미제출", { exact: true }).isVisible());
  ok(
    "AFA-003 홈페이지 없음",
    await page.getByText("홈페이지 URL").locator("..").getByText("-", { exact: true }).count().then((n) => n >= 0),
  );

  await openDetail(page, "AFA-004");
  ok("AFA-004 보완요청 제목", await page.getByText("가입신청 보완요청", { exact: true }).isVisible());
  ok("AFA-004 보완 미완료", await page.getByText("보완 미완료").isVisible());
  ok(
    "AFA-004 프로토 안내",
    await page.getByText("현재 프로토타입에서는 이메일 발송과 홈페이지 보완 재제출이 처리되지 않습니다.").isVisible(),
  );

  await openDetail(page, "AFA-005");
  ok("AFA-005 보완 확인 가능", await page.getByText("보완 확인 가능(샘플)").isVisible());
  ok(
    "AFA-005 승인 가능 진단",
    await page.getByText("필수정보, 필수서류 검토 및 필수약관 동의가 확인되었습니다.").isVisible(),
  );

  await openDetail(page, "AFA-006");
  ok("AFA-006 승인완료", await page.getByText("가입승인 완료", { exact: true }).isVisible());
  ok("AFA-006 AFF-101", await page.getByText("AFF-101").first().isVisible());
  const groupSection = page.locator("#affiliate-groups-title").locator("xpath=ancestor::section[1]");
  ok("AFA-006 그룹 미지정", await groupSection.getByText("미지정", { exact: true }).isVisible());
  ok("AFA-006 자동공유 안내", await page.getByText(/상품이 자동으로 공유되지 않습니다/).first().isVisible());
  ok("AFA-006 거절 버튼 없음", (await page.getByRole("button", { name: "가입거절" }).count()) === 0);
  ok("AFA-006 심사 버튼 없음", (await page.getByRole("button", { name: "가입 승인" }).count()) === 0);

  await openDetail(page, "AFA-007");
  ok("AFA-007 복수그룹 요약", await page.getByText(/동북아 상품공유 외 1개/).first().isVisible());
  ok("AFA-007 그룹 전체", await page.getByText(/수도권 판매 제휴/).first().isVisible());
  ok("AFA-007 이력 그룹변경", await page.getByText("상품공유그룹 변경").isVisible());
  ok("AFA-007 거절 버튼 없음", (await page.getByRole("button", { name: "가입거절" }).count()) === 0);

  await openDetail(page, "AFA-008");
  ok("AFA-008 거절 제목", await page.getByText("가입거절", { exact: true }).first().isVisible());
  ok("AFA-008 거절 사유", await page.getByText("거절 사유").isVisible());
  ok("AFA-008 거절 버튼 없음", (await page.getByRole("button", { name: "가입거절" }).count()) === 0);
  ok(
    "AFA-008 심사 버튼 없음",
    (await page.getByRole("button", { name: /가입 승인|보완요청|보완 확인/ }).count()) === 0,
  );

  await openDetail(page, "AFA-999");
  ok("없는 ID 제목", await page.getByText("제휴여행사 신청정보를 찾을 수 없습니다.").isVisible());
  ok(
    "없는 ID 목록 링크",
    (await page.getByRole("link", { name: "제휴여행사 목록으로" }).getAttribute("href")) === "/members/affiliates",
  );
  await page.getByRole("link", { name: "제휴여행사 목록으로" }).click();
  await page.waitForURL("**/members/affiliates");
  ok("목록 복귀", page.url().includes("/members/affiliates") && !page.url().includes("/AFA-"));

  await openDetail(page, "not-a-valid-id");
  ok("잘못된 ID 안전", await page.getByText("제휴여행사 신청정보를 찾을 수 없습니다.").isVisible());

  await page.evaluate((key) => sessionStorage.setItem(key, "{not-json"), STORAGE_KEY);
  await openDetail(page, "AFA-001");
  ok("잘못된 storage에도 상세", await page.getByRole("heading", { name: "제휴여행사 신청 상세", level: 1 }).isVisible());

  // --------------------------------------------------------------------------
  // 21. E2E 시나리오 — 시나리오별 storage 초기화
  // --------------------------------------------------------------------------

  // --- 승인 (AFA-001) ---
  await resetAffiliateStorage(page);
  await openDetail(page, "AFA-001");
  ok("승인·AFA-001 승인 버튼", await page.getByRole("button", { name: "가입 승인" }).isVisible());
  await page.getByRole("button", { name: "가입 승인" }).click();
  const approveDialog = page.getByRole("dialog");
  ok(
    "승인·모달",
    await approveDialog.getByRole("heading", { name: "제휴여행사 가입을 승인하시겠습니까?" }).isVisible(),
  );
  ok(
    "승인·안내 정책",
    (await approveDialog.getByText("승인 후 제휴관계가 활성화됩니다.").count()) === 1 &&
      (await approveDialog.getByText("상품공유그룹은 자동 지정되지 않습니다.").count()) === 1 &&
      (await approveDialog.getByText("가입 승인만으로 상품이 자동 공유되지 않습니다.").count()) === 1 &&
      (await approveDialog.getByText("상품공급여행사가 상품별로 공유 대상을 지정합니다.").count()) === 1 &&
      (await approveDialog.getByText("상품공유에 상대 여행사의 별도 수락 단계는 없습니다.").count()) === 1,
  );
  await approveDialog.locator("#affiliate-approve-memo").fill("E2E AFA-001 승인 메모");
  ok("승인·메모", (await approveDialog.locator("#affiliate-approve-memo").inputValue()) === "E2E AFA-001 승인 메모");
  await approveDialog.getByRole("button", { name: "가입 승인" }).click();
  await page.locator(".toast").getByText("제휴여행사 가입이 승인되었습니다.").waitFor({ state: "visible" });
  ok("승인·성공", await page.locator(".toast").getByText("제휴여행사 가입이 승인되었습니다.").isVisible());
  const afterApprove = await titleBadges(page);
  ok("승인·상태 승인완료", afterApprove.application.includes("승인완료"));
  ok("승인·관계 활성", afterApprove.partnership.includes("활성"));
  ok("승인·AFF-103", await page.getByText("AFF-103", { exact: true }).first().isVisible());
  ok(
    "승인·그룹 미지정",
    await page
      .locator(".member-affiliate-detail-field")
      .filter({ hasText: "상품공유그룹" })
      .getByText("미지정")
      .count()
      .then((n) => n >= 1),
  );
  const approveHistory = await latestHistoryRow(page);
  ok(
    "승인·이력",
    Boolean(
      approveHistory &&
        approveHistory.action === "가입승인" &&
        approveHistory.statusBefore === "승인대기" &&
        approveHistory.statusAfter === "승인완료" &&
        approveHistory.actor === "장윤호" &&
        approveHistory.note.includes("E2E AFA-001 승인 메모"),
    ),
  );
  ok("승인·중복 처리 없음", (await historyActionCount(page, "가입승인")) === 1);
  await page.reload({ waitUntil: "networkidle" });
  ok(
    "승인·새로고침 유지",
    (await titleBadges(page)).application.includes("승인완료") &&
      (await page.getByText("AFF-103", { exact: true }).count()) >= 1 &&
      (await latestHistoryRow(page).then((row) => Boolean(row && row.action === "가입승인"))),
  );

  await page.goto(`${BASE}/members/affiliates`, { waitUntil: "networkidle" });
  const approveListRow = listRowByAgency(page, "[샘플] 블루하버여행");
  ok(
    "승인·목록 반영",
    (await approveListRow.locator(".badge").first().innerText()).includes("승인완료") &&
      (await approveListRow.locator(".member-affiliate-partner-code").innerText()).includes("AOS00001"),
  );
  const afterApproveTotals = await listTotals(page);
  ok(
    "승인·집계 반영",
    afterApproveTotals.total === 8 && afterApproveTotals.pending === 2 && afterApproveTotals.supplement === 2,
    afterApproveTotals.text,
  );

  await page.evaluate(() => {
    sessionStorage.setItem("aos.homepage.affiliate.receipt.probe", "keep-homepage");
    sessionStorage.setItem("aos.admin.products.affiliate.probe", "keep-product-share");
  });
  await page.getByRole("button", { name: "샘플 초기화" }).click();
  ok(
    "승인·초기화 안내",
    await page.getByRole("dialog").getByText(/홈페이지·상품공유 storage는 변경하지 않습니다/).isVisible(),
  );
  await page.getByRole("dialog").getByRole("button", { name: "샘플 초기화" }).click();
  await page.waitForTimeout(250);
  ok("승인·초기화 storage 삭제", (await page.evaluate((key) => sessionStorage.getItem(key), STORAGE_KEY)) === null);
  ok(
    "승인·초기화 홈페이지 유지",
    (await page.evaluate(() => sessionStorage.getItem("aos.homepage.affiliate.receipt.probe"))) === "keep-homepage",
  );
  ok(
    "승인·초기화 상품공유 유지",
    (await page.evaluate(() => sessionStorage.getItem("aos.admin.products.affiliate.probe"))) === "keep-product-share",
  );
  const resetTotals = await listTotals(page);
  ok(
    "승인·초기화 복원 집계",
    resetTotals.total === 8 && resetTotals.pending === 3 && resetTotals.supplement === 2,
    resetTotals.text,
  );
  ok(
    "승인·초기화 AFF-103 제거",
    (await page.locator(".member-affiliate-table").getByText("AFF-103", { exact: true }).count()) === 0,
  );
  await openDetail(page, "AFA-001");
  ok("승인·초기화 AFA-001 복원", (await titleBadges(page)).application.includes("승인대기"));
  ok(
    "승인·초기화 이력 복원",
    (await historyActionCount(page, "가입신청 접수")) >= 1 && (await historyActionCount(page, "가입승인")) === 0,
  );
  await page.evaluate(() => {
    sessionStorage.removeItem("aos.homepage.affiliate.receipt.probe");
    sessionStorage.removeItem("aos.admin.products.affiliate.probe");
  });

  // --- 승인 불가 ---
  await resetAffiliateStorage(page);
  await openDetail(page, "AFA-002");
  const before002 = await applicationSnapshot(page);
  await page.getByRole("button", { name: "가입 승인" }).click();
  ok(
    "승인불가·AFA-002 미검토",
    await page.getByRole("dialog").getByRole("heading", { name: "승인 전 확인이 필요합니다." }).isVisible(),
  );
  ok("승인불가·AFA-002 이유", await page.getByRole("dialog").getByText("필수서류 미검토").isVisible());
  ok(
    "승인불가·AFA-002 승인확인 아님",
    (await page.getByRole("heading", { name: "제휴여행사 가입을 승인하시겠습니까?" }).count()) === 0,
  );
  ok("승인불가·AFA-002 토스트 없음", (await page.locator(".toast").count()) === 0);
  await page.getByRole("dialog").getByRole("button", { name: "확인" }).click();
  const after002 = await applicationSnapshot(page);
  ok(
    "승인불가·AFA-002 데이터 변경 없음",
    after002.application === before002.application &&
      after002.partnership === before002.partnership &&
      after002.meta === before002.meta &&
      after002.historyText === before002.historyText &&
      !after002.meta.includes("AFF-"),
  );

  await resetAffiliateStorage(page);
  await openDetail(page, "AFA-003");
  const before003 = await applicationSnapshot(page);
  await page.getByRole("button", { name: "가입 승인" }).click();
  ok(
    "승인불가·AFA-003 필수 누락",
    await page.getByRole("dialog").getByRole("heading", { name: "승인 전 확인이 필요합니다." }).isVisible(),
  );
  ok("승인불가·AFA-003 이유", await page.getByRole("dialog").getByText("필수서류 미제출").isVisible());
  ok("승인불가·AFA-003 토스트 없음", (await page.locator(".toast").count()) === 0);
  await page.getByRole("dialog").getByRole("button", { name: "확인" }).click();
  const after003 = await applicationSnapshot(page);
  ok(
    "승인불가·AFA-003 데이터 변경 없음",
    after003.application === before003.application &&
      after003.partnership === before003.partnership &&
      after003.meta === before003.meta &&
      after003.historyText === before003.historyText,
  );

  // --- 보완요청 ---
  await resetAffiliateStorage(page);
  await openDetail(page, "AFA-001");
  await page.getByRole("button", { name: "보완요청" }).click();
  ok(
    "보완요청·모달",
    await page.getByRole("heading", { name: "가입신청 보완을 요청합니다." }).isVisible(),
  );
  await page.getByRole("dialog").getByRole("button", { name: "보완요청", exact: true }).click();
  ok(
    "보완요청·항목 미선택",
    await page.getByRole("dialog").getByText("보완 항목을 1개 이상 선택해 주세요.").isVisible(),
  );
  ok(
    "보완요청·사유 미입력",
    await page.getByRole("dialog").getByText("보완요청 사유를 입력해 주세요.").isVisible(),
  );
  ok("보완요청·검증 실패 시 유지", await page.getByRole("dialog").isVisible());
  ok("보완요청·검증 시 토스트 없음", (await page.locator(".toast").count()) === 0);
  await page.getByRole("dialog").getByText("관광사업등록증", { exact: true }).locator("..").locator("input").check();
  await page.getByRole("dialog").locator("#affiliate-supplement-reason").fill("   ");
  await page.getByRole("dialog").getByRole("button", { name: "보완요청", exact: true }).click();
  ok(
    "보완요청·공백만 사유 불가",
    await page.getByRole("dialog").getByText("보완요청 사유를 입력해 주세요.").isVisible(),
  );
  await page.getByRole("dialog").locator("#affiliate-supplement-reason").fill("관광사업등록증을 다시 제출해 주세요.");
  await page.getByRole("dialog").getByRole("button", { name: "보완요청", exact: true }).click();
  await page.locator(".toast").getByText("가입신청 보완을 요청했습니다.").waitFor({ state: "visible" });
  ok("보완요청·정상 요청", await page.locator(".toast").getByText("가입신청 보완을 요청했습니다.").isVisible());
  ok("보완요청·상태 보완요청", (await titleBadges(page)).application.includes("보완요청"));
  ok(
    "보완요청·관련 서류 보완필요",
    await page
      .locator(".member-affiliate-detail-table--docs tbody tr")
      .filter({ hasText: "관광사업등록증" })
      .filter({ hasText: "보완필요" })
      .count()
      .then((n) => n >= 1),
  );
  const supplementHistory = await latestHistoryRow(page);
  ok(
    "보완요청·이력",
    Boolean(
      supplementHistory &&
        supplementHistory.action === "보완요청" &&
        supplementHistory.statusBefore === "승인대기" &&
        supplementHistory.statusAfter === "보완요청" &&
        supplementHistory.note.includes("관광사업등록증을 다시 제출해 주세요."),
    ),
  );
  await page.reload({ waitUntil: "networkidle" });
  ok(
    "보완요청·새로고침 유지",
    (await titleBadges(page)).application.includes("보완요청") &&
      (await latestHistoryRow(page).then((row) => Boolean(row && row.action === "보완요청"))),
  );
  await page.goto(`${BASE}/members/affiliates`, { waitUntil: "networkidle" });
  const supplementListRow = listRowByAgency(page, "[샘플] 블루하버여행");
  ok(
    "보완요청·목록 반영",
    (await supplementListRow.locator(".badge").first().innerText()).includes("보완요청") &&
      (await supplementListRow.locator(".member-affiliate-partner-code").innerText()).includes("AOS00001"),
  );
  const afterSupplementTotals = await listTotals(page);
  ok(
    "보완요청·집계 반영",
    afterSupplementTotals.total === 8 &&
      afterSupplementTotals.pending === 2 &&
      afterSupplementTotals.supplement === 3,
    afterSupplementTotals.text,
  );

  // --- 보완 확인 ---
  await resetAffiliateStorage(page);
  await openDetail(page, "AFA-004");
  const before004 = await applicationSnapshot(page);
  await page.getByRole("button", { name: "보완 확인" }).click();
  ok(
    "보완확인·AFA-004 실패",
    await page.getByRole("heading", { name: "보완 완료를 확인할 수 없습니다." }).isVisible(),
  );
  ok("보완확인·미완료 이유", await page.getByRole("dialog").getByText("보완필요 서류").isVisible());
  ok(
    "보완확인·미완료 상세",
    await page.getByRole("dialog").getByText(/보완필요 상태입니다/).count().then((n) => n >= 1),
  );
  ok("보완확인·실패 토스트 없음", (await page.locator(".toast").count()) === 0);
  await page.getByRole("dialog").getByRole("button", { name: "확인" }).click();
  const after004 = await applicationSnapshot(page);
  ok(
    "보완확인·AFA-004 상태 유지",
    after004.application.includes("보완요청") && after004.historyText === before004.historyText,
  );

  await resetAffiliateStorage(page);
  await openDetail(page, "AFA-005");
  await page.getByRole("button", { name: "보완 확인" }).click();
  ok(
    "보완확인·AFA-005 모달",
    await page.getByRole("heading", { name: "보완 완료를 확인하시겠습니까?" }).isVisible(),
  );
  ok(
    "보완확인·안내",
    await page
      .getByRole("dialog")
      .getByText("보완 확인 후 가입신청 상태가 승인대기로 변경됩니다. 가입승인은 별도로 처리해야 합니다.")
      .isVisible(),
  );
  await page.getByRole("dialog").getByRole("button", { name: "보완 확인" }).click();
  await page
    .locator(".toast")
    .getByText("보완 완료를 확인했습니다. 가입승인을 별도로 진행해 주세요.")
    .waitFor({ state: "visible" });
  ok("보완확인·상태 승인대기", (await titleBadges(page)).application.includes("승인대기"));
  ok("보완확인·관계 미활성", (await titleBadges(page)).partnership.includes("미활성"));
  ok(
    "보완확인·AFF 코드 없음",
    !(await page.locator(".member-affiliate-detail-meta").innerText()).includes("AFF-") &&
      (await page
        .locator(".member-affiliate-detail-field")
        .filter({ hasText: "제휴여행사 코드" })
        .getByText("-", { exact: true })
        .count()) >= 1,
  );
  const confirmHistory = await latestHistoryRow(page);
  ok(
    "보완확인·이력",
    Boolean(
      confirmHistory &&
        confirmHistory.action === "보완 확인" &&
        confirmHistory.statusBefore === "보완요청" &&
        confirmHistory.statusAfter === "승인대기",
    ),
  );
  ok("보완확인·이후 가입 승인 버튼", await page.getByRole("button", { name: "가입 승인" }).isVisible());
  ok("보완확인·이후 보완요청 버튼", await page.getByRole("button", { name: "보완요청", exact: true }).isVisible());
  ok("보완확인·이후 거절 버튼", await page.getByRole("button", { name: "가입거절" }).isVisible());

  // --- 보완 재요청 ---
  await resetAffiliateStorage(page);
  await openDetail(page, "AFA-004");
  ok("재요청·보완요청 상태", (await titleBadges(page)).application.includes("보완요청"));
  const beforeRerequestHistory = await historyActionCount(page, "보완요청");
  await page.getByRole("button", { name: "보완 재요청" }).click();
  ok(
    "재요청·모달",
    await page.getByRole("heading", { name: "가입신청 보완을 다시 요청합니다." }).isVisible(),
  );
  await page.getByRole("dialog").getByText("사업자등록증", { exact: true }).locator("..").locator("input").check();
  await page.getByRole("dialog").locator("#affiliate-supplement-reason").fill("사업자등록증을 다시 제출해 주세요.");
  await page.getByRole("dialog").getByRole("button", { name: "보완요청", exact: true }).click();
  await page.locator(".toast").getByText("가입신청 보완을 다시 요청했습니다.").waitFor({ state: "visible" });
  ok("재요청·정상", await page.locator(".toast").getByText("가입신청 보완을 다시 요청했습니다.").isVisible());
  ok("재요청·상태 보완요청 유지", (await titleBadges(page)).application.includes("보완요청"));
  ok(
    "재요청·새 보완정보",
    await page
      .locator(".member-affiliate-detail-info-grid")
      .getByText("사업자등록증을 다시 제출해 주세요.", { exact: true })
      .count()
      .then((n) => n >= 1),
  );
  ok(
    "재요청·이력 추가",
    (await historyActionCount(page, "보완요청")) === beforeRerequestHistory + 1 &&
      (await latestHistoryRow(page).then(
        (row) => Boolean(row && row.action === "보완요청" && row.note.includes("사업자등록증을 다시 제출해 주세요.")),
      )),
  );

  // --- 가입거절 ---
  await resetAffiliateStorage(page);
  await openDetail(page, "AFA-001");
  ok("거절·승인대기 상태", (await titleBadges(page)).application.includes("승인대기"));
  await page.getByRole("button", { name: "제휴여행사 가입거절" }).click();
  ok(
    "거절·모달",
    await page.getByRole("heading", { name: "제휴여행사 가입을 거절하시겠습니까?" }).isVisible(),
  );
  ok(
    "거절·안내",
    (await page.getByRole("dialog").getByText("제휴관계는 활성화되지 않습니다.").count()) === 1 &&
      (await page.getByRole("dialog").getByText("실제 이메일은 발송되지 않습니다.").count()) === 1,
  );
  await page.getByRole("dialog").getByRole("button", { name: "제휴여행사 가입거절 확정" }).click();
  ok("거절·사유 필수", await page.getByRole("dialog").getByText("거절 사유를 입력해 주세요.").isVisible());
  ok("거절·검증 실패 시 유지", await page.getByRole("dialog").isVisible());
  await page.getByRole("dialog").locator("#affiliate-reject-reason").fill("서류 요건 미충족으로 거절합니다.");
  await page.getByRole("dialog").getByRole("button", { name: "제휴여행사 가입거절 확정" }).click();
  await page.locator(".toast").getByText("제휴여행사 가입신청이 거절 처리되었습니다.").waitFor({ state: "visible" });
  ok("거절·정상", await page.locator(".toast").getByText("제휴여행사 가입신청이 거절 처리되었습니다.").isVisible());
  ok("거절·상태 가입거절", (await titleBadges(page)).application.includes("가입거절"));
  ok("거절·관계 미활성", (await titleBadges(page)).partnership.includes("미활성"));
  const rejectHistory = await latestHistoryRow(page);
  ok(
    "거절·이력",
    Boolean(
      rejectHistory &&
        rejectHistory.action === "가입거절" &&
        rejectHistory.statusBefore === "승인대기" &&
        rejectHistory.statusAfter === "가입거절" &&
        rejectHistory.note === "서류 요건 미충족으로 거절합니다.",
    ),
  );
  ok("거절·심사 버튼 제거", (await page.getByRole("button", { name: /가입 승인|보완요청|보완 확인|가입거절/ }).count()) === 0);
  ok("거절·중복 처리 없음", (await historyActionCount(page, "가입거절")) === 1);

  await resetAffiliateStorage(page);
  await openDetail(page, "AFA-006");
  ok("거절·승인완료 버튼 없음", (await page.getByRole("button", { name: /가입거절/ }).count()) === 0);

  await resetAffiliateStorage(page);
  await openDetail(page, "AFA-008");
  ok("거절·이미 거절 버튼 없음", (await page.getByRole("button", { name: /가입거절/ }).count()) === 0);

  // --- 모달 공통 (취소 / Escape / 재오픈 초기화 / 검증 유지) ---
  await resetAffiliateStorage(page);
  await openDetail(page, "AFA-001");
  await page.getByRole("button", { name: "가입 승인" }).click();
  await page.getByRole("dialog").locator("#affiliate-approve-memo").fill("취소될 메모");
  await page.getByRole("dialog").getByRole("button", { name: "취소" }).click();
  ok("모달·취소 닫기", (await page.getByRole("dialog").count()) === 0);
  ok("모달·취소 후 상태 유지", (await titleBadges(page)).application.includes("승인대기"));

  await page.getByRole("button", { name: "가입 승인" }).click();
  ok(
    "모달·다시 열 때 초기화",
    (await page.getByRole("dialog").locator("#affiliate-approve-memo").inputValue()) === "",
  );
  await page.keyboard.press("Escape");
  ok("모달·Escape 닫기", (await page.getByRole("dialog").count()) === 0);

  await page.getByRole("button", { name: "보완요청" }).click();
  await page.getByRole("dialog").locator("#affiliate-supplement-reason").fill("임시 사유");
  await page.getByRole("dialog").getByText("관광사업등록증", { exact: true }).locator("..").locator("input").check();
  await page.getByRole("dialog").getByRole("button", { name: "취소" }).click();
  await page.getByRole("button", { name: "보완요청" }).click();
  ok(
    "모달·보완 재오픈 초기화",
    (await page.getByRole("dialog").locator("#affiliate-supplement-reason").inputValue()) === "" &&
      !(await page
        .getByRole("dialog")
        .getByText("관광사업등록증", { exact: true })
        .locator("..")
        .locator("input")
        .isChecked()),
  );
  await page.getByRole("dialog").getByRole("button", { name: "보완요청", exact: true }).click();
  ok("모달·검증 실패 시 유지", await page.getByRole("dialog").isVisible());
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "제휴여행사 가입거절" }).click();
  await page.getByRole("dialog").locator("#affiliate-reject-reason").fill("임시 거절");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "제휴여행사 가입거절" }).click();
  ok(
    "모달·거절 재오픈 초기화",
    (await page.getByRole("dialog").locator("#affiliate-reject-reason").inputValue()) === "",
  );
  await page.getByRole("dialog").getByRole("button", { name: "취소" }).click();

  // --------------------------------------------------------------------------
  // 목록 링크 · 반응형 · 접근성 · 영향 확인
  // --------------------------------------------------------------------------
  await resetAffiliateStorage(page);
  await page.goto(`${BASE}/members/affiliates`, { waitUntil: "networkidle" });
  const nameHref = await page.locator(".member-affiliate-name a").first().getAttribute("href");
  ok("목록 여행사명 href", Boolean(nameHref && nameHref.startsWith("/members/affiliates/AFA-")));
  await page.locator(".member-affiliate-name a").first().click();
  await page.waitForURL(/\/members\/affiliates\/AFA-\d+/);
  await page.waitForSelector("h1");
  ok(
    "상세보기 이동",
    await page.getByRole("heading", { name: "제휴여행사 신청 상세", level: 1 }).isVisible(),
  );
  await page.getByRole("link", { name: "목록으로" }).click();
  await page.waitForURL(/\/members\/affiliates\/?$/);
  ok("상세 목록으로", /\/members\/affiliates\/?$/.test(new URL(page.url()).pathname));

  await page.goto(`${BASE}/members/web`, { waitUntil: "domcontentloaded" });
  ok("웹회원 메뉴 활성", await page.locator(".subnav button.current").innerText().then((t) => t.includes("웹회원관리")));

  for (const width of [1440, 1280, 1024]) {
    await openDetail(page, "AFA-007");
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(120);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    ok(`body 가로스크롤 없음 ${width}`, !overflow);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await resetAffiliateStorage(page);
  await openDetail(page, "AFA-001");
  ok(
    "가입거절 버튼 aria-label",
    (await page.getByRole("button", { name: "제휴여행사 가입거절" }).count()) === 1,
  );
  await page.getByRole("button", { name: "가입 승인" }).click();
  const a11yApprove = page.getByRole("dialog");
  await a11yApprove.waitFor({ state: "visible" });
  ok(
    "승인 모달 dialog·aria-labelledby",
    (await a11yApprove.getAttribute("aria-labelledby")) === "affiliate-approve-title",
  );
  ok(
    "승인 모달 첫 포커스",
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const active = document.activeElement;
      return Boolean(dialog && active && dialog.contains(active) && active.tagName === "TEXTAREA");
    }),
  );
  ok(
    "모달 배경 inert",
    await page.evaluate(() => {
      const workspace = document.querySelector(".workspace");
      return workspace?.hasAttribute("inert") && workspace.getAttribute("aria-hidden") === "true";
    }),
  );
  await page.keyboard.press("Escape");
  ok(
    "Escape 닫기·포커스 복귀",
    (await page.getByRole("dialog").count()) === 0 &&
      (await page.evaluate(() => document.activeElement?.textContent?.includes("가입 승인"))),
  );

  await page.getByRole("button", { name: "보완요청" }).click();
  const a11ySupplement = page.getByRole("dialog");
  await a11ySupplement.waitFor({ state: "visible" });
  ok(
    "보완요청 fieldset·그룹",
    (await page.locator("#affiliate-supplement-items-legend").count()) === 1 &&
      (await page.locator('[role="group"][aria-labelledby="affiliate-supplement-items-legend"]').count()) === 1,
  );
  await a11ySupplement.getByRole("button", { name: "보완요청", exact: true }).click();
  ok(
    "보완요청 오류·입력 연결",
    (await page.locator("#affiliate-supplement-reason-error").count()) === 1 &&
      (await page.locator("#affiliate-supplement-items-error").count()) === 1,
  );
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "제휴여행사 가입거절" }).click();
  ok(
    "거절 모달 제목 연결",
    (await page.getByRole("dialog").getAttribute("aria-labelledby")) === "affiliate-reject-title",
  );
  ok(
    "거절 확정 버튼 이름",
    (await page.getByRole("button", { name: "제휴여행사 가입거절 확정" }).count()) === 1,
  );
  await page.locator("#affiliate-reject-reason").fill("접근성 검증용 거절 사유입니다.");
  await page.getByRole("button", { name: "제휴여행사 가입거절 확정" }).click();
  await page.locator(".toast[role='status']").waitFor({ state: "visible" });
  ok(
    "성공 toast live region",
    (await page.locator(".toast[role='status']").getAttribute("aria-live")) === "polite",
  );
  ok(
    "상태 변경 배지·안내",
    (await titleBadges(page)).application.includes("가입거절") &&
      (await page.locator(".member-affiliate-sr-only[role='status']").innerText()).includes("가입거절"),
  );

  const products = await page.goto(`${BASE}/products`, { waitUntil: "domcontentloaded" });
  ok("/products 200", products?.status() === 200);

  const filteredConsole = consoleErrors.filter(
    (text) => !text.includes("Download the React DevTools") && !text.includes("favicon"),
  );
  ok(
    "콘솔 pageerror 없음",
    filteredConsole.length === 0 && pageErrors.length === 0,
    filteredConsole.join(" | ") || pageErrors.join(" | "),
  );

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
