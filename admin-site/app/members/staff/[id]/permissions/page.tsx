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
  STAFF_INDIVIDUAL_MENU_ROWS,
  createDefaultFieldViewSettings,
  createDefaultIndividualSettings,
  createEmptyPermissionRow,
  getCategoryGroupAccess,
  getFieldViewMenuRows,
  getFieldViewNotice,
  getPermissionPresetByGroupName,
  isFieldViewOnlyGroup,
  isPermissionRowAllChecked,
  resolveFinalAccess,
  type IndividualSettingValue,
} from "@/lib/admin/members-permission-groups-data";

/**
 * 회원관리 > 관리자/직원관리 > 개별 권한설정
 * STEP: Mock UI (DB/API/실제 저장 없음)
 * - 가이드/기사: 조회 전용 현장 메뉴 UI
 */
export default function StaffIndividualPermissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const adminCode = decodeURIComponent(id);
  const staff = getStaffMemberByAdminCode(adminCode);

  const initialGroup = staff?.groupName ?? "최종관리자";
  const displayName = staff?.koreanName ?? "장용선";
  const displayCode = staff?.adminCode ?? "changys888";

  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const [groupName, setGroupName] = useState(initialGroup);
  const [baselineGroup, setBaselineGroup] = useState(initialGroup);
  const [individualSettings, setIndividualSettings] = useState(() => createDefaultIndividualSettings());
  const [baselineIndividual, setBaselineIndividual] = useState(() => createDefaultIndividualSettings());
  const [fieldViewSettings, setFieldViewSettings] = useState(() => createDefaultFieldViewSettings(initialGroup));
  const [baselineFieldView, setBaselineFieldView] = useState(() => createDefaultFieldViewSettings(initialGroup));

  const groupPreset = useMemo(() => getPermissionPresetByGroupName(groupName), [groupName]);
  const isFieldViewGroup = isFieldViewOnlyGroup(groupName);
  const fieldViewMenus = useMemo(() => getFieldViewMenuRows(groupName), [groupName]);
  const fieldViewNotice = getFieldViewNotice(groupName);

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const goList = () => window.location.assign("/members/staff");

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const changeGroup = (nextGroup: string) => {
    setGroupName(nextGroup);
    if (isFieldViewOnlyGroup(nextGroup)) {
      setFieldViewSettings(createDefaultFieldViewSettings(nextGroup));
    }
  };

  const setIndividual = (menuId: string, value: IndividualSettingValue) => {
    setIndividualSettings((prev) => ({ ...prev, [menuId]: value }));
  };

  const toggleFieldView = (menuId: string, checked: boolean) => {
    setFieldViewSettings((prev) => ({ ...prev, [menuId]: checked }));
  };

  const cancelChanges = () => {
    setGroupName(baselineGroup);
    setIndividualSettings({ ...baselineIndividual });
    setFieldViewSettings({ ...baselineFieldView });
    act("변경사항을 취소했습니다.");
  };

  const savePermissions = () => {
    setBaselineGroup(groupName);
    setBaselineIndividual({ ...individualSettings });
    setBaselineFieldView({ ...fieldViewSettings });
    act("권한저장 기능은 다음 단계에서 제공됩니다. (현재는 화면 상태만 유지)");
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
            <strong>개별 권한설정</strong>
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

        <main className="content member-web-detail-content member-web-edit-content member-staff-individual-perm-content">
          <section className="page-head member-web-detail-page-head">
            <div>
              <p className="member-web-breadcrumb">회원관리 &gt; 관리자/직원관리 &gt; 개별 권한설정</p>
              <div className="member-web-detail-title-row">
                <h1>관리자 개별 권한설정</h1>
              </div>
            </div>
            <div className="member-web-detail-actions">
              <button type="button" className="secondary" onClick={goList}>
                목록
              </button>
            </div>
          </section>

          <div className="member-web-edit-stack">
            <section className="panel member-web-detail-card">
              <div className="member-web-detail-card-head">
                <strong>기본정보</strong>
              </div>
              <div className="member-web-edit-form-body">
                <div className="member-web-edit-form-grid member-web-edit-form-grid--3">
                  <div className="member-web-edit-field member-web-edit-field--readonly">
                    <span>ID</span>
                    <div className="member-web-edit-readonly">{displayCode}</div>
                  </div>
                  <div className="member-web-edit-field member-web-edit-field--readonly">
                    <span>이름</span>
                    <div className="member-web-edit-readonly">{displayName}</div>
                  </div>
                  <label className="member-web-edit-field">
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

            {isFieldViewGroup ? (
              <section className="panel member-web-detail-card">
                <div className="member-web-detail-card-head">
                  <strong>{groupName} 조회 권한</strong>
                  <span className="member-staff-individual-perm-group-tag">{groupName}</span>
                </div>
                <div className="member-web-edit-form-body">
                  <p className="member-staff-field-view-notice">{fieldViewNotice}</p>
                  <p className="member-staff-individual-perm-guide">
                    조회 권한만 제공하며 등록 / 수정 / 삭제 권한은 적용되지 않습니다.
                  </p>
                  <div className="member-staff-table-wrap">
                    <table className="member-staff-table member-staff-field-view-table">
                      <thead>
                        <tr>
                          <th>메뉴</th>
                          <th>조회</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fieldViewMenus.map((row) => (
                          <tr key={row.id}>
                            <td className="member-staff-individual-perm-menu">{row.label}</td>
                            <td>
                              <input
                                type="checkbox"
                                checked={fieldViewSettings[row.id] ?? true}
                                aria-label={`${row.label} 조회`}
                                onChange={(e) => toggleFieldView(row.id, e.target.checked)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ) : (
              <>
                <section className="panel member-web-detail-card">
                  <div className="member-web-detail-card-head">
                    <strong>그룹 기본권한</strong>
                    <span className="member-staff-individual-perm-group-tag">{groupName}</span>
                  </div>
                  <div className="member-staff-table-wrap member-staff-individual-perm-group-wrap">
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
                          const state = groupPreset[row.id] ?? createEmptyPermissionRow();
                          const allChecked = isPermissionRowAllChecked(state);
                          return (
                            <tr key={row.id} className={row.depth === 1 ? "member-perm-setting-child" : undefined}>
                              <td className="member-perm-setting-menu">{row.label}</td>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={allChecked}
                                  disabled
                                  readOnly
                                  aria-label={`${row.label} 전체`}
                                />
                              </td>
                              {PERMISSION_ACTIONS.map((action) => (
                                <td key={action}>
                                  <input
                                    type="checkbox"
                                    checked={state[action]}
                                    disabled
                                    readOnly
                                    aria-label={`${row.label} ${PERMISSION_ACTION_LABELS[action]}`}
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

                <section className="panel member-web-detail-card">
                  <div className="member-web-detail-card-head">
                    <strong>개별 권한 설정</strong>
                  </div>
                  <div className="member-web-edit-form-body">
                    <p className="member-staff-individual-perm-guide">
                      그룹 기본권한을 기준으로 사용자별 권한을 추가하거나 제한할 수 있습니다.
                    </p>
                    <div className="member-staff-table-wrap">
                      <table className="member-staff-table member-staff-individual-perm-table">
                        <thead>
                          <tr>
                            <th>메뉴</th>
                            <th>그룹권한</th>
                            <th>개별설정</th>
                            <th>최종권한</th>
                          </tr>
                        </thead>
                        <tbody>
                          {STAFF_INDIVIDUAL_MENU_ROWS.map((row) => {
                            const groupAccess = getCategoryGroupAccess(groupPreset, row);
                            const individual = individualSettings[row.id] ?? "기본값 사용";
                            const finalAccess = resolveFinalAccess(groupAccess, individual);
                            return (
                              <tr key={row.id}>
                                <td className="member-staff-individual-perm-menu">{row.label}</td>
                                <td>
                                  <span
                                    className={`member-staff-individual-perm-flag is-${groupAccess === "허용" ? "allow" : "deny"}`}
                                  >
                                    {groupAccess}
                                  </span>
                                </td>
                                <td>
                                  <select
                                    className="member-staff-individual-perm-select"
                                    value={individual}
                                    aria-label={`${row.label} 개별설정`}
                                    onChange={(e) => setIndividual(row.id, e.target.value as IndividualSettingValue)}
                                  >
                                    <option value="기본값 사용">기본값 사용</option>
                                    <option value="허용">허용</option>
                                    <option value="차단">차단</option>
                                  </select>
                                </td>
                                <td>
                                  <span
                                    className={`member-staff-individual-perm-flag is-${finalAccess === "허용" ? "allow" : "deny"}`}
                                  >
                                    {finalAccess}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </>
            )}

            <div className="member-web-edit-footer member-staff-individual-perm-footer">
              <button type="button" className="secondary" onClick={goList}>
                목록
              </button>
              <button type="button" className="secondary" onClick={cancelChanges}>
                <RotateCcw size={14} />
                변경취소
              </button>
              <button type="button" className="primary" onClick={savePermissions}>
                <Save size={14} />
                권한저장
              </button>
            </div>
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

