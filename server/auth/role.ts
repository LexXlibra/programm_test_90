import type { Role } from "@/generated/prisma/client";

export function asRole(value: string): Role {
  if (value === "ADMIN" || value === "MANAGER" || value === "USER") return value;
  return "USER";
}
