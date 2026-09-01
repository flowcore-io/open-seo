const POSTGRES_URL_ERROR =
  "DATABASE_PROVIDER=postgres requires a HYPERDRIVE binding or POSTGRES_DATABASE_URL.";

export function resolvePostgresConnectionString(input: {
  hyperdriveConnectionString?: string | null;
  databaseUrl?: string | null;
}): string {
  const hyperdrive = input.hyperdriveConnectionString?.trim();
  if (hyperdrive) {
    return hyperdrive;
  }

  const databaseUrl = input.databaseUrl?.trim();
  if (databaseUrl) {
    return databaseUrl;
  }

  throw new Error(POSTGRES_URL_ERROR);
}

export function usesHyperdrivePooling(input: {
  hyperdriveConnectionString?: string | null;
}): boolean {
  return Boolean(input.hyperdriveConnectionString?.trim());
}
