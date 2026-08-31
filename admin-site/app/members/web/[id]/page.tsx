"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, QrCode, RefreshCw, UserRound } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  getWebMemberDetail,
  memberStatusBadgeClass,
  type WebMemberDetail,
} from "@/lib/admin/members-web-data";

type DetailTab = "basic" | "reservation" | "history";

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="member-web-detail-field">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function DetailTabs({
  active,
  onChange,
}: {
  active: DetailTab;
  onChange: (tab: DetailTab) => void;
}) {
  const tabs: { id: DetailTab; label: string }[] = [
    { id: "basic", label: "기본정보" },
    { id: "reservation", label: "예약내역" },
    { id: "history", label: "변경이력" },
  ];

  return (
    <div className="member-web-detail-tabs" role="tablist" aria-label="웹회원 상세 탭">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={active === tab.id ? "active" : ""}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function BasicTab({ member }: { member: WebMemberDetail }) {
  const [memoDraft, setMemoDraft] = useState("");

  return (
    <div className="member-web-detail-tab-panel">
      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>기본정보</strong>
        </div>
        <div className="member-web-detail-info-grid">
          <InfoField label="회원명" value={member.name} />
          <InfoField label="아이디" value={member.loginId} />
          <InfoField label="성별" value={member.gender} />
          <InfoField label="휴대전화" value={member.phone} />
          <InfoField label="이메일" value={member.email} />
          <InfoField label="생년월일" value={member.birthDate} />
          <InfoField label="가입일" value={member.joinedAt} />
          <InfoField label="최근 로그인" value={member.lastAccessAt} />
          <InfoField label="회원상태" value={member.status} />
          <InfoField label="우편번호" value={member.zipCode} />
          <InfoField label="주소" value={member.address} />
          <InfoField label="상세주소" value={member.addressDetail} />
        </div>
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>가입/추천정보</strong>
        </div>
        <div className="member-web-detail-info-grid member-web-detail-info-grid--7">
          <InfoField label="가입경로" value={member.joinPath} />
          <InfoField label="추천인코드" value={member.referralCode} />
          <InfoField label="추천 판매점" value={member.agency} />
          <InfoField label="추천일" value={member.referredAt} />
          <InfoField label="판매점 담당자" value={member.agencyManager} />
          <InfoField label="판매점 연락처" value={member.agencyPhone} />
          <InfoField label="유입메모" value={member.inflowMemo} />
        </div>
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>문의/상담내역</strong>
        </div>
        <div className="member-web-detail-table-wrap">
          <table className="member-web-detail-table">
            <thead>
              <tr>
                <th>상담일</th>
                <th>상담구분</th>
                <th>상담내용</th>
                <th>처리상태</th>
                <th>담당자</th>
              </tr>
            </thead>
            <tbody>
              {member.consultations.map((item) => (
                <tr key={`${item.date}-${item.type}-${item.content}`}>
                  <td className="date-cell">{item.date}</td>
                  <td>{item.type}</td>
                  <td className="text-left">{item.content}</td>
                  <td>
                    <span
                      className={`badge ${
                        item.status === "완료" ? "success" : item.status === "처리중" ? "warn" : "info"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>{item.manager}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            등록
          </button>
        </div>
      </section>
    </div>
  );
}

function ReservationTab({ member }: { member: WebMemberDetail }) {
  return (
    <div className="member-web-detail-tab-panel">
      <div className="member-web-detail-summary">
        <article className="member-web-detail-kpi">
          <span>
            <small>전체 예약건수</small>
            <strong>{member.reservationSummary.totalCount}건</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>최근 예약일</small>
            <strong>{member.reservationSummary.latestReservedAt}</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>총 결제금액</small>
            <strong>{member.reservationSummary.totalPaidAmount}</strong>
          </span>
        </article>
        <article className="member-web-detail-kpi">
          <span>
            <small>예약상태 요약</small>
            <strong>{member.reservationSummary.statusSummary}</strong>
          </span>
        </article>
      </div>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>예약내역</strong>
        </div>
        {member.reservations.length > 0 ? (
          <div className="member-web-detail-table-wrap">
            <table className="member-web-detail-table member-web-detail-table--reservation">
              <thead>
                <tr>
                  <th>예약번호</th>
                  <th>예약일</th>
                  <th>출발일</th>
                  <th>상품명</th>
                  <th>인원</th>
                  <th>예약상태</th>
                  <th>입금상태</th>
                  <th>결제금액</th>
                  <th>판매점</th>
                </tr>
              </thead>
              <tbody>
                {member.reservations.map((item) => (
                  <tr key={item.code}>
                    <td className="member-number">{item.code}</td>
                    <td className="date-cell">{item.reservedAt}</td>
                    <td className="date-cell">{item.departureAt}</td>
                    <td className="text-left">{item.productName}</td>
                    <td>{item.people}</td>
                    <td>
                      <span className={`badge ${item.reserveStatusClass}`}>{item.reserveStatus}</span>
                    </td>
                    <td>
                      <span className={`badge ${item.paymentStatusClass}`}>{item.paymentStatus}</span>
                    </td>
                    <td className="amount-cell">{item.amount}</td>
                    <td>{item.agency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="member-web-detail-empty">등록된 예약내역이 없습니다.</div>
        )}
      </section>
    </div>
  );
}

function HistoryTab({ member }: { member: WebMemberDetail }) {
  return (
    <div className="member-web-detail-tab-panel">
      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>변경이력</strong>
        </div>
        <div className="member-web-detail-table-wrap">
          <table className="member-web-detail-table member-web-detail-table--history">
            <thead>
              <tr>
                <th>변경일시</th>
                <th>변경항목</th>
                <th>변경 전</th>
                <th>변경 후</th>
                <th>처리자</th>
              </tr>
            </thead>
            <tbody>
              {member.changeHistory.map((item) => (
                <tr key={`${item.changedAt}-${item.field}`}>
                  <td className="date-cell">{item.changedAt}</td>
                  <td>{item.field}</td>
                  <td className="text-left">{item.before}</td>
                  <td className="text-left">{item.after}</td>
                  <td>{item.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
  const [activeTab, setActiveTab] = useState<DetailTab>("basic");

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
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
            <strong>웹회원 상세</strong>
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
                  <button>정산 마감 알림</button>
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
              <p className="member-web-breadcrumb">회원관리 &gt; 웹회원관리 &gt; 웹회원 상세</p>
              <h1>웹회원 상세</h1>
              <p>홈페이지 가입 회원의 기본정보와 이용내역을 확인합니다.</p>
            </div>
            <div className="member-web-detail-actions">
              <button type="button" className="secondary" onClick={() => window.location.assign("/members/web")}>
                <ArrowLeft size={14} />
                목록
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => act("정보수정 화면은 다음 단계에서 제공될 예정입니다.")}
              >
                <Pencil size={14} />
                정보수정
              </button>
              <button type="button" className="primary" onClick={() => act("회원상태 변경 기능은 준비 중입니다.")}>
                <RefreshCw size={14} />
                회원상태 변경
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
                  <span className={`badge ${memberStatusBadgeClass(member.status)}`}>{member.status}</span>
                </div>
                <h2>{member.name}</h2>
                <p>
                  {member.loginId} · {member.phone}
                </p>
              </div>
            </div>
          </section>

          <div className="member-web-detail-summary">
            <article className="member-web-detail-kpi">
              <span>
                <small>회원명</small>
                <strong>{member.name}</strong>
              </span>
            </article>
            <article className="member-web-detail-kpi">
              <span>
                <small>회원번호</small>
                <strong>{member.id}</strong>
              </span>
            </article>
            <article className="member-web-detail-kpi">
              <span>
                <small>아이디</small>
                <strong>{member.loginId}</strong>
              </span>
            </article>
            <article className="member-web-detail-kpi">
              <span>
                <small>휴대전화</small>
                <strong>{member.phone}</strong>
              </span>
            </article>
            <article className="member-web-detail-kpi">
              <span>
                <small>회원상태</small>
                <strong>{member.status}</strong>
              </span>
            </article>
            <article className="member-web-detail-kpi">
              <span>
                <small>최근 로그인</small>
                <strong>{member.lastAccessAt}</strong>
              </span>
            </article>
          </div>

          <DetailTabs active={activeTab} onChange={setActiveTab} />

          {activeTab === "basic" && <BasicTab member={member} />}
          {activeTab === "reservation" && <ReservationTab member={member} />}
          {activeTab === "history" && <HistoryTab member={member} />}
        </main>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
