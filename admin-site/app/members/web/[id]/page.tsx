"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Ban, Pencil, QrCode, ShieldOff, UserRound } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  getWebMemberDetail,
  memberStatusBadgeClass,
  SAMPLE_STATUS_CHANGE_HISTORY,
  type WebMemberDetail,
  type WebMemberStatusChangeHistory,
} from "@/lib/admin/members-web-data";

const SUSPEND_REASON_OPTIONS = [
  "운영정책 위반",
  "부정 이용 의심",
  "반복 취소/노쇼",
  "고객 요청",
  "기타",
] as const;

type SuspendReason = (typeof SUSPEND_REASON_OPTIONS)[number];
type SuspendPeriodType = "무기한" | "기간 지정";
type SuspendModalMode = "suspend" | "unsuspend" | null;

function displayStatusBadgeClass(status: string) {
  return memberStatusBadgeClass(status as "정상" | "휴면" | "탈퇴" | "차단" | "정지");
}

function isInitiallySuspended(status: string) {
  return status === "차단";
}

function formatStatusHistoryTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function statusActionBadgeClass(action: WebMemberStatusChangeHistory["action"]) {
  return action === "회원정지" ? "danger" : "success";
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="member-web-detail-field">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function YesNoField({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="member-web-detail-field">
      <span>{label}</span>
      <strong>{value ? "동의" : "미동의"}</strong>
    </div>
  );
}

function MemberStatusHistorySection({ history }: { history: WebMemberStatusChangeHistory[] }) {
  return (
    <section className="panel member-web-detail-card">
      <div className="member-web-detail-card-head">
        <strong>회원 상태 변경 이력</strong>
        <span className="member-web-status-history-count">{history.length}건</span>
      </div>
      {history.length > 0 ? (
        <div className="member-web-detail-table-wrap">
          <table className="member-web-detail-table member-web-detail-table--status-history">
            <thead>
              <tr>
                <th>처리일시</th>
                <th>처리구분</th>
                <th>변경 전 상태</th>
                <th>변경 후 상태</th>
                <th>사유</th>
                <th>처리 관리자</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, index) => (
                <tr key={`${item.processedAt}-${item.action}-${index}`}>
                  <td className="date-cell">{item.processedAt}</td>
                  <td>
                    <span className={`badge ${statusActionBadgeClass(item.action)}`}>{item.action}</span>
                  </td>
                  <td>
                    <span className={`badge ${displayStatusBadgeClass(item.statusBefore)}`}>{item.statusBefore}</span>
                  </td>
                  <td>
                    <span className={`badge ${displayStatusBadgeClass(item.statusAfter)}`}>{item.statusAfter}</span>
                  </td>
                  <td className="text-left member-web-status-history-reason">{item.reason}</td>
                  <td>{item.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="member-web-detail-empty">등록된 상태 변경 이력이 없습니다.</div>
      )}
    </section>
  );
}

function MemberDetailContent({
  member,
  displayStatus,
  statusHistory,
}: {
  member: WebMemberDetail;
  displayStatus: string;
  statusHistory: WebMemberStatusChangeHistory[];
}) {
  const [memoDraft, setMemoDraft] = useState("");

  return (
    <div className="member-web-detail-stack">
      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>기본정보</strong>
        </div>
        <div className="member-web-detail-info-grid">
          <InfoField label="이름" value={member.name} />
          <InfoField label="아이디" value={member.loginId} />
          <InfoField label="휴대전화" value={member.phone} />
          <InfoField label="이메일" value={member.email} />
          <InfoField label="생년월일" value={member.birthDate} />
          <InfoField label="성별" value={member.gender} />
          <InfoField label="가입일" value={member.joinedAt} />
          <InfoField label="최근 로그인" value={member.lastAccessAt} />
          <InfoField label="회원상태" value={displayStatus} />
        </div>
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>동의/인증 정보</strong>
        </div>
        <div className="member-web-detail-info-grid">
          <YesNoField label="휴대전화 본인인증" value={member.consent.phoneVerified} />
          <YesNoField label="이메일 인증" value={member.consent.emailVerified} />
          <InfoField label="이용약관 동의일" value={member.consent.termsAgreedAt} />
          <InfoField label="개인정보 수집 동의일" value={member.consent.privacyAgreedAt} />
          <YesNoField label="마케팅 수신 동의" value={member.consent.marketingAgreed} />
        </div>
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>이용현황</strong>
        </div>
        <div className="member-web-detail-usage-grid">
          <article className="member-web-detail-kpi">
            <span>
              <small>예약 건수</small>
              <strong>{member.usage.reservationCount}건</strong>
            </span>
          </article>
          <article className="member-web-detail-kpi">
            <span>
              <small>완료 여행 건수</small>
              <strong>{member.usage.completedTripCount}건</strong>
            </span>
          </article>
          <article className="member-web-detail-kpi">
            <span>
              <small>취소 건수</small>
              <strong>{member.usage.cancelCount}건</strong>
            </span>
          </article>
          <article className="member-web-detail-kpi">
            <span>
              <small>누적 결제금액</small>
              <strong>{member.usage.totalPaidAmount}</strong>
            </span>
          </article>
          <article className="member-web-detail-kpi">
            <span>
              <small>최근 예약일</small>
              <strong>{member.usage.latestReservedAt}</strong>
            </span>
          </article>
        </div>
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>최근 예약내역</strong>
        </div>
        {member.reservations.length > 0 ? (
          <div className="member-web-detail-table-wrap">
            <table className="member-web-detail-table member-web-detail-table--recent">
              <thead>
                <tr>
                  <th>예약번호</th>
                  <th>예약일</th>
                  <th>상품명</th>
                  <th>출발일</th>
                  <th>예약상태</th>
                  <th>결제금액</th>
                </tr>
              </thead>
              <tbody>
                {member.reservations.map((item) => (
                  <tr key={item.code}>
                    <td className="member-number">
                      <Link href={`/reservations/${item.code}`} className="reservation-code-link">
                        {item.code}
                      </Link>
                    </td>
                    <td className="date-cell">{item.reservedAt}</td>
                    <td className="text-left">{item.productName}</td>
                    <td className="date-cell">{item.departureAt}</td>
                    <td>
                      <span className={`badge ${item.reserveStatusClass}`}>{item.reserveStatus}</span>
                    </td>
                    <td className="amount-cell">{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="member-web-detail-empty">등록된 예약내역이 없습니다.</div>
        )}
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>관리자 메모</strong>
        </div>
        <div className="member-web-detail-memos">
          {member.adminMemos.map((memo) => (
            <article key={`${memo.date}-${memo.author}`} className="member-web-detail-memo-item">
              <header>
                <time>{memo.date}</time>
                <span>{memo.author}</span>
              </header>
              <p>{memo.content}</p>
            </article>
          ))}
        </div>
        <div className="member-web-detail-memo-form">
          <label>
            <span>메모 입력</span>
            <textarea
              value={memoDraft}
              onChange={(event) => setMemoDraft(event.target.value)}
              placeholder="관리자 메모를 입력하세요."
              rows={3}
            />
          </label>
          <button type="button" className="primary" onClick={() => setMemoDraft("")}>
            저장
          </button>
        </div>
      </section>

      <MemberStatusHistorySection history={statusHistory} />
    </div>
  );
}

export default function WebMemberDetailPage() {
  const params = useParams<{ id: string }>();
  const memberId = useMemo(() => decodeURIComponent(params.id ?? ""), [params.id]);
  const member = useMemo(() => getWebMemberDetail(memberId), [memberId]);

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [displayStatus, setDisplayStatus] = useState(() =>
    member && isInitiallySuspended(member.status) ? "정지" : member?.status ?? "정상",
  );
  const [suspendModal, setSuspendModal] = useState<SuspendModalMode>(null);
  const [suspendReason, setSuspendReason] = useState<SuspendReason | "">("");
  const [suspendOtherReason, setSuspendOtherReason] = useState("");
  const [suspendPeriodType, setSuspendPeriodType] = useState<SuspendPeriodType>("무기한");
  const [suspendStartDate, setSuspendStartDate] = useState("");
  const [suspendEndDate, setSuspendEndDate] = useState("");
  const [suspendAdminMemo, setSuspendAdminMemo] = useState("");
  const [unsuspendReason, setUnsuspendReason] = useState("");
  const [suspendReasonError, setSuspendReasonError] = useState(false);
  const [unsuspendReasonError, setUnsuspendReasonError] = useState(false);
  const [statusHistory, setStatusHistory] = useState<WebMemberStatusChangeHistory[]>(() =>
    SAMPLE_STATUS_CHANGE_HISTORY.map((item) => ({ ...item })),
  );

  const isSuspended = displayStatus === "정지";

  const prependStatusHistory = (entry: WebMemberStatusChangeHistory) => {
    setStatusHistory((current) => [entry, ...current]);
  };

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const resetSuspendForm = () => {
    setSuspendReason("");
    setSuspendOtherReason("");
    setSuspendPeriodType("무기한");
    setSuspendStartDate("");
    setSuspendEndDate("");
    setSuspendAdminMemo("");
    setSuspendReasonError(false);
  };

  const resetUnsuspendForm = () => {
    setUnsuspendReason("");
    setUnsuspendReasonError(false);
  };

  const closeSuspendModal = () => {
    setSuspendModal(null);
    resetSuspendForm();
    resetUnsuspendForm();
  };

  const openSuspendAction = () => {
    if (isSuspended) {
      setSuspendModal("unsuspend");
      resetUnsuspendForm();
      return;
    }
    setSuspendModal("suspend");
    resetSuspendForm();
  };

  const confirmSuspend = () => {
    if (!suspendReason) {
      setSuspendReasonError(true);
      return;
    }
    if (suspendReason === "기타" && !suspendOtherReason.trim()) {
      setSuspendReasonError(true);
      act("기타 사유를 입력해 주세요.");
      return;
    }
    if (suspendPeriodType === "기간 지정" && (!suspendStartDate || !suspendEndDate)) {
      act("정지 기간의 시작일과 종료일을 선택해 주세요.");
      return;
    }
    const reasonText = suspendReason === "기타" ? suspendOtherReason.trim() : suspendReason;
    const statusBefore = displayStatus;
    setDisplayStatus("정지");
    prependStatusHistory({
      processedAt: formatStatusHistoryTimestamp(new Date()),
      action: "회원정지",
      statusBefore,
      statusAfter: "정지",
      reason: reasonText,
      actor: "장윤호",
    });
    closeSuspendModal();
    act("회원 이용이 정지되었습니다.");
  };

  const confirmUnsuspend = () => {
    if (!unsuspendReason.trim()) {
      setUnsuspendReasonError(true);
      return;
    }
    const statusBefore = displayStatus;
    setDisplayStatus("정상");
    prependStatusHistory({
      processedAt: formatStatusHistoryTimestamp(new Date()),
      action: "정지해제",
      statusBefore,
      statusAfter: "정상",
      reason: unsuspendReason.trim(),
      actor: "장윤호",
    });
    closeSuspendModal();
    act("회원 이용 정지가 해제되었습니다.");
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  if (!member) {
    return (
      <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
        <main className="content member-web-detail-content">
          <section className="panel member-web-detail-not-found">
            <strong>회원을 찾을 수 없습니다.</strong>
            <p>요청하신 회원번호({memberId || "-"})에 해당하는 웹회원 정보가 없습니다.</p>
            <button type="button" className="secondary" onClick={() => window.location.assign("/members/web")}>
              <ArrowLeft size={14} />
              목록으로 돌아가기
            </button>
          </section>
        </main>
      </div>
    );
  }

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
                      className={child === "웹회원관리" ? "current" : ""}
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
            <span>웹회원관리</span>
            <b>/</b>
            <strong>회원상세</strong>
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
                  <button>예약 확정 요청 2건</button>
                  <button>결제 대기 1건</button>
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

        <main className="content member-web-detail-content">
          <section className="page-head member-web-detail-page-head">
            <div>
              <p className="member-web-breadcrumb">회원관리 &gt; 웹회원관리 &gt; 회원상세</p>
              <div className="member-web-detail-title-row">
                <h1>{member.name}</h1>
                <span className={`badge ${displayStatusBadgeClass(displayStatus)}`}>{displayStatus}</span>
              </div>
              <p className="member-web-detail-subtitle">회원번호 {member.id}</p>
            </div>
            <div className="member-web-detail-actions">
              <button type="button" className="secondary" onClick={() => window.location.assign("/members/web")}>
                <ArrowLeft size={14} />
                목록
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => window.location.assign(`/members/web/${member.id}/edit`)}
              >
                <Pencil size={14} />
                정보수정
              </button>
              <button
                type="button"
                className={isSuspended ? "secondary" : "primary"}
                onClick={openSuspendAction}
              >
                {isSuspended ? <ShieldOff size={14} /> : <Ban size={14} />}
                {isSuspended ? "정지해제" : "회원정지"}
              </button>
            </div>
          </section>

          <section className="panel member-web-detail-hero">
            <div className="member-web-detail-identity">
              <span className="member-web-detail-avatar">
                <UserRound size={23} />
              </span>
              <div>
                <div className="member-web-detail-code-row">
                  <span>{member.id}</span>
                  <span className={`badge ${displayStatusBadgeClass(displayStatus)}`}>{displayStatus}</span>
                </div>
                <h2>{member.name}</h2>
                <p>
                  {member.loginId} · {member.phone} · {member.email}
                </p>
              </div>
            </div>
          </section>

          <MemberDetailContent member={member} displayStatus={displayStatus} statusHistory={statusHistory} />
        </main>
      </div>

      {suspendModal === "suspend" && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="회원 이용 정지">
          <div className="member-web-suspend-modal">
            <div className="modal-head">
              <div>
                <span className="danger">
                  <Ban size={17} />
                </span>
                <h3>회원 이용 정지</h3>
              </div>
              <button type="button" onClick={closeSuspendModal} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-web-suspend-body">
              <p>해당 회원의 서비스 이용을 정지하시겠습니까?</p>
              <div className="member-web-suspend-target">
                <div>
                  <span>이름</span>
                  <b>{member.name}</b>
                </div>
                <div>
                  <span>회원번호</span>
                  <b>{member.id}</b>
                </div>
                <div>
                  <span>현재 상태</span>
                  <b>
                    <span className={`badge ${displayStatusBadgeClass(displayStatus)}`}>{displayStatus}</span>
                  </b>
                </div>
              </div>
              <label className={suspendReasonError && !suspendReason ? "invalid" : ""}>
                <span>
                  정지 사유 <b>*</b>
                </span>
                <select
                  value={suspendReason}
                  onChange={(event) => {
                    setSuspendReason(event.target.value as SuspendReason | "");
                    setSuspendReasonError(false);
                  }}
                >
                  <option value="">사유 선택</option>
                  {SUSPEND_REASON_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <small className={suspendReasonError && !suspendReason ? "error" : ""}>
                  {suspendReasonError && !suspendReason ? "정지 사유를 선택해 주세요." : "정지 사유는 관리자 활동 이력에 기록됩니다."}
                </small>
              </label>
              {suspendReason === "기타" && (
                <label className={suspendReasonError && !suspendOtherReason.trim() ? "invalid" : ""}>
                  <span>기타 사유</span>
                  <textarea
                    value={suspendOtherReason}
                    onChange={(event) => {
                      setSuspendOtherReason(event.target.value);
                      setSuspendReasonError(false);
                    }}
                    placeholder="정지 사유를 입력해 주세요."
                    rows={3}
                  />
                </label>
              )}
              <div className="member-web-suspend-period">
                <span>정지 기간</span>
                <div className="member-web-suspend-period-options">
                  <label>
                    <input
                      type="radio"
                      name="suspend-period"
                      checked={suspendPeriodType === "무기한"}
                      onChange={() => setSuspendPeriodType("무기한")}
                    />
                    무기한
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="suspend-period"
                      checked={suspendPeriodType === "기간 지정"}
                      onChange={() => setSuspendPeriodType("기간 지정")}
                    />
                    기간 지정
                  </label>
                </div>
              </div>
              {suspendPeriodType === "기간 지정" && (
                <div className="member-web-suspend-date-range">
                  <label>
                    <span>시작일</span>
                    <input type="date" value={suspendStartDate} onChange={(event) => setSuspendStartDate(event.target.value)} />
                  </label>
                  <label>
                    <span>종료일</span>
                    <input type="date" value={suspendEndDate} onChange={(event) => setSuspendEndDate(event.target.value)} />
                  </label>
                </div>
              )}
              <label>
                <span>관리자 메모</span>
                <textarea
                  value={suspendAdminMemo}
                  onChange={(event) => setSuspendAdminMemo(event.target.value)}
                  placeholder="내부 관리용 메모를 입력하세요."
                  rows={3}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeSuspendModal}>
                취소
              </button>
              <button type="button" className="danger-button" onClick={confirmSuspend}>
                회원정지
              </button>
            </div>
          </div>
        </div>
      )}

      {suspendModal === "unsuspend" && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="회원 이용 정지 해제">
          <div className="member-web-suspend-modal">
            <div className="modal-head">
              <div>
                <span className="info">
                  <ShieldOff size={17} />
                </span>
                <h3>회원 이용 정지 해제</h3>
              </div>
              <button type="button" onClick={closeSuspendModal} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="member-web-suspend-body">
              <div className="member-web-suspend-target">
                <div>
                  <span>회원명</span>
                  <b>{member.name}</b>
                </div>
                <div>
                  <span>회원번호</span>
                  <b>{member.id}</b>
                </div>
                <div>
                  <span>현재 상태</span>
                  <b>
                    <span className={`badge ${displayStatusBadgeClass(displayStatus)}`}>{displayStatus}</span>
                  </b>
                </div>
              </div>
              <label className={unsuspendReasonError ? "invalid" : ""}>
                <span>해제 사유 또는 관리자 메모</span>
                <textarea
                  value={unsuspendReason}
                  onChange={(event) => {
                    setUnsuspendReason(event.target.value);
                    setUnsuspendReasonError(false);
                  }}
                  placeholder="정지 해제 사유를 입력해 주세요."
                  rows={4}
                  autoFocus
                />
                <small className={unsuspendReasonError ? "error" : ""}>
                  {unsuspendReasonError ? "해제 사유를 입력해 주세요." : "입력한 내용은 관리자 활동 이력에 기록됩니다."}
                </small>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeSuspendModal}>
                취소
              </button>
              <button type="button" className="primary" onClick={confirmUnsuspend}>
                정지해제
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
