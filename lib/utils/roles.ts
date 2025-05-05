import type { RoleLevel } from "@/types/roles";

export function isTechnical(level: RoleLevel): boolean {
  return level >= 0 && level < 10;
}

export function isManager(level: RoleLevel): boolean {
  return level >= 10 && level < 20;
}

export function isStandard(level: RoleLevel): boolean {
  return level >= 20 && level < 30;
}
