import { describe, expect, it } from "vitest";
import { isHostedAuthMode, isSessionAuthMode } from "@/lib/auth-mode";
import { shouldRenderAuthenticatedShell } from "./useHostedAuthRouteGuard";

describe("shouldRenderAuthenticatedShell", () => {
  // /oauth-consent lives under the authenticated shell. Gating the shell on
  // hosted mode alone rendered a blank consent page on an AUTH_MODE=usable
  // deployment, so no MCP client could approve access.
  it("renders for a verified session in a session mode", () => {
    expect(
      shouldRenderAuthenticatedShell({
        isSessionMode: true,
        canRenderAuthenticatedContent: true,
      }),
    ).toBe(true);
  });

  it("stays blank while a session mode has no renderable session", () => {
    expect(
      shouldRenderAuthenticatedShell({
        isSessionMode: true,
        canRenderAuthenticatedContent: false,
      }),
    ).toBe(false);
  });

  it("stays blank outside the session modes", () => {
    expect(
      shouldRenderAuthenticatedShell({
        isSessionMode: false,
        canRenderAuthenticatedContent: true,
      }),
    ).toBe(false);
  });

  it("treats usable as a session mode but not a hosted one", () => {
    expect(isSessionAuthMode("usable")).toBe(true);
    expect(isHostedAuthMode("usable")).toBe(false);
    expect(isSessionAuthMode("hosted")).toBe(true);
    expect(isSessionAuthMode("cloudflare_access")).toBe(false);
  });
});
