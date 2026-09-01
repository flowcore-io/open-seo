import { decodeJwt } from "jose";
import { APIError } from "better-auth/api";

export const USABLE_OAUTH_PROVIDER_ID = "usable";
const DEFAULT_USABLE_OIDC_ISSUER =
  "https://auth.flowcore.io/realms/memory-mesh";
const DEFAULT_SCOPES = ["openid", "profile", "email", "offline_access"];

type EnvRecord = Record<string, string | undefined>;

type UsableOidcConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  requiredGroup?: string;
  scopes: string[];
};

function read(env: EnvRecord, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function parseScopes(value: string | undefined): string[] {
  if (!value) {
    return DEFAULT_SCOPES;
  }
  const scopes = value.split(/[,\s]+/).filter(Boolean);
  return scopes.length > 0 ? scopes : DEFAULT_SCOPES;
}

export function readUsableOidcConfig(env: EnvRecord): UsableOidcConfig | null {
  const clientId = read(env, "USABLE_OIDC_CLIENT_ID");
  const clientSecret = read(env, "USABLE_OIDC_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    issuer: read(env, "USABLE_OIDC_ISSUER") ?? DEFAULT_USABLE_OIDC_ISSUER,
    clientId,
    clientSecret,
    requiredGroup: read(env, "USABLE_OIDC_REQUIRED_GROUP"),
    scopes: parseScopes(read(env, "USABLE_OIDC_SCOPES")),
  };
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string" && value) {
    return [value];
  }
  return [];
}

export function tokenHasGroup(
  payload: Record<string, unknown>,
  group: string,
): boolean {
  const realmAccess = payload.realm_access;
  const realmRoles =
    realmAccess && typeof realmAccess === "object"
      ? stringList((realmAccess as { roles?: unknown }).roles)
      : [];
  return [...stringList(payload.groups), ...realmRoles].includes(group);
}

function claimString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value ? value : undefined;
}

function decodeClaims(token: string | undefined): Record<string, unknown> {
  if (!token) {
    return {};
  }
  try {
    return decodeJwt(token) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function usableUserFromTokens(
  tokens: { idToken?: string; accessToken?: string },
  config: UsableOidcConfig,
) {
  const idClaims = decodeClaims(tokens.idToken);
  const accessClaims = decodeClaims(tokens.accessToken);
  if (
    config.requiredGroup &&
    !tokenHasGroup(idClaims, config.requiredGroup) &&
    !tokenHasGroup(accessClaims, config.requiredGroup)
  ) {
    throw new APIError("FORBIDDEN", {
      message: "Usable app is not installed for this user.",
    });
  }

  const userId =
    claimString(idClaims, "usable-user-id") ??
    claimString(idClaims, "sub") ??
    claimString(accessClaims, "usable-user-id") ??
    claimString(accessClaims, "sub");
  const email =
    claimString(idClaims, "email") ?? claimString(accessClaims, "email");
  if (!userId || !email) {
    throw new APIError("UNAUTHORIZED", {
      message: "Usable token is missing user id or email.",
    });
  }

  return {
    id: userId,
    email,
    name:
      claimString(idClaims, "name") ??
      claimString(idClaims, "preferred_username") ??
      email.split("@")[0],
    emailVerified: true,
  };
}

export function createUsableOAuthConfig(config: UsableOidcConfig) {
  return {
    providerId: USABLE_OAUTH_PROVIDER_ID,
    discoveryUrl: `${config.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`,
    issuer: config.issuer,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    scopes: config.scopes,
    pkce: true,
    accessType: "offline",
    getUserInfo: async (tokens: { idToken?: string; accessToken?: string }) =>
      usableUserFromTokens(
        {
          idToken: tokens.idToken,
          accessToken: tokens.accessToken,
        },
        config,
      ),
  };
}
