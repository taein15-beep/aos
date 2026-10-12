"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MOCK_SELLER_ACCOUNT,
  MOCK_SELLER_EXISTING_SUPPLIERS,
  getNewSellerTerms,
  joinStateBadgeClass,
  type ApplySupplier,
  type SupplierJoinState,
} from "./entry-mock";
import { Dialog } from "./SellerNewApplyFlow";

export type ExistingSellerStage = "info" | "confirm" | "done";

const seller = MOCK_SELLER_ACCOUNT;

function StateBadge({ state }: { state: SupplierJoinState }) {
  return <span className={`seller-entry-badge ${joinStateBadgeClass(state)}`}>{state}</span>;
}

function SellerSummaryList({ withEmail }: { withEmail: boolean }) {
  return (
    <dl className="seller-exist-dl">
      <div>
        <dt>대표자</dt>
        <dd>{seller.representative}</dd>
      </div>
      <div>
        <dt>담당자</dt>
        <dd>{seller.managerName}</dd>
      </div>
      <div>
        <dt>연락처</dt>
        <dd>{seller.managerPhone}</dd>
      </div>
      {withEmail ? (
        <div>
          <dt>이메일</dt>
          <dd>{seller.email}</dd>
        </div>
      ) : null}
      <div>
        <dt>사업자등록번호</dt>
        <dd>{seller.businessNumber}</dd>
      </div>
    </dl>
  );
}

