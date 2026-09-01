import { describe, expect, it } from "vitest";
import {
  resolvePostgresConnectionString,
  usesHyperdrivePooling,
} from "./postgres-connection";

describe("resolvePostgresConnectionString", () => {
  it("prefers Hyperdrive over POSTGRES_DATABASE_URL", () => {
    expect(
      resolvePostgresConnectionString({
        hyperdriveConnectionString: "postgres://hyperdrive/db",
        databaseUrl: "postgres://direct/db",
      }),
    ).toBe("postgres://hyperdrive/db");
  });

  it("falls back to POSTGRES_DATABASE_URL", () => {
    expect(
      resolvePostgresConnectionString({
        databaseUrl: " postgres://openseo:openseo@db:5432/openseo ",
      }),
    ).toBe("postgres://openseo:openseo@db:5432/openseo");
  });

  it("rejects postgres mode with neither source", () => {
    expect(() => resolvePostgresConnectionString({})).toThrow(
      /HYPERDRIVE binding or POSTGRES_DATABASE_URL/,
    );
  });
});

describe("usesHyperdrivePooling", () => {
  it("is true only when Hyperdrive has a connection string", () => {
    expect(
      usesHyperdrivePooling({
        hyperdriveConnectionString: "postgres://hyperdrive/db",
      }),
    ).toBe(true);
    expect(usesHyperdrivePooling({})).toBe(false);
    expect(usesHyperdrivePooling({ hyperdriveConnectionString: "  " })).toBe(
      false,
    );
  });
});
