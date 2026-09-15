"use client";

import Link from "next/link";
import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, ClipboardList, Download, Eye, Pencil, Play, QrCode, XCircle } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import { SellerProductsPanel } from "./SellerProductsPanel";
import { SellerReservationsPanel } from "./SellerReservationsPanel";
import { SellerSettlementsPanel } from "./SellerSettlementsPanel";
import {
  SELLER_DETAIL_TABS,
  SELLER_REJECTION_REASON_OPTIONS,
  SELLER_SALES_STOP_REASON_OPTIONS,
  SELLER_SUPPLEMENT_ITEM_OPTIONS,
  SELLER_TYPE_BADGE_LABELS,
  approveSellerApplication,
  displaySellerText,
  formatSellerBusinessNumber,
  formatSellerCommissionText,
  formatSellerDateTime,
  formatSellerListDisplayName,
  formatSellerMobilePhone,
  formatSellerPartnerCode,
  formatSellerProductCount,
  formatSellerSummaryDate,
  formatSellerVerificationStatus,
  getPrototypeSellerApplication,
  rejectSellerApplication,
  requestSellerSupplement,
  resolveSellerDetailTabFromQuery,
  resolveSellerSalesStatus,
  sellerApplicationStatusBadgeClass,
  sellerApprovalStatusLabel,
  sellerApplicationSourceLabel,
  sellerDetailTabToQuery,
  sellerSalesSetupStatusBadgeClass,
  sellerSalesSetupStatusLabel,
  sellerSalesStatusBadgeClass,
  sellerSalesStatusLabel,
  sellerTypeBadgeClass,
  startSellerReview,
  updateSellerSalesStatus,
  type SellerApplication,
  type SellerApprovalStatusCode,
  type SellerDetailTab,
} from "@/lib/admin/members-seller-data";

function isMembersChildCurrent(child: string) {
  return child === "판매점관리";
}

function isReviewableStatus(status: SellerApprovalStatusCode) {
  return status === "pending" || status === "reviewing" || status === "supplement_requested";
}

