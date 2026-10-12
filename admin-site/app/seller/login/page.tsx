"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SellerLogo } from "@/components/seller/SellerLogo";
import {
  createSellerSessionCookieValue,
  toSellerSession,
  validateSellerLogin,
  type SellerMockAccount,
} from "@/lib/seller/auth";
import { SELLER_ADMIN_DEMO_PROFILE } from "@/lib/seller/seller-admin-profile";
import { SELLER_ADMIN_BASE_PATH, SELLER_JOIN_URL } from "@/lib/seller/navigation";
import {
  SELLER_LOGIN_SCENARIOS,
  getSellerLoginScenario,
  summarizeSupplierTrades,
  type SellerLoginScenarioKey,
} from "@/lib/seller/seller-login-mock";

type LoginView = "form" | "success" | "restricted";
type FieldErrors = { loginId?: string; password?: string };

const SELLER_FEATURES = [
  { title: "여러 공급여행사 통합관리", text: "가입한 공급여행사와 판매상품을 한 곳에서 확인합니다." },
  { title: "예약관리", text: "판매점에서 발생한 예약을 확인하고 관리합니다." },
  { title: "인보이스 · 정산", text: "판매내역과 공급여행사별 정산정보를 확인합니다." },
];

export default function SellerLoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberId, setRememberId] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [scenarioKey, setScenarioKey] = useState<SellerLoginScenarioKey>("normal");
  const [view, setView] = useState<LoginView>("form");
  const [account, setAccount] = useState<SellerMockAccount | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const loginIdRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const scenario = getSellerLoginScenario(scenarioKey);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (view !== "form") headingRef.current?.focus();
  }, [view]);

  const notify = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedId = loginId.trim();
    const nextErrors: FieldErrors = {};
    if (!trimmedId) nextErrors.loginId = "아이디를 입력해주세요.";
    if (!password) nextErrors.password = "비밀번호를 입력해주세요.";
    setFieldErrors(nextErrors);
    setFormError("");
    if (nextErrors.loginId) {
      loginIdRef.current?.focus();
      return;
    }
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    const result = validateSellerLogin(trimmedId, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setFormError("아이디 또는 비밀번호를 확인해주세요.");
      return;
    }

    setPassword("");
    setShowPassword(false);
    setAccount(result.account);
    setView(scenario.accountStatus === "이용제한" ? "restricted" : "success");
  };

  const backToForm = () => {
    setView("form");
    setAccount(null);
    setFormError("");
    setFieldErrors({});
  };

  const startSellerAdmin = () => {
    if (!account) return;
    const next = new URLSearchParams(window.location.search).get("next");
    const nextPath =
      next && next.startsWith(`${SELLER_ADMIN_BASE_PATH}/`) ? next : `${SELLER_ADMIN_BASE_PATH}/dashboard`;
    document.cookie = createSellerSessionCookieValue(account);
    router.replace(nextPath);
    router.refresh();
  };

  const session = account ? toSellerSession(account) : null;
  const isDemoSeller = session?.sellerId === SELLER_ADMIN_DEMO_PROFILE.sellerId;
  const summary = summarizeSupplierTrades(scenario.suppliers);

  return (
    <div className="seller-login-page seller-login-split">
      <header className="seller-login-intro">
        <div className="seller-login-intro-brand">
          <div className="seller-login-logo" aria-hidden="true">
            A
          </div>
          <div>
            <strong>AOS</strong>
            <span>판매점 관리자</span>
          </div>
        </div>
        <h1>AOS 판매점 관리자</h1>
        <p>여러 공급여행사의 여행상품을 하나의 판매점 계정으로 관리하세요.</p>
      </header>

      <ul className="seller-login-features" aria-label="판매점 관리자 주요 기능">
        {SELLER_FEATURES.map((feature, index) => (
          <li key={feature.title}>
            <span aria-hidden="true">{index + 1}</span>
            <div>
              <strong>{feature.title}</strong>
              <p>{feature.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <main className="seller-login-card panel">
        {view === "form" ? (
          <>
            <div className="seller-login-card-head">
              <span className="badge info">AOS 판매점</span>
              <h2>판매점 로그인</h2>
              <p>AOS 판매점 계정으로 로그인해주세요.</p>
            </div>

            <form className="seller-login-form" onSubmit={submit} noValidate>
              <div className="seller-login-field">
                <label htmlFor="seller-login-id">아이디</label>
                <input
                  ref={loginIdRef}
                  id="seller-login-id"
                  type="text"
                  value={loginId}
                  onChange={(event) => {
                    setLoginId(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, loginId: undefined }));
                    setFormError("");
                  }}
                  placeholder="아이디를 입력해주세요."
                  autoComplete="username"
                  aria-invalid={fieldErrors.loginId || formError ? true : undefined}
                  aria-describedby={fieldErrors.loginId ? "seller-login-id-error" : undefined}
                />
                {fieldErrors.loginId ? (
                  <p className="seller-login-error" id="seller-login-id-error" role="alert">
                    {fieldErrors.loginId}
                  </p>
                ) : null}
              </div>

              <div className="seller-login-field">
                <label htmlFor="seller-login-password">비밀번호</label>
                <div className="seller-login-password">
                  <input
                    ref={passwordRef}
                    id="seller-login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      setFormError("");
                    }}
                    placeholder="비밀번호를 입력해주세요."
                    autoComplete="current-password"
                    aria-invalid={fieldErrors.password || formError ? true : undefined}
                    aria-describedby={fieldErrors.password ? "seller-login-password-error" : undefined}
                  />
                  <button
                    type="button"
                    className="secondary seller-login-password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showPassword ? "숨김" : "보기"}</span>
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="seller-login-error" id="seller-login-password-error" role="alert">
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>

              <div className="seller-login-row">
                <label className="seller-login-check">
                  <input
                    type="checkbox"
                    checked={rememberId}
                    onChange={(event) => setRememberId(event.target.checked)}
                  />
                  <span>아이디 저장</span>
                </label>
                <span className="seller-login-links">
                  <button type="button" className="seller-login-link" onClick={() => notify("준비 중인 기능입니다.")}>
                    아이디 찾기
                  </button>
                  <span aria-hidden="true">|</span>
                  <button type="button" className="seller-login-link" onClick={() => notify("준비 중인 기능입니다.")}>
                    비밀번호 찾기
                  </button>
                </span>
              </div>

              {formError ? (
                <p className="seller-login-error seller-login-form-error" role="alert">
                  {formError}
                </p>
              ) : null}

              <button type="submit" className="primary seller-login-submit" disabled={isSubmitting}>
                {isSubmitting ? "로그인 중..." : "로그인"}
              </button>
            </form>

            <p className="seller-login-info" role="note">
              하나의 판매점 계정으로 가입한 여러 공급여행사의 상품, 예약 및 정산정보를 관리할 수 있습니다.
            </p>

            <div className="seller-login-join">
              <span>아직 판매점 계정이 없으신가요?</span>
              <a className="secondary seller-login-join-link" href={SELLER_JOIN_URL}>
                판매점 가입
              </a>
            </div>

            <fieldset className="seller-login-mock">
              <legend>프로토타입 Mock 시나리오</legend>
              <div role="radiogroup" aria-label="로그인 Mock 시나리오">
                {SELLER_LOGIN_SCENARIOS.map((item) => (
                  <label key={item.key} className={scenarioKey === item.key ? "is-selected" : undefined}>
                    <input
                      type="radio"
                      name="seller-login-scenario"
                      checked={scenarioKey === item.key}
                      onChange={() => setScenarioKey(item.key)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : null}

        {view === "success" && session ? (
          <div className="seller-login-result">
            <div className="seller-login-card-head">
              <span className="badge success">로그인 완료</span>
              <h2 ref={headingRef} tabIndex={-1}>
                로그인되었습니다.
              </h2>
            </div>

            <div className="seller-login-seller">
              <SellerLogo sellerName={session.sellerName} logoUrl={session.logoUrl} size="sidebar" />
              <div>
                <strong>{session.sellerName}</strong>
                <span>{session.sellerCode}</span>
              </div>
              <span className="badge success">계정 정상</span>
            </div>

            <p className="seller-login-result-text">
              판매점 관리자에 로그인되었습니다.
              <br />
              <span>다음 단계에서 판매점 대시보드를 구성합니다.</span>
            </p>

            {isDemoSeller ? (
              <div className="seller-login-summary" aria-label="가입 공급여행사 요약">
                <div>
                  <span>가입 공급여행사</span>
                  <strong>{summary.total}곳</strong>
                </div>
                <div>
                  <span>정상</span>
                  <strong>{summary.normal}곳</strong>
                </div>
                <div>
                  <span>승인대기</span>
                  <strong>{summary.pending}곳</strong>
                </div>
                {summary.suspended > 0 ? (
                  <div className="is-suspended">
                    <span>이용중지</span>
                    <strong>{summary.suspended}곳</strong>
                  </div>
                ) : null}
              </div>
            ) : null}

            <p className="seller-login-info" role="note">
              {summary.suspended > 0 && isDemoSeller
                ? "이용중지된 공급여행사의 상품은 판매할 수 없지만, 판매점 계정 로그인에는 영향을 주지 않습니다."
                : "공급여행사별 거래상태는 판매점 계정 상태와 별개로 관리됩니다."}
            </p>

            <div className="seller-login-actions">
              <button type="button" className="secondary" onClick={backToForm}>
                다른 계정으로 로그인
              </button>
              <button type="button" className="primary" onClick={startSellerAdmin}>
                판매점 관리자 시작
              </button>
            </div>
          </div>
        ) : null}

        {view === "restricted" && session ? (
          <div className="seller-login-result">
            <div className="seller-login-card-head">
              <span className="badge danger">이용제한</span>
              <h2 ref={headingRef} tabIndex={-1}>
                판매점 계정 이용이 제한되어 있습니다.
              </h2>
              <p>계정 이용상태를 확인해주세요.</p>
            </div>

            <div className="seller-login-seller is-restricted">
              <SellerLogo sellerName={session.sellerName} logoUrl={session.logoUrl} size="sidebar" />
              <div>
                <strong>{session.sellerName}</strong>
                <span>{session.sellerCode}</span>
              </div>
              <span className="badge danger">계정 이용제한</span>
            </div>

            <p className="seller-login-info" role="note">
              판매점 계정이 이용제한 상태이면 공급여행사 거래상태와 관계없이 판매점 관리자에 로그인할 수 없습니다.
            </p>

            <div className="seller-login-actions">
              <button type="button" className="secondary" onClick={backToForm}>
                로그인 화면으로
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {toast ? (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
