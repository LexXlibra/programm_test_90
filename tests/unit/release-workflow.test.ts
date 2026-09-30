import { describe, expect, it } from "vitest";
import { allowedReleaseTransitions, assertReleaseTransition } from "@/server/services/release-workflow";

describe("release workflow", () => {
  it("only permits declared transitions", () => {
    expect(allowedReleaseTransitions("DRAFT")).toEqual(["SUBMITTED"]);
    expect(() => assertReleaseTransition("DRAFT", "SUBMITTED", "USER")).not.toThrow();
    expect(() => assertReleaseTransition("DRAFT", "APPROVED", "ADMIN")).toThrow("INVALID_RELEASE_TRANSITION");
    expect(() => assertReleaseTransition("RELEASED", "DRAFT", "ADMIN")).toThrow("INVALID_RELEASE_TRANSITION");
  });

  it("restricts moderation transitions to label staff", () => {
    expect(() => assertReleaseTransition("IN_REVIEW", "APPROVED", "USER")).toThrow("FORBIDDEN");
    expect(() => assertReleaseTransition("IN_REVIEW", "APPROVED", "MANAGER")).not.toThrow();
    expect(() => assertReleaseTransition("CHANGES_REQUESTED", "RESUBMITTED", "USER")).not.toThrow();
  });
});
