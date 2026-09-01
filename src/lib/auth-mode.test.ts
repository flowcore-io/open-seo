import { describe, expect, it } from "vitest";
import { isSessionAuthMode } from "./auth-mode";

describe("isSessionAuthMode", () => {
  it.each([
    ["hosted", true],
    ["usable", true],
    ["cloudflare_access", false],
    ["local_noauth", false],
  ] as const)("classifies %s", (mode, expected) => {
    expect(isSessionAuthMode(mode)).toBe(expected);
  });
});
