"use client";

import { useMemo, useState } from "react";
import { QrCode, Save, X } from "lucide-react";
import { ADMIN_MENU, navigateAdminChild } from "@/lib/admin/navigation";
import {
  PERMISSION_GROUP_MOCK_ROWS,
  PERMISSION_GROUP_OPTIONS,
  STAFF_INDIVIDUAL_MENU_ROWS,
  createDefaultIndividualSettings,
  getCategoryGroupAccess,
  getPermissionGroupSummaryByName,
  getPermissionPresetByGroupName,
  resolveFinalAccess,
  type IndividualSettingValue,
} from "@/lib/admin/members-permission-groups-data";

const STAFF_NEW_SECTIONS = [
  { id: "account", title: "1. 계정정보" },
  { id: "basic", title: "2. 기본정보" },
  { id: "org", title: "3. 조직정보" },
  { id: "permission", title: "4. 권한설정" },
  { id: "scope", title: "5. 업무범위" },
] as const;

type AccountStatus = "사용" | "사용중지";

type AccountFormState = {
  adminCode: string;
  password: string;
  passwordConfirm: string;
  accountStatus: AccountStatus;
};

type BasicFormState = {
  koreanName: string;
  englishName: string;
  position: string;
  mobile: string;
  directPhone: string;
  email: string;
  profileFileName: string;
};

type OrgFormState = {
  department: string;
  team: string;
  jobTitle: string;
  permissionGroup: string;
  duties: string;
};

type GeneralScopeState = {
  productScope: "전체상품" | "지정상품";
  regionScope: "전체" | "국내" | "해외" | "지역 지정";
  sellers: string;
  affiliates: string;
};

type GuideScopeState = {
  active: "활동" | "비활동";
  region: string;
  languages: string;
  guideType: string;
};

type DriverScopeState = {
  active: "활동" | "비활동";
  vehicleType: string;
  vehicleNumber: string;
  serviceRegion: string;
  contact: string;
};

const POSITION_OPTIONS = ["대표", "임원", "부장", "차장", "과장", "대리", "주임", "사원", "기타"] as const;
const DEPARTMENT_OPTIONS = ["경영관리", "상품운영", "예약/CS", "정산/회계", "마케팅", "현장운영", "기타"] as const;
const TEAM_OPTIONS = ["국내여행팀", "해외여행팀", "항공팀", "예약팀", "정산팀", "영업팀", "운영팀"] as const;
const JOB_TITLE_OPTIONS = ["팀장", "파트장", "담당자", "없음"] as const;
const GUIDE_TYPE_OPTIONS = ["국내가이드", "해외가이드", "인솔자"] as const;
const VEHICLE_TYPE_OPTIONS = ["승합", "버스", "승용", "기타"] as const;

const INITIAL_ACCOUNT: AccountFormState = {
  adminCode: "",
  password: "",
  passwordConfirm: "",
  accountStatus: "사용",
};

const INITIAL_BASIC: BasicFormState = {
  koreanName: "",
  englishName: "",
  position: "",
  mobile: "",
  directPhone: "",
  email: "",
  profileFileName: "",
};

const INITIAL_ORG: OrgFormState = {
  department: "",
  team: "",
  jobTitle: "",
  permissionGroup: "",
  duties: "",
};

const INITIAL_GENERAL_SCOPE: GeneralScopeState = {
  productScope: "전체상품",
  regionScope: "전체",
  sellers: "",
  affiliates: "",
};

const INITIAL_GUIDE_SCOPE: GuideScopeState = {
  active: "활동",
  region: "",
  languages: "",
  guideType: "",
};

const INITIAL_DRIVER_SCOPE: DriverScopeState = {
  active: "활동",
  vehicleType: "",
  vehicleNumber: "",
  serviceRegion: "",
  contact: "",
};

function RequiredMark() {
  return <b className="member-seller-form-required">*</b>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <small className="member-seller-form-error" role="alert">
      {message}
    </small>
  );
}

type StaffNewErrors = {
  adminCode?: string;
  password?: string;
  passwordConfirm?: string;
  koreanName?: string;
  mobile?: string;
  email?: string;
  permissionGroup?: string;
};

