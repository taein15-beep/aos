"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, QrCode } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  AFFILIATE_APPROVAL_POLICY_NOTES,
  AFFILIATE_DEFAULT_PROCESSOR,
  AFFILIATE_GROUP_POLICY_NOTICE,
  AFFILIATE_REJECTION_POLICY_NOTES,
  AFFILIATE_REVIEW_MESSAGES,
  AFFILIATE_SUPPLEMENT_ITEM_OPTIONS,
  affiliateApplicationStatusBadgeClass,
  affiliateDocumentReviewBadgeClass,
  affiliateDocumentSubmitBadgeClass,
  affiliatePartnershipStatusBadgeClass,
  approveAffiliateApplication,
  confirmAffiliateSupplement,
  displayAffiliateText,
  formatAffiliateDateTime,
  formatAffiliateShareGroupsLabel,
  getAffiliateApprovalCheck,
  getAffiliateDetailApprovalDiagnosis,
  getAffiliateSupplementConfirmDiagnosis,
  getAffiliateSupplementReadyCheck,
  getPrototypeAffiliateApplication,
  loadPrototypeAffiliateApplications,
  rejectAffiliateApplication,
  requestAffiliateSupplement,
  savePrototypeAffiliateApplication,
  type AffiliateApplication,
  type AffiliateDocumentItem,
  type AffiliateProcessHistoryItem,
  type AffiliateSupplementItem,
  type AffiliateTermItem,
} from "@/lib/admin/members-affiliate-data";

type ReviewModalMode =
  | "approve"
  | "approve-blocked"
  | "supplement"
  | "confirm-supplement"
  | "confirm-supplement-blocked"
  | "reject"
  | null;

function isMembersChildCurrent(child: string) {
  return child === "제휴여행사";
}

function textOrDash(value: string | null | undefined) {
  return displayAffiliateText(value);
}

