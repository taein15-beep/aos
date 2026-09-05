/**
 * Temporary E2E verification for partnership apply flow.
 * Run: npx --yes playwright@1.49.0 install chromium && node scripts/partnership-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.PARTNERSHIP_BASE || "http://localhost:3001";
const results = [];

function ok(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  } catch (err) {
    console.error("Failed to launch Chrome channel:", err);
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  // 1) Partnership landing
  await page.goto(`${BASE}/partnership`, { waitUntil: "networkidle" });
  ok("안내 페이지 로드", await page.locator("h1").first().isVisible());
  const statusLinks = await page.locator('a[href="/partnership/application-status"]').allTextContents();
  ok(
    "안내 CTA 신청현황 용어",
    statusLinks.every((t) => t.trim() === "신청현황") && statusLinks.length >= 1,
    statusLinks.join(" | "),
  );
  ok("안내에 신청상태 확인 문구 없음", !(await page.content()).includes("신청상태 확인"));

  // 2) Empty apply validation
  await page.goto(`${BASE}/partnership/apply`, { waitUntil: "networkidle" });
  ok("가입신청 제목", await page.getByRole("heading", { name: "제휴여행사 가입신청" }).isVisible());
  ok("진행바 없음", (await page.locator(".partnership-apply-progress, .partnership-apply-steps").count()) === 0);
  ok("이전/다음/임시저장 없음", !(await page.content()).match(/임시저장|>\s*이전\s*</));
  ok("취소 버튼", await page.getByRole("button", { name: "취소" }).isVisible());
  const submit = page.getByRole("button", { name: "가입 신청하기" });
  ok("가입 신청하기 활성", await submit.isEnabled());

  await submit.click();
  await page.waitForTimeout(400);
  const errVisible = await page.locator(".partnership-field-error").first().isVisible();
  ok("빈 제출 시 오류 표시", errVisible);
  const agencyFocused = await page.evaluate(() => document.activeElement?.id === "agencyName");
  ok("첫 오류 포커스(agencyName)", agencyFocused, await page.evaluate(() => document.activeElement?.id || ""));
  ok("빈 제출 후 페이지 유지", page.url().includes("/partnership/apply"));

  // Field validations
  await page.fill("#agencyName", "테스트여행사");
  await page.fill("#businessNumber", "12-34");
  await page.getByRole("button", { name: "중복확인" }).click();
  await page.waitForTimeout(200);
  ok(
    "잘못된 사업자번호 오류",
    (await page.locator(".partnership-field-error").filter({ hasText: "사업자등록번호" }).count()) > 0 ||
      (await page.locator("#businessNumber").getAttribute("aria-invalid")) === "true",
  );

  await page.fill("#businessNumber", "123-45-67890");
  await page.fill("#ceoName", "홍길동");
  await page.fill("#tourismLicenseNumber", "제2026-01호");
  await page.selectOption("#tourismLicenseType", "국내여행업");
  await page.fill("#address", "서울특별시 중구 세종대로 110");
  await page.fill("#phone", "123");
  await submit.click();
  await page.waitForTimeout(300);
  ok(
    "잘못된 대표전화 오류",
    (await page.locator(".partnership-field-error").filter({ hasText: "전화" }).count()) > 0,
  );

  await page.fill("#phone", "02-1234-5678");
  await page.fill("#homepage", "notaurl");
  await submit.click();
  await page.waitForTimeout(300);
  ok(
    "잘못된 홈페이지 오류",
    (await page.locator(".partnership-field-error").filter({ hasText: "홈페이지" }).count()) > 0,
  );
  await page.fill("#homepage", "https://example.com");

  await page.fill("#adminName", "김담당");
  await page.fill("#department", "영업팀");
  await page.fill("#adminPhone", "010");
  await submit.click();
  await page.waitForTimeout(300);
  ok(
    "잘못된 휴대전화 오류",
    (await page.locator(".partnership-field-error").filter({ hasText: "휴대전화" }).count()) > 0,
  );
  await page.fill("#adminPhone", "010-1234-5678");
  await page.fill("#adminEmail", "not-an-email");
  await submit.click();
  await page.waitForTimeout(300);
  ok(
    "잘못된 이메일 오류",
    (await page.locator(".partnership-field-error").filter({ hasText: "이메일" }).count()) > 0,
  );
  await page.fill("#adminEmail", "agent@example.com");
  await page.fill("#adminEmailConfirm", "other@example.com");
  await submit.click();
  await page.waitForTimeout(300);
  ok(
    "이메일 확인 불일치",
    (await page.locator(".partnership-field-error").filter({ hasText: "일치" }).count()) > 0,
  );
  await page.fill("#adminEmailConfirm", "agent@example.com");

  // Required docs / terms / accuracy without files
  await submit.click();
  await page.waitForTimeout(300);
  ok(
    "필수서류/약관 오류",
    (await page.locator(".partnership-field-error").count()) > 0,
  );

  // Attach tiny valid PDF-like files via buffer
  const pdfBuffer = Buffer.from("%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
  await page.setInputFiles("#businessLicenseFile-input", {
    name: "biz.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });
  await page.setInputFiles("#tourismLicenseFile-input", {
    name: "tour.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });

  // Rejected file type
  await page.setInputFiles("#mailOrderLicenseFile-input", {
    name: "bad.exe",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("MZ"),
  });
  await page.waitForTimeout(200);
  ok(
    "허용되지 않은 파일 형식",
    (await page.locator("#mailOrderLicenseFile .partnership-field-error, #mailOrderLicenseFile ~ .partnership-field-error").count()) > 0 ||
      (await page.locator(".partnership-file-slot.is-invalid").count()) > 0 ||
      (await page.getByText("허용 형식").count()) > 0,
  );

  // Oversize file (>10MB)
  const big = Buffer.alloc(10 * 1024 * 1024 + 10, 1);
  await page.setInputFiles("#mailOrderLicenseFile-input", {
    name: "big.pdf",
    mimeType: "application/pdf",
    buffer: big,
  });
  await page.waitForTimeout(200);
  ok(
    "10MB 초과 파일",
    (await page.getByText("용량이 초과").count()) > 0 ||
      (await page.getByText("10MB").count()) > 0,
  );
  // clear bad optional by not required - leave and continue with required files still set

  // clear bad optional
  const mailClear = page.locator("#mailOrderLicenseFile button", { hasText: "삭제" });
  if (await mailClear.count()) await mailClear.first().click();

  await page.setInputFiles("#businessLicenseFile-input", {
    name: "biz.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });
  await page.setInputFiles("#tourismLicenseFile-input", {
    name: "tour.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer,
  });

  // Uncheck path: submit without terms
  await submit.click();
  await page.waitForTimeout(300);
  const beforeAgreeUrl = page.url();
  ok("약관 미동의 시 미이동", beforeAgreeUrl.includes("/partnership/apply"));

  await page.locator(".partnership-agree-all input").check();
  await submit.click();
  await page.waitForURL("**/partnership/apply/complete", { timeout: 15000 });
  ok("제출 후 완료 페이지", page.url().includes("/partnership/apply/complete"));
  ok(
    "완료 제목",
    await page.getByRole("heading", { name: /제휴여행사 가입신청이 완료되었습니다/ }).isVisible(),
  );
  ok("완료 상태 승인대기", await page.getByText("승인대기").first().isVisible());

  // receipt in session
  const receipt = await page.evaluate(() => {
    const raw = sessionStorage.getItem("aos.partnership.apply.prototype.receipt.v2");
    return raw ? JSON.parse(raw) : null;
  });
  ok("receipt.v2 저장", Boolean(receipt?.summary && receipt.applicationNumber));

  // Reload complete
  await page.reload({ waitUntil: "networkidle" });
  ok(
    "완료 새로고침 유지",
    await page.getByRole("heading", { name: /제휴여행사 가입신청이 완료되었습니다/ }).isVisible(),
  );

  // Status page
  await page.getByRole("link", { name: "신청현황", exact: true }).last().click();
  await page.waitForURL("**/partnership/application-status");
  await page.getByRole("heading", { name: "최근 신청" }).waitFor({ state: "visible", timeout: 8000 });
  ok("신청현황 최근 신청", await page.getByRole("heading", { name: "최근 신청" }).isVisible());
  ok("신청현황 승인대기", await page.getByText("승인대기").first().isVisible());
  ok("신청현황에 신청상태 확인 없음", !(await page.locator("a,button,h1").filter({ hasText: "신청상태 확인" }).count()));

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "최근 신청" }).waitFor({ state: "visible", timeout: 8000 });
  ok("신청현황 새로고침 후 최근 신청", await page.getByRole("heading", { name: "최근 신청" }).isVisible());

  // Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/partnership/apply`, { waitUntil: "networkidle" });
  const overflowInfo = await page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [...document.querySelectorAll("body *")]
      .filter((el) => el.scrollWidth > doc.clientWidth + 2)
      .slice(0, 8)
      .map((el) => `${el.tagName}.${el.className}`.slice(0, 80));
    return {
      hasHScroll: doc.scrollWidth > doc.clientWidth + 2,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      offenders,
    };
  });
  ok("모바일 가로스크롤 없음(가입)", !overflowInfo.hasHScroll, JSON.stringify(overflowInfo));

  // Header/footer labels
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/partnership`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /제휴안내/ }).click();
  const menuText = await page.locator(".nav-submenu").innerText();
  ok("헤더 메뉴에 신청현황", menuText.includes("신청현황") && !menuText.includes("신청상태 확인"));
  const footerText = await page.locator("footer").innerText();
  ok("푸터에 신청현황", footerText.includes("신청현황") && !footerText.includes("신청상태 확인"));

  const criticalConsole = consoleErrors.filter(
    (e) => !e.includes("favicon") && !e.includes("Download the React DevTools"),
  );
  ok("콘솔 치명 오류 없음", criticalConsole.length === 0, criticalConsole.slice(0, 3).join(" | "));

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
