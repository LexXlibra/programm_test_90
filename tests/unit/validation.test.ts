import { describe, expect, it } from "vitest";
import { releaseDraftSchema } from "@/server/validation/release";

describe("release draft validation", () => {
  it("normalizes optional release fields and requires a title", () => {
    expect(releaseDraftSchema.parse({ title: " Blue Hour ", type: "EP", explicit: false })).toMatchObject({ title: "Blue Hour", type: "EP" });
    expect(releaseDraftSchema.safeParse({ title: "", type: "EP" }).success).toBe(false);
    expect(releaseDraftSchema.safeParse({ title: "ok", type: "MIXTAPE" }).success).toBe(false);
    expect(releaseDraftSchema.safeParse({ title: "ok", type: "SINGLE", unexpected: true }).success).toBe(false);
  });
});
