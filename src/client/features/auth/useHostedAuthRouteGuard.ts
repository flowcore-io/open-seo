import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import {
  isEmailVerificationBypassed,
  isHostedClientAuthMode,
  isSessionClientAuthMode,
} from "@/lib/auth-mode";
import {
  getCurrentAuthRedirectFromHref,
  getSignInSearch,
  getVerifyEmailSearch,
} from "@/lib/auth-redirect";

// The authenticated shell renders in the session modes — hosted AND usable.
// Gating it on hosted alone left every route under the shell, /oauth-consent
// above all, blank on an AUTH_MODE=usable deployment.
export function shouldRenderAuthenticatedShell(gate: {
  isSessionMode: boolean;
  canRenderAuthenticatedContent: boolean;
}) {
  return gate.isSessionMode && gate.canRenderAuthenticatedContent;
}

export function useHostedAuthRouteGuard() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const isHostedMode = isHostedClientAuthMode();
  const isSessionMode = isSessionClientAuthMode();
  const emailVerified =
    session?.user?.emailVerified === true ||
    isEmailVerificationBypassed() ||
    !isHostedMode;

  useEffect(() => {
    if (isPending || !isSessionMode) {
      return;
    }

    const redirectTo = getCurrentAuthRedirectFromHref(window.location.href);

    if (!session?.user?.id) {
      void navigate({
        to: "/sign-in",
        search: getSignInSearch(redirectTo),
        replace: true,
      });
      return;
    }

    if (isHostedMode && !emailVerified) {
      void navigate({
        to: "/verify-email",
        search: getVerifyEmailSearch(session.user.email, redirectTo),
        replace: true,
      });
    }
  }, [
    isPending,
    isSessionMode,
    isHostedMode,
    emailVerified,
    session?.user?.email,
    session?.user?.id,
    navigate,
  ]);

  const hasVerifiedSession =
    !isPending &&
    Boolean(session?.user?.id) &&
    (!isHostedMode || emailVerified);

  return {
    isHostedMode,
    isSessionMode,
    canRenderAuthenticatedContent: !isSessionMode || hasVerifiedSession,
  };
}
