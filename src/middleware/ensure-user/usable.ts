import { getAuth, hasUsableAuthConfig } from "@/lib/auth";
import { AppError } from "@/server/lib/errors";
import { resolveSharedWorkspaceContext } from "./delegated";
import type { EnsuredUserContext } from "./types";

export async function resolveUsableContext(
  headers: Headers,
): Promise<EnsuredUserContext> {
  if (!hasUsableAuthConfig()) {
    throw new AppError(
      "AUTH_CONFIG_MISSING",
      "Missing Usable OIDC configuration",
    );
  }

  const session = await getAuth().api.getSession({ headers });
  if (!session?.user?.id || !session.user.email) {
    throw new AppError("UNAUTHENTICATED");
  }

  return resolveSharedWorkspaceContext(session.user.id, session.user.email);
}
