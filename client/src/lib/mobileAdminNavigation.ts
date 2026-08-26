export type MobileAdminRole = "admin" | "pc_admin" | "user" | undefined;

export function mobileAdminQuickPaths(role: MobileAdminRole) {
  return role === "admin" ? ["/", "/review", "/activities"] : ["/", "/review", "/participants"];
}