function validateStaffNewForm(
  account: AccountFormState,
  basic: BasicFormState,
  org: OrgFormState,
): StaffNewErrors {
  const errors: StaffNewErrors = {};

  if (!account.adminCode.trim()) errors.adminCode = "ID를 입력해주세요.";
  if (!account.password) errors.password = "비밀번호를 입력해주세요.";
  if (!account.passwordConfirm) {
    errors.passwordConfirm = "비밀번호 확인을 입력해주세요.";
  } else if (account.password && account.password !== account.passwordConfirm) {
    errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
  }
  if (!basic.koreanName.trim()) errors.koreanName = "한글이름을 입력해주세요.";
  if (!basic.mobile.trim()) errors.mobile = "휴대폰을 입력해주세요.";
  if (!basic.email.trim()) errors.email = "이메일을 입력해주세요.";
  if (!org.permissionGroup.trim()) errors.permissionGroup = "권한그룹을 선택해주세요.";

  return errors;
}

/**
 * 회원관리 > 관리자/직원관리 > 신규등록
 * STEP: 등록 UX Mock (필수검증 + 완료 안내, DB/API 없음)
 */
export default function StaffMemberNewPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(["회원관리"]);
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [account, setAccount] = useState<AccountFormState>(INITIAL_ACCOUNT);
  const [basic, setBasic] = useState<BasicFormState>(INITIAL_BASIC);
  const [org, setOrg] = useState<OrgFormState>(INITIAL_ORG);
  const [errors, setErrors] = useState<StaffNewErrors>({});
  const [useIndividualPermission, setUseIndividualPermission] = useState(false);
  const [individualSettings, setIndividualSettings] = useState(() => createDefaultIndividualSettings());
  const [generalScope, setGeneralScope] = useState<GeneralScopeState>(INITIAL_GENERAL_SCOPE);
  const [guideScope, setGuideScope] = useState<GuideScopeState>(INITIAL_GUIDE_SCOPE);
  const [driverScope, setDriverScope] = useState<DriverScopeState>(INITIAL_DRIVER_SCOPE);

  const permissionGroupHint = useMemo(() => {
    if (!org.permissionGroup) return "";
    return PERMISSION_GROUP_MOCK_ROWS.find((row) => row.groupName === org.permissionGroup)?.description ?? "";
  }, [org.permissionGroup]);

  const groupSummary = useMemo(
    () => getPermissionGroupSummaryByName(org.permissionGroup),
    [org.permissionGroup],
  );

  const groupPreset = useMemo(
    () => getPermissionPresetByGroupName(org.permissionGroup),
    [org.permissionGroup],
  );

  const isGuideGroup = org.permissionGroup === "가이드";
  const isDriverGroup = org.permissionGroup === "기사";
  const isFieldScopeGroup = isGuideGroup || isDriverGroup;

  const act = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const goList = () => window.location.assign("/members/staff");

  const toggleMenu = (label: string) =>
    setExpanded((value) => (value.includes(label) ? value.filter((item) => item !== label) : [...value, label]));

  const clearError = (key: keyof StaffNewErrors) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateAccount = <K extends keyof AccountFormState>(key: K, value: AccountFormState[K]) => {
    setAccount((prev) => ({ ...prev, [key]: value }));
    if (key === "adminCode" || key === "password" || key === "passwordConfirm") {
      clearError(key);
      if (key === "password" || key === "passwordConfirm") clearError("passwordConfirm");
    }
  };

  const updateBasic = <K extends keyof BasicFormState>(key: K, value: BasicFormState[K]) => {
    setBasic((prev) => ({ ...prev, [key]: value }));
    if (key === "koreanName" || key === "mobile" || key === "email") clearError(key);
  };

  const updateOrg = <K extends keyof OrgFormState>(key: K, value: OrgFormState[K]) => {
    setOrg((prev) => ({ ...prev, [key]: value }));
    if (key === "permissionGroup") {
      clearError("permissionGroup");
      if (value === "가이드" || value === "기사") {
        setUseIndividualPermission(false);
      }
    }
  };

  const setIndividual = (menuId: string, value: IndividualSettingValue) => {
    setIndividualSettings((prev) => ({ ...prev, [menuId]: value }));
  };

  const updateGeneralScope = <K extends keyof GeneralScopeState>(key: K, value: GeneralScopeState[K]) => {
    setGeneralScope((prev) => ({ ...prev, [key]: value }));
  };

  const updateGuideScope = <K extends keyof GuideScopeState>(key: K, value: GuideScopeState[K]) => {
    setGuideScope((prev) => ({ ...prev, [key]: value }));
  };

  const updateDriverScope = <K extends keyof DriverScopeState>(key: K, value: DriverScopeState[K]) => {
    setDriverScope((prev) => ({ ...prev, [key]: value }));
  };

  const handleRegister = () => {
    const nextErrors = validateStaffNewForm(account, basic, org);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      act("필수 입력값을 확인해주세요.");
      return;
    }
    act("관리자/직원이 등록되었습니다.");
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
            <strong>신규등록</strong>
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
                      관리자/직원 등록 알림이 있습니다.
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

        <main className="content member-web-detail-content member-web-edit-content member-staff-new-content">
          <section className="page-head member-web-detail-page-head">
            <div>
              <p className="member-web-breadcrumb">회원관리 &gt; 관리자/직원관리 &gt; 신규등록</p>
              <div className="member-web-detail-title-row">
                <h1>관리자/직원 신규등록</h1>
              </div>
            </div>
            <div className="member-web-detail-actions">
              <button type="button" className="secondary" onClick={goList}>
                목록
              </button>
            </div>
          </section>

          <div className="member-web-edit-stack">
            {STAFF_NEW_SECTIONS.map((section) => (
              <section key={section.id} className="member-web-detail-card member-staff-new-section" aria-label={section.title}>
                <div className="member-web-detail-card-head member-staff-new-section-head">
                  <strong>{section.title}</strong>
                </div>

                {section.id === "account" ? (
                  <div className="member-web-edit-form-body member-staff-new-form-body">
                    <div className="member-web-edit-form-grid member-web-edit-form-grid--3 member-staff-new-grid">
                      <div className={`member-web-edit-field${errors.adminCode ? " is-invalid" : ""}`}>
                        <span>
                          ID <RequiredMark />
                        </span>
                        <div className="member-seller-login-row">
                          <input
                            value={account.adminCode}
                            onChange={(e) => updateAccount("adminCode", e.target.value.replace(/\s/g, ""))}
                            placeholder="예: changys888"
                            autoComplete="off"
                            aria-label="ID"
                            aria-invalid={Boolean(errors.adminCode)}
                          />
                          <button
                            type="button"
                            className="secondary member-staff-new-mini-btn"
                            onClick={() => act("중복확인 기능은 다음 단계에서 제공됩니다.")}
                          >
                            중복확인
                          </button>
                        </div>
                        <FieldError message={errors.adminCode} />
                      </div>

                      <label className={`member-web-edit-field${errors.password ? " is-invalid" : ""}`}>
                        <span>
                          비밀번호 <RequiredMark />
                        </span>
                        <input
                          type="password"
                          value={account.password}
                          onChange={(e) => updateAccount("password", e.target.value)}
                          placeholder="비밀번호"
                          autoComplete="new-password"
                          aria-label="비밀번호"
                          aria-invalid={Boolean(errors.password)}
                        />
                        <FieldError message={errors.password} />
                      </label>

                      <label className={`member-web-edit-field${errors.passwordConfirm ? " is-invalid" : ""}`}>
                        <span>
                          비밀번호 확인 <RequiredMark />
                        </span>
                        <input
                          type="password"
                          value={account.passwordConfirm}
                          onChange={(e) => updateAccount("passwordConfirm", e.target.value)}
                          placeholder="비밀번호 확인"
                          autoComplete="new-password"
                          aria-label="비밀번호 확인"
                          aria-invalid={Boolean(errors.passwordConfirm)}
                        />
                        <FieldError message={errors.passwordConfirm} />
                      </label>

                      <div className="member-web-edit-field">
                        <span>
                          계정상태 <RequiredMark />
                        </span>
                        <div className="member-staff-new-radio-row" role="radiogroup" aria-label="계정상태">
                          <label className="member-staff-new-radio">
                            <input
                              type="radio"
                              name="staff-account-status"
                              checked={account.accountStatus === "사용"}
                              onChange={() => updateAccount("accountStatus", "사용")}
                            />
                            <span>사용</span>
                          </label>
                          <label className="member-staff-new-radio">
                            <input
                              type="radio"
                              name="staff-account-status"
                              checked={account.accountStatus === "사용중지"}
                              onChange={() => updateAccount("accountStatus", "사용중지")}
                            />
                            <span>사용중지</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : section.id === "basic" ? (
                  <div className="member-web-edit-form-body member-staff-new-form-body">
                    <div className="member-web-edit-form-grid member-web-edit-form-grid--3 member-staff-new-grid">
                      <label className={`member-web-edit-field${errors.koreanName ? " is-invalid" : ""}`}>
                        <span>
                          한글이름 <RequiredMark />
                        </span>
                        <input
                          value={basic.koreanName}
                          onChange={(e) => updateBasic("koreanName", e.target.value)}
                          placeholder="한글이름"
                          aria-label="한글이름"
                          aria-invalid={Boolean(errors.koreanName)}
                        />
                        <FieldError message={errors.koreanName} />
                      </label>

                      <label className="member-web-edit-field">
                        <span>영문이름</span>
                        <input
                          value={basic.englishName}
                          onChange={(e) => updateBasic("englishName", e.target.value)}
                          placeholder="English name"
                          aria-label="영문이름"
                        />
                      </label>

                      <label className="member-web-edit-field">
                        <span>직급</span>
                        <select
                          value={basic.position}
                          onChange={(e) => updateBasic("position", e.target.value)}
                          aria-label="직급"
                        >
                          <option value="">선택</option>
                          {POSITION_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={`member-web-edit-field${errors.mobile ? " is-invalid" : ""}`}>
                        <span>
                          휴대폰 <RequiredMark />
                        </span>
                        <input
                          value={basic.mobile}
                          onChange={(e) => updateBasic("mobile", e.target.value)}
                          placeholder="010-1234-5678"
                          inputMode="tel"
                          aria-label="휴대폰"
                          aria-invalid={Boolean(errors.mobile)}
                        />
                        <FieldError message={errors.mobile} />
                      </label>

                      <label className="member-web-edit-field">
                        <span>직통번호</span>
                        <input
                          value={basic.directPhone}
                          onChange={(e) => updateBasic("directPhone", e.target.value)}
                          placeholder="02-1234-5678"
                          inputMode="tel"
                          aria-label="직통번호"
                        />
                      </label>

                      <label className={`member-web-edit-field${errors.email ? " is-invalid" : ""}`}>
                        <span>
                          이메일 <RequiredMark />
                        </span>
                        <input
                          type="email"
                          value={basic.email}
                          onChange={(e) => updateBasic("email", e.target.value)}
                          placeholder="staff@company.com"
                          aria-label="이메일"
                          aria-invalid={Boolean(errors.email)}
                        />
                        <FieldError message={errors.email} />
                      </label>

                      <div className="member-web-edit-field member-web-edit-field--span-2">
                        <span>프로필사진</span>
                        <div className="member-staff-new-profile-row">
                          <div className="member-staff-new-profile-preview" aria-hidden="true">
                            {basic.profileFileName ? basic.profileFileName.slice(0, 1).toUpperCase() : "사진"}
                          </div>
                          <div className="member-staff-new-profile-meta">
                            <p className="member-staff-new-profile-name">
                              {basic.profileFileName || "선택된 파일이 없습니다."}
                            </p>
                            <div className="member-staff-new-profile-actions">
                              <button
                                type="button"
                                className="secondary member-staff-new-mini-btn"
                                onClick={() => {
                                  updateBasic("profileFileName", "profile-sample.jpg");
                                  act("프로필사진 업로드 기능은 다음 단계에서 제공됩니다.");
                                }}
                              >
                                업로드
                              </button>
                              <button
                                type="button"
                                className="secondary member-staff-new-mini-btn"
                                onClick={() => updateBasic("profileFileName", "")}
                                disabled={!basic.profileFileName}
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : section.id === "org" ? (
                  <div className="member-web-edit-form-body member-staff-new-form-body">
                    <div className="member-web-edit-form-grid member-web-edit-form-grid--3 member-staff-new-grid">
                      {!isFieldScopeGroup ? (
                        <>
                          <label className="member-web-edit-field">
                            <span>소속부서</span>
                            <select
                              value={org.department}
                              onChange={(e) => updateOrg("department", e.target.value)}
                              aria-label="소속부서"
                            >
                              <option value="">선택</option>
                              {DEPARTMENT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="member-web-edit-field">
                            <span>소속팀</span>
                            <select
                              value={org.team}
                              onChange={(e) => updateOrg("team", e.target.value)}
                              aria-label="소속팀"
                            >
                              <option value="">선택</option>
                              {TEAM_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="member-web-edit-field">
                            <span>직책</span>
                            <select
                              value={org.jobTitle}
                              onChange={(e) => updateOrg("jobTitle", e.target.value)}
                              aria-label="직책"
                            >
                              <option value="">선택</option>
                              {JOB_TITLE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      ) : null}

                      <div className={`member-web-edit-field${errors.permissionGroup ? " is-invalid" : ""}`}>
                        <span>
                          권한그룹 <RequiredMark />
                        </span>
                        <select
                          value={org.permissionGroup}
                          onChange={(e) => updateOrg("permissionGroup", e.target.value)}
                          aria-label="권한그룹"
                          aria-invalid={Boolean(errors.permissionGroup)}
                        >
                          <option value="">선택</option>
                          {PERMISSION_GROUP_OPTIONS.map((option) => (
                            <option key={option.id} value={option.name}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                        <FieldError message={errors.permissionGroup} />
                        {!errors.permissionGroup && permissionGroupHint ? (
                          <p className="member-staff-new-group-hint">{permissionGroupHint}</p>
                        ) : null}
                      </div>

                      {!isFieldScopeGroup ? (
                        <label className="member-web-edit-field member-web-edit-field--span-2">
                          <span>담당업무</span>
                          <textarea
                            rows={2}
                            value={org.duties}
                            onChange={(e) => updateOrg("duties", e.target.value)}
                            placeholder="국내상품 등록 및 예약관리 담당"
                            aria-label="담당업무"
                          />
                        </label>
                      ) : (
                        <p className="member-staff-new-group-hint member-staff-new-field-org-hint">
                          가이드/기사는 소속부서·담당업무 대신 아래 업무범위에서 현장 설정을 입력합니다.
                        </p>
                      )}
                    </div>
                  </div>
                ) : section.id === "permission" ? (
                  <div className="member-web-edit-form-body member-staff-new-form-body member-staff-new-perm-body">
                    <div className="member-web-edit-form-grid member-web-edit-form-grid--3 member-staff-new-grid">
                      <div className="member-web-edit-field member-web-edit-field--readonly">
                        <span>권한그룹</span>
                        <div className="member-web-edit-readonly">
                          {org.permissionGroup || "조직정보에서 권한그룹을 선택하세요."}
                        </div>
                      </div>
                    </div>

                    <div className="member-staff-new-perm-summary">
                      <strong className="member-staff-new-perm-summary-title">그룹 기본권한</strong>
                      {groupSummary ? (
                        <div className="member-staff-new-perm-summary-grid">
                          <div>
                            <em>허용</em>
                            <ul>
                              {groupSummary.allowed.map((item) => (
                                <li key={`allow-${item}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <em>제한</em>
                            {groupSummary.restricted.length > 0 ? (
                              <ul>
                                {groupSummary.restricted.map((item) => (
                                  <li key={`deny-${item}`}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="member-staff-new-perm-empty">제한 항목 없음</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="member-staff-new-placeholder">권한그룹을 선택하면 기본권한이 표시됩니다.</p>
                      )}
                    </div>

                    {isFieldScopeGroup ? (
                      <p className="member-staff-field-view-notice">
                        {isGuideGroup
                          ? "가이드는 본인 지정 행사/예약정보 조회 중심으로 권한이 적용되며, 개별 메뉴권한 설정은 사용하지 않습니다."
                          : "기사는 본인 지정 운행/행사정보 조회 중심으로 권한이 적용되며, 개별 메뉴권한 설정은 사용하지 않습니다."}
                      </p>
                    ) : (
                      <div className="member-staff-new-perm-individual">
                        <label className="member-staff-new-perm-toggle">
                          <input
                            type="checkbox"
                            checked={useIndividualPermission}
                            onChange={(e) => setUseIndividualPermission(e.target.checked)}
                          />
                          <span>이 관리자에게 개별권한 설정</span>
                          <em>{useIndividualPermission ? "사용" : "사용 안 함"}</em>
                        </label>

                        {!useIndividualPermission ? (
                          <p className="member-staff-new-group-hint">
                            기본값은 사용 안 함입니다. 사용 시에만 개별 권한표를 편집할 수 있습니다.
                          </p>
                        ) : (
                          <div className="member-staff-table-wrap member-staff-new-perm-table-wrap">
                            <table className="member-staff-table member-staff-individual-perm-table">
                              <thead>
                                <tr>
                                  <th>메뉴</th>
                                  <th>기본권한</th>
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
                                          onChange={(e) =>
                                            setIndividual(row.id, e.target.value as IndividualSettingValue)
                                          }
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
                        )}
                      </div>
                    )}
                  </div>
                ) : section.id === "scope" ? (
                  <div className="member-web-edit-form-body member-staff-new-form-body">
                    {isGuideGroup ? (
                      <>
                        <p className="member-staff-field-view-notice">
                          가이드는 본인에게 지정된 행사/예약정보 조회 중심으로 업무범위를 설정합니다.
                        </p>
                        <strong className="member-staff-new-scope-subtitle">가이드 업무설정</strong>
                        <div className="member-web-edit-form-grid member-web-edit-form-grid--3 member-staff-new-grid">
                          <div className="member-web-edit-field">
                            <span>가이드 활동여부</span>
                            <div className="member-staff-new-radio-row" role="radiogroup" aria-label="가이드 활동여부">
                              <label className="member-staff-new-radio">
                                <input
                                  type="radio"
                                  name="guide-active"
                                  checked={guideScope.active === "활동"}
                                  onChange={() => updateGuideScope("active", "활동")}
                                />
                                <span>활동</span>
                              </label>
                              <label className="member-staff-new-radio">
                                <input
                                  type="radio"
                                  name="guide-active"
                                  checked={guideScope.active === "비활동"}
                                  onChange={() => updateGuideScope("active", "비활동")}
                                />
                                <span>비활동</span>
                              </label>
                            </div>
                          </div>
                          <label className="member-web-edit-field">
                            <span>담당지역</span>
                            <input
                              value={guideScope.region}
                              onChange={(e) => updateGuideScope("region", e.target.value)}
                              placeholder="예: 제주, 부산"
                              aria-label="가이드 담당지역"
                            />
                          </label>
                          <label className="member-web-edit-field">
                            <span>가능언어</span>
                            <input
                              value={guideScope.languages}
                              onChange={(e) => updateGuideScope("languages", e.target.value)}
                              placeholder="예: 한국어, 영어"
                              aria-label="가능언어"
                            />
                          </label>
                          <label className="member-web-edit-field">
                            <span>가이드유형</span>
                            <select
                              value={guideScope.guideType}
                              onChange={(e) => updateGuideScope("guideType", e.target.value)}
                              aria-label="가이드유형"
                            >
                              <option value="">선택</option>
                              {GUIDE_TYPE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </>
                    ) : isDriverGroup ? (
                      <>
                        <p className="member-staff-field-view-notice">
                          기사는 본인에게 지정된 운행/행사정보 조회 중심으로 업무범위를 설정합니다.
                        </p>
                        <strong className="member-staff-new-scope-subtitle">기사 업무설정</strong>
                        <div className="member-web-edit-form-grid member-web-edit-form-grid--3 member-staff-new-grid">
                          <div className="member-web-edit-field">
                            <span>기사 활동여부</span>
                            <div className="member-staff-new-radio-row" role="radiogroup" aria-label="기사 활동여부">
                              <label className="member-staff-new-radio">
                                <input
                                  type="radio"
                                  name="driver-active"
                                  checked={driverScope.active === "활동"}
                                  onChange={() => updateDriverScope("active", "활동")}
                                />
                                <span>활동</span>
                              </label>
                              <label className="member-staff-new-radio">
                                <input
                                  type="radio"
                                  name="driver-active"
                                  checked={driverScope.active === "비활동"}
                                  onChange={() => updateDriverScope("active", "비활동")}
                                />
                                <span>비활동</span>
                              </label>
                            </div>
                          </div>
                          <label className="member-web-edit-field">
                            <span>차량종류</span>
                            <select
                              value={driverScope.vehicleType}
                              onChange={(e) => updateDriverScope("vehicleType", e.target.value)}
                              aria-label="차량종류"
                            >
                              <option value="">선택</option>
                              {VEHICLE_TYPE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="member-web-edit-field">
                            <span>차량번호</span>
                            <input
                              value={driverScope.vehicleNumber}
                              onChange={(e) => updateDriverScope("vehicleNumber", e.target.value)}
                              placeholder="예: 12가 3456"
                              aria-label="차량번호"
                            />
                          </label>
                          <label className="member-web-edit-field">
                            <span>운행가능지역</span>
                            <input
                              value={driverScope.serviceRegion}
                              onChange={(e) => updateDriverScope("serviceRegion", e.target.value)}
                              placeholder="예: 수도권, 강원"
                              aria-label="운행가능지역"
                            />
                          </label>
                          <label className="member-web-edit-field">
                            <span>연락처</span>
                            <input
                              value={driverScope.contact}
                              onChange={(e) => updateDriverScope("contact", e.target.value)}
                              placeholder="010-1234-5678"
                              inputMode="tel"
                              aria-label="기사 연락처"
                            />
                          </label>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="member-staff-new-group-hint member-staff-new-scope-lead">
                          일반 관리자/직원 업무범위 설정입니다.
                        </p>
                        <div className="member-web-edit-form-grid member-web-edit-form-grid--3 member-staff-new-grid">
                          <div className="member-web-edit-field">
                            <span>담당상품 범위</span>
                            <div className="member-staff-new-radio-row" role="radiogroup" aria-label="담당상품 범위">
                              <label className="member-staff-new-radio">
                                <input
                                  type="radio"
                                  name="product-scope"
                                  checked={generalScope.productScope === "전체상품"}
                                  onChange={() => updateGeneralScope("productScope", "전체상품")}
                                />
                                <span>전체상품</span>
                              </label>
                              <label className="member-staff-new-radio">
                                <input
                                  type="radio"
                                  name="product-scope"
                                  checked={generalScope.productScope === "지정상품"}
                                  onChange={() => updateGeneralScope("productScope", "지정상품")}
                                />
                                <span>지정상품</span>
                              </label>
                            </div>
                          </div>
                          <label className="member-web-edit-field">
                            <span>담당지역</span>
                            <select
                              value={generalScope.regionScope}
                              onChange={(e) =>
                                updateGeneralScope(
                                  "regionScope",
                                  e.target.value as GeneralScopeState["regionScope"],
                                )
                              }
                              aria-label="담당지역"
                            >
                              <option value="전체">전체</option>
                              <option value="국내">국내</option>
                              <option value="해외">해외</option>
                              <option value="지역 지정">지역 지정</option>
                            </select>
                          </label>
                          <label className="member-web-edit-field">
                            <span>담당 판매점</span>
                            <input
                              value={generalScope.sellers}
                              onChange={(e) => updateGeneralScope("sellers", e.target.value)}
                              placeholder="예: 전체 또는 판매점명"
                              aria-label="담당 판매점"
                            />
                          </label>
                          <label className="member-web-edit-field member-web-edit-field--span-2">
                            <span>담당 제휴여행사</span>
                            <input
                              value={generalScope.affiliates}
                              onChange={(e) => updateGeneralScope("affiliates", e.target.value)}
                              placeholder="예: 전체 또는 제휴여행사명"
                              aria-label="담당 제휴여행사"
                            />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </section>
            ))}

            <div className="member-web-edit-footer member-staff-new-footer">
              <button type="button" className="secondary" onClick={goList}>
                <X size={14} />
                취소
              </button>
              <button type="button" className="primary" onClick={handleRegister}>
                <Save size={14} />
                등록
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
