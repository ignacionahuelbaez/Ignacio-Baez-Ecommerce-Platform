import type { PoolConfig } from 'pg';

// SSL is environment-driven, not guessed from NODE_ENV:
// - DATABASE_SSL=false (or unset) -> no SSL (local Docker/Postgres, which doesn't speak TLS)
// - DATABASE_SSL=true             -> SSL required; DATABASE_SSL_REJECT_UNAUTHORIZED controls
//                                    certificate validation (default true; set to false only
//                                    for providers with self-signed certs, e.g. some managed PG).
// Shared by the app's PrismaService and the standalone seed script so both connect consistently.
export function resolveSsl(): PoolConfig['ssl'] {
  const sslEnabled = ['true', '1'].includes((process.env.DATABASE_SSL ?? '').trim().toLowerCase());

  if (!sslEnabled) {
    return false;
  }

  const rejectUnauthorized =
    (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? 'true').trim().toLowerCase() !== 'false';

  return { rejectUnauthorized };
}
