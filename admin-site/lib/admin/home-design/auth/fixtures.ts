import {
  ALL_HOME_DESIGN_PERMISSIONS,
  type HomeDesignPermission,
  type HomeDesignRole,
} from "../../../../../packages/home-design-contract/src/permissions.ts";

export type HomeDesignDevUser = {
  userId: string;
  loginId: string;
  password: string;
  displayName: string;
  agencyId: string;
  agencyName: string;
  role: HomeDesignRole;
  permissions: HomeDesignPermission[];
  allowedSiteCodes: string[];
  /** 플랫폼 범위 권한이 명시적으로 부여된 경우에만 true */
  platformScope: boolean;
};

const READ_PREVIEW: HomeDesignPermission[] = ["home_design.read", "home_design.preview"];
const EDITOR: HomeDesignPermission[] = [
  "home_design.read",
  "home_design.edit",
  "home_design.draft_save",
  "home_design.preview",
];
const AGENCY_FULL: HomeDesignPermission[] = [...ALL_HOME_DESIGN_PERMISSIONS];

/** 개발·테스트 전용 fixture. 운영 계정과 연결되지 않는다. */
export const HOME_DESIGN_DEV_USERS: HomeDesignDevUser[] = [
  {
    userId: "dev-platform-1",
    loginId: "platform",
    password: "dev-platform!",
    displayName: "플랫폼 관리자 (개발)",
    agencyId: "platform",
    agencyName: "AOS Platform",
    role: "platform_admin",
    permissions: [...ALL_HOME_DESIGN_PERMISSIONS],
    allowedSiteCodes: ["OY01470", "AOS01005"],
    platformScope: true,
  },
  {
    userId: "dev-oy-master-1",
    loginId: "oy-master",
    password: "dev-oy-master!",
    displayName: "애비아넥스트 최고관리자 (개발)",
    agencyId: "OY01470",
    agencyName: "애비아넥스트 샘플",
    role: "agency_master",
    permissions: [...AGENCY_FULL],
    allowedSiteCodes: ["OY01470"],
    platformScope: false,
  },
  {
    userId: "dev-oy-editor-1",
    loginId: "oy-editor",
    password: "dev-oy-editor!",
    displayName: "애비아넥스트 편집자 (개발)",
    agencyId: "OY01470",
    agencyName: "애비아넥스트 샘플",
    role: "agency_admin",
    permissions: [...EDITOR],
    allowedSiteCodes: ["OY01470"],
    platformScope: false,
  },
  {
    userId: "dev-oy-staff-1",
    loginId: "oy-staff",
    password: "dev-oy-staff!",
    displayName: "애비아넥스트 직원 (개발)",
    agencyId: "OY01470",
    agencyName: "애비아넥스트 샘플",
    role: "staff",
    permissions: [...READ_PREVIEW],
    allowedSiteCodes: ["OY01470"],
    platformScope: false,
  },
  {
    userId: "dev-happy-master-1",
    loginId: "happy-master",
    password: "dev-happy!",
    displayName: "해피투어 최고관리자 (개발)",
    agencyId: "AOS01005",
    agencyName: "해피투어 샘플",
    role: "agency_master",
    permissions: [...AGENCY_FULL],
    allowedSiteCodes: ["AOS01005"],
    platformScope: false,
  },
];

export function findHomeDesignDevUser(loginId: string): HomeDesignDevUser | null {
  const normalized = loginId.trim().toLowerCase();
  if (!normalized) return null;
  return HOME_DESIGN_DEV_USERS.find((user) => user.loginId.toLowerCase() === normalized) ?? null;
}

export function validateHomeDesignDevLogin(loginId: string, password: string) {
  const user = findHomeDesignDevUser(loginId);
  if (!user) return { ok: false as const, message: "개발용 계정을 찾을 수 없습니다." };
  if (password !== user.password) return { ok: false as const, message: "비밀번호가 올바르지 않습니다." };
  return { ok: true as const, user };
}
