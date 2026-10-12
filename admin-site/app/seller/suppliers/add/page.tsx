"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Info as InfoIcon, Search, X } from "lucide-react";
import { SellerLogo } from "@/components/seller/SellerLogo";
import { Info } from "@/components/seller/SellerSupplierDialogs";
import {
  SellerSupplierDirectoryDrawer,
  SellerSupplierJoinConfirmModal,
  SellerSupplierPolicyModal,
  SupplierJoinStatusBadge,
} from "@/components/seller/SellerSupplierJoinDialogs";
import { SELLER_ADMIN_BASE_PATH } from "@/lib/seller/navigation";
import { SELLER_ADMIN_DEMO_PROFILE, getSellerRegisteredInfo } from "@/lib/seller/seller-admin-profile";
import {
  getSellerSupplierRelations,
  getSellerSupplierSearchDirectory,
  isJoinedOrApplied,
  searchSellerSuppliers,
  supplierJoinGuide,
  supplierLogoText,
  supplierRelationStatusBadgeClass,
  type SellerSupplierJoinStatus,
  type SellerSupplierSearchResult,
} from "@/lib/seller/seller-suppliers-data";
import { useSellerSession } from "@/lib/seller/use-seller-session";

type JoinView = "search" | "apply" | "review" | "done";

const MEMO_MAX_LENGTH = 500;
const SUPPLIERS_PATH = `${SELLER_ADMIN_BASE_PATH}/suppliers`;

function SupplierIdentity({ supplier }: { supplier: Pick<SellerSupplierSearchResult, "supplierName" | "supplierCode"> }) {
  return (
    <div className="seller-sup-join-party">
      <span className="seller-relation-logo is-large" aria-hidden="true">
        {supplierLogoText(supplier.supplierName)}
      </span>
      <span>
        <strong>{supplier.supplierName}</strong>
        <small>{supplier.supplierCode}</small>
      </span>
    </div>
  );
}

