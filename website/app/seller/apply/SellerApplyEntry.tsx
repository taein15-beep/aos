"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  APPLY_SUPPLIER,
  EXISTING_SELLER_STEPS,
  MOCK_SELLER_ACCOUNT,
  NEW_SELLER_STEPS,
  SUPPLIER_JOIN_STATES,
  joinStateBadgeClass,
  type EntryStep,
  type SupplierJoinState,
} from "./entry-mock";
import { SellerExistingApplyFlow, type ExistingSellerStage } from "./SellerExistingApplyFlow";
import { SellerNewApplyFlow, type NewSellerStage } from "./SellerNewApplyFlow";

type EntryView = "choose" | "existingLogin" | "existingSeller" | "newSeller";

const NEW_STAGE_STEP: Record<NewSellerStage, number> = { form: 1, confirm: 2, done: 3 };
const EXISTING_STAGE_STEP: Record<ExistingSellerStage, number> = { info: 1, confirm: 2, done: 3 };

function StepIndicator({ steps, current }: { steps: EntryStep[]; current: number }) {
  return (
    <ol className="seller-entry-steps" aria-label="가입 진행 단계">
      {steps.map((step, index) => {
        const state = index < current ? "is-done" : index === current ? "is-current" : "";
        return (
          <li key={step.key} className={state} aria-current={index === current ? "step" : undefined}>
            <span className="seller-entry-step-num">{index + 1}</span>
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function SellerApplyEntry() {
  const supplier = APPLY_SUPPLIER;
  const [view, setView] = useState<EntryView>("choose");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [joinState, setJoinState] = useState<SupplierJoinState>("미가입");
  const [newStage, setNewStage] = useState<NewSellerStage>("form");
  const [existingStage, setExistingStage] = useState<ExistingSellerStage>("info");
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (view === "existingLogin") headingRef.current?.focus();
  }, [view]);

  const notify = (message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  };

  const goChoose = () => {
    setView("choose");
    setLoginError("");
  };

  const submitLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (!loginId.trim() || !password) {
      setLoginError("아이디 또는 이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setLoginError("");
    setExistingStage("info");
    setView("existingSeller");
  };

  const fillMockAccount = () => {
    setLoginId(MOCK_SELLER_ACCOUNT.loginId);
    setPassword(MOCK_SELLER_ACCOUNT.password);
    setLoginError("");
  };

  const isExistingFlow = view === "existingLogin" || view === "existingSeller";
  const steps = isExistingFlow ? EXISTING_SELLER_STEPS : NEW_SELLER_STEPS;
  const currentStep =
    view === "choose"
      ? 0
      : view === "newSeller"
        ? NEW_STAGE_STEP[newStage]
        : view === "existingSeller"
          ? EXISTING_STAGE_STEP[existingStage]
          : 0;
  const supplierJoinState: SupplierJoinState | null =
    view === "existingSeller" ? (existingStage === "done" ? "승인대기" : joinState) : null;

  const startNewSeller = () => {
    setNewStage("form");
    setView("newSeller");
  };

  return (
    <main className="seller-apply-page seller-entry-page">
      <div className="shell seller-apply-shell">
        <nav className="seller-apply-breadcrumb" aria-label="현재 위치">
          <Link href="/">홈</Link>
          <span aria-hidden="true">/</span>
          <Link href="/seller">판매점</Link>
          <span aria-hidden="true">/</span>
          <span>가입신청</span>
        </nav>

        <header className="seller-entry-intro">
          <span className="seller-entry-logo is-supplier" aria-hidden="true">
            {supplier.logoText}
          </span>
          <div>
            <span className="section-kicker">SELLER APPLY</span>
            <h1>{supplier.name} 판매점 가입</h1>
            <p>{supplier.name}의 여행상품을 판매하려면 판매점 가입신청을 진행해주세요.</p>
          </div>
        </header>

        <StepIndicator steps={steps} current={currentStep} />

        <section className="seller-entry-supplier" aria-label="가입 대상 공급여행사">
          <span className="seller-entry-logo is-supplier" aria-hidden="true">
            {supplier.logoText}
          </span>
          <div>
            <small>가입 대상</small>
            <strong>{supplier.name}</strong>
            <span className="seller-entry-badge is-info">{supplier.typeLabel}</span>
            {supplierJoinState ? (
              <span className={`seller-entry-badge ${joinStateBadgeClass(supplierJoinState)}`}>
                {supplierJoinState}
              </span>
            ) : null}
          </div>
          <p>가입 승인 후 {supplier.name}에서 판매 허용한 상품을 판매할 수 있습니다.</p>
        </section>

        <p className="seller-apply-temp-note" role="note">
          프론트엔드 프로토타입입니다. 실제 로그인·회원가입·가입신청 저장은 연결되지 않습니다.
        </p>

        {view === "choose" ? (
          <section className="seller-apply-panel seller-entry-panel" aria-labelledby="seller-entry-question">
            <header className="seller-apply-panel-head">
              <span>STEP 1 · 가입유형</span>
              <h2 id="seller-entry-question">AOS 판매점 계정이 있으신가요?</h2>
              <p>
                기존 판매점 계정이 있다면 새 계정을 만들 필요 없이 해당 계정으로 {supplier.name}에 가입할 수 있습니다.
              </p>
            </header>

            <div className="seller-entry-choices">
              <article className="seller-entry-choice">
                <span className="seller-entry-choice-icon" aria-hidden="true">
                  ID
                </span>
                <h3>기존 판매점 계정으로 가입</h3>
                <p>
                  이미 AOS 판매점으로 활동 중이라면 기존 계정으로 로그인하여 {supplier.name}에 추가 가입할 수 있습니다.
                </p>
                <ul>
                  <li>새 판매점 계정을 만들 필요가 없습니다.</li>
                  <li>기존 계정에 {supplier.name} 가입신청이 추가됩니다.</li>
                </ul>
                <button type="button" className="button primary" onClick={() => setView("existingLogin")}>
                  기존 계정으로 가입
                </button>
              </article>

              <article className="seller-entry-choice">
                <span className="seller-entry-choice-icon" aria-hidden="true">
                  +
                </span>
                <h3>처음 판매점 가입</h3>
                <p>
                  AOS 판매점 계정이 없다면 판매점 정보를 등록한 후 {supplier.name}에 가입신청할 수 있습니다.
                </p>
                <ul>
                  <li>AOS 판매점 계정을 먼저 만듭니다.</li>
                  <li>계정 생성 후 {supplier.name} 가입신청을 이어서 진행합니다.</li>
                </ul>
                <button type="button" className="button primary" onClick={startNewSeller}>
                  판매점 계정 만들기
                </button>
              </article>
            </div>

            <div className="seller-entry-concept" aria-label="판매점 계정과 공급여행사 가입 관계">
              <div>
                <strong>판매점 계정</strong>
                <span>1개</span>
              </div>
              <em aria-hidden="true">→</em>
              <div>
                <strong>공급여행사 가입</strong>
                <span>여러 곳 (공급여행사별 별도 신청)</span>
              </div>
            </div>
          </section>
        ) : null}

        {view === "existingLogin" ? (
          <section className="seller-apply-panel seller-entry-panel" aria-labelledby="seller-entry-login-title">
            <header className="seller-apply-panel-head">
              <span>STEP 1 · 계정확인</span>
              <h2 id="seller-entry-login-title" ref={headingRef} tabIndex={-1}>
                기존 판매점 계정 확인
              </h2>
              <p>AOS 판매점 계정으로 로그인한 후 {supplier.name} 가입신청을 진행합니다.</p>
            </header>

            <form className="seller-entry-login" onSubmit={submitLogin} noValidate>
              <div className="seller-apply-fields">
                <label className="full">
                  <span className="seller-field-label">
                    <span>아이디 또는 이메일</span>
                  </span>
                  <input
                    value={loginId}
                    onChange={(event) => {
                      setLoginId(event.target.value);
                      setLoginError("");
                    }}
                    autoComplete="username"
                    placeholder="아이디 또는 이메일을 입력해주세요."
                  />
                </label>
                <label className="full">
                  <span className="seller-field-label">
                    <span>비밀번호</span>
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setLoginError("");
                    }}
                    autoComplete="current-password"
                    placeholder="비밀번호를 입력해주세요."
                  />
                </label>
              </div>
              {loginError ? (
                <p className="seller-field-error seller-entry-login-error" role="alert">
                  {loginError}
                </p>
              ) : null}

              <fieldset className="seller-entry-mock">
                <legend>프로토타입 Mock 설정</legend>
                <p>
                  Mock 계정: {MOCK_SELLER_ACCOUNT.sellerName} ({MOCK_SELLER_ACCOUNT.sellerCode}){" "}
                  <button type="button" className="seller-entry-link" onClick={fillMockAccount}>
                    Mock 계정 입력
                  </button>
                </p>
                <div className="seller-entry-mock-states" role="radiogroup" aria-label={`${supplier.name} 가입상태 Mock`}>
                  {SUPPLIER_JOIN_STATES.map((state) => (
                    <label key={state} className={joinState === state ? "is-selected" : undefined}>
                      <input
                        type="radio"
                        name="seller-entry-join-state"
                        checked={joinState === state}
                        onChange={() => setJoinState(state)}
                      />
                      {state}
                    </label>
                  ))}
                </div>
                <small>로그인 후 표시할 {supplier.name} 가입상태를 선택합니다.</small>
              </fieldset>

              <div className="seller-entry-actions">
                <button type="button" className="button ghost dark" onClick={goChoose}>
                  이전
                </button>
                <button type="submit" className="button primary">
                  로그인 후 가입 계속
                </button>
              </div>
              <p className="seller-entry-subactions">
                <button type="button" className="seller-entry-link" onClick={() => notify("비밀번호 찾기는 이번 단계에서 연결하지 않습니다.")}>
                  비밀번호 찾기
                </button>
              </p>
            </form>
          </section>
        ) : null}

        {view === "existingSeller" ? (
          <SellerExistingApplyFlow
            supplier={supplier}
            joinState={joinState}
            stage={existingStage}
            onStageChange={setExistingStage}
            onBack={() => setView("existingLogin")}
            notify={notify}
          />
        ) : null}

        {view === "newSeller" ? (
          <SellerNewApplyFlow
            supplier={supplier}
            stage={newStage}
            onStageChange={setNewStage}
            onBack={goChoose}
            notify={notify}
          />
        ) : null}

        <aside className="seller-entry-help" aria-labelledby="seller-entry-help-title">
          <h2 id="seller-entry-help-title">판매점 계정이란?</h2>
          <p>
            AOS 판매점 계정 하나로 여러 공급여행사에 가입하고, 각 공급여행사가 제공하는 상품을 판매할 수 있습니다.
          </p>
          <p>판매점 계정과 공급여행사 가입은 별개입니다. 공급여행사마다 가입신청과 승인이 따로 진행됩니다.</p>
        </aside>
      </div>

      {toast ? (
        <div className="seller-entry-toast" role="status">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
