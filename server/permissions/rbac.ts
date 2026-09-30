import type { Role } from "@/generated/prisma/client";

export function canManageReleases(role: Role): boolean {
  return role === "MANAGER" || role === "ADMIN";
}

export function canAdminister(role: Role): boolean {
  return role === "ADMIN";
}

export function canAccessRelease(role: Role, ownerId: string, userId: string): boolean {
  return canManageReleases(role) || ownerId === userId;
}