export default function SellerSupplierAddPage() {
  const session = useSellerSession();
  const seller = {
    sellerId: session?.sellerId ?? SELLER_ADMIN_DEMO_PROFILE.sellerId,
    sellerName: session?.sellerName ?? SELLER_ADMIN_DEMO_PROFILE.sellerName,
    sellerCode: session?.sellerCode ?? SELLER_ADMIN_DEMO_PROFILE.sellerCode,
    logoUrl: session?.logoUrl ?? SELLER_ADMIN_DEMO_PROFILE.logoUrl,
  };
  const registered = getSellerRegisteredInfo(seller.sellerId);

  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, SellerSupplierJoinStatus>>({});
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [view, setView] = useState<JoinView>("search");
  const [targetCode, setTargetCode] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const directory = useMemo(() => getSellerSupplierSearchDirectory(seller.sellerId), [seller.sellerId]);
  const results = useMemo(
    () => searchSellerSuppliers(directory, keyword, statusOverrides),
    [directory, keyword, statusOverrides],
  );
  const withStatus = useCallback(
    (code: string | null) => {
      const entry = directory.find((item) => item.supplierCode === code);
      return entry ? { ...entry, joinStatus: statusOverrides[entry.supplierCode] ?? entry.joinStatus } : null;
    },
    [directory, statusOverrides],
  );
  const detail = withStatus(detailCode);
  const target = withStatus(targetCode);

  const existingRelations = useMemo(
    () => getSellerSupplierRelations(seller.sellerId, "normal").filter(isJoinedOrApplied),
    [seller.sellerId],
  );

  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
  };

  const moveTo = (next: JoinView) => {
    setView(next);
    window.scrollTo({ top: 0 });
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setKeyword(input.trim());
  };

  const resetSearch = () => {
    setInput("");
    setKeyword("");
  };

  const closeDetail = useCallback(() => setDetailCode(null), []);
  const closePolicy = useCallback(() => setPolicyOpen(false), []);
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);

  const startApply = useCallback(
    (code: string) => {
      const entry = withStatus(code);
      if (!entry || !supplierJoinGuide(entry.joinStatus).canApply) return;
      setDetailCode(null);
      setTargetCode(code);
      setMemo("");
      setAgreed(false);
      setView("apply");
      window.scrollTo({ top: 0 });
    },
    [withStatus],
  );

  const cancelApply = () => {
    setTargetCode(null);
    moveTo("search");
  };

  const submitApplication = () => {
    if (!target || !supplierJoinGuide(target.joinStatus).canApply) return;
    setStatusOverrides((prev) => ({ ...prev, [target.supplierCode]: "승인대기" }));
    setConfirmOpen(false);
    moveTo("done");
    showToast("공급여행사 가입신청이 접수되었습니다.");
  };

  const sellerIdentity = { sellerName: seller.sellerName, sellerCode: seller.sellerCode };

  return (
    <div className="seller-sup-page seller-sup-join-page">
      <section className="page-head seller-sup-head">
        <div>
          <h1>공급여행사 추가</h1>
          <p>새로운 공급여행사를 찾아 {seller.sellerName} 판매점 계정으로 가입을 신청합니다.</p>
        </div>
      </section>

      {view === "search" ? (
        <>
          <section className="seller-sup-join-account" aria-labelledby="seller-sup-join-account-title">
            <InfoIcon size={18} aria-hidden="true" />
            <div>
              <h2 id="seller-sup-join-account-title">기존 판매점 계정을 그대로 사용합니다.</h2>
              <p>
                새로운 판매점 계정을 만들 필요 없이 {seller.sellerName}({seller.sellerCode}) 계정으로 여러 공급여행사에 가입할 수
                있습니다.
              </p>
            </div>
          </section>

          <section className="panel seller-sup-list" aria-labelledby="seller-sup-find-title">
            <div className="panel-head">
              <div>
                <h2 id="seller-sup-find-title">공급여행사 찾기</h2>
                <p>AOS에 등록된 공급여행사 중 가입하려는 공급여행사를 찾습니다.</p>
              </div>
            </div>

            <form className="seller-sup-toolbar seller-sup-find" role="search" onSubmit={submitSearch}>
              <label className="seller-sup-search" htmlFor="seller-sup-find-keyword">
                <Search size={15} aria-hidden="true" />
                <input
                  id="seller-sup-find-keyword"
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="공급여행사명 또는 코드 검색"
                  aria-label="공급여행사명 또는 코드 검색"
                  autoComplete="off"
                />
                {input ? (
                  <button type="button" className="seller-sup-search-clear" aria-label="검색어 지우기" onClick={resetSearch}>
                    <X size={14} />
                  </button>
                ) : null}
              </label>
              <button type="submit" className="primary seller-sup-primary">
                검색
              </button>
              {keyword ? (
                <button type="button" className="secondary" onClick={resetSearch}>
                  초기화
                </button>
              ) : null}
            </form>

            {!keyword ? (
              <div className="seller-sup-empty">
                <h3>공급여행사를 검색해주세요.</h3>
                <p>가입하려는 공급여행사명 또는 공급여행사 코드를 입력해주세요.</p>
              </div>
            ) : results.length === 0 ? (
              <div className="seller-sup-empty">
                <h3>검색 결과가 없습니다.</h3>
                <p>입력한 공급여행사명 또는 코드를 다시 확인해주세요.</p>
              </div>
            ) : (
              <>
                <p className="seller-sup-result-meta">
                  ‘{keyword}’ 검색 결과 <b>{results.length}</b>곳 · 가입 가능한 공급여행사를 먼저 표시합니다.
                </p>
                <ul className="seller-sup-results">
                  {results.map((supplier) => {
                    const guide = supplierJoinGuide(supplier.joinStatus);
                    return (
                      <li key={supplier.supplierCode} className={guide.canApply ? "is-available" : undefined}>
                        <div className="seller-sup-result-main">
                          <span className="seller-relation-logo is-large" aria-hidden="true">
                            {supplierLogoText(supplier.supplierName)}
                          </span>
                          <div>
                            <button
                              type="button"
                              className="seller-sup-result-name"
                              onClick={() => setDetailCode(supplier.supplierCode)}
                            >
                              {supplier.supplierName}
                            </button>
                            <small>{supplier.supplierCode}</small>
                            <p>{supplier.summary}</p>
                          </div>
                        </div>
                        <div className="seller-sup-result-status">
                          <span>현재 관계</span>
                          <SupplierJoinStatusBadge status={supplier.joinStatus} />
                          {guide.messages.map((message) => (
                            <small key={message}>{message}</small>
                          ))}
                        </div>
                        <div className="seller-sup-result-actions">
                          <button
                            type="button"
                            className="secondary"
                            aria-label={`${supplier.supplierName} 상세보기`}
                            onClick={() => setDetailCode(supplier.supplierCode)}
                          >
                            상세보기
                          </button>
                          <button
                            type="button"
                            className={guide.canApply ? "primary seller-sup-primary" : "secondary seller-sup-disabled"}
                            disabled={!guide.canApply}
                            aria-label={`${supplier.supplierName} ${guide.actionLabel}`}
                            onClick={() => startApply(supplier.supplierCode)}
                          >
                            {guide.actionLabel}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </>
      ) : null}

      {view === "apply" && target ? (
        <section className="panel seller-sup-apply" aria-labelledby="seller-sup-apply-title">
          <div className="panel-head">
            <div>
              <h2 id="seller-sup-apply-title">공급여행사 가입신청</h2>
              <p>
                기존 {seller.sellerName} 판매점 계정으로 {target.supplierName}에 가입을 신청합니다.
              </p>
            </div>
            <ol className="seller-sup-steps" aria-label="가입신청 단계">
              <li className="is-current">가입신청</li>
              <li>신청내용 확인</li>
              <li>완료</li>
            </ol>
          </div>

          <div className="seller-sup-apply-body">
            <div className="seller-sup-apply-parties">
              <section aria-labelledby="seller-sup-apply-seller">
                <h3 id="seller-sup-apply-seller">
                  신청 판매점 <small>등록정보 · 조회 전용</small>
                </h3>
                <div className="seller-sup-join-party">
                  <SellerLogo sellerName={seller.sellerName} logoUrl={seller.logoUrl} size="header" />
                  <span>
                    <strong>{seller.sellerName}</strong>
                    <small>{seller.sellerCode}</small>
                  </span>
                </div>
                <dl className="seller-relation-dl">
                  <Info label="대표자">{registered?.representative ?? "-"}</Info>
                  <Info label="담당자">{registered?.contactName ?? "-"}</Info>
                  <Info label="연락처">{registered?.contactPhone ?? "-"}</Info>
                  <Info label="사업자등록번호">{registered?.businessNumber ?? "-"}</Info>
                </dl>
                <p className="seller-relation-drawer-help">
                  판매점 가입 시 등록한 정보를 그대로 사용합니다. 등록정보는 이 화면에서 수정하지 않습니다.
                </p>
              </section>

              <section aria-labelledby="seller-sup-apply-target">
                <h3 id="seller-sup-apply-target">가입 대상 공급여행사</h3>
                <SupplierIdentity supplier={target} />
                <dl className="seller-relation-dl">
                  <Info label="현재 상태">
                    <SupplierJoinStatusBadge status={target.joinStatus} />
                  </Info>
                  <Info label="공급상품">{target.summary}</Info>
                </dl>
              </section>
            </div>

            <section aria-labelledby="seller-sup-apply-memo">
              <h3 id="seller-sup-apply-memo">
                <label htmlFor="seller-sup-memo">가입신청 메모</label> <small>선택</small>
              </h3>
              <textarea
                id="seller-sup-memo"
                className="seller-sup-memo"
                value={memo}
                maxLength={MEMO_MAX_LENGTH}
                rows={4}
                placeholder="공급여행사에 전달할 내용이 있으면 입력해주세요."
                onChange={(event) => setMemo(event.target.value)}
              />
              <span className="seller-sup-memo-count" aria-live="polite">
                {memo.length} / {MEMO_MAX_LENGTH}자
              </span>
            </section>

            <section aria-labelledby="seller-sup-apply-policy">
              <h3 id="seller-sup-apply-policy">판매점 운영정책</h3>
              <div className="seller-sup-policy-row">
                <label>
                  <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
                  <span>
                    <b>[필수]</b> {target.supplierName} 판매점 운영정책에 동의합니다.
                  </span>
                </label>
                <button type="button" className="seller-sup-policy-view" onClick={() => setPolicyOpen(true)}>
                  보기
                </button>
              </div>
              <p className="seller-relation-drawer-help">
                이미 AOS 판매점 계정이 있으므로 AOS 이용약관·개인정보 수집 동의는 다시 받지 않습니다.
              </p>
            </section>

            <ul className="seller-sup-guide">
              <li>
                <strong>승인 필요</strong>
                <span>가입신청 후 공급여행사의 승인이 필요합니다.</span>
              </li>
              <li>
                <strong>상품 판매</strong>
                <span>승인 후 공급여행사가 판매 허용한 상품만 판매할 수 있습니다.</span>
              </li>
              <li>
                <strong>기존 거래 유지</strong>
                <span>이번 가입신청은 기존 공급여행사와의 거래에 영향을 주지 않습니다.</span>
              </li>
            </ul>
          </div>

          <div className="seller-sup-apply-foot">
            <button type="button" className="secondary" onClick={cancelApply}>
              취소
            </button>
            <button type="button" className="primary seller-sup-primary" disabled={!agreed} onClick={() => moveTo("review")}>
              신청내용 확인
            </button>
          </div>
        </section>
      ) : null}

      {view === "review" && target ? (
        <section className="panel seller-sup-apply" aria-labelledby="seller-sup-review-title">
          <div className="panel-head">
            <div>
              <h2 id="seller-sup-review-title">가입신청 내용 확인</h2>
              <p>신청 내용을 확인한 뒤 가입신청을 진행해주세요.</p>
            </div>
            <ol className="seller-sup-steps" aria-label="가입신청 단계">
              <li className="is-done">가입신청</li>
              <li className="is-current">신청내용 확인</li>
              <li>완료</li>
            </ol>
          </div>

          <div className="seller-sup-apply-body">
            <dl className="seller-sup-review">
              <div>
                <dt>판매점</dt>
                <dd>
                  {seller.sellerName}
                  <small>{seller.sellerCode}</small>
                </dd>
              </div>
              <div>
                <dt>가입 공급여행사</dt>
                <dd>
                  {target.supplierName}
                  <small>{target.supplierCode}</small>
                </dd>
              </div>
              <div>
                <dt>현재 상태</dt>
                <dd>
                  <SupplierJoinStatusBadge status={target.joinStatus} />
                </dd>
              </div>
              <div>
                <dt>신청 후 상태</dt>
                <dd>
                  <SupplierJoinStatusBadge status="승인대기" />
                </dd>
              </div>
              <div className="is-wide">
                <dt>신청메모</dt>
                <dd className="seller-sup-review-memo">{memo.trim() ? memo.trim() : "입력한 메모가 없습니다."}</dd>
              </div>
              <div>
                <dt>운영정책</dt>
                <dd>
                  <span className="badge success">동의 완료</span>
                </dd>
              </div>
            </dl>

            <div className="seller-sup-join-notice">
              <InfoIcon size={15} aria-hidden="true" />
              <p>
                가입신청 후 공급여행사의 승인이 완료되어야 거래를 시작할 수 있습니다.
                <br />
                승인 후에도 공급여행사가 판매 허용한 상품만 판매할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="seller-sup-apply-foot">
            <button type="button" className="secondary" onClick={() => moveTo("apply")}>
              이전
            </button>
            <button type="button" className="primary seller-sup-primary" onClick={() => setConfirmOpen(true)}>
              가입신청
            </button>
          </div>
        </section>
      ) : null}

      {view === "done" && target ? (
        <section className="panel seller-sup-apply seller-sup-done" aria-labelledby="seller-sup-done-title">
          <div className="seller-sup-done-head">
            <CheckCircle2 size={34} aria-hidden="true" />
            <h2 id="seller-sup-done-title">가입신청이 완료되었습니다.</h2>
            <SupplierIdentity supplier={target} />
            <dl className="seller-sup-done-status">
              <dt>상태</dt>
              <dd>
                <SupplierJoinStatusBadge status={target.joinStatus} />
              </dd>
            </dl>
            <p>공급여행사의 승인을 기다리고 있습니다.</p>
            <small>승인 후 판매 허용된 상품을 판매상품에서 확인할 수 있습니다.</small>
          </div>

          <section className="seller-sup-done-relations" aria-labelledby="seller-sup-done-relations-title">
            <h3 id="seller-sup-done-relations-title">기존 공급여행사 거래상태</h3>
            <p className="seller-relation-drawer-help">이번 가입신청은 기존 공급여행사와의 거래에 영향을 주지 않습니다.</p>
            <ul>
              {existingRelations.map((relation) => (
                <li key={relation.supplierCode}>
                  <span>
                    {relation.supplierName} <small>{relation.supplierCode}</small>
                  </span>
                  <span className={`badge ${supplierRelationStatusBadgeClass(relation.status)}`}>{relation.status}</span>
                </li>
              ))}
              <li className="is-new">
                <span>
                  {target.supplierName} <small>{target.supplierCode}</small>
                </span>
                <SupplierJoinStatusBadge status={target.joinStatus} />
              </li>
            </ul>
          </section>

          <div className="seller-sup-apply-foot">
            <button type="button" className="secondary" onClick={() => moveTo("search")}>
              다른 공급여행사 검색
            </button>
            <Link href={SUPPLIERS_PATH} className="primary seller-sup-primary">
              공급여행사 목록으로
            </Link>
          </div>
        </section>
      ) : null}

      {detail && view === "search" ? (
        <SellerSupplierDirectoryDrawer supplier={detail} seller={sellerIdentity} onApply={startApply} onClose={closeDetail} />
      ) : null}
      {policyOpen && target ? <SellerSupplierPolicyModal supplierName={target.supplierName} onClose={closePolicy} /> : null}
      {confirmOpen && target ? (
        <SellerSupplierJoinConfirmModal
          seller={sellerIdentity}
          supplierName={target.supplierName}
          onCancel={closeConfirm}
          onConfirm={submitApplication}
        />
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
