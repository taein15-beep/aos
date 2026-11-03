/** 홈페이지 디자인 기능 권한. 역할명만으로 접근을 허용하지 않는다. */
export const HOME_DESIGN_PERMISSIONS = [
  "home_design.read",
  "home_design.edit",
  "home_design.draft_save",
  "home_design.preview",
  "home_design.publish_dev",
  "home_design.restore",
  "home_design.media_manage",
] as const;

export type HomeDesignPermission = (typeof HOME_DESIGN_PERMISSIONS)[number];

export const HOME_DESIGN_ROLES = ["platform_admin", "agency_master", "agency_admin", "staff"] as const;
export type HomeDesignRole = (typeof HOME_DESIGN_ROLES)[number];

export const ALL_HOME_DESIGN_PERMISSIONS: HomeDesignPermission[] = [...HOME_DESIGN_PERMISSIONS];

export function isHomeDesignPermission(value: string): value is HomeDesignPermission {
  return (HOME_DESIGN_PERMISSIONS as readonly string[]).includes(value);
}

export function hasHomeDesignPermission(
  permissions: readonly string[] | null | undefined,
  required: HomeDesignPermission,
): boolean {
  return Array.isArray(permissions) && permissions.includes(required);
}
