import { beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({
  databaseProvider: "postgres" as "d1" | "postgres",
  hyperdrive: false,
}));

const createdClients = vi.hoisted(() => [] as { id: symbol }[]);

const postgresFactory = vi.hoisted(() =>
  vi.fn((_connectionString: string, _options: { max: number }) => {
    const client = { id: Symbol("sql") };
    createdClients.push(client);
    return client as unknown;
  }),
);

vi.mock("postgres", () => ({ default: postgresFactory }));

vi.mock("@/db/provider", () => ({
  getDatabaseProvider: () => provider.databaseProvider,
  getPostgresConnectionString: () => "postgres://openseo@db:5432/openseo",
  usesHyperdrivePostgres: () => provider.hyperdrive,
}));

vi.mock("./retry", () => ({
  withQueryRetries: (sql: unknown) => sql,
}));

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: (sql: unknown) => ({ sql }),
}));

const { withPgClient } = await import("./client");

describe("withPgClient", () => {
  beforeEach(() => {
    provider.databaseProvider = "postgres";
    provider.hyperdrive = false;
    createdClients.length = 0;
    postgresFactory.mockClear();
  });

  // The self-host image runs on workerd, which refuses to reuse a socket
  // created by an earlier request ("Cannot perform I/O on behalf of a
  // different request"). A client cached across scopes broke every query
  // after the first one.
  it("creates a new client for each scope without Hyperdrive", async () => {
    await withPgClient(async () => undefined);
    await withPgClient(async () => undefined);

    expect(postgresFactory).toHaveBeenCalledTimes(2);
    expect(createdClients).toHaveLength(2);
    expect(createdClients[0]).not.toBe(createdClients[1]);
  });

  it("creates a new client for each scope with Hyperdrive", async () => {
    provider.hyperdrive = true;

    await withPgClient(async () => undefined);
    await withPgClient(async () => undefined);

    expect(createdClients).toHaveLength(2);
    expect(createdClients[0]).not.toBe(createdClients[1]);
  });

  it("uses one connection behind Hyperdrive and a small pool without it", async () => {
    await withPgClient(async () => undefined);
    expect(postgresFactory.mock.calls[0]?.[1]).toMatchObject({ max: 10 });

    provider.hyperdrive = true;
    await withPgClient(async () => undefined);
    expect(postgresFactory.mock.calls[1]?.[1]).toMatchObject({ max: 1 });
  });

  it("reuses the ambient client for nested scopes", async () => {
    await withPgClient(async () => {
      await withPgClient(async () => undefined);
    });

    expect(createdClients).toHaveLength(1);
  });

  it("creates no client in d1 mode", async () => {
    provider.databaseProvider = "d1";

    await withPgClient(async () => undefined);

    expect(createdClients).toHaveLength(0);
  });
});
