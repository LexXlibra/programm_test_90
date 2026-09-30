import { describe, expect, it } from "vitest";
import { isRateLimited } from "@/server/security/rate-limit";

describe("in-process API rate limiter",()=>{
  it("allows the configured count and blocks additional calls until the window expires",()=>{
    const key=`test-${crypto.randomUUID()}`;
    expect(isRateLimited(key,2,1000,100)).toBe(false);
    expect(isRateLimited(key,2,1000,101)).toBe(false);
    expect(isRateLimited(key,2,1000,102)).toBe(true);
    expect(isRateLimited(key,2,1000,1100)).toBe(false);
  });
});
