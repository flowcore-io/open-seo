import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getAuth, hasHostedAuthConfig, hasUsableAuthConfig } from "@/lib/auth";
import {
  isHostedAuthMode,
  isSessionAuthMode,
  isUsableAuthMode,
} from "@/lib/auth-mode";

async function handleAuthRequest(request: Request) {
  if (!isSessionAuthMode(env.AUTH_MODE)) {
    return new Response("Not found", {
      status: 404,
    });
  }

  if (isHostedAuthMode(env.AUTH_MODE) && !hasHostedAuthConfig()) {
    return new Response("Missing Better Auth hosted configuration", {
      status: 500,
    });
  }

  if (isUsableAuthMode(env.AUTH_MODE) && !hasUsableAuthConfig()) {
    return new Response("Missing Usable OIDC configuration", {
      status: 500,
    });
  }

  const auth = getAuth();
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return handleAuthRequest(request);
      },
      POST: async ({ request }: { request: Request }) => {
        return handleAuthRequest(request);
      },
    },
  },
});
