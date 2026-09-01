import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import {
  readUsableOidcConfig,
  tokenHasGroup,
  usableUserFromTokens,
} from "./usable-oidc";

const secret = new TextEncoder().encode("test-secret-test-secret-test-secret");

async function jwt(payload: Record<string, unknown>) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).sign(secret);
}

describe("readUsableOidcConfig", () => {
  it("returns null without client credentials", () => {
    expect(readUsableOidcConfig({})).toBeNull();
  });

  it("defaults the memory-mesh issuer", () => {
    const config = readUsableOidcConfig({
      USABLE_OIDC_CLIENT_ID: "app-id",
      USABLE_OIDC_CLIENT_SECRET: "secret",
    });
    expect(config?.issuer).toBe("https://auth.flowcore.io/realms/memory-mesh");
    expect(config?.scopes).toContain("offline_access");
  });
});

describe("tokenHasGroup", () => {
  it("matches groups and realm roles", () => {
    expect(
      tokenHasGroup(
        { groups: ["/app-marketplace-abc-users"] },
        "/app-marketplace-abc-users",
      ),
    ).toBe(true);
    expect(
      tokenHasGroup(
        { realm_access: { roles: ["/app-marketplace-abc-users"] } },
        "/app-marketplace-abc-users",
      ),
    ).toBe(true);
    expect(
      tokenHasGroup({ groups: ["/other"] }, "/app-marketplace-abc-users"),
    ).toBe(false);
  });
});

describe("usableUserFromTokens", () => {
  const config = {
    issuer: "https://auth.flowcore.io/realms/memory-mesh",
    clientId: "app-id",
    clientSecret: "secret",
    scopes: ["openid"],
  };

  it("uses the usable-user-id claim", async () => {
    const idToken = await jwt({
      "usable-user-id": "11111111-1111-1111-1111-111111111111",
      sub: "keycloak-sub",
      email: "julius@usable.dev",
      name: "Julius",
    });
    expect(usableUserFromTokens({ idToken }, config)).toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
      email: "julius@usable.dev",
      emailVerified: true,
    });
  });

  it("rejects a missing required group", async () => {
    const idToken = await jwt({
      sub: "11111111-1111-1111-1111-111111111111",
      email: "julius@usable.dev",
      groups: ["/other"],
    });
    expect(() =>
      usableUserFromTokens(
        { idToken },
        { ...config, requiredGroup: "/app-marketplace-abc-users" },
      ),
    ).toThrow(/not installed/);
  });
});
