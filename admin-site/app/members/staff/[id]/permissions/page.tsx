"use client";

import { use, useMemo, useState } from "react";
import { QrCode, RotateCcw, Save } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import { getStaffMemberByAdminCode } from "@/lib/admin/members-staff-data";
import {
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_GROUP_OPTIONS,
  PERMISSION_MENU_ROWS,
  createEmptyPermissionRow,
  getPermissionPresetByGroupName,
  isPermissionRowAllChecked,
  type PermissionAction,
  type PermissionRowState,
} from "@/lib/admin/members-permission-groups-data";

/**
 * 회원관리 > 관리자/직원관리 > 개별 권한설정
 * STEP: 권한그룹 권한설정과 동일한 Mock 체크박스 UI (DB/API 없음)
 */
export default function StaffIndividualPermissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const adminCode = decodeURIComponent(id);
  const staff = getStaffMemberByAdminCode(adminCode);

  const initialGroup = staff?.groupName ?? "직원";
  const displayName = staff?.koreanName ?? adminCode;
  const displayCode = staff?.adminCode ?? adminCode;

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [groupName, setGroupName] = useState(initialGroup);
  const [permissions, setPermissions] = useState(() => getPermissionPresetByGroupName(initialGroup));

  const editableRowCount = useMemo(
    () => PERMISSION_MENU_ROWS.filter((row) => !row.isGroup).length,
    [],
  );

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const goList = () => window.location.assign("/members/staff");

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const setRow = (rowId: string, next: PermissionRowState) => {
    setPermissions((prev) => ({ ...prev, [rowId]: next }));
  };

  const toggleAll = (rowId: string, checked: boolean) => {
    setRow(rowId, {
      view: checked,
      create: checked,
      update: checked,
      delete: checked,
    });
  };

  const toggleAction = (rowId: string, action: PermissionAction, checked: boolean) => {
    const current = permissions[rowId] ?? createEmptyPermissionRow();
    setRow(rowId, { ...current, [action]: checked });
  };

  const changeGroup = (nextGroup: string) => {
    setGroupName(nextGroup);
    setPermissions(getPermissionPresetByGroupName(nextGroup));
    act(`${nextGroup} 그룹 기본권한을 불러왔습니다.`);
  };

  const resetPermissions = () => {
    setPermissions(getPermissionPresetByGroupName(groupName));
    act("소속그룹 Mock Preset으로 초기화했습니다.");
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
                {item.children ? (
                  <span className={`chevron ${expanded.includes(item.label) ? "open" : ""}`}>⌄</span>
                ) : null}
              </button>
              {item.children && expanded.includes(item.label) && !collapsed ? (
                <div className="subnav">
                  {item.children.map((child) => (
                    <button
                      key={child}
                      type="button"
                      className={child === "관리자/직원" ? "current" : ""}
                      onClick={() => navigateAdminChild(child, act)}
                    >
                      {child}
                    </button>
                  ))}
                </div>
              ) : null}
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
            <strong>관리자/직원관리</strong>
            <b>/</b>
            <strong>권한설정</strong>
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
                type="button"
                className="icon-btn notice"
                aria-label="알림"
                onClick={() => {
                  setNoticeOpen(!noticeOpen);
                  setProfileOpen(false);
                }}
              >
                ♢<i>5</i>
              </button>
              {noticeOpen ? (
                <div className="dropdown notice-menu">
                  <div className="drop-head">
                    <strong>알림</strong>
                    <button type="button" onClick={() => setNoticeOpen(false)}>
                      모두 읽음
                    </button>
                  </div>
                  <button type="button">
                    <span className="alert-dot info" />
                    <span>
                      개별 권한설정 알림이 있습니다.
                      <small>방금 전</small>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
            <div className="divider" />
            <div className="dropdown-wrap">
              <button
                type="button"
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
              {profileOpen ? (
                <div className="dropdown profile-menu">
                  <button type="button">내 정보</button>
                  <button type="button">환경설정</button>
                  <hr />
                  <button type="button" className="logout">
                    로그아웃
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="content member-staff-content member-perm-setting-content">
          <section className="page-head member-staff-page-head">
            <div>
              <h1>개별 권한설정</h1>
              <p className="member-perm-setting-summary">
                <span>
                  ID: <b>{displayCode}</b>
                </span>
                <span>
                  이름: <b>{displayName}</b>
                </span>
              </p>
              <div className="member-staff-individual-perm-group-row">
                <label>
                  <span>소속그룹</span>
                  <select
                    value={groupName}
                    onChange={(e) => changeGroup(e.target.value)}
                    aria-label="소속그룹"
                  >
                    {PERMISSION_GROUP_OPTIONS.map((option) => (
                      <option key={option.id} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </section>

          <section className="member-staff-list-panel" aria-label="권한설정">
            <div className="member-staff-table-wrap">
              <table className="member-staff-table member-perm-setting-table">
                <thead>
                  <tr>
                    <th>메뉴</th>
                    <th>전체</th>
                    <th>조회</th>
                    <th>등록</th>
                    <th>수정</th>
                    <th>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MENU_ROWS.map((row) => {
                    if (row.isGroup) {
                      return (
                        <tr key={row.id} className="member-perm-setting-group">
                          <td colSpan={6}>{row.label}</td>
                        </tr>
                      );
                    }

                    const state = permissions[row.id] ?? createEmptyPermissionRow();
                    const allChecked = isPermissionRowAllChecked(state);

                    return (
                      <tr key={row.id} className={row.depth === 1 ? "member-perm-setting-child" : undefined}>
                        <td className="member-perm-setting-menu">{row.label}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={allChecked}
                            aria-label={`${row.label} 전체`}
                            onChange={(e) => toggleAll(row.id, e.target.checked)}
                          />
                        </td>
                        {PERMISSION_ACTIONS.map((action) => (
                          <td key={action}>
                            <input
                              type="checkbox"
                              checked={state[action]}
                              aria-label={`${row.label} ${PERMISSION_ACTION_LABELS[action]}`}
                              onChange={(e) => toggleAction(row.id, action, e.target.checked)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <p className="member-perm-setting-hint">
            소속그룹({groupName}) Mock Preset 기준 · 메뉴 {editableRowCount}개 · 체크 상태는 화면에서만 반영됩니다.
          </p>

          <div className="member-web-edit-footer member-perm-setting-footer">
            <button type="button" className="secondary" onClick={goList}>
              목록
            </button>
            <button type="button" className="secondary" onClick={resetPermissions}>
              <RotateCcw size={14} />
              초기화
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => act("권한저장 기능은 다음 단계에서 제공됩니다.")}
            >
              <Save size={14} />
              권한저장
            </button>
          </div>
        </main>
      </div>

      {toast ? (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