export function SellerExistingApplyFlow({
  supplier,
  joinState,
  stage,
  onStageChange,
  onBack,
  notify,
}: {
  supplier: ApplySupplier;
  joinState: SupplierJoinState;
  stage: ExistingSellerStage;
  onStageChange: (stage: ExistingSellerStage) => void;
  onBack: () => void;
  notify: (message: string) => void;
}) {
  const policy = useMemo(
    () => getNewSellerTerms(supplier.name).find((term) => term.key === "supplierPolicy"),
    [supplier.name],
  );
  const [agreed, setAgreed] = useState(false);
  const [policyError, setPolicyError] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [stage]);

  const canApply = joinState === "미가입";

  const goConfirm = () => {
    if (!agreed) {
      setPolicyError(true);
      document.getElementById("seller-exist-policy")?.focus();
      return;
    }
    onStageChange("confirm");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitApplication = () => {
    setConfirmOpen(false);
    onStageChange("done");
    notify(`${supplier.name} 판매점 가입신청이 접수되었습니다.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sellerCard = (
    <div className="seller-entry-account seller-exist-account">
      <span className="seller-entry-logo" aria-hidden="true">
        {seller.logoText}
      </span>
      <div>
        <strong>{seller.sellerName}</strong>
        <small>
          {seller.sellerCode} <span className="seller-entry-badge is-info">AOS 판매점</span>
        </small>
      </div>
    </div>
  );

  if (stage === "done") {
    const relations = [
      ...MOCK_SELLER_EXISTING_SUPPLIERS.map((item) => ({ ...item, isNew: false })),
      { supplierName: supplier.name, logoText: supplier.logoText, state: "승인대기" as SupplierJoinState, isNew: true },
    ];
    return (
      <section className="seller-apply-panel seller-entry-panel" aria-labelledby="seller-exist-done-title">
        <header className="seller-apply-panel-head">
          <span>STEP 4 · 완료 (Preview)</span>
          <h2 id="seller-exist-done-title" ref={headingRef} tabIndex={-1}>
            가입신청이 완료되었습니다.
          </h2>
          <p>
            {seller.sellerName}({seller.sellerCode}) 계정으로 {supplier.name}에 판매점 가입신청이 접수되었습니다.
          </p>
        </header>

        <div className="seller-new-target">
          <h3>가입 신청 공급여행사</h3>
          <div>
            <span className="seller-entry-logo is-supplier" aria-hidden="true">
              {supplier.logoText}
            </span>
            <strong>{supplier.name}</strong>
            <StateBadge state="승인대기" />
          </div>
          <p>{supplier.name}의 승인 후 판매 가능한 상품을 확인할 수 있습니다.</p>
        </div>

        <section className="seller-exist-block" aria-labelledby="seller-exist-relations-title">
          <h3 id="seller-exist-relations-title">{seller.sellerName}의 공급여행사</h3>
          <table className="seller-exist-table">
            <thead>
              <tr>
                <th scope="col">공급여행사</th>
                <th scope="col">상태</th>
              </tr>
            </thead>
            <tbody>
              {relations.map((item) => (
                <tr key={item.supplierName} className={item.isNew ? "is-new" : undefined}>
                  <td>
                    <span className="seller-exist-supplier-name">
                      <span className="seller-exist-mini-logo" aria-hidden="true">
                        {item.logoText}
                      </span>
                      {item.supplierName}
                      {item.isNew ? <em>이번 신청</em> : null}
                    </span>
                  </td>
                  <td>
                    <StateBadge state={item.state} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="seller-exist-caption">
            공급여행사별 상태는 서로 독립적입니다. {supplier.name} 가입신청으로 다른 공급여행사의 상태·상품·예약은
            변경되지 않습니다.
          </p>
        </section>

        <ul className="seller-new-done-notes">
          <li>가입 승인 후에도 {supplier.name}가 판매 허용한 상품만 판매할 수 있습니다.</li>
          <li>기존에 가입한 다른 공급여행사의 상품도 동일한 판매점 관리자에서 계속 이용할 수 있습니다.</li>
        </ul>

        <div className="seller-entry-actions">
          <button
            type="button"
            className="button ghost dark"
            onClick={() => notify("판매점 관리자 로그인은 이번 단계에서 연결하지 않습니다.")}
          >
            판매점 관리자 로그인
          </button>
        </div>
      </section>
    );
  }

  if (stage === "confirm") {
    return (
      <section className="seller-apply-panel seller-entry-panel" aria-labelledby="seller-exist-confirm-title">
        <header className="seller-apply-panel-head">
          <span>STEP 3 · 가입신청</span>
          <h2 id="seller-exist-confirm-title" ref={headingRef} tabIndex={-1}>
            가입신청 내용 확인
          </h2>
          <p>아래 내용을 확인한 후 {supplier.name}에 판매점 가입을 신청해주세요.</p>
        </header>

        <div className="seller-new-review seller-exist-review">
          <section aria-labelledby="seller-exist-review-apply">
            <h3 id="seller-exist-review-apply">가입신청 내용</h3>
            <dl>
              <div>
                <dt>판매점</dt>
                <dd>
                  {seller.sellerName}
                  <br />
                  <span className="seller-new-muted">{seller.sellerCode}</span>
                </dd>
              </div>
              <div>
                <dt>가입 대상 공급여행사</dt>
                <dd>{supplier.name}</dd>
              </div>
              <div>
                <dt>현재 관계</dt>
                <dd>
                  <StateBadge state="미가입" />
                </dd>
              </div>
              <div>
                <dt>신청 후 상태</dt>
                <dd>
                  <StateBadge state="승인대기" />
                </dd>
              </div>
              <div>
                <dt>동의</dt>
                <dd>{supplier.name} 판매점 운영정책 동의 완료</dd>
              </div>
            </dl>
          </section>
          <section aria-labelledby="seller-exist-review-seller">
            <h3 id="seller-exist-review-seller">판매점 정보 요약</h3>
            <dl>
              <div>
                <dt>판매점명</dt>
                <dd>{seller.sellerName}</dd>
              </div>
              <div>
                <dt>대표자</dt>
                <dd>{seller.representative}</dd>
              </div>
              <div>
                <dt>담당자</dt>
                <dd>{seller.managerName}</dd>
              </div>
              <div>
                <dt>연락처</dt>
                <dd>{seller.managerPhone}</dd>
              </div>
              <div>
                <dt>사업자등록번호</dt>
                <dd>{seller.businessNumber}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="seller-new-info seller-exist-keep" role="note">
          <p>
            이번 신청은 기존 AOS 판매점 계정을 유지한 상태에서 {supplier.name}와 새로운 판매관계를 신청하는 것입니다.
          </p>
          <p>기존에 가입한 다른 공급여행사와의 거래에는 영향을 주지 않습니다.</p>
        </div>

        <div className="seller-apply-actions">
          <button type="button" className="button ghost dark" onClick={() => onStageChange("info")}>
            이전
          </button>
          <button type="button" className="button primary" onClick={() => setConfirmOpen(true)}>
            {supplier.name} 가입신청
          </button>
        </div>

        {confirmOpen ? (
          <Dialog titleId="seller-exist-confirm-dialog-title" onClose={() => setConfirmOpen(false)}>
            <h3 id="seller-exist-confirm-dialog-title">{supplier.name}에 판매점 가입을 신청하시겠습니까?</h3>
            <p className="seller-new-dialog-lead">
              {seller.sellerName}({seller.sellerCode}) 계정으로 {supplier.name}에 판매점 가입을 신청합니다.
            </p>
            <p>가입신청 후 {supplier.name}의 승인이 필요합니다.</p>
            <div>
              <button type="button" className="button ghost dark compact" onClick={() => setConfirmOpen(false)}>
                취소
              </button>
              <button type="button" className="button primary compact" onClick={submitApplication}>
                가입신청
              </button>
            </div>
          </Dialog>
        ) : null}
      </section>
    );
  }

  return (
    <section className="seller-apply-panel seller-entry-panel" aria-labelledby="seller-exist-info-title">
      <header className="seller-apply-panel-head">
        <span>STEP 2 · 가입정보 확인</span>
        <h2 id="seller-exist-info-title" ref={headingRef} tabIndex={-1}>
          공급여행사 추가 가입
        </h2>
        <p>기존 AOS 판매점 계정으로 {supplier.name}에 판매점 가입을 신청합니다.</p>
      </header>

      {!canApply ? (
        <div className={`seller-entry-join seller-exist-state ${joinStateBadgeClass(joinState)}`} role="status">
          <div className="seller-entry-join-head">
            <span>{supplier.name} 가입상태</span>
            <StateBadge state={joinState} />
          </div>
          {joinState === "정상" ? (
            <>
              <h3>이미 가입된 공급여행사입니다.</h3>
              <p>
                {seller.sellerName}는 현재 {supplier.name}의 정상 판매점입니다.
              </p>
              <small>신규 가입신청 없이 판매점 관리자에서 {supplier.name} 상품을 이용할 수 있습니다.</small>
            </>
          ) : null}
          {joinState === "승인대기" ? (
            <>
              <h3>가입 승인 대기 중입니다.</h3>
              <p>{supplier.name}에 판매점 가입신청이 접수되어 있습니다.</p>
              <small>공급여행사의 승인 후 판매 가능한 상품을 확인할 수 있습니다.</small>
            </>
          ) : null}
          {joinState === "이용중지" ? (
            <>
              <h3>판매점 이용이 중지되어 있습니다.</h3>
              <p>{supplier.name}와의 판매점 거래가 현재 중지된 상태입니다.</p>
              <small>신규 가입신청이 아닌 이용 재개가 필요합니다. {supplier.name} 담당자에게 문의해주세요.</small>
            </>
          ) : null}
          {joinState === "승인거절" ? (
            <>
              <h3>이전 가입신청이 승인되지 않았습니다.</h3>
              <small>재가입이 필요한 경우 {supplier.name} 담당자에게 문의해주세요.</small>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="seller-exist-grid">
        <section className="seller-exist-block" aria-labelledby="seller-exist-seller-title">
          <h3 id="seller-exist-seller-title">가입 판매점</h3>
          {sellerCard}
          <SellerSummaryList withEmail />
          <p className="seller-exist-caption">
            판매점 정보가 변경된 경우 판매점 관리자에서 정보를 수정한 후 가입신청을 진행해주세요.{" "}
            <button
              type="button"
              className="seller-entry-link"
              onClick={() => notify("판매점 정보 관리는 판매점 관리자에서 제공될 예정입니다.")}
            >
              판매점 정보 관리
            </button>
          </p>
        </section>

        <section className="seller-exist-block" aria-labelledby="seller-exist-suppliers-title">
          <h3 id="seller-exist-suppliers-title">현재 가입 공급여행사</h3>
          <ul className="seller-exist-suppliers">
            {MOCK_SELLER_EXISTING_SUPPLIERS.map((item) => (
              <li key={item.supplierName}>
                <span className="seller-exist-supplier-name">
                  <span className="seller-exist-mini-logo" aria-hidden="true">
                    {item.logoText}
                  </span>
                  {item.supplierName}
                </span>
                <StateBadge state={item.state} />
              </li>
            ))}
          </ul>
          <div className="seller-exist-divider">{canApply ? "이번 가입신청" : "가입 대상 공급여행사"}</div>
          <ul className="seller-exist-suppliers">
            <li className="is-new">
              <span className="seller-exist-supplier-name">
                <span className="seller-exist-mini-logo is-supplier" aria-hidden="true">
                  {supplier.logoText}
                </span>
                {supplier.name}
              </span>
              <StateBadge state={joinState} />
            </li>
          </ul>
          <p className="seller-exist-caption">
            {supplier.name} 가입신청은 기존에 이용 중인 다른 공급여행사와의 관계에 영향을 주지 않습니다.
          </p>
        </section>
      </div>

      {canApply ? (
        <>
          <section className="seller-apply-section" aria-labelledby="seller-exist-policy-title">
            <div className="seller-apply-section-head">
              <h3 id="seller-exist-policy-title">판매점 운영정책</h3>
              <p>{supplier.name}의 상품을 판매하기 위해 아래 운영정책을 확인해주세요.</p>
            </div>
            <fieldset className={`seller-apply-check-group${policyError && !agreed ? " is-invalid" : ""}`}>
              <legend>공급여행사 운영정책</legend>
              <div className="seller-term-row">
                <label className="check">
                  <input
                    id="seller-exist-policy"
                    type="checkbox"
                    checked={agreed}
                    aria-describedby={policyError && !agreed ? "seller-exist-policy-error" : undefined}
                    onChange={(event) => setAgreed(event.target.checked)}
                  />
                  <span>
                    <b className="seller-new-term-required">[필수]</b> {supplier.name} 판매점 운영정책에 동의합니다.
                  </span>
                </label>
                <button type="button" className="seller-term-view" onClick={() => setPolicyOpen(true)}>
                  보기
                </button>
              </div>
            </fieldset>
            {policyError && !agreed ? (
              <small className="seller-field-error" id="seller-exist-policy-error" role="alert">
                {supplier.name} 판매점 운영정책에 동의해주세요.
              </small>
            ) : null}
            <p className="seller-exist-caption">
              AOS 판매점 이용약관과 개인정보 수집·이용 동의는 계정 생성 시 완료되어 다시 동의하지 않습니다.
            </p>
          </section>

          <section className="seller-exist-guide" aria-label="가입조건 안내">
            <div>
              <h4>가입 후 이용</h4>
              <p>
                {supplier.name}의 승인 후 {supplier.name}가 판매 허용한 상품을 판매할 수 있습니다.
              </p>
            </div>
            <div>
              <h4>판매조건</h4>
              <p>상품별 판매조건은 {supplier.name}에서 수수료형 또는 입금가형으로 설정합니다.</p>
            </div>
            <div>
              <h4>여러 공급여행사 이용</h4>
              <p>기존에 가입한 다른 공급여행사의 상품도 동일한 판매점 관리자에서 계속 이용할 수 있습니다.</p>
            </div>
          </section>
          <ol className="seller-exist-flow" aria-label="상품 판매 절차">
            <li>{supplier.name} 가입 승인</li>
            <li>판매점 정상</li>
            <li>{supplier.name}가 상품 판매 허용</li>
            <li>허용 상품 판매</li>
          </ol>
          <p className="seller-exist-caption">가입 승인 후에도 {supplier.name}가 판매 허용한 상품만 판매할 수 있습니다.</p>

          <div className="seller-apply-actions">
            <button type="button" className="button ghost dark" onClick={onBack}>
              이전
            </button>
            <button
              type="button"
              className={`button primary${agreed ? "" : " seller-new-submit-pending"}`}
              aria-disabled={!agreed}
              onClick={goConfirm}
            >
              가입신청 내용 확인
            </button>
          </div>
        </>
      ) : (
        <div className="seller-apply-actions">
          <button type="button" className="button ghost dark" onClick={onBack}>
            이전
          </button>
          {joinState === "정상" ? (
            <button
              type="button"
              className="button primary"
              onClick={() => notify("판매점 관리자 로그인은 이번 단계에서 연결하지 않습니다.")}
            >
              판매점 관리자 로그인
            </button>
          ) : null}
        </div>
      )}

      {policyOpen && policy ? (
        <Dialog titleId="seller-exist-policy-dialog-title" className="seller-term-dialog" onClose={() => setPolicyOpen(false)}>
          <h3 id="seller-exist-policy-dialog-title">[필수] {policy.title}</h3>
          <p className="seller-term-badge">Mock 약관 · 실제 약관 전문은 이후 단계에서 연결합니다.</p>
          <p>{policy.summary}</p>
          <div>
            <button type="button" className="button primary compact" onClick={() => setPolicyOpen(false)}>
              확인
            </button>
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}
