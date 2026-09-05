/**
 * Seller apply + complete + application-status E2E (stage 5–7).
 * Run: node scripts/seller-apply-e2e.mjs
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import os from "os";

const BASE = process.env.SELLER_BASE || "http://localhost:3001";
const RECEIPT_KEY = "aos.seller.apply.prototype.receipt.v1";
const PARTNERSHIP_KEY = "aos.partnership.apply.prototype.receipt.v2";
const results = [];

function ok(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function makeTinyPng() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "seller-apply-"));
  const filePath = path.join(dir, "license.png");
  const buf = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  fs.writeFileSync(filePath, buf);
  return filePath;
}

async function fillCommonContact(page, { name = "김담당" } = {}) {
  await page.fill("#contactName", name);
  await page.fill("#contactPhone", "010-1234-5678");
  await page.fill("#contactEmail", "seller@example.com");
  await page.fill("#contactEmailConfirm", "seller@example.com");
}

async function agreeAllRequired(page) {
  const boxes = page.locator(".seller-apply-check-group .seller-term-row .check input");
  const count = await boxes.count();
  for (let i = 0; i < count; i++) {
    const box = boxes.nth(i);
    if (!(await box.isChecked())) await box.check();
  }
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

  const pngPath = makeTinyPng();

  // --- Application status: no seller receipt ---
  await page.goto(`${BASE}/seller/application-status`, { waitUntil: "networkidle" });
  await page.evaluate((key) => sessionStorage.removeItem(key), RECEIPT_KEY);
  await page.reload({ waitUntil: "networkidle" });
  ok(
    "신청현황 제목",
    await page.getByRole("heading", { name: "판매점 가입 신청현황", level: 1 }).isVisible(),
  );
  ok("신청현황 조회 폼", await page.locator("#seller-lookup-number").isVisible());
  ok("신청현황 샘플 칩", (await page.locator(".seller-status-chip").count()) >= 4);
  ok("신청상태 확인 용어 없음", !(await page.content()).includes("신청상태 확인"));

  await page.fill("#seller-lookup-number", "AOS-S-SAMPLE-WAIT-01");
  await page.fill("#seller-lookup-email", "not-an-email");
  await page.getByRole("button", { name: "조회" }).click();
  await page.waitForTimeout(200);
  ok(
    "잘못된 이메일 형식",
    (await page.locator("#seller-lookup-error").innerText()).includes("이메일 형식"),
  );

  await page.fill("#seller-lookup-email", "nobody@example.com");
  await page.getByRole("button", { name: "조회" }).click();
  await page.waitForTimeout(200);
  ok(
    "일치하지 않는 조회",
    (await page.locator("#seller-lookup-error").innerText()).includes("찾을 수 없습니다"),
  );

  await page.getByRole("button", { name: "승인대기 · 샘플" }).click();
  await page.waitForTimeout(200);
  let statusText = await page.locator("#seller-status-detail").innerText();
  ok("샘플 배지", statusText.includes("샘플 데이터 · 화면 확인용"));
  ok("승인대기 샘플 안내", statusText.includes("검토하고 있습니다"));

  await page.getByRole("button", { name: "보완요청 · 샘플" }).click();
  await page.waitForTimeout(200);
  statusText = await page.locator("#seller-status-detail").innerText();
  ok("보완요청 항목", statusText.includes("사업자등록증") && statusText.includes("보완"));
  ok("보완요청 관리자 안내", statusText.includes("관리자 요청사항") || statusText.includes("선명한"));

  await page.getByRole("button", { name: "승인완료 · 샘플" }).click();
  await page.waitForTimeout(200);
  statusText = await page.locator("#seller-status-detail").innerText();
  ok("승인완료와 설정대기", statusText.includes("승인완료") && statusText.includes("설정대기"));
  ok("승인≠판매가능 구분", statusText.includes("설정대기") && statusText.includes("승인완료와 판매가능은 같지 않습니다"));

  await page.getByRole("button", { name: "가입거절 · 샘플" }).click();
  await page.waitForTimeout(200);
  statusText = await page.locator("#seller-status-detail").innerText();
  ok("가입거절 안내", statusText.includes("가입이 승인되지 않았습니다") || statusText.includes("거절"));

  // Partnership-only → no recent seller
  await page.evaluate((keys) => {
    sessionStorage.removeItem(keys.seller);
    sessionStorage.setItem(
      keys.partnership,
      JSON.stringify({ applicationNumber: "KEEP-PARTNERSHIP", submittedAt: new Date().toISOString() }),
    );
  }, { seller: RECEIPT_KEY, partnership: PARTNERSHIP_KEY });
  await page.reload({ waitUntil: "networkidle" });
  ok(
    "제휴 receipt만 있으면 최근 미표시",
    (await page.locator(".seller-status-source-badge.is-recent").count()) === 0,
  );

  // Invalid seller receipt
  await page.evaluate((key) => {
    sessionStorage.setItem(key, JSON.stringify({ prototype: true, applicationNumber: "bad" }));
  }, RECEIPT_KEY);
  await page.reload({ waitUntil: "networkidle" });
  ok(
    "잘못된 판매점 receipt 오류 없음",
    await page.getByRole("heading", { name: "판매점 가입 신청현황", level: 1 }).isVisible(),
  );
  ok("잘못된 receipt 최근 미표시", (await page.locator(".seller-status-source-badge.is-recent").count()) === 0);

  // --- Complete empty: direct access ---
  await page.goto(`${BASE}/seller/apply/complete`, { waitUntil: "networkidle" });
  await page.evaluate((key) => sessionStorage.removeItem(key), RECEIPT_KEY);
  await page.reload({ waitUntil: "networkidle" });
  ok(
    "완료 빈 상태 제목",
    await page.getByRole("heading", { name: "확인할 판매점 가입신청 내역이 없습니다." }).isVisible(),
  );
  ok(
    "완료 빈 상태 가입신청 버튼",
    await page.locator(".seller-complete-actions a[href='/seller/apply']").isVisible(),
  );
  ok(
    "완료 빈 상태 안내 버튼",
    await page.locator(".seller-complete-actions a[href='/seller']").isVisible(),
  );

  // Partnership-only receipt → still empty
  await page.evaluate((key) => {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        prototype: true,
        applicationNumber: "AOS-20260101-0001",
        submittedAt: new Date().toISOString(),
        agencyName: "제휴만",
        contactEmail: "p@example.com",
        status: "승인대기",
      }),
    );
  }, PARTNERSHIP_KEY);
  await page.reload({ waitUntil: "networkidle" });
  ok(
    "제휴 receipt만 있을 때 빈 상태",
    await page.getByRole("heading", { name: "확인할 판매점 가입신청 내역이 없습니다." }).isVisible(),
  );
  const partnershipKeptEmpty = await page.evaluate((key) => sessionStorage.getItem(key), PARTNERSHIP_KEY);
  ok("제휴 receipt 미삭제", Boolean(partnershipKeptEmpty));

  // Invalid seller receipt → empty
  await page.evaluate((key) => {
    sessionStorage.setItem(key, JSON.stringify({ prototype: true, applicationNumber: "bad" }));
  }, RECEIPT_KEY);
  await page.reload({ waitUntil: "networkidle" });
  ok(
    "잘못된 receipt 빈 상태",
    await page.getByRole("heading", { name: "확인할 판매점 가입신청 내역이 없습니다." }).isVisible(),
  );

  // Seed partnership keep marker for apply flow
  await page.goto(`${BASE}/seller/apply`, { waitUntil: "networkidle" });
  await page.evaluate((key) => {
    sessionStorage.setItem(
      key,
      JSON.stringify({ applicationNumber: "KEEP-PARTNERSHIP", submittedAt: new Date().toISOString() }),
    );
  }, PARTNERSHIP_KEY);

  ok("페이지 h1", await page.getByRole("heading", { name: "판매점 가입신청", level: 1 }).isVisible());
  ok(
    "운영 여행사 표시 상수",
    (await page.locator(".seller-apply-belong").textContent())?.includes("현재 홈페이지 운영 여행사") ===
      true,
  );
  ok("여행사 검색 UI 없음", (await page.locator('input[placeholder*="여행사"]').count()) === 0);
  ok("위저드/임시저장 없음", !(await page.content()).match(/임시저장|진행\s*%|이전\s*단계/));
  ok("SellerChrome 헤더", (await page.locator(".seller-header").count()) > 0);
  ok(
    "판매점 드롭다운 활성",
    (await page.locator(".seller-header .nav-dropdown-trigger.is-active").count()) > 0,
  );
  ok(
    "가입신청 하위메뉴 aria-current",
    (await page.locator('.seller-header a[href="/seller/apply"][aria-current="page"]').count()) > 0,
  );

  const submit = page.getByRole("button", { name: "판매점 가입 신청하기" });
  ok("제출 버튼 활성", await submit.isEnabled());
  await submit.click();
  await page.waitForTimeout(400);
  ok(
    "빈 제출 유형 오류",
    (await page.locator(".seller-field-error").filter({ hasText: "가입유형" }).count()) > 0,
  );

  // Select business
  await page.getByLabel("사업자 판매점").click();
  await page.waitForTimeout(200);
  ok("사업자 필드 표시", await page.locator("#businessName").isVisible());
  ok("사업자등록증 슬롯", await page.locator("#businessLicenseFile").isVisible());
  ok("개인 활동증빙 숨김", (await page.locator("#activityProofFile").count()) === 0);

  await submit.click();
  await page.waitForTimeout(300);
  ok("사업자 빈 제출 오류", (await page.locator(".seller-field-error").count()) > 0);

  await page.fill("#businessName", "테스트상호");
  await page.getByText("상호명을 판매점명으로 사용").click();
  ok("상호명→판매점명 동기화", (await page.inputValue("#sellerName")) === "테스트상호");
  await page.fill("#businessName", "테스트상호변경");
  ok("상호명 변경 동기화", (await page.inputValue("#sellerName")) === "테스트상호변경");

  await page.fill("#businessNumber", "12-34");
  await page.getByRole("button", { name: "중복확인" }).first().click();
  await page.waitForTimeout(200);
  ok(
    "사업자번호 형식 오류",
    (await page.locator(".seller-field-error").filter({ hasText: "사업자등록번호" }).count()) > 0,
  );
  await page.fill("#businessNumber", "123-45-67890");
  await page.getByRole("button", { name: "중복확인" }).first().click();
  await page.waitForTimeout(200);
  ok(
    "사업자 중복확인 프로토타입",
    (await page.locator(".seller-field-info").filter({ hasText: "형식이 확인" }).count()) > 0,
  );

  await page.fill("#representativeName", "홍대표");
  await page.getByText("대표자가 직접 관리합니다").click();
  ok("대표자→담당자 동기화", (await page.inputValue("#contactName")) === "홍대표");

  await page.fill("#address", "서울특별시 중구 세종대로 110");
  await page.getByRole("button", { name: "주소검색" }).click();
  await page.waitForTimeout(100);
  ok(
    "주소검색 프로토타입",
    (await page.locator(".seller-field-info").filter({ hasText: "주소검색" }).count()) > 0,
  );

  await page.fill("#contactPhone", "010-1111-2222");
  await page.getByText("담당자 휴대전화번호와 동일").click();
  ok("추천인코드 동기화", (await page.inputValue("#referralCodePhone")) === "010-1111-2222");
  await page.fill("#contactPhone", "010-3333-4444");
  ok("추천인코드 연동 변경", (await page.inputValue("#referralCodePhone")) === "010-3333-4444");

  await page.fill("#contactEmail", "biz@example.com");
  await page.fill("#contactEmailConfirm", "biz@example.com");
  await page.fill("#homepageOrSns", "https://example.com");

  await page.locator("#businessLicenseFile-input").setInputFiles(pngPath);
  await page.waitForTimeout(200);
  ok(
    "사업자등록증 선택",
    (await page.locator("#businessLicenseFile .seller-file-meta strong").count()) > 0,
  );

  await agreeAllRequired(page);
  await submit.click();
  await page.waitForURL("**/seller/apply/complete", { timeout: 8000 });
  await page.waitForTimeout(300);

  ok("사업자 제출 후 complete 이동", page.url().includes("/seller/apply/complete"));
  ok(
    "완료 제목",
    await page.getByRole("heading", { name: "판매점 가입신청이 완료되었습니다." }).isVisible(),
  );

  const receipt = await page.evaluate((key) => sessionStorage.getItem(key), RECEIPT_KEY);
  const partnershipKept = await page.evaluate((key) => sessionStorage.getItem(key), PARTNERSHIP_KEY);
  ok("판매점 receipt 저장", Boolean(receipt));
  ok("제휴 receipt 유지", partnershipKept?.includes("KEEP-PARTNERSHIP") === true);

  let bizAppNo = "";
  if (receipt) {
    const parsed = JSON.parse(receipt);
    bizAppNo = parsed.applicationNumber;
    ok("receipt에 File/원본 없음", !("businessLicenseFile" in (parsed.summary || {})) && !parsed.form);
    ok("가입유형 business", parsed.sellerType === "business");
  }

  const completeText = await page.locator(".seller-complete-panel").innerText();
  ok("접수번호 표시", Boolean(bizAppNo) && completeText.includes(bizAppNo), bizAppNo);
  ok("가입유형 라벨 표시", completeText.includes("사업자 판매점"));
  ok("내부 코드 미노출", !completeText.includes("business") && !completeText.includes("prototype-current-site"));
  ok("판매점명 표시", completeText.includes("테스트상호변경"));
  ok("승인대기 표시", completeText.includes("승인대기"));
  ok("사업자 상호명 표시", completeText.includes("상호명") && completeText.includes("테스트상호변경"));
  ok("사업자번호 마스킹", completeText.includes("123-**-*****"));
  ok("휴대전화 마스킹", completeText.includes("010-****-4444"));
  ok("필수서류 첨부 완료", completeText.includes("필수서류 첨부 완료") || completeText.includes("사업자등록증"));
  ok("신청현황 링크", await page.locator(".seller-complete-actions a[href='/seller/application-status']").isVisible());

  await page.reload({ waitUntil: "networkidle" });
  ok(
    "새로고침 후 유지",
    (await page.locator(".seller-complete-panel").innerText()).includes(bizAppNo),
  );

  // Status from complete → recent application
  await page.locator(".seller-complete-actions a[href='/seller/application-status']").click();
  await page.waitForURL("**/seller/application-status", { timeout: 8000 });
  await page.waitForTimeout(300);
  ok("신청현황 이동", page.url().includes("/seller/application-status"));
  ok(
    "최근 신청 배지",
    await page.locator(".seller-status-source-badge.is-recent").filter({ hasText: "최근 신청 · 이 브라우저" }).isVisible(),
  );
  const recentText = await page.locator("#seller-status-detail").innerText();
  ok("최근 접수번호", recentText.includes(bizAppNo));
  ok("최근 판매점명", recentText.includes("테스트상호변경"));
  ok("최근 가입유형", recentText.includes("사업자 판매점"));
  ok("최근 승인대기", recentText.includes("승인대기"));
  ok("최근 마스킹", recentText.includes("123-**-*****") && recentText.includes("010-****-4444"));
  ok("최근 필수서류", recentText.includes("사업자등록증") && recentText.includes("첨부 완료"));
  const historyText = await page.locator(".seller-status-history").innerText();
  ok(
    "최근 이력은 접수·승인대기",
    historyText.includes("가입신청 접수") &&
      historyText.includes("승인대기") &&
      !historyText.includes("가입 승인") &&
      !historyText.includes("보완요청"),
  );

  // Sample must not clear recent receipt
  await page.getByRole("button", { name: "승인대기 · 샘플" }).click();
  await page.waitForTimeout(200);
  const receiptAfterSample = await page.evaluate((key) => sessionStorage.getItem(key), RECEIPT_KEY);
  ok("샘플 선택 후 receipt 유지", Boolean(receiptAfterSample) && receiptAfterSample.includes(bizAppNo));
  await page.getByRole("button", { name: "최근 신청 다시 보기" }).click();
  await page.waitForTimeout(200);

  await page.reload({ waitUntil: "networkidle" });
  ok(
    "새로고침 후 최근 신청 유지",
    (await page.locator("#seller-status-detail").innerText()).includes(bizAppNo),
  );

  // Lookup recent by number + email
  await page.fill("#seller-lookup-number", bizAppNo);
  await page.fill("#seller-lookup-email", "biz@example.com");
  await page.getByRole("button", { name: "조회" }).click();
  await page.waitForTimeout(300);
  ok(
    "최근 신청 번호·이메일 조회",
    (await page.locator("#seller-status-detail").innerText()).includes(bizAppNo),
  );

  // Individual flow
  await page.goto(`${BASE}/seller/apply`, { waitUntil: "networkidle" });
  await page.getByLabel("개인 판매점").click();
  await page.waitForTimeout(200);
  ok("개인 판매점명", await page.locator("#sellerName").isVisible());
  ok("개인 상호명 없음", (await page.locator("#businessName").count()) === 0);
  ok("신청자 정보 제목", await page.getByRole("heading", { name: "신청자 정보" }).isVisible());
  ok("활동 경력 증빙", await page.locator("#activityProofFile").isVisible());
  ok("사업자등록증 숨김", (await page.locator("#businessLicenseFile").count()) === 0);

  await page.fill("#sellerName", "개인판매점A");
  await page.fill("#address", "부산광역시 해운대구");
  await fillCommonContact(page, { name: "이신청" });
  await page.getByText("신청자 휴대전화번호와 동일").click();
  await agreeAllRequired(page);
  await submit.click();
  await page.waitForURL("**/seller/apply/complete", { timeout: 8000 });
  await page.waitForTimeout(300);
  ok("개인 필수서류 없이 제출", page.url().includes("/seller/apply/complete"));

  const receipt2 = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) || "null"), RECEIPT_KEY);
  ok("개인 receipt 유형", receipt2?.sellerType === "individual");

  const indText = await page.locator(".seller-complete-panel").innerText();
  ok("개인 판매점명 완료 표시", indText.includes("개인판매점A"));
  ok("개인 가입유형 라벨", indText.includes("개인 판매점"));
  ok("개인 사업자 정보 미표시", !indText.includes("사업자등록번호") && !indText.includes("상호명"));
  ok("개인 필수서류 없음 안내", indText.includes("필수 첨부서류가 없습니다"));
  ok("개인 휴대전화 마스킹", indText.includes("010-****-5678"));

  // Type change confirm
  await page.goto(`${BASE}/seller/apply`, { waitUntil: "networkidle" });
  await page.getByLabel("사업자 판매점").click();
  await page.fill("#businessName", "변경전상호");
  await page.getByLabel("개인 판매점").click();
  await page.waitForTimeout(200);
  ok(
    "유형 변경 다이얼로그",
    await page.getByRole("heading", { name: "가입유형을 변경할까요?" }).isVisible(),
  );
  await page.getByRole("button", { name: "취소" }).last().click();
  await page.waitForTimeout(200);
  ok("변경 취소 시 사업자 유지", await page.locator("#businessName").isVisible());
  ok("변경 취소 데이터 유지", (await page.inputValue("#businessName")) === "변경전상호");

  await page.getByLabel("개인 판매점").click();
  await page.getByRole("button", { name: "유형 변경" }).click();
  await page.waitForTimeout(200);
  ok("유형 변경 후 개인", (await page.locator("#businessName").count()) === 0);

  // Cancel dialog
  await page.fill("#sellerName", "취소테스트");
  await page.getByRole("button", { name: "취소" }).first().click();
  await page.waitForTimeout(200);
  ok("취소 다이얼로그", await page.getByText("작성 중인 판매점 가입신청 내용이 삭제됩니다").isVisible());
  await page.evaluate((keys) => {
    sessionStorage.setItem(keys.seller, JSON.stringify({ keep: "seller-receipt" }));
    sessionStorage.setItem(keys.partnership, JSON.stringify({ keep: "partnership-receipt" }));
  }, { seller: RECEIPT_KEY, partnership: PARTNERSHIP_KEY });
  await page.getByRole("button", { name: "계속 작성" }).click();
  const keptAfterContinue = await page.evaluate((keys) => ({
    seller: sessionStorage.getItem(keys.seller),
    partnership: sessionStorage.getItem(keys.partnership),
  }), { seller: RECEIPT_KEY, partnership: PARTNERSHIP_KEY });
  ok(
    "계속 작성 시 receipt 유지",
    keptAfterContinue.seller?.includes("seller-receipt") === true &&
      keptAfterContinue.partnership?.includes("partnership-receipt") === true,
  );

  // Optional marketing unchecked still can submit (individual path already agreed all once;
  // reopen apply and leave marketing unchecked after filling minimum)
  await page.goto(`${BASE}/seller/apply`, { waitUntil: "networkidle" });
  await page.getByLabel("개인 판매점").click();
  await page.fill("#sellerName", "선택약관테스트");
  await page.fill("#address", "서울 테스트구");
  await fillCommonContact(page, { name: "선택약관" });
  await page.getByText("신청자 휴대전화번호와 동일").click();
  await agreeAllRequired(page);
  const marketing = page.locator(".seller-apply-check-group .seller-term-row").filter({ hasText: "제휴·상품 안내" }).locator("input");
  if (await marketing.count()) {
    if (await marketing.isChecked()) await marketing.uncheck();
  }
  await page.getByRole("button", { name: "판매점 가입 신청하기" }).click();
  await page.waitForURL("**/seller/apply/complete", { timeout: 8000 });
  ok("선택 약관 미동의 제출", page.url().includes("/seller/apply/complete"));

  // Responsive 390 — apply
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/seller/apply`, { waitUntil: "networkidle" });
  let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  let clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  ok("390 apply 가로 스크롤 없음", scrollWidth <= clientWidth + 1, `${scrollWidth}/${clientWidth}`);

  // Responsive 390 — complete
  await page.goto(`${BASE}/seller/apply/complete`, { waitUntil: "networkidle" });
  scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  ok("390 complete 가로 스크롤 없음", scrollWidth <= clientWidth + 1, `${scrollWidth}/${clientWidth}`);

  // Responsive 390 — status
  await page.goto(`${BASE}/seller/application-status`, { waitUntil: "networkidle" });
  scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  ok("390 status 가로 스크롤 없음", scrollWidth <= clientWidth + 1, `${scrollWidth}/${clientWidth}`);

  for (const width of [1440, 900]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/seller", "/seller/apply", "/seller/apply/complete", "/seller/application-status"]) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      ok(
        `${width}${path} 가로스크롤 없음`,
        scrollWidth <= clientWidth + 1,
        `${scrollWidth}/${clientWidth}`,
      );
    }
  }

  const fatal = [...consoleErrors, ...pageErrors].filter(
    (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("Failed to load resource"),
  );
  ok("콘솔·pageerror 치명 오류 없음", fatal.length === 0, fatal.slice(0, 3).join(" | "));

  const sellerGuide = await page.goto(`${BASE}/seller`, { waitUntil: "networkidle" });
  ok("판매점 안내 유지", sellerGuide?.ok() === true);
  const applyOk = await page.goto(`${BASE}/seller/apply`, { waitUntil: "networkidle" });
  ok("판매점 가입신청 유지", applyOk?.ok() === true);
  const completeOk = await page.goto(`${BASE}/seller/apply/complete`, { waitUntil: "networkidle" });
  ok("판매점 완료 유지", completeOk?.ok() === true);
  const statusOk = await page.goto(`${BASE}/seller/application-status`, { waitUntil: "networkidle" });
  ok("판매점 신청현황 유지", statusOk?.ok() === true);
  const pLanding = await page.goto(`${BASE}/partnership`, { waitUntil: "networkidle" });
  ok("제휴 안내 영향 없음", pLanding?.ok() === true);
  const pStatus = await page.goto(`${BASE}/partnership/apply`, { waitUntil: "networkidle" });
  ok("제휴 가입신청 영향 없음", pStatus?.ok() === true);
  const pAppStatus = await page.goto(`${BASE}/partnership/application-status`, { waitUntil: "networkidle" });
  ok("제휴 신청현황 영향 없음", pAppStatus?.ok() === true);

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL detail: ${f.name} ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
