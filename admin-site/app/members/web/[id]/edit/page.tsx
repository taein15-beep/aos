"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, QrCode, Save, UserRound, X } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  getWebMemberDetail,
  MEMBER_EDIT_STATUS_OPTIONS,
  memberStatusBadgeClass,
  type MemberStatus,
  type WebMemberDetail,
} from "@/lib/admin/members-web-data";

type EditFormState = {
  name: string;
  loginId: string;
  phone: string;
  email: string;
  birthDate: string;
  gender: "남성" | "여성";
  status: MemberStatus;
  marketingAgreed: boolean;
  adminNote: string;
  internalNote: string;
};

function buildFormState(member: WebMemberDetail): EditFormState {
  return {
    name: member.name,
    loginId: member.loginId,
    phone: member.phone,
    email: member.email,
    birthDate: member.birthDate,
    gender: member.gender,
    status: member.status,
    marketingAgreed: member.consent.marketingAgreed,
    adminNote: member.adminNote,
    internalNote: member.internalNote,
  };
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="member-web-edit-field member-web-edit-field--readonly">
      <span>{label}</span>
      <div className="member-web-edit-readonly">{value || "-"}</div>
    </div>
  );
}

function MemberEditForm({
  member,
  onCancel,
  onSave,
}: {
  member: WebMemberDetail;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState<EditFormState>(() => buildFormState(member));

  const update = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="member-web-edit-stack">
      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>기본정보</strong>
        </div>
        <div className="member-web-edit-form-body">
          <div className="member-web-edit-form-grid">
            <label className="member-web-edit-field">
              <span>이름</span>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} />
            </label>
            <label className="member-web-edit-field">
              <span>아이디</span>
              <input value={form.loginId} onChange={(e) => update("loginId", e.target.value)} />
            </label>
            <label className="member-web-edit-field">
              <span>휴대전화</span>
              <input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="010-0000-0000" />
            </label>
            <label className="member-web-edit-field">
              <span>이메일</span>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </label>
            <label className="member-web-edit-field">
              <span>생년월일</span>
              <input type="date" value={form.birthDate} onChange={(e) => update("birthDate", e.target.value)} />
            </label>
            <label className="member-web-edit-field">
              <span>성별</span>
              <select value={form.gender} onChange={(e) => update("gender", e.target.value as "남성" | "여성")}>
                <option value="남성">남성</option>
                <option value="여성">여성</option>
              </select>
            </label>
            <label className="member-web-edit-field">
              <span>회원상태</span>
              <select value={form.status} onChange={(e) => update("status", e.target.value as MemberStatus)}>
                {MEMBER_EDIT_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <ReadonlyField label="회원번호" value={member.id} />
            <ReadonlyField label="가입일" value={member.joinedAt} />
            <ReadonlyField label="최근 로그인" value={member.lastAccessAt} />
          </div>
        </div>
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>동의 정보</strong>
        </div>
        <div className="member-web-edit-form-body">
          <div className="member-web-edit-form-grid member-web-edit-form-grid--3">
            <ReadonlyField label="이용약관 동의일" value={member.consent.termsAgreedAt} />
            <ReadonlyField label="개인정보 수집 동의일" value={member.consent.privacyAgreedAt} />
            <label className="member-web-edit-field">
              <span>마케팅 수신 동의</span>
              <select
                value={form.marketingAgreed ? "동의" : "미동의"}
                onChange={(e) => update("marketingAgreed", e.target.value === "동의")}
              >
                <option value="동의">동의</option>
                <option value="미동의">미동의</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="panel member-web-detail-card">
        <div className="member-web-detail-card-head">
          <strong>관리자 설정</strong>
        </div>
        <div className="member-web-edit-form-body">
          <div className="member-web-edit-form-grid member-web-edit-form-grid--admin">
            <label className="member-web-edit-field">
              <span>회원상태</span>
              <select value={form.status} onChange={(e) => update("status", e.target.value as MemberStatus)}>
                {MEMBER_EDIT_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="member-web-edit-field member-web-edit-field--span-2">
              <span>관리자 메모</span>
              <textarea
                rows={3}
                value={form.adminNote}
                onChange={(e) => update("adminNote", e.target.value)}
                placeholder="담당자 확인 사항, 유입 경로 등 관리 메모를 입력하세요."
              />
            </label>
            <label className="member-web-edit-field member-web-edit-field--span-3">
              <span>내부관리용 비고</span>
              <textarea
                rows={3}
                value={form.internalNote}
                onChange={(e) => update("internalNote", e.target.value)}
                placeholder="내부 운영 참고 사항을 입력하세요."
              />
            </label>
          </div>
        </div>
      </section>

      <div className="member-web-edit-footer">
        <button type="button" className="secondary" onClick={onCancel}>
          <X size={14} />
          취소
        </button>
        <button type="button" className="primary" onClick={onSave}>
          <Save size={14} />
          변경사항 저장
        </button>
      </div>
    </div>
  );
}

export default function WebMemberEditPage() {
  const params = useParams<{ id: string }>();
  const memberId = useMemo(() => decodeURIComponent(params.id ?? ""), [params.id]);
  const member = useMemo(() => getWebMemberDetail(memberId), [memberId]);

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const goDetail = () => window.location.assign(`/members/web/${member?.id ?? memberId}`);
  const goList = () => window.location.assign("/members/web");

  const handleSave = () => {
    act("회원 정보를 저장했습니다.");
    window.setTimeout(() => goDetail(), 900);
  };

  if (!member) {
    return (
      <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
        <main className="content member-web-detail-content">
          <section className="panel member-web-detail-not-found">
            <strong>회원을 찾을 수 없습니다.</strong>
            <p>요청하신 회원번호({memberId || "-"})에 해당하는 웹회원 정보가 없습니다.</p>
            <button type="button" className="secondary" onClick={goList}>
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
            <span>회원상세</span>
            <b>/</b>
            <strong>정보수정</strong>
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

        <main className="content member-web-detail-content member-web-edit-content">
          <section className="page-head member-web-detail-page-head">
            <div>
              <p className="member-web-breadcrumb">회원관리 &gt; 웹회원관리 &gt; 회원상세 &gt; 정보수정</p>
              <div className="member-web-detail-title-row">
                <h1>{member.name}</h1>
                <span className={`badge ${memberStatusBadgeClass(member.status)}`}>{member.status}</span>
              </div>
              <p className="member-web-detail-subtitle">회원번호 {member.id}</p>
            </div>
            <div className="member-web-detail-actions">
              <button type="button" className="secondary" onClick={goDetail}>
                <X size={14} />
                취소
              </button>
              <button type="button" className="primary" onClick={handleSave}>
                <Save size={14} />
                저장
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
                  {member.loginId} · {member.phone} · {member.email}
                </p>
              </div>
            </div>
          </section>

          <MemberEditForm member={member} onCancel={goDetail} onSave={handleSave} />
        </main>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
