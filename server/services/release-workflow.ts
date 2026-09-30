import type { ReleaseStatus, Role } from "@/generated/prisma/client";
import { canManageReleases } from "../permissions/rbac";

const transitions: Record<ReleaseStatus, readonly ReleaseStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["IN_REVIEW", "REJECTED"],
  IN_REVIEW: ["CHANGES_REQUESTED", "APPROVED", "REJECTED"],
  CHANGES_REQUESTED: ["RESUBMITTED", "REJECTED"],
  RESUBMITTED: ["IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"],
  APPROVED: ["READY_FOR_DISTRIBUTION", "SCHEDULED", "REJECTED"],
  READY_FOR_DISTRIBUTION: ["DISTRIBUTED", "SCHEDULED", "REJECTED"],
  DISTRIBUTED: ["SCHEDULED", "RELEASED"],
  SCHEDULED: ["RELEASED", "REJECTED"],
  RELEASED: [],
  REJECTED: [],
};

export function allowedReleaseTransitions(status: ReleaseStatus): readonly ReleaseStatus[] {
  return transitions[status];
}

export function assertReleaseTransition(from: ReleaseStatus, to: ReleaseStatus, role: Role): void {
  const managerOnlyTargets: ReleaseStatus[] = ["IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "READY_FOR_DISTRIBUTION", "DISTRIBUTED", "SCHEDULED", "RELEASED", "REJECTED"];
  if (managerOnlyTargets.includes(to) && !canManageReleases(role)) throw new Error("FORBIDDEN");
  if (!transitions[from].includes(to)) throw new Error("INVALID_RELEASE_TRANSITION");
}
