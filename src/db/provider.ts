import { env } from "cloudflare:workers";
import {
  resolvePostgresConnectionString,
  usesHyperdrivePooling,
} from "./postgres-connection";

type DatabaseProvider = "d1" | "postgres";

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function hyperdriveConnectionString(): string | undefined {
  const hyperdrive = Reflect.get(env, "HYPERDRIVE") as
    | { connectionString?: string }
    | undefined;
  return readString(hyperdrive?.connectionString);
}

function directPostgresUrl(): string | undefined {
  return (
    readString(
      typeof process !== "undefined"
        ? process.env.POSTGRES_DATABASE_URL
        : undefined,
    ) ?? readString(Reflect.get(env, "POSTGRES_DATABASE_URL"))
  );
}

export function getDatabaseProvider(): DatabaseProvider {
  const provider =
    readString(
      typeof process !== "undefined"
        ? process.env.DATABASE_PROVIDER
        : undefined,
    ) ?? Reflect.get(env, "DATABASE_PROVIDER");

  if (provider === "postgres") {
    return "postgres";
  }

  if (provider === "d1" || provider === undefined || provider === "") {
    return "d1";
  }

  throw new Error(
    `Unsupported DATABASE_PROVIDER "${String(provider)}". Expected "d1" or "postgres".`,
  );
}

export function getPostgresConnectionString() {
  return resolvePostgresConnectionString({
    hyperdriveConnectionString: hyperdriveConnectionString(),
    databaseUrl: directPostgresUrl(),
  });
}

export function usesHyperdrivePostgres(): boolean {
  return usesHyperdrivePooling({
    hyperdriveConnectionString: hyperdriveConnectionString(),
  });
}
