import { describe, expect, it } from "vitest";
import { canAccessRelease, canAdminister, canManageReleases } from "@/server/permissions/rbac";

describe("server role checks", () => {
  it("allows users to see only their own release", () => {
    expect(canAccessRelease("USER", "owner", "owner")).toBe(true);
    expect(canAccessRelease("USER", "other", "owner")).toBe(false);
  });

  it("allows managers to review and admins to administer", () => {
    expect(canManageReleases("MANAGER")).toBe(true);
    expect(canManageReleases("ADMIN")).toBe(true);
    expect(canManageReleases("USER")).toBe(false);
    expect(canAdminister("ADMIN")).toBe(true);
    expect(canAdminister("MANAGER")).toBe(false);
  });
});
