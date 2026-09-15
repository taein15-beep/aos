"use client";

import { useState } from "react";
import { List, QrCode } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import { SellerForm, confirmSellerFormLeave } from "../SellerForm";

function isMembersChildCurrent(child: string) {
  return child === "판매점관리";
}

export default function SellerNewPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const goList = () => {
    if (!confirmSellerFormLeave(isDirty)) return;
    window.location.assign("/members/sellers");
  };

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
                      onClick={() => {
                        if (child === "판매점관리") {
                          goList();
                          return;
                        }
                        navigateAdminChild(child, act);
                      }}
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
            <strong>판매점 신규등록</strong>
          </div>
          <div className="top-actions">
            <button className="ghost" onClick={() => setNoticeOpen((v) => !v)} aria-label="알림">
              알림
            </button>
            <div className="profile-wrap">
              <button className="profile" onClick={() => setProfileOpen((v) => !v)}>
                관리자
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

        <main className="content member-web-detail-content member-web-edit-content member-seller-form-content">
          <section className="page-head member-web-detail-page-head">
            <div>
              <p className="member-web-breadcrumb">회원관리 &gt; 판매점관리 &gt; 판매점 신규등록</p>
              <div className="member-web-detail-title-row">
                <h1>판매점 신규등록</h1>
              </div>
              <p className="member-web-detail-subtitle">
                AOS에서 상품을 판매할 사업자 또는 개인 판매점을 등록합니다.
              </p>
            </div>
            <div className="member-web-detail-actions">
              <button type="button" className="secondary" onClick={goList}>
                <List size={14} />
                목록
              </button>
            </div>
          </section>

          <SellerForm
            mode="create"
            onDirtyChange={setIsDirty}
            onCancel={() => window.location.assign("/members/sellers")}
            onCreated={(application) => {
              act("판매점이 등록되었습니다.");
              window.setTimeout(() => {
                window.location.assign(`/members/sellers/${application.applicationId}`);
              }, 700);
            }}
          />
        </main>
      </div>

      {noticeOpen ? (
        <div className="toast-stack">
          <div className="toast">알림 센터는 준비 중입니다.</div>
        </div>
      ) : null}
      {toast ? (
        <div className="toast-stack">
          <div className="toast">{toast}</div>
        </div>
      ) : null}
    </div>
  );
}