function InfoField({ label, value, className = "" }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`member-affiliate-detail-field ${className}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function HomepageValue({ url }: { url: string }) {
  const trimmed = url.trim();
  if (!trimmed) return "-";

  let href = trimmed;
  try {
    const parsed = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return trimmed;
    }
    href = parsed.toString();
  } catch {
    return trimmed;
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="member-affiliate-detail-ext-link">
      {trimmed}
    </a>
  );
}

function GroupsDisplay({ groups }: { groups: readonly string[] }) {
  if (groups.length === 0) return <>미지정</>;
  if (groups.length === 1) return <>{groups[0]}</>;
  return (
    <span className="member-affiliate-detail-groups-multi">
      <span>{formatAffiliateShareGroupsLabel(groups)}</span>
      <small>{groups.join(" · ")}</small>
    </span>
  );
}

function ReviewPanel({
  application,
  onApprove,
  onSupplement,
  onConfirmSupplement,
  onReject,
}: {
  application: AffiliateApplication;
  onApprove: () => void;
  onSupplement: () => void;
  onConfirmSupplement: () => void;
  onReject: () => void;
}) {
  const status = application.applicationStatus;

  if (status === "승인대기") {
    return (
      <section className="panel member-affiliate-detail-card" aria-labelledby="affiliate-review-title">
        <div className="member-affiliate-detail-card-head">
          <strong id="affiliate-review-title">가입심사 대기</strong>
        </div>
        <div className="member-affiliate-detail-card-body member-affiliate-detail-stack-sm">
          <p>
            신청정보와 필수 증빙서류 및 약관 동의 여부를 확인한 후 승인, 보완요청 또는 가입거절을 처리할 수 있습니다.
          </p>
          <div className="member-affiliate-detail-review-actions">
            <button type="button" className="primary" onClick={onApprove}>
              가입 승인
            </button>
            <button type="button" className="secondary" onClick={onSupplement}>
              보완요청
            </button>
            <button
              type="button"
              className="member-affiliate-detail-danger-btn member-affiliate-detail-danger-btn--spaced"
              onClick={onReject}
              aria-label="제휴여행사 가입거절"
            >
              가입거절
            </button>
          </div>
          <p className="member-affiliate-detail-hint">실제 이메일·계정 생성은 발송·생성되지 않습니다.</p>
        </div>
      </section>
    );
  }

  if (status === "보완요청") {
    const supplement = application.latestSupplement;
    const ready = getAffiliateSupplementReadyCheck(application);
    return (
      <section className="panel member-affiliate-detail-card" aria-labelledby="affiliate-review-title">
        <div className="member-affiliate-detail-card-head">
          <strong id="affiliate-review-title">가입신청 보완요청</strong>
        </div>
        <div className="member-affiliate-detail-card-body member-affiliate-detail-stack-sm">
          {supplement ? (
            <div className="member-affiliate-detail-info-grid member-affiliate-detail-info-grid--2">
              <InfoField label="보완 항목" value={supplement.items.join(", ") || "-"} />
              <InfoField label="요청일시" value={formatAffiliateDateTime(supplement.requestedAt)} />
              <InfoField label="처리 관리자" value={textOrDash(supplement.actor)} />
              <InfoField
                label="보완 완료 여부"
                value={ready.canApprove ? "보완 확인 가능(샘플)" : "보완 미완료"}
              />
              <InfoField label="보완요청 사유" value={textOrDash(supplement.reason)} className="member-affiliate-detail-field--span-2" />
              <InfoField label="관리자 안내사항" value={textOrDash(supplement.guideNote)} className="member-affiliate-detail-field--span-2" />
            </div>
          ) : (
            <p>보완요청 상세 정보가 없습니다.</p>
          )}
          <div className="member-affiliate-detail-review-actions">
            <button type="button" className="primary" onClick={onConfirmSupplement}>
              보완 확인
            </button>
            <button type="button" className="secondary" onClick={onSupplement}>
              보완 재요청
            </button>
            <button
              type="button"
              className="member-affiliate-detail-danger-btn member-affiliate-detail-danger-btn--spaced"
              onClick={onReject}
              aria-label="제휴여행사 가입거절"
            >
              가입거절
            </button>
          </div>
          <p className="member-affiliate-detail-hint">
            현재 프로토타입에서는 이메일 발송과 홈페이지 보완 재제출이 처리되지 않습니다.
          </p>
        </div>
      </section>
    );
  }

  if (status === "승인완료") {
    return (
      <section className="panel member-affiliate-detail-card" aria-labelledby="affiliate-review-title">
        <div className="member-affiliate-detail-card-head">
          <strong id="affiliate-review-title">가입승인 완료</strong>
        </div>
        <div className="member-affiliate-detail-card-body member-affiliate-detail-stack-sm">
          <p className="member-affiliate-detail-ok">
            가입승인이 완료되었습니다. 상품공유그룹과 상품별 공유 대상은 별도로 설정해야 합니다.
          </p>
          <div className="member-affiliate-detail-info-grid member-affiliate-detail-info-grid--2">
            <InfoField label="승인일시" value={formatAffiliateDateTime(application.approvedAt)} />
            <InfoField label="처리 관리자" value={textOrDash(application.processedBy)} />
            <InfoField label="제휴여행사 코드" value={textOrDash(application.affiliateAgencyId)} />
            <InfoField label="승인 메모" value={textOrDash(application.approvalMemo)} className="member-affiliate-detail-field--span-2" />
          </div>
          <ul className="member-affiliate-detail-policy-list">
            {AFFILIATE_APPROVAL_POLICY_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p className="member-affiliate-detail-hint">
            계정 생성·이메일 발송·상품 자동 공유는 수행되지 않으며, 승인완료 상태를 상품 공유 상태로 표시하지 않습니다.
          </p>
        </div>
      </section>
    );
  }

  const rejection = application.latestRejection;
  return (
    <section className="panel member-affiliate-detail-card" aria-labelledby="affiliate-review-title">
      <div className="member-affiliate-detail-card-head">
        <strong id="affiliate-review-title">가입거절</strong>
      </div>
      <div className="member-affiliate-detail-card-body">
        {rejection ? (
          <div className="member-affiliate-detail-info-grid member-affiliate-detail-info-grid--2">
            <InfoField label="처리일시" value={formatAffiliateDateTime(rejection.rejectedAt)} />
            <InfoField label="처리 관리자" value={textOrDash(rejection.actor)} />
            <InfoField label="거절 사유" value={textOrDash(rejection.reason)} className="member-affiliate-detail-field--span-2" />
            <InfoField label="관리자 안내사항" value={textOrDash(rejection.guideNote)} className="member-affiliate-detail-field--span-2" />
          </div>
        ) : (
          <p>거절 상세 정보가 없습니다.</p>
        )}
      </div>
    </section>
  );
}

function ApprovalDiagnosis({ application }: { application: AffiliateApplication }) {
  const diagnosis = getAffiliateDetailApprovalDiagnosis(application);
  if (!diagnosis.visible) return null;

  return (
    <section
      className="panel member-affiliate-detail-card member-affiliate-review-diagnosis"
      aria-labelledby="affiliate-approval-diagnosis-title"
    >
      <div className="member-affiliate-detail-card-head">
        <strong id="affiliate-approval-diagnosis-title">승인 가능 여부</strong>
      </div>
      <div className="member-affiliate-detail-card-body">
        {diagnosis.canApprove ? (
          <p className="member-affiliate-detail-ok member-affiliate-review-diagnosis-ok">
            필수정보, 필수서류 검토 및 필수약관 동의가 확인되었습니다.
          </p>
        ) : (
          <div className="member-affiliate-review-diagnosis-block">
            <p className="member-affiliate-detail-warn-title">승인 전 확인이 필요합니다.</p>
            <ul className="member-affiliate-review-diagnosis-list">
              {diagnosis.categories.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function DocumentsSection({ documents }: { documents: AffiliateDocumentItem[] }) {
  return (
    <section className="panel member-affiliate-detail-card" aria-labelledby="affiliate-docs-title">
      <div className="member-affiliate-detail-card-head">
        <strong id="affiliate-docs-title">증빙서류</strong>
      </div>
      <div className="member-affiliate-detail-table-wrap">
        <table className="member-affiliate-detail-table member-affiliate-detail-table--docs">
          <thead>
            <tr>
              <th>서류명</th>
              <th>구분</th>
              <th>파일명</th>
              <th>제출상태</th>
              <th>검토상태</th>
              <th>제출일시</th>
              <th>검토 메모</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const optionalMissing = !doc.required && doc.submitState === "미제출";
              return (
                <tr key={doc.key} className={optionalMissing ? "is-optional-missing" : undefined}>
                  <td className="text-left">{doc.label}</td>
                  <td>{doc.required ? "필수" : "선택"}</td>
                  <td className="text-left member-affiliate-detail-filename">
                    {doc.fileName?.trim() || "미제출"}
                  </td>
                  <td>
                    <span className={`badge ${affiliateDocumentSubmitBadgeClass(doc.submitState)}`}>
                      {doc.submitState}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${affiliateDocumentReviewBadgeClass(doc.reviewState)}`}>
                      {doc.reviewState}
                    </span>
                  </td>
                  <td className="date-cell">{formatAffiliateDateTime(doc.submittedAt)}</td>
                  <td className="text-left member-affiliate-detail-note">
                    {doc.reviewState === "보완필요" || doc.reviewNote.trim()
                      ? textOrDash(doc.reviewNote)
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TermsSection({ terms }: { terms: AffiliateTermItem[] }) {
  const missingRequired = terms.some((term) => term.required && !term.agreed);

  return (
    <section className="panel member-affiliate-detail-card" aria-labelledby="affiliate-terms-title">
      <div className="member-affiliate-detail-card-head">
        <strong id="affiliate-terms-title">약관 동의</strong>
      </div>
      <div className="member-affiliate-detail-table-wrap">
        <table className="member-affiliate-detail-table member-affiliate-detail-table--terms">
          <thead>
            <tr>
              <th>약관</th>
              <th>구분</th>
              <th>동의 여부</th>
              <th>동의일시</th>
            </tr>
          </thead>
          <tbody>
            {terms.map((term) => (
              <tr key={term.key}>
                <td className="text-left">{term.title}</td>
                <td>{term.required ? "필수" : "선택"}</td>
                <td>
                  <span className={`badge ${term.agreed ? "success" : "warn"}`}>
                    {term.agreed ? "동의" : "미동의"}
                  </span>
                </td>
                <td className="date-cell">{formatAffiliateDateTime(term.agreedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {missingRequired ? (
        <p className="member-affiliate-detail-hint member-affiliate-detail-hint--pad">
          필수약관 미동의가 있어 심사 시 참고가 필요합니다.
        </p>
      ) : null}
    </section>
  );
}

function HistorySection({ history }: { history: AffiliateProcessHistoryItem[] }) {
  return (
    <section className="panel member-affiliate-detail-card" aria-labelledby="affiliate-history-title">
      <div className="member-affiliate-detail-card-head">
        <strong id="affiliate-history-title">처리 이력</strong>
        <span className="member-affiliate-detail-count">{history.length}건</span>
      </div>
      {history.length > 0 ? (
        <div className="member-affiliate-detail-table-wrap">
          <table className="member-affiliate-detail-table member-affiliate-detail-table--history">
            <thead>
              <tr>
                <th>처리일시</th>
                <th>처리 유형</th>
                <th>이전 상태</th>
                <th>이후 상태</th>
                <th>처리 관리자</th>
                <th>사유 또는 메모</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} data-history-action={item.action}>
                  <td className="date-cell">{formatAffiliateDateTime(item.processedAt)}</td>
                  <td className="text-left">{item.action}</td>
                  <td>
                    {item.statusBefore ? (
                      <span className={`badge ${affiliateApplicationStatusBadgeClass(item.statusBefore)}`}>
                        {item.statusBefore}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    {item.statusAfter ? (
                      <span className={`badge ${affiliateApplicationStatusBadgeClass(item.statusAfter)}`}>
                        {item.statusAfter}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{textOrDash(item.actor)}</td>
                  <td className="text-left member-affiliate-detail-note">{textOrDash(item.note)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="member-affiliate-detail-empty">등록된 처리 이력이 없습니다.</div>
      )}
    </section>
  );
}

function DetailBody({
  application,
  onApprove,
  onSupplement,
  onConfirmSupplement,
  onReject,
}: {
  application: AffiliateApplication;
  onApprove: () => void;
  onSupplement: () => void;
  onConfirmSupplement: () => void;
  onReject: () => void;
}) {
  const approved = application.applicationStatus === "승인완료";
  const addressLine = [application.address, application.addressDetail].filter((part) => part.trim()).join(" ") || "-";

  return (
    <div className="member-affiliate-detail-stack">
      <section className="panel member-affiliate-detail-card" aria-labelledby="affiliate-summary-title">
        <div className="member-affiliate-detail-card-head">
          <strong id="affiliate-summary-title">신청 요약</strong>
        </div>
        <div className="member-affiliate-detail-info-grid">
          <InfoField label="접수번호" value={application.applicationNumber} />
          <InfoField label="여행사명" value={application.agencyName} />
          <InfoField label="대표자명" value={textOrDash(application.ceoName)} />
          <InfoField label="담당자명" value={textOrDash(application.contactName)} />
          <InfoField
            label="가입신청 상태"
            value={
              <span className={`badge ${affiliateApplicationStatusBadgeClass(application.applicationStatus)}`}>
                {application.applicationStatus}
              </span>
            }
          />
          <InfoField
            label="제휴관계 상태"
            value={
              <span className={`badge ${affiliatePartnershipStatusBadgeClass(application.partnershipStatus)}`}>
                {application.partnershipStatus}
              </span>
            }
          />
          <InfoField label="상품공유그룹" value={<GroupsDisplay groups={application.shareGroups} />} />
          <InfoField label="신청일시" value={formatAffiliateDateTime(application.appliedAt)} />
        </div>
        <p className="member-affiliate-detail-meta-id">내부신청ID {application.applicationId}</p>
      </section>

      <ReviewPanel
        application={application}
        onApprove={onApprove}
        onSupplement={onSupplement}
        onConfirmSupplement={onConfirmSupplement}
        onReject={onReject}
      />
      <ApprovalDiagnosis application={application} />

      <section className="panel member-affiliate-detail-card" aria-labelledby="affiliate-agency-title">
        <div className="member-affiliate-detail-card-head">
          <strong id="affiliate-agency-title">여행사 기본정보</strong>
        </div>
        <div className="member-affiliate-detail-info-grid">
          <InfoField label="여행사명" value={textOrDash(application.agencyName)} />
          <InfoField label="사업자등록번호" value={textOrDash(application.businessNumber)} />
          <InfoField label="대표자명" value={textOrDash(application.ceoName)} />
          <InfoField label="여행업 등록번호" value={textOrDash(application.tourismLicenseNumber)} />
          <InfoField label="여행업 종류" value={textOrDash(application.tourismLicenseType)} />
          <InfoField label="대표 전화번호" value={textOrDash(application.phone)} />
          <InfoField label="사업장 주소" value={addressLine} className="member-affiliate-detail-field--span-2" />
          <InfoField label="상세주소" value={textOrDash(application.addressDetail)} />
          <InfoField label="홈페이지 URL" value={<HomepageValue url={application.homepage} />} className="member-affiliate-detail-field--span-2" />
        </div>
      </section>

      <section className="panel member-affiliate-detail-card" aria-labelledby="affiliate-contact-title">
        <div className="member-affiliate-detail-card-head">
          <strong id="affiliate-contact-title">담당자 정보</strong>
        </div>
        <div className="member-affiliate-detail-info-grid">
          <InfoField label="담당자명" value={textOrDash(application.contactName)} />
          <InfoField label="부서 또는 직책" value={textOrDash(application.contactRole)} />
          <InfoField label="휴대전화번호" value={textOrDash(application.contactPhone)} />
          <InfoField label="이메일" value={textOrDash(application.contactEmail)} />
        </div>
      </section>

      <DocumentsSection documents={application.documents} />
      <TermsSection terms={application.terms} />

      <section className="panel member-affiliate-detail-card" aria-labelledby="affiliate-memo-title">
        <div className="member-affiliate-detail-card-head">
          <strong id="affiliate-memo-title">관리자 메모</strong>
        </div>
        <div className="member-affiliate-detail-card-body">
          {application.adminMemo.trim() ? (
            <>
              <p className="member-affiliate-detail-memo">{application.adminMemo}</p>
              <p className="member-affiliate-detail-hint">
                메모 최종 수정일: {formatAffiliateDateTime(application.memoUpdatedAt)}
              </p>
            </>
          ) : (
            <p className="member-affiliate-detail-empty-inline">등록된 관리자 메모가 없습니다.</p>
          )}
        </div>
      </section>

      <HistorySection history={application.history} />

      <section className="panel member-affiliate-detail-card" aria-labelledby="affiliate-groups-title">
        <div className="member-affiliate-detail-card-head">
          <strong id="affiliate-groups-title">상품공유그룹</strong>
        </div>
        <div className="member-affiliate-detail-card-body member-affiliate-detail-stack-sm">
          {!approved ? (
            <>
              <p>
                <strong>미지정</strong>
              </p>
              <p className="member-affiliate-detail-hint">가입 승인 후 상품공유그룹을 지정할 수 있습니다.</p>
            </>
          ) : (
            <>
              <p>
                <GroupsDisplay groups={application.shareGroups} />
              </p>
              <p className="member-affiliate-detail-hint">{AFFILIATE_GROUP_POLICY_NOTICE}</p>
            </>
          )}
        </div>
      </section>

      <section className="panel member-affiliate-detail-card" aria-labelledby="affiliate-partnership-title">
        <div className="member-affiliate-detail-card-head">
          <strong id="affiliate-partnership-title">제휴관계 정보</strong>
        </div>
        <div className="member-affiliate-detail-info-grid">
          <InfoField
            label="가입신청 상태"
            value={
              <span className={`badge ${affiliateApplicationStatusBadgeClass(application.applicationStatus)}`}>
                {application.applicationStatus}
              </span>
            }
          />
          <InfoField
            label="제휴관계 상태"
            value={
              <span className={`badge ${affiliatePartnershipStatusBadgeClass(application.partnershipStatus)}`}>
                {application.partnershipStatus}
              </span>
            }
          />
          <InfoField label="제휴여행사 코드" value={textOrDash(application.affiliateAgencyId)} />
          <InfoField label="상품공유그룹" value={<GroupsDisplay groups={application.shareGroups} />} />
          <InfoField label="승인일" value={formatAffiliateDateTime(application.approvedAt)} />
          <InfoField label="최종 처리일" value={formatAffiliateDateTime(application.processedAt)} />
          <InfoField label="최종 수정일" value={formatAffiliateDateTime(application.updatedAt)} />
        </div>
      </section>
    </div>
  );
}

export function AffiliateApplicationDetail() {
  const params = useParams<{ id: string }>();
  const applicationId = useMemo(() => {
    const raw = params?.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    try {
      return decodeURIComponent(value ?? "").trim();
    } catch {
      return String(value ?? "").trim();
    }
  }, [params]);

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState<"success" | "warn">("success");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [application, setApplication] = useState<AffiliateApplication | null>(null);
  const [modalMode, setModalMode] = useState<ReviewModalMode>(null);
  const [approvalMemo, setApprovalMemo] = useState("");
  const [supplementItems, setSupplementItems] = useState<AffiliateSupplementItem[]>([]);
  const [supplementReason, setSupplementReason] = useState("");
  const [supplementGuide, setSupplementGuide] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectGuide, setRejectGuide] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalReasons, setModalReasons] = useState<string[]>([]);
  const [supplementItemsError, setSupplementItemsError] = useState("");
  const [supplementReasonError, setSupplementReasonError] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");
  const [statusAnnouncement, setStatusAnnouncement] = useState("");
  const modalTriggerRef = useRef<HTMLElement | null>(null);
  const modalDialogRef = useRef<HTMLDivElement | null>(null);

  const act = (message: string, tone: "success" | "warn" = "success") => {
    setToastTone(tone);
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const clearSupplementFieldErrors = () => {
    setSupplementItemsError("");
    setSupplementReasonError("");
  };

  const captureModalTrigger = () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) modalTriggerRef.current = active;
  };

  const closeModal = useCallback(() => {
    const trigger = modalTriggerRef.current;
    setModalMode(null);
    setApprovalMemo("");
    setSupplementItems([]);
    setSupplementReason("");
    setSupplementGuide("");
    setRejectReason("");
    setRejectGuide("");
    setModalError("");
    setModalReasons([]);
    setSupplementItemsError("");
    setSupplementReasonError("");
    setRejectReasonError("");
    window.requestAnimationFrame(() => {
      if (trigger?.isConnected) {
        trigger.focus();
        return;
      }
      const fallback =
        document.querySelector<HTMLElement>(".member-affiliate-detail-title-row h1") ??
        document.querySelector<HTMLElement>('a[href="/members/affiliates"]');
      if (fallback) {
        if (!fallback.hasAttribute("tabindex")) fallback.setAttribute("tabindex", "-1");
        fallback.focus();
      }
    });
  }, []);

  /** 성공한 뮤테이션만 전용 sessionStorage에 저장하고, 저장 성공 시에만 상세 UI를 갱신한다. */
  const persistResult = (next: AffiliateApplication, message: string) => {
    const saved = savePrototypeAffiliateApplication(next);
    if (!saved) {
      setModalError(AFFILIATE_REVIEW_MESSAGES.saveFailed);
      setModalReasons([]);
      return;
    }
    const reloaded = getPrototypeAffiliateApplication(next.applicationId);
    setApplication(reloaded ?? next);
    setStatusAnnouncement(
      `처리 완료. 가입신청 상태 ${next.applicationStatus}, 제휴관계 상태 ${next.partnershipStatus}`,
    );
    closeModal();
    act(message, "success");
  };

  const openApprove = () => {
    if (!application) return;
    captureModalTrigger();
    setModalError("");
    setModalReasons([]);
    setApprovalMemo("");
    const check = getAffiliateApprovalCheck(application);
    if (!check.canApprove) {
      const diagnosis = getAffiliateDetailApprovalDiagnosis(application);
      setModalReasons(diagnosis.categories.length > 0 ? diagnosis.categories : check.reasons);
      setModalMode("approve-blocked");
      return;
    }
    setModalMode("approve");
  };

  const openSupplementFromBlocked = () => {
    setModalError("");
    setModalReasons([]);
    clearSupplementFieldErrors();
    setSupplementItems([]);
    setSupplementReason("");
    setSupplementGuide("");
    setModalMode("supplement");
  };

  const openSupplement = () => {
    captureModalTrigger();
    setModalError("");
    setModalReasons([]);
    clearSupplementFieldErrors();
    setSupplementItems([]);
    setSupplementReason("");
    setSupplementGuide("");
    setModalMode("supplement");
  };

  const openConfirmSupplement = () => {
    if (!application) return;
    captureModalTrigger();
    setModalError("");
    setModalReasons([]);
    const diagnosis = getAffiliateSupplementConfirmDiagnosis(application);
    if (!diagnosis.canConfirm) {
      setModalReasons(diagnosis.categories.length > 0 ? diagnosis.categories : diagnosis.reasons);
      setModalMode("confirm-supplement-blocked");
      return;
    }
    setModalMode("confirm-supplement");
  };

  const openSupplementFromConfirmBlocked = () => {
    setModalError("");
    setModalReasons([]);
    clearSupplementFieldErrors();
    setSupplementItems([]);
    setSupplementReason("");
    setSupplementGuide("");
    setModalMode("supplement");
  };

  const openReject = () => {
    captureModalTrigger();
    setModalError("");
    setModalReasons([]);
    setRejectReasonError("");
    setRejectReason("");
    setRejectGuide("");
    setModalMode("reject");
  };

  useEffect(() => {
    if (!modalMode) return;
    const dialog = modalDialogRef.current;
    if (!dialog) return;

    const workspace = document.querySelector<HTMLElement>(".workspace");
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    workspace?.setAttribute("aria-hidden", "true");
    sidebar?.setAttribute("aria-hidden", "true");
    workspace?.setAttribute("inert", "");
    sidebar?.setAttribute("inert", "");

    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

    const focusTimer = window.setTimeout(() => {
      const candidates = getFocusable().filter((el) => el.getAttribute("aria-label") !== "닫기");
      const target = candidates[0] ?? getFocusable()[0] ?? dialog;
      target.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      workspace?.removeAttribute("aria-hidden");
      sidebar?.removeAttribute("aria-hidden");
      workspace?.removeAttribute("inert");
      sidebar?.removeAttribute("inert");
    };
  }, [modalMode, closeModal]);

  const submitApprove = () => {
    if (!application) return;
    const check = getAffiliateApprovalCheck(application);
    if (!check.canApprove) {
      setModalMode("approve-blocked");
      setModalReasons(
        getAffiliateDetailApprovalDiagnosis(application).categories.length > 0
          ? getAffiliateDetailApprovalDiagnosis(application).categories
          : check.reasons,
      );
      return;
    }
    const result = approveAffiliateApplication({
      application,
      approvalMemo,
      actor: AFFILIATE_DEFAULT_PROCESSOR,
      processedAt: new Date().toISOString(),
      allApplications: loadPrototypeAffiliateApplications(),
    });
    if (!result.ok) {
      setModalError(result.message);
      setModalReasons(result.reasons ?? []);
      return;
    }
    persistResult(result.application, result.message);
  };

  const submitSupplement = () => {
    if (!application) return;

    const nextItemsError =
      supplementItems.length === 0 ? "보완 항목을 1개 이상 선택해 주세요." : "";
    const nextReasonError = supplementReason.trim().length === 0 ? "보완요청 사유를 입력해 주세요." : "";
    const statusAllowed =
      application.applicationStatus === "승인대기" || application.applicationStatus === "보완요청";

    setSupplementItemsError(nextItemsError);
    setSupplementReasonError(nextReasonError);
    setModalError("");
    setModalReasons([]);

    if (!statusAllowed) {
      setModalError("승인대기 또는 보완요청 상태의 신청만 보완요청할 수 있습니다.");
      return;
    }
    if (nextItemsError || nextReasonError) return;

    const result = requestAffiliateSupplement({
      application,
      items: supplementItems,
      reason: supplementReason,
      guideNote: supplementGuide,
      actor: AFFILIATE_DEFAULT_PROCESSOR,
      processedAt: new Date().toISOString(),
    });
    if (!result.ok) {
      if (result.message.includes("보완 항목")) {
        setSupplementItemsError(result.message);
      } else if (result.message.includes("사유")) {
        setSupplementReasonError(result.message);
      } else {
        setModalError(result.message);
        setModalReasons(result.reasons ?? []);
      }
      return;
    }
    persistResult(result.application, result.message);
  };

  const submitConfirmSupplement = () => {
    if (!application) return;
    const diagnosis = getAffiliateSupplementConfirmDiagnosis(application);
    if (!diagnosis.canConfirm) {
      setModalReasons(diagnosis.categories.length > 0 ? diagnosis.categories : diagnosis.reasons);
      setModalMode("confirm-supplement-blocked");
      return;
    }
    const result = confirmAffiliateSupplement({
      application,
      actor: AFFILIATE_DEFAULT_PROCESSOR,
      processedAt: new Date().toISOString(),
    });
    if (!result.ok) {
      if (result.message.includes("보완이 아직 완료되지 않았습니다")) {
        const blocked = getAffiliateSupplementConfirmDiagnosis(application);
        setModalReasons(blocked.categories.length > 0 ? blocked.categories : result.reasons ?? []);
        setModalMode("confirm-supplement-blocked");
        return;
      }
      setModalError(result.message);
      setModalReasons(result.reasons ?? []);
      return;
    }
    persistResult(result.application, result.message);
  };

  const submitReject = () => {
    if (!application) return;
    const nextReasonError = rejectReason.trim().length === 0 ? "거절 사유를 입력해 주세요." : "";
    setRejectReasonError(nextReasonError);
    setModalError("");
    if (nextReasonError) return;

    const result = rejectAffiliateApplication({
      application,
      reason: rejectReason,
      guideNote: rejectGuide,
      actor: AFFILIATE_DEFAULT_PROCESSOR,
      processedAt: new Date().toISOString(),
    });
    if (!result.ok) {
      if (result.message.includes("거절 사유")) {
        setRejectReasonError(result.message);
      } else {
        setModalError(result.message);
        setModalReasons(result.reasons ?? []);
      }
      return;
    }
    persistResult(result.application, result.message);
  };

  const toggleSupplementItem = (item: AffiliateSupplementItem) => {
    setSupplementItems((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
    setSupplementItemsError("");
    setModalError("");
  };

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setApplication(applicationId ? getPrototypeAffiliateApplication(applicationId) : null);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  const approveCheck = application ? getAffiliateApprovalCheck(application) : null;
  const requiredDocsOk =
    application?.documents
      .filter((doc) => doc.required)
      .every((doc) => doc.submitState === "제출" && doc.reviewState === "확인완료") ?? false;
  const requiredTermsOk = application?.terms.filter((term) => term.required).every((term) => term.agreed) ?? false;

  const shellChrome = (
    <>
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
    </>
  );

  if (!ready) {
    return (
      <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
        {shellChrome}
        <div className="workspace">
          <main className="content member-affiliate-detail-content">
            <div className="member-affiliate-detail-empty" role="status" aria-live="polite">
              <strong>제휴여행사 신청정보를 불러오는 중…</strong>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
        {shellChrome}
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              <span>회원관리</span>
              <b>/</b>
              <span>제휴여행사</span>
              <b>/</b>
              <strong>신청 상세</strong>
            </div>
          </header>
          <main className="content member-affiliate-detail-content">
            <section className="panel member-affiliate-detail-not-found" aria-labelledby="affiliate-not-found-title">
              <strong id="affiliate-not-found-title">제휴여행사 신청정보를 찾을 수 없습니다.</strong>
              <p>목록에서 신청정보를 다시 확인해 주세요.</p>
              <Link href="/members/affiliates" className="secondary member-affiliate-detail-back">
                <ArrowLeft size={14} aria-hidden="true" />
                제휴여행사 목록으로
              </Link>
            </section>
          </main>
        </div>
        {toast ? (
          <div className={`toast${toastTone === "warn" ? " toast-warn" : ""}`} role="status">
            <span>{toastTone === "warn" ? "!" : "✓"}</span>
            {toast}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      {shellChrome}
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>회원관리</span>
            <b>/</b>
            <span>제휴여행사</span>
            <b>/</b>
            <strong>신청 상세</strong>
          </div>
          <div className="top-actions">
            <label className="search">
              <span>⌕</span>
              <input aria-label="빠른 검색" placeholder="예약번호, 고객명, 상품명 검색" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-btn" title="업무지원" onClick={() => act("업무지원센터를 엽니다.")}>
              ?
            </button>
            <div className="dropdown-wrap">
              <button
                className="icon-btn notice"
                aria-label="알림"
                onClick={() => {
                  setNoticeOpen(!noticeOpen);
                  setProfileOpen(false);
                }}
              >
                ♢<i>5</i>
              </button>
              {noticeOpen && (
                <div className="dropdown notice-menu">
                  <div className="drop-head">
                    <strong>알림</strong>
                    <button onClick={() => setNoticeOpen(false)}>모두 읽음</button>
                  </div>
                  <button>
                    <span className="alert-dot info" />
                    <span>
                      제휴여행사 신청 상세를 확인해 주세요.
                      <small>방금 전</small>
                    </span>
                  </button>
                  <button className="drop-footer">알림 전체보기</button>
                </div>
              )}
            </div>
            <div className="divider" />
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
          <section className="page-head member-affiliate-detail-page-head">
            <div>
              <p className="member-affiliate-detail-breadcrumb">회원관리 &gt; 제휴여행사 &gt; 신청 상세</p>
              <div className="member-affiliate-detail-title-row">
                <h1>제휴여행사 신청 상세</h1>
                <span
                  className={`badge ${affiliateApplicationStatusBadgeClass(application.applicationStatus)}`}
                  aria-live="polite"
                >
                  {application.applicationStatus}
                </span>
                <span
                  className={`badge ${affiliatePartnershipStatusBadgeClass(application.partnershipStatus)}`}
                  aria-live="polite"
                >
                  {application.partnershipStatus}
                </span>
              </div>
              <p className="member-affiliate-detail-subtitle">{application.agencyName}</p>
              <p className="member-affiliate-detail-meta">
                접수번호 {application.applicationNumber}
                {application.affiliateAgencyId ? ` · 제휴여행사 코드 ${application.affiliateAgencyId}` : ""}
                {` · 신청일 ${formatAffiliateDateTime(application.appliedAt)}`}
                {application.processedAt ? ` · 최종 처리일 ${formatAffiliateDateTime(application.processedAt)}` : ""}
                {` · 최종 수정일 ${formatAffiliateDateTime(application.updatedAt)}`}
              </p>
            </div>
            <div className="member-affiliate-detail-actions">
              <Link href="/members/affiliates" className="secondary member-affiliate-detail-back">
                <ArrowLeft size={14} aria-hidden="true" />
                목록으로
              </Link>
            </div>
          </section>

          <p className="member-affiliate-proto-note" role="note">
            현재 화면은 샘플 데이터로 동작하며 홈페이지 가입신청, 이메일, 계정 생성 및 실제 회원 데이터와 연결되지
            않습니다.
          </p>

          <DetailBody
            application={application}
            onApprove={openApprove}
            onSupplement={openSupplement}
            onConfirmSupplement={openConfirmSupplement}
            onReject={openReject}
          />
          <footer>© 2026 AOS Travel ERP · AviaNext</footer>
        </main>
      </div>

      {modalMode === "approve-blocked" && application ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            ref={modalDialogRef}
            className="modal member-affiliate-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="affiliate-approve-blocked-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="affiliate-approve-blocked-title">승인 전 확인이 필요합니다.</h3>
              <button type="button" onClick={closeModal} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <p>현재 신청은 바로 승인할 수 없습니다. 아래 항목을 확인해 주세요.</p>
              <ul className="member-affiliate-review-modal-reasons">
                {modalReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {(approveCheck?.reasons ?? []).length > 0 ? (
                <div className="member-affiliate-review-modal-alert" role="status">
                  <strong>상세 사유</strong>
                  <ul>
                    {(approveCheck?.reasons ?? []).map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={openSupplementFromBlocked}>
                보완요청
              </button>
              <button type="button" className="primary" onClick={closeModal}>
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalMode === "approve" && application ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            ref={modalDialogRef}
            className="modal member-affiliate-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="affiliate-approve-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="affiliate-approve-title">제휴여행사 가입을 승인하시겠습니까?</h3>
              <button type="button" onClick={closeModal} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <div className="member-affiliate-review-modal-summary">
                <div>
                  <span>여행사명</span>
                  <b>{application.agencyName}</b>
                </div>
                <div>
                  <span>사업자등록번호</span>
                  <b>{application.businessNumber}</b>
                </div>
                <div>
                  <span>담당자명</span>
                  <b>{application.contactName}</b>
                </div>
                <div>
                  <span>필수서류 상태</span>
                  <b>{requiredDocsOk ? "검토 완료" : "확인 필요"}</b>
                </div>
                <div>
                  <span>필수약관 상태</span>
                  <b>{requiredTermsOk ? "동의 확인" : "확인 필요"}</b>
                </div>
              </div>
              <ul className="member-affiliate-detail-policy-list">
                {AFFILIATE_APPROVAL_POLICY_NOTES.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <label className="member-affiliate-review-modal-field" htmlFor="affiliate-approve-memo">
                <span>승인 메모 (선택)</span>
                <textarea
                  id="affiliate-approve-memo"
                  value={approvalMemo}
                  onChange={(event) => setApprovalMemo(event.target.value)}
                  rows={3}
                  placeholder="내부 확인용 메모를 입력할 수 있습니다."
                />
              </label>
              {modalError ? (
                <div className="member-affiliate-review-modal-error" role="alert">
                  <p>{modalError}</p>
                  {modalReasons.length > 0 ? (
                    <ul>
                      {modalReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeModal}>
                취소
              </button>
              <button type="button" className="primary" onClick={submitApprove}>
                가입 승인
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalMode === "supplement" && application ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            ref={modalDialogRef}
            className="modal member-affiliate-review-modal member-affiliate-review-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="affiliate-supplement-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="affiliate-supplement-title">
                {application.applicationStatus === "보완요청"
                  ? "가입신청 보완을 다시 요청합니다."
                  : "가입신청 보완을 요청합니다."}
              </h3>
              <button type="button" onClick={closeModal} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <fieldset
                className={`member-affiliate-review-modal-fieldset${supplementItemsError ? " is-invalid" : ""}`}
                aria-required="true"
                aria-describedby={
                  supplementItemsError
                    ? "affiliate-supplement-items-error"
                    : "affiliate-supplement-items-hint"
                }
              >
                <legend id="affiliate-supplement-items-legend">보완 항목 (필수)</legend>
                <p id="affiliate-supplement-items-hint" className="member-affiliate-sr-only">
                  보완이 필요한 항목을 하나 이상 선택합니다.
                </p>
                <div className="member-affiliate-detail-check-grid" role="group" aria-labelledby="affiliate-supplement-items-legend">
                  {AFFILIATE_SUPPLEMENT_ITEM_OPTIONS.map((item) => (
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
                  <p
                    id="affiliate-supplement-items-error"
                    className="member-affiliate-detail-field-error"
                    role="alert"
                  >
                    {supplementItemsError}
                  </p>
                ) : null}
              </fieldset>
              <label
                className={`member-affiliate-review-modal-field${supplementReasonError ? " is-invalid" : ""}`}
                htmlFor="affiliate-supplement-reason"
              >
                <span>보완요청 사유 (필수)</span>
                <textarea
                  id="affiliate-supplement-reason"
                  value={supplementReason}
                  onChange={(event) => {
                    setSupplementReason(event.target.value);
                    setSupplementReasonError("");
                    setModalError("");
                  }}
                  rows={3}
                  placeholder="신청자에게 안내할 보완 사유를 입력해 주세요."
                  aria-required="true"
                  aria-invalid={supplementReasonError ? true : undefined}
                  aria-describedby={supplementReasonError ? "affiliate-supplement-reason-error" : undefined}
                />
                {supplementReasonError ? (
                  <small
                    id="affiliate-supplement-reason-error"
                    className="member-affiliate-detail-field-error"
                    role="alert"
                  >
                    {supplementReasonError}
                  </small>
                ) : null}
              </label>
              <label className="member-affiliate-review-modal-field" htmlFor="affiliate-supplement-guide">
                <span>관리자 안내사항 (선택)</span>
                <textarea
                  id="affiliate-supplement-guide"
                  value={supplementGuide}
                  onChange={(event) => setSupplementGuide(event.target.value)}
                  rows={2}
                  placeholder="추가 안내가 있으면 입력합니다."
                />
              </label>
              <p className="member-affiliate-detail-hint">
                현재 프로토타입에서는 이메일 발송과 홈페이지 보완 재제출이 처리되지 않습니다.
              </p>
              {modalError ? (
                <div className="member-affiliate-review-modal-error" role="alert">
                  <p>{modalError}</p>
                  {modalReasons.length > 0 ? (
                    <ul>
                      {modalReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeModal}>
                취소
              </button>
              <button type="button" className="primary" onClick={submitSupplement}>
                보완요청
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalMode === "confirm-supplement-blocked" && application ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            ref={modalDialogRef}
            className="modal member-affiliate-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="affiliate-confirm-supplement-blocked-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="affiliate-confirm-supplement-blocked-title">보완 완료를 확인할 수 없습니다.</h3>
              <button type="button" onClick={closeModal} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <div className="member-affiliate-review-modal-alert" role="alert">
                <strong>아래 항목을 확인해 주세요.</strong>
                <ul>
                  {(modalReasons.length > 0
                    ? modalReasons
                    : getAffiliateSupplementConfirmDiagnosis(application).categories
                  ).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <ul className="member-affiliate-review-modal-alert-detail">
                  {getAffiliateSupplementConfirmDiagnosis(application).reasons.map((reason) => (
                    <li key={`detail-${reason}`}>{reason}</li>
                  ))}
                </ul>
              </div>
              <p className="member-affiliate-detail-hint">데이터는 변경되지 않았습니다.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={openSupplementFromConfirmBlocked}>
                보완 재요청
              </button>
              <button type="button" className="primary" onClick={closeModal}>
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalMode === "confirm-supplement" && application ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            ref={modalDialogRef}
            className="modal member-affiliate-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="affiliate-confirm-supplement-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="affiliate-confirm-supplement-title">보완 완료를 확인하시겠습니까?</h3>
              <button type="button" onClick={closeModal} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <p>
                보완 확인 후 가입신청 상태가 승인대기로 변경됩니다. 가입승인은 별도로 처리해야 합니다.
              </p>
              <div className="member-affiliate-review-modal-summary">
                <div>
                  <span>여행사명</span>
                  <b>{application.agencyName}</b>
                </div>
                <div>
                  <span>최근 보완요청 항목</span>
                  <b>{application.latestSupplement?.items.join(", ") || "-"}</b>
                </div>
                <div className="member-affiliate-review-modal-summary-span">
                  <span>최근 보완요청 사유</span>
                  <b>{textOrDash(application.latestSupplement?.reason)}</b>
                </div>
              </div>
              {modalError ? (
                <div className="member-affiliate-review-modal-error" role="alert">
                  <p>{modalError}</p>
                  {modalReasons.length > 0 ? (
                    <ul>
                      {modalReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeModal}>
                취소
              </button>
              <button type="button" className="primary" onClick={submitConfirmSupplement}>
                보완 확인
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalMode === "reject" && application ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            ref={modalDialogRef}
            className="modal member-affiliate-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="affiliate-reject-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h3 id="affiliate-reject-title">제휴여행사 가입을 거절하시겠습니까?</h3>
              <button type="button" onClick={closeModal} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-affiliate-review-modal-body">
              <ul className="member-affiliate-detail-policy-list" id="affiliate-reject-policy">
                {AFFILIATE_REJECTION_POLICY_NOTES.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <label
                className={`member-affiliate-review-modal-field${rejectReasonError ? " is-invalid" : ""}`}
                htmlFor="affiliate-reject-reason"
              >
                <span>거절 사유 (필수)</span>
                <textarea
                  id="affiliate-reject-reason"
                  value={rejectReason}
                  onChange={(event) => {
                    setRejectReason(event.target.value);
                    setRejectReasonError("");
                    setModalError("");
                  }}
                  rows={3}
                  placeholder="거절 사유를 입력해 주세요."
                  aria-required="true"
                  aria-invalid={rejectReasonError ? true : undefined}
                  aria-describedby={
                    rejectReasonError ? "affiliate-reject-reason-error affiliate-reject-policy" : "affiliate-reject-policy"
                  }
                />
                {rejectReasonError ? (
                  <small
                    id="affiliate-reject-reason-error"
                    className="member-affiliate-detail-field-error"
                    role="alert"
                  >
                    {rejectReasonError}
                  </small>
                ) : null}
              </label>
              <label className="member-affiliate-review-modal-field" htmlFor="affiliate-reject-guide">
                <span>관리자 안내사항 (선택)</span>
                <textarea
                  id="affiliate-reject-guide"
                  value={rejectGuide}
                  onChange={(event) => setRejectGuide(event.target.value)}
                  rows={2}
                  placeholder="신청자 안내 문구가 있으면 입력합니다."
                />
              </label>
              {modalError ? (
                <div className="member-affiliate-review-modal-error" role="alert">
                  <p>{modalError}</p>
                  {modalReasons.length > 0 ? (
                    <ul>
                      {modalReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeModal}>
                취소
              </button>
              <button
                type="button"
                className="member-affiliate-detail-danger-btn"
                onClick={submitReject}
                aria-label="제휴여행사 가입거절 확정"
              >
                가입거절
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="member-affiliate-sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusAnnouncement}
      </div>

      {toast ? (
        <div
          className={`toast${toastTone === "warn" ? " toast-warn" : ""}`}
          role="status"
          aria-live={toastTone === "warn" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          <span aria-hidden="true">{toastTone === "warn" ? "!" : "✓"}</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