function InfoField({ label, value, className = "" }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`member-affiliate-detail-field ${className}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryKpi({ label, children }: { label: string; children: ReactNode }) {
  return (
    <article className="member-web-detail-kpi">
      <span>
        <small>{label}</small>
        <strong>{children}</strong>
      </span>
    </article>
  );
}

function BusinessLicenseRow({
  license,
  onNotify,
}: {
  license: NonNullable<SellerApplication["businessLicense"]>;
  onNotify: (message: string) => void;
}) {
  return (
    <div className="member-seller-file-row">
      <strong>{license.name}</strong>
      <button type="button" className="secondary" onClick={() => onNotify("파일 미리보기는 샘플 화면에서 지원하지 않습니다.")}>
        <Eye size={14} aria-hidden="true" />
        파일보기
      </button>
      <button type="button" className="secondary" onClick={() => onNotify("파일 다운로드는 샘플 화면에서 지원하지 않습니다.")}>
        <Download size={14} aria-hidden="true" />
        다운로드
      </button>
    </div>
  );
}

type ReviewActionsProps = {
  status: SellerApprovalStatusCode;
  layout?: "header" | "aside";
  onStartReview: () => void;
  onSupplement: () => void;
  onApprove: () => void;
  onReject: () => void;
};

function ReviewActions({ status, layout = "header", onStartReview, onSupplement, onApprove, onReject }: ReviewActionsProps) {
  if (status === "pending") {
    return (
      <>
        <button type="button" className="secondary" onClick={onStartReview}>
          <ClipboardList size={14} aria-hidden="true" />
          검토 시작
        </button>
        <button type="button" className="secondary" onClick={onSupplement}>
          보완요청
        </button>
        <button type="button" className="primary" onClick={onApprove}>
          <Check size={14} aria-hidden="true" />
          가입승인
        </button>
        <button type="button" className="member-affiliate-detail-danger-btn" onClick={onReject}>
          <XCircle size={14} aria-hidden="true" />
          승인거절
        </button>
      </>
    );
  }

  if (status === "reviewing") {
    return (
      <>
        <button type="button" className="secondary" onClick={onSupplement}>
          보완요청
        </button>
        <button type="button" className="primary" onClick={onApprove}>
          <Check size={14} aria-hidden="true" />
          가입승인
        </button>
        <button type="button" className="member-affiliate-detail-danger-btn" onClick={onReject}>
          <XCircle size={14} aria-hidden="true" />
          승인거절
        </button>
      </>
    );
  }

  if (status === "supplement_requested") {
    return (
      <>
        <button type="button" className="primary" onClick={onApprove}>
          <Check size={14} aria-hidden="true" />
          가입승인
        </button>
        <button type="button" className="member-affiliate-detail-danger-btn" onClick={onReject}>
          <XCircle size={14} aria-hidden="true" />
          승인거절
        </button>
      </>
    );
  }

  if (layout === "aside" && status === "approved") {
    return (
      <p className="member-affiliate-detail-hint">
        승인완료된 판매점입니다. 판매상품·수수료 설정이 완료되어야 판매를 시작할 수 있습니다.
      </p>
    );
  }

  return null;
}

function ReviewBanner({ application }: { application: SellerApplication }) {
  const status = application.applicationStatus;
  if (status === "pending") {
    return (
      <div className="member-seller-review-banner" role="status">
        <strong>신규 가입신청</strong>
        <p>판매점 가입신청이 접수되었습니다. 신청정보와 증빙서류를 확인한 후 검토를 진행해 주세요.</p>
      </div>
    );
  }
  if (status === "reviewing") {
    return (
      <div className="member-seller-review-banner" role="status">
        <strong>검토중</strong>
        <p>관리자가 가입신청을 검토 중입니다. 보완이 필요하면 보완요청을, 검토가 완료되면 가입승인 또는 승인거절을 처리해 주세요.</p>
      </div>
    );
  }
  if (status === "supplement_requested") {
    const supplement = application.supplementRequest;
    return (
      <div className="member-seller-review-banner" role="status">
        <strong>보완요청</strong>
        <p>신청자에게 보완을 요청한 상태입니다. 보완이 완료되면 가입승인 또는 승인거절을 처리할 수 있습니다.</p>
        {supplement ? (
          <>
            {supplement.supplementItems.length > 0 ? (
              <p>
                <b>보완 항목:</b> {supplement.supplementItems.join(", ")}
              </p>
            ) : null}
            {supplement.supplementMessage ? (
              <p>
                <b>보완 요청내용:</b> {supplement.supplementMessage}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }
  return null;
}

export function SellerApplicationDetail() {
  const params = useParams<{ id: string }>();
  const applicationId = useMemo(() => decodeURIComponent(String(params?.id ?? "")).trim(), [params?.id]);

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [activeTab, setActiveTab] = useState<SellerDetailTab>("기본정보");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [supplementOpen, setSupplementOpen] = useState(false);
  const [salesStopOpen, setSalesStopOpen] = useState(false);
  const [salesResumeOpen, setSalesResumeOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [supplementItems, setSupplementItems] = useState<string[]>([]);
  const [supplementMessage, setSupplementMessage] = useState("");
  const [supplementItemsError, setSupplementItemsError] = useState("");
  const [supplementMessageError, setSupplementMessageError] = useState("");
  const [salesStopReason, setSalesStopReason] = useState("");
  const [salesStopError, setSalesStopError] = useState("");
  const [setupCtaDismissed, setSetupCtaDismissed] = useState(false);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const changeTab = useCallback(
    (tab: SellerDetailTab) => {
      setActiveTab(tab);
      if (typeof window === "undefined" || !applicationId) return;
      const query = sellerDetailTabToQuery(tab);
      const url = `/members/sellers/${encodeURIComponent(applicationId)}?tab=${query}`;
      window.history.replaceState(null, "", url);
    },
    [applicationId],
  );

  useLayoutEffect(() => {
    setApplication(getPrototypeSellerApplication(applicationId));
    setReady(true);
    const tab = resolveSellerDetailTabFromQuery(new URLSearchParams(window.location.search).get("tab"));
    setActiveTab(tab);
  }, [applicationId]);

  const displayName = useMemo(
    () => (application ? formatSellerListDisplayName(application) : ""),
    [application],
  );
  const salesStatus = application ? resolveSellerSalesStatus(application) : "not_started";

  const showSetupCta =
    application?.applicationStatus === "approved" &&
    application.salesSetupStatus === "not_configured" &&
    !setupCtaDismissed;

  const openApprove = () => {
    if (!application || !isReviewableStatus(application.applicationStatus)) return;
    setApproveOpen(true);
  };

  const confirmApprove = () => {
    if (!application) return;
    const result = approveSellerApplication(application.applicationId);
    if (!result.ok) {
      act(result.message);
      return;
    }
    setApplication(result.application);
    setApproveOpen(false);
    setSetupCtaDismissed(false);
    act("판매점 가입을 승인했습니다.");
  };

  const confirmStartReview = () => {
    if (!application) return;
    const result = startSellerReview(application.applicationId);
    if (!result.ok) {
      act(result.message);
      return;
    }
    setApplication(result.application);
    act("가입신청 검토를 시작했습니다.");
  };

  const openSupplement = () => {
    setSupplementItems([]);
    setSupplementMessage("");
    setSupplementItemsError("");
    setSupplementMessageError("");
    setSupplementOpen(true);
  };

  const toggleSupplementItem = (item: string) => {
    setSupplementItems((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
    setSupplementItemsError("");
  };

  const confirmSupplement = () => {
    if (!application) return;
    const itemsError = supplementItems.length === 0 ? "보완 항목을 1개 이상 선택해 주세요." : "";
    const messageError = !supplementMessage.trim() ? "보완 요청내용을 입력해 주세요." : "";
    setSupplementItemsError(itemsError);
    setSupplementMessageError(messageError);
    if (itemsError || messageError) return;

    const result = requestSellerSupplement(application.applicationId, {
      items: supplementItems,
      message: supplementMessage,
    });
    if (!result.ok) {
      if (result.message.includes("보완 항목")) {
        setSupplementItemsError(result.message);
      } else if (result.message.includes("보완 요청내용")) {
        setSupplementMessageError(result.message);
      } else {
        act(result.message);
      }
      return;
    }
    setApplication(result.application);
    setSupplementOpen(false);
    act("보완요청을 전송했습니다.");
  };

  const openReject = () => {
    setRejectReason("");
    setRejectError("");
    setRejectOpen(true);
  };

  const confirmReject = () => {
    if (!application) return;
    if (!rejectReason.trim()) {
      setRejectError("거절 사유를 입력해 주세요.");
      return;
    }
    const result = rejectSellerApplication(application.applicationId, rejectReason);
    if (!result.ok) {
      setRejectError(result.message);
      return;
    }
    setApplication(result.application);
    setRejectOpen(false);
    act("판매점 가입을 거절했습니다.");
  };

  const openSalesStop = () => {
    if (!application || application.applicationStatus !== "approved") return;
    if (resolveSellerSalesStatus(application) !== "active") return;
    setSalesStopReason("");
    setSalesStopError("");
    setSalesStopOpen(true);
  };

  const confirmSalesStop = () => {
    if (!application) return;
    if (!salesStopReason.trim()) {
      setSalesStopError("판매중지 사유를 입력해 주세요.");
      return;
    }
    const result = updateSellerSalesStatus(application.applicationId, "suspended", {
      reason: salesStopReason,
    });
    if (!result.ok) {
      setSalesStopError(result.message);
      return;
    }
    setApplication(result.application);
    setSalesStopOpen(false);
    act("판매를 중지했습니다.");
  };

  const openSalesResume = () => {
    if (!application || application.applicationStatus !== "approved") return;
    if (resolveSellerSalesStatus(application) !== "suspended") return;
    setSalesResumeOpen(true);
  };

  const confirmSalesResume = () => {
    if (!application) return;
    const result = updateSellerSalesStatus(application.applicationId, "active");
    if (!result.ok) {
      act(result.message);
      return;
    }
    setApplication(result.application);
    setSalesResumeOpen(false);
    act("판매를 재개했습니다.");
  };

  const reviewActionProps = application
    ? {
        status: application.applicationStatus,
        onStartReview: confirmStartReview,
        onSupplement: openSupplement,
        onApprove: openApprove,
        onReject: openReject,
      }
    : null;

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div className="brand-copy">
            <strong>AOS</strong>
            <span>TRAVEL ERP</span>
          </div>
          <button className="collapse" onClick={() => setCollapsed(!collapsed)} aria-label="사이드바 접기">
            ‹
          </button>
        </div>
        <nav aria-label="관리자 메뉴">
          {ADMIN_MENU.map((item) => (
            <div className="nav-group" key={item.label}>
              <button
                className={`nav-item ${item.label === "회원관리" ? "active" : ""}`}
                onClick={() =>
                  item.label === "대시보드"
                    ? window.location.assign("/")
                    : item.children
                      ? toggleMenu(item.label)
                      : act(`${item.label} 화면으로 이동합니다.`)
                }
              >
                <span className="nav-icon">
                  {item.icon === "qr" ? <QrCode size={16} strokeWidth={1.8} /> : item.icon}
                </span>
                <span className="nav-label">{item.label}</span>
                {item.children && <span className={`chevron ${expanded.includes(item.label) ? "open" : ""}`}>⌄</span>}
              </button>
              {item.children && expanded.includes(item.label) && !collapsed && (
                <div className="subnav">
                  {item.children.map((child) => (
                    <button
                      key={child}
                      className={isMembersChildCurrent(child) ? "current" : ""}
                      onClick={() => navigateAdminChild(child, act)}
                    >
                      {child}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-help">
          <span className="nav-icon">?</span>
          <div>
            <strong>업무지원센터</strong>
            <p>평일 09:00–18:00</p>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>회원관리</span>
            <b>/</b>
            <span>판매점관리</span>
            <b>/</b>
            <strong>판매점 상세</strong>
          </div>
          <div className="top-actions">
            <div className="dropdown-wrap">
              <button
                className="icon-btn"
                aria-label="알림"
                onClick={() => {
                  setNoticeOpen(!noticeOpen);
                  setProfileOpen(false);
                }}
              >
                🔔
              </button>
              {noticeOpen && (
                <div className="dropdown notice-menu">
                  <strong>알림</strong>
                  <p>판매점 상세는 샘플 데이터로 동작합니다.</p>
                </div>
              )}
            </div>
            <div className="dropdown-wrap">
              <button
                className="profile"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNoticeOpen(false);
                }}
              >
                <span className="avatar">장</span>
                <span>
                  <b>애비아넥스트</b>
                  <small>관리자 장윤호</small>
                </span>
                <em>⌄</em>
              </button>
              {profileOpen && (
                <div className="dropdown profile-menu">
                  <button>내 정보</button>
                  <button>환경설정</button>
                  <hr />
                  <button className="logout">로그아웃</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content member-affiliate-detail-content">
          {!ready ? (
            <section className="panel member-affiliate-detail-not-found" role="status">
              <strong>판매점 정보를 불러오는 중…</strong>
            </section>
          ) : !application ? (
            <section className="panel member-affiliate-detail-not-found">
              <strong>판매점 신청을 찾을 수 없습니다.</strong>
              <p>목록에서 다시 선택하거나 샘플 데이터를 초기화해 주세요.</p>
              <Link href="/members/sellers" className="secondary member-affiliate-detail-back">
                <ArrowLeft size={14} aria-hidden="true" />
                목록으로
              </Link>
            </section>
          ) : (
            <>
              <section className="page-head member-affiliate-detail-page-head">
                <div>
                  <p className="member-affiliate-detail-breadcrumb">회원관리 &gt; 판매점관리 &gt; 판매점 상세</p>
                  <div className="member-affiliate-detail-title-row">
                    <h1>{displayName}</h1>
                    <span
                      className={`badge ${sellerTypeBadgeClass(application.sellerType)}`}
                      title="판매점 유형"
                    >
                      {SELLER_TYPE_BADGE_LABELS[application.sellerType]}
                    </span>
                    <span
                      className={`badge ${sellerApplicationStatusBadgeClass(application.applicationStatus)}`}
                      title="승인상태"
                      aria-label={`승인상태 ${sellerApprovalStatusLabel(application.applicationStatus)}`}
                      aria-live="polite"
                    >
                      {sellerApprovalStatusLabel(application.applicationStatus)}
                    </span>
                    <span
                      className={`badge ${sellerSalesStatusBadgeClass(salesStatus)}`}
                      title="판매상태"
                      aria-label={`판매상태 ${sellerSalesStatusLabel(salesStatus)}`}
                      aria-live="polite"
                    >
                      {sellerSalesStatusLabel(salesStatus)}
                    </span>
                  </div>
                  <p className="member-affiliate-detail-meta">
                    거래처코드 {formatSellerPartnerCode(application.applicationId)}
                    {` · 접수번호 ${application.applicationNumber}`}
                    {` · 신청일 ${formatSellerDateTime(application.appliedAt)}`}
                    {application.processedAt ? ` · 최종 처리일 ${formatSellerDateTime(application.processedAt)}` : ""}
                  </p>
                  {application.applicationStatus === "rejected" ? (
                    <p className="member-affiliate-detail-subtitle">
                      거절 사유: {displaySellerText(application.rejectionReason)}
                      {application.rejectedAt ? ` · 거절일 ${formatSellerDateTime(application.rejectedAt)}` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="member-affiliate-detail-actions">
                  <Link href="/members/sellers" className="secondary member-affiliate-detail-back">
                    <ArrowLeft size={14} aria-hidden="true" />
                    목록
                  </Link>
                  <Link href={`/members/sellers/${application.applicationId}/edit`} className="secondary">
                    <Pencil size={14} aria-hidden="true" />
                    정보수정
                  </Link>
                  {reviewActionProps && isReviewableStatus(reviewActionProps.status) ? (
                    <ReviewActions {...reviewActionProps} layout="header" />
                  ) : null}
                  {application.applicationStatus === "approved" && salesStatus === "active" ? (
                    <button type="button" className="secondary" onClick={openSalesStop}>
                      판매중지
                    </button>
                  ) : null}
                  {application.applicationStatus === "approved" && salesStatus === "suspended" ? (
                    <button type="button" className="primary" onClick={openSalesResume}>
                      <Play size={14} aria-hidden="true" />
                      판매재개
                    </button>
                  ) : null}
                </div>
              </section>

              <ReviewBanner application={application} />

              {showSetupCta ? (
                <div className="member-seller-setup-cta" role="region" aria-label="판매설정 안내">
                  <p>
                    가입이 승인되었습니다. 판매상품과 수수료 설정을 완료해야 판매를 시작할 수 있습니다.
                  </p>
                  <div className="member-seller-setup-cta-actions">
                    <button type="button" className="primary" onClick={() => changeTab("판매상품")}>
                      판매상품·수수료 설정
                    </button>
                    <button type="button" className="secondary" onClick={() => setSetupCtaDismissed(true)}>
                      나중에 설정
                    </button>
                  </div>
                </div>
              ) : null}

              <p className="member-affiliate-proto-note" role="note">
                현재 화면은 샘플 데이터로 동작하며 홈페이지 가입신청, 이메일 및 실제 회원 데이터와 연결되지 않습니다.
                예약·정산 탭은 조회용 Mock이며 API·회계연동은 포함하지 않습니다.
              </p>

              <section className="member-web-detail-summary" aria-label="판매점 요약">
                <SummaryKpi label="판매점 유형">
                  <span className={`badge ${sellerTypeBadgeClass(application.sellerType)}`}>
                    {SELLER_TYPE_BADGE_LABELS[application.sellerType]}
                  </span>
                </SummaryKpi>
                <SummaryKpi label="승인상태">
                  <span
                    className={`badge ${sellerApplicationStatusBadgeClass(application.applicationStatus)}`}
                    aria-label={`승인상태 ${sellerApprovalStatusLabel(application.applicationStatus)}`}
                  >
                    {sellerApprovalStatusLabel(application.applicationStatus)}
                  </span>
                </SummaryKpi>
                <SummaryKpi label="판매상태">
                  <span
                    className={`badge ${sellerSalesStatusBadgeClass(salesStatus)}`}
                    aria-label={`판매상태 ${sellerSalesStatusLabel(salesStatus)}`}
                  >
                    {sellerSalesStatusLabel(salesStatus)}
                  </span>
                </SummaryKpi>
                <SummaryKpi label="판매상품">{formatSellerProductCount(application.productCount)}</SummaryKpi>
                <SummaryKpi label="기본 수수료">{formatSellerCommissionText(application.commissionText)}</SummaryKpi>
                <SummaryKpi label="가입일">{formatSellerSummaryDate(application.appliedAt)}</SummaryKpi>
              </section>

              <div className="member-web-detail-tabs" role="tablist" aria-label="판매점 상세 탭">
                {SELLER_DETAIL_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    className={activeTab === tab ? "active" : ""}
                    onClick={() => changeTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "기본정보" ? (
                <div className="member-seller-detail-basic">
                  <div className="member-affiliate-detail-stack">
                    <section className="panel member-affiliate-detail-card" aria-labelledby="seller-application-title">
                      <div className="member-affiliate-detail-card-head">
                        <strong id="seller-application-title">신청 정보</strong>
                      </div>
                      <div className="member-affiliate-detail-info-grid">
                        <InfoField label="신청번호" value={displaySellerText(application.applicationNumber)} />
                        <InfoField label="신청일" value={formatSellerDateTime(application.appliedAt)} />
                        <InfoField
                          label="신청경로"
                          value={sellerApplicationSourceLabel(application.applicationSource)}
                        />
                        <InfoField label="대상 여행사" value={displaySellerText(application.agencyName)} />
                        <InfoField
                          label="판매점 유형"
                          value={
                            <span className={`badge ${sellerTypeBadgeClass(application.sellerType)}`}>
                              {SELLER_TYPE_BADGE_LABELS[application.sellerType]}
                            </span>
                          }
                        />
                      </div>
                    </section>

                    {application.sellerType === "business" ? (
                      <>
                        <section className="panel member-affiliate-detail-card" aria-labelledby="seller-biz-title">
                          <div className="member-affiliate-detail-card-head">
                            <strong id="seller-biz-title">사업자 정보</strong>
                          </div>
                          <div className="member-affiliate-detail-info-grid">
                            <InfoField label="상호명" value={displaySellerText(application.sellerName)} />
                            <InfoField
                              label="사업자등록번호"
                              value={formatSellerBusinessNumber(application.businessNumber)}
                            />
                            <InfoField label="사업자구분" value={displaySellerText(application.businessKind)} />
                            <InfoField label="대표자" value={displaySellerText(application.representativeName)} />
                            <InfoField label="담당자" value={displaySellerText(application.contactName)} />
                            <InfoField label="연락처" value={formatSellerMobilePhone(application.contactPhone)} />
                            <InfoField label="이메일" value={displaySellerText(application.contactEmail)} />
                            <InfoField
                              label="주소"
                              value={`${displaySellerText(application.address)} ${displaySellerText(application.addressDetail)}`.trim()}
                              className="member-affiliate-detail-field--span-2"
                            />
                            <InfoField
                              label="사업자등록증"
                              value={
                                application.businessLicense ? (
                                  <BusinessLicenseRow license={application.businessLicense} onNotify={act} />
                                ) : (
                                  "-"
                                )
                              }
                              className="member-affiliate-detail-field--span-2"
                            />
                          </div>
                        </section>
                      </>
                    ) : (
                      <>
                        <section className="panel member-affiliate-detail-card" aria-labelledby="seller-applicant-title">
                          <div className="member-affiliate-detail-card-head">
                            <strong id="seller-applicant-title">개인 판매점 정보</strong>
                          </div>
                          <div className="member-affiliate-detail-info-grid">
                            <InfoField label="판매점명" value={displaySellerText(application.sellerName)} />
                            <InfoField label="신청자명" value={displaySellerText(application.contactName)} />
                            <InfoField
                              label="휴대전화"
                              value={formatSellerMobilePhone(application.contactPhone)}
                            />
                            <InfoField label="이메일" value={displaySellerText(application.contactEmail)} />
                            <InfoField
                              label="활동주소"
                              value={`${displaySellerText(application.address)} ${displaySellerText(application.addressDetail)}`.trim()}
                              className="member-affiliate-detail-field--span-2"
                            />
                          </div>
                        </section>

                        <section className="panel member-affiliate-detail-card" aria-labelledby="seller-verify-title">
                          <div className="member-affiliate-detail-card-head">
                            <strong id="seller-verify-title">본인확인</strong>
                          </div>
                          <div className="member-affiliate-detail-info-grid">
                            <InfoField
                              label="본인인증 여부"
                              value={
                                <span
                                  className={`badge ${
                                    application.identityVerified === true
                                      ? "success"
                                      : application.identityVerified === false
                                        ? "warn"
                                        : "gray"
                                  }`}
                                >
                                  {formatSellerVerificationStatus(application.identityVerified)}
                                </span>
                              }
                            />
                            <InfoField
                              label="휴대전화 인증 여부"
                              value={
                                <span
                                  className={`badge ${
                                    application.phoneVerified === true
                                      ? "success"
                                      : application.phoneVerified === false
                                        ? "warn"
                                        : "gray"
                                  }`}
                                >
                                  {formatSellerVerificationStatus(application.phoneVerified)}
                                </span>
                              }
                            />
                          </div>
                        </section>
                      </>
                    )}

                    <section className="panel member-affiliate-detail-card" aria-labelledby="seller-join-title">
                      <div className="member-affiliate-detail-card-head">
                        <strong id="seller-join-title">가입정보</strong>
                      </div>
                      <div className="member-affiliate-detail-info-grid">
                        <InfoField label="가입 신청일" value={formatSellerDateTime(application.appliedAt)} />
                        <InfoField label="승인일" value={formatSellerDateTime(application.approvedAt)} />
                        <InfoField label="최근 수정일" value={formatSellerDateTime(application.updatedAt)} />
                        <InfoField
                          label="판매설정"
                          value={
                            <span className={`badge ${sellerSalesSetupStatusBadgeClass(application.salesSetupStatus)}`}>
                              {sellerSalesSetupStatusLabel(application.salesSetupStatus)}
                            </span>
                          }
                        />
                        {application.applicationStatus === "rejected" ? (
                          <>
                            <InfoField label="거절일" value={formatSellerDateTime(application.rejectedAt)} />
                            <InfoField
                              label="거절 사유"
                              value={displaySellerText(application.rejectionReason)}
                              className="member-affiliate-detail-field--span-2"
                            />
                            <InfoField
                              label="관리자 안내"
                              value={displaySellerText(application.rejectionGuideNote)}
                              className="member-affiliate-detail-field--span-2"
                            />
                          </>
                        ) : null}
                        {application.applicationStatus === "supplement_requested" && application.supplementRequest ? (
                          <>
                            <InfoField
                              label="보완 항목"
                              value={application.supplementRequest.supplementItems.join(", ") || "-"}
                              className="member-affiliate-detail-field--span-2"
                            />
                            <InfoField
                              label="보완 요청내용"
                              value={displaySellerText(application.supplementRequest.supplementMessage)}
                              className="member-affiliate-detail-field--span-2"
                            />
                          </>
                        ) : null}
                      </div>
                    </section>
                  </div>

                  <aside className="member-seller-detail-aside">
                    <section className="panel member-affiliate-detail-card" aria-labelledby="seller-approval-title">
                      <div className="member-affiliate-detail-card-head">
                        <strong id="seller-approval-title">가입 승인</strong>
                      </div>
                      <div className="member-affiliate-detail-info-grid member-affiliate-detail-info-grid--2">
                        <InfoField label="신청일" value={formatSellerDateTime(application.appliedAt)} />
                        <InfoField
                          label="현재 승인상태"
                          value={
                            <span className={`badge ${sellerApplicationStatusBadgeClass(application.applicationStatus)}`}>
                              {sellerApprovalStatusLabel(application.applicationStatus)}
                            </span>
                          }
                        />
                        <InfoField label="승인 처리일" value={formatSellerDateTime(application.processedAt)} />
                        <InfoField label="승인 처리 관리자" value={displaySellerText(application.processedBy)} />
                        {application.applicationStatus === "rejected" ? (
                          <InfoField
                            label="거절 사유"
                            value={displaySellerText(application.rejectionReason)}
                            className="member-affiliate-detail-field--span-2"
                          />
                        ) : null}
                      </div>
                      {reviewActionProps && isReviewableStatus(reviewActionProps.status) ? (
                        <div className="member-affiliate-detail-card-body member-affiliate-detail-stack-sm">
                          <div className="member-affiliate-detail-review-actions">
                            <ReviewActions {...reviewActionProps} layout="aside" />
                          </div>
                          <p className="member-affiliate-detail-hint">
                            승인 후 판매상태는 판매전으로 시작됩니다. 판매상품·수수료 설정이 완료되어야 판매를 시작할
                            수 있습니다.
                          </p>
                        </div>
                      ) : reviewActionProps?.status === "approved" ? (
                        <div className="member-affiliate-detail-card-body member-affiliate-detail-stack-sm">
                          <ReviewActions {...reviewActionProps} layout="aside" />
                        </div>
                      ) : null}
                    </section>
                  </aside>

                  <div className="member-affiliate-detail-stack member-seller-detail-basic-main">
                    <section className="panel member-affiliate-detail-card" aria-labelledby="seller-sales-title">
                      <div className="member-affiliate-detail-card-head">
                        <strong id="seller-sales-title">판매상태 관리</strong>
                      </div>
                      <div className="member-affiliate-detail-card-body member-affiliate-detail-stack-sm">
                        {application.applicationStatus === "approved" ? (
                          <>
                            <p className="member-affiliate-detail-hint">
                              승인완료된 판매점만 판매가능 / 판매중지를 관리할 수 있습니다. 승인만으로 즉시 판매가
                              시작되지 않습니다.
                            </p>
                            <div className="member-affiliate-detail-info-grid member-affiliate-detail-info-grid--2">
                              <InfoField
                                label="현재 판매상태"
                                value={
                                  <span
                                    className={`badge ${sellerSalesStatusBadgeClass(salesStatus)}`}
                                    aria-label={`판매상태 ${sellerSalesStatusLabel(salesStatus)}`}
                                  >
                                    {sellerSalesStatusLabel(salesStatus)}
                                  </span>
                                }
                              />
                              {salesStatus === "suspended" ? (
                                <InfoField
                                  label="판매중지 사유"
                                  value={displaySellerText(application.salesStopReason)}
                                />
                              ) : null}
                            </div>
                            <div className="member-affiliate-detail-review-actions">
                              {salesStatus === "active" ? (
                                <button type="button" className="secondary" onClick={openSalesStop}>
                                  판매중지
                                </button>
                              ) : null}
                              {salesStatus === "suspended" ? (
                                <button type="button" className="primary" onClick={openSalesResume}>
                                  <Play size={14} aria-hidden="true" />
                                  판매재개
                                </button>
                              ) : null}
                            </div>
                          </>
                        ) : (
                          <p className="member-affiliate-detail-hint">
                            승인 전에는 판매상태가 <strong>판매전</strong>으로 표시됩니다. 승인 후 판매상품·수수료
                            설정이 필요합니다.
                          </p>
                        )}
                      </div>
                    </section>

                    <section className="panel member-affiliate-detail-card" aria-labelledby="seller-history-title">
                      <div className="member-affiliate-detail-card-head">
                        <strong id="seller-history-title">검토/처리 이력</strong>
                        <span className="member-affiliate-detail-count">{application.history.length}건</span>
                      </div>
                      {application.history.length === 0 ? (
                        <div className="member-affiliate-detail-empty">등록된 처리 이력이 없습니다.</div>
                      ) : (
                        <div className="member-seller-history-list">
                          {application.history.map((item) => (
                            <div
                              className="member-seller-history-item"
                              key={`${item.processedAt}-${item.action}-${item.statusAfter}`}
                            >
                              <time dateTime={item.processedAt}>{formatSellerDateTime(item.processedAt)}</time>
                              <div>
                                <b>{item.actor}</b>
                                <span className="badge gray">{item.action}</span>
                                {item.note ? <p>{item.note}</p> : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              ) : activeTab === "판매상품" ? (
                <SellerProductsPanel
                  sellerId={application.applicationId}
                  sellerName={displayName}
                  onNotify={act}
                  onBundleChanged={() => {
                    const reloaded = getPrototypeSellerApplication(application.applicationId);
                    if (reloaded) setApplication(reloaded);
                  }}
                />
              ) : activeTab === "예약현황" ? (
                <SellerReservationsPanel sellerId={application.applicationId} sellerName={displayName} />
              ) : activeTab === "정산현황" ? (
                <SellerSettlementsPanel
                  sellerId={application.applicationId}
                  sellerName={displayName}
                  sellerType={application.sellerType}
                  onNotify={act}
                />
              ) : (
                <section className="panel member-affiliate-detail-card" aria-label={`${activeTab} 준비 중`}>
                  <div className="member-affiliate-detail-card-head">
                    <strong>{activeTab}</strong>
                    <span className="badge gray">준비 중</span>
                  </div>
                  <div className="member-affiliate-detail-empty">
                    <strong>{activeTab}은(는) 준비 중입니다.</strong>
                    <p>해당 기능은 이후 단계에서 별도로 구현할 예정입니다.</p>
                    <button type="button" className="secondary" onClick={() => changeTab("기본정보")}>
                      기본정보로 돌아가기
                    </button>
                  </div>
                </section>
              )}

              <footer>© 2026 AOS Travel ERP · AviaNext</footer>
            </>
          )}
        </main>
      </div>

      {approveOpen && application ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setApproveOpen(false)}>
          <div
            className="modal member-affiliate-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-approve-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="seller-approve-title">판매점 가입 승인</h3>
              <button type="button" onClick={() => setApproveOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <p>해당 판매점의 가입을 승인하시겠습니까?</p>
              <div className="member-affiliate-review-modal-summary">
                <div>
                  <span>판매점명</span>
                  <b>{displayName}</b>
                </div>
                <div>
                  <span>현재 승인상태</span>
                  <b>{sellerApprovalStatusLabel(application.applicationStatus)}</b>
                </div>
                <div>
                  <span>승인 후 상태</span>
                  <b>승인완료</b>
                </div>
              </div>
              <p className="member-affiliate-detail-hint">
                승인 후에도 판매상품과 수수료 설정이 완료되어야 판매를 시작할 수 있습니다.
              </p>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setApproveOpen(false)}>
                취소
              </button>
              <button type="button" className="primary" onClick={confirmApprove}>
                가입승인
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {supplementOpen && application ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSupplementOpen(false)}>
          <div
            className="modal member-affiliate-review-modal member-affiliate-review-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-supplement-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="seller-supplement-title">가입정보 보완요청</h3>
              <button type="button" onClick={() => setSupplementOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <fieldset
                className={`member-affiliate-review-modal-fieldset${supplementItemsError ? " is-invalid" : ""}`}
                aria-required="true"
              >
                <legend>보완 항목 (필수)</legend>
                <div className="member-affiliate-detail-check-grid" role="group">
                  {SELLER_SUPPLEMENT_ITEM_OPTIONS.map((item) => (
                    <label key={item}>
                      <input
                        type="checkbox"
                        checked={supplementItems.includes(item)}
                        onChange={() => toggleSupplementItem(item)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
                {supplementItemsError ? (
                  <p className="member-affiliate-detail-field-error" role="alert">
                    {supplementItemsError}
                  </p>
                ) : null}
              </fieldset>
              <label
                className={`member-affiliate-review-modal-field${supplementMessageError ? " is-invalid" : ""}`}
                htmlFor="seller-supplement-message"
              >
                <span>
                  보완 요청내용 <b>*</b>
                </span>
                <textarea
                  id="seller-supplement-message"
                  rows={4}
                  value={supplementMessage}
                  onChange={(event) => {
                    setSupplementMessage(event.target.value);
                    setSupplementMessageError("");
                  }}
                  placeholder="신청자에게 안내할 보완 내용을 입력해 주세요."
                  autoFocus
                />
                {supplementMessageError ? (
                  <small className="member-affiliate-detail-field-error" role="alert">
                    {supplementMessageError}
                  </small>
                ) : null}
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setSupplementOpen(false)}>
                취소
              </button>
              <button type="button" className="primary" onClick={confirmSupplement}>
                보완요청 보내기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {salesResumeOpen && application ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSalesResumeOpen(false)}>
          <div
            className="modal member-affiliate-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-sales-resume-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="seller-sales-resume-title">판매점 판매재개</h3>
              <button type="button" onClick={() => setSalesResumeOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <p>해당 판매점의 상품 판매를 다시 허용하시겠습니까?</p>
              <div className="member-affiliate-review-modal-summary">
                <div>
                  <span>판매점명</span>
                  <b>{displayName}</b>
                </div>
                <div>
                  <span>현재 판매상태</span>
                  <b>판매중지</b>
                </div>
                <div>
                  <span>변경 후 상태</span>
                  <b>판매가능</b>
                </div>
                <div>
                  <span>판매중지 사유</span>
                  <b>{displaySellerText(application.salesStopReason)}</b>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setSalesResumeOpen(false)}>
                취소
              </button>
              <button type="button" className="primary" onClick={confirmSalesResume}>
                판매재개
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {salesStopOpen && application ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSalesStopOpen(false)}>
          <div
            className="modal member-affiliate-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-sales-stop-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="seller-sales-stop-title">판매점 판매중지</h3>
              <button type="button" onClick={() => setSalesStopOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <p>
                <strong>{displayName}</strong>의 판매를 중지합니다.
              </p>
              <div className="member-affiliate-review-modal-summary">
                <div>
                  <span>판매점명</span>
                  <b>{displayName}</b>
                </div>
                <div>
                  <span>변경 후 상태</span>
                  <b>판매중지</b>
                </div>
              </div>
              <div className="member-affiliate-detail-review-actions">
                {SELLER_SALES_STOP_REASON_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setSalesStopError("");
                      setSalesStopReason(option === "기타" ? "" : option);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <label
                className={`member-affiliate-review-modal-field${salesStopError ? " is-invalid" : ""}`}
                htmlFor="seller-sales-stop-reason"
              >
                <span>
                  판매중지 사유 <b>*</b>
                </span>
                <textarea
                  id="seller-sales-stop-reason"
                  rows={4}
                  value={salesStopReason}
                  onChange={(event) => {
                    setSalesStopError("");
                    setSalesStopReason(event.target.value);
                  }}
                  placeholder="예: 운영 요청 / 정산 문제 / 정책 위반 / 일시 중단 / 기타 직접 입력"
                  autoFocus
                />
              </label>
              {salesStopError ? (
                <div className="member-affiliate-review-modal-error" role="alert">
                  <p>{salesStopError}</p>
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setSalesStopOpen(false)}>
                취소
              </button>
              <button type="button" className="member-affiliate-detail-danger-btn" onClick={confirmSalesStop}>
                판매중지
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectOpen && application ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setRejectOpen(false)}>
          <div
            className="modal member-affiliate-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="seller-reject-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="seller-reject-title">승인거절</h3>
              <button type="button" onClick={() => setRejectOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <p>
                <strong>{displayName}</strong> 신청을 거절합니다. 거절 사유는 필수입니다.
              </p>
              <div className="member-affiliate-review-modal-summary">
                <div>
                  <span>판매점명</span>
                  <b>{displayName}</b>
                </div>
                <div>
                  <span>거절 후 상태</span>
                  <b>승인거절</b>
                </div>
              </div>
              <div className="member-affiliate-detail-review-actions">
                {SELLER_REJECTION_REASON_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setRejectError("");
                      setRejectReason(option === "기타" ? "" : option);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <label
                className={`member-affiliate-review-modal-field${rejectError ? " is-invalid" : ""}`}
                htmlFor="seller-reject-reason"
              >
                <span>
                  거절 사유 <b>*</b>
                </span>
                <textarea
                  id="seller-reject-reason"
                  rows={4}
                  value={rejectReason}
                  onChange={(event) => {
                    setRejectError("");
                    setRejectReason(event.target.value);
                  }}
                  placeholder="예: 신청정보 불일치 / 사업자 확인 불가 / 운영정책 부적합 / 중복 신청 / 기타 직접 입력"
                  autoFocus
                />
              </label>
              {rejectError ? (
                <div className="member-affiliate-review-modal-error" role="alert">
                  <p>{rejectError}</p>
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setRejectOpen(false)}>
                취소
              </button>
              <button type="button" className="member-affiliate-detail-danger-btn" onClick={confirmReject}>
                승인거절
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          <span>✓</span>
          <b>{toast}</b>
        </div>
      ) : null}
    </div>
  );
}
