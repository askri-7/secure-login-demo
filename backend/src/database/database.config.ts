import { AccessToken, DefaultAzureCredential } from '@azure/identity';
import { Pool, PoolConfig } from 'pg';

const POSTGRES_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default';
const TOKEN_REFRESH_SKEW_MS = 60_000;

export type DatabaseAuthMode = 'entra' | 'password';

export function validateDatabaseConfiguration(): void {
  const mode = getDatabaseAuthMode();

  if (mode === 'entra') {
    const missing = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_PRINCIPAL'].filter(
      (name) => !process.env[name],
    );

    if (missing.length > 0) {
      throw new Error(
        `Missing required Entra database configuration: ${missing.join(', ')}`,
      );
    }

    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is required when DB_AUTH_MODE=password. This mode is for local development only.',
    );
  }
}

export function getDatabaseAuthMode(): DatabaseAuthMode {
  const mode = process.env.DB_AUTH_MODE ?? 'password';

  if (mode !== 'entra' && mode !== 'password') {
    throw new Error('DB_AUTH_MODE must be either entra or password');
  }

  if (process.env.NODE_ENV === 'production' && mode !== 'entra') {
    throw new Error(
      'Production requires DB_AUTH_MODE=entra. PostgreSQL password authentication is not supported in production.',
    );
  }

  return mode;
}

class EntraTokenProvider {
  private readonly credential = new DefaultAzureCredential();
  private cachedToken?: AccessToken;
  private refreshPromise?: Promise<string>;

  async getToken(): Promise<string> {
    const now = Date.now();
    if (
      this.cachedToken &&
      this.cachedToken.expiresOnTimestamp > now + TOKEN_REFRESH_SKEW_MS
    ) {
      return this.cachedToken.token;
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshToken();
    }

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = undefined;
    }
  }

  private async refreshToken(): Promise<string> {
    const token = await this.credential.getToken(POSTGRES_SCOPE);
    if (!token) {
      throw new Error(
        'Azure credential did not return a PostgreSQL access token',
      );
    }

    this.cachedToken = token;
    return token.token;
  }
}

export function createDatabasePool(): Pool {
  const mode = getDatabaseAuthMode();

  if (mode === 'password') {
    return new Pool({ connectionString: process.env.DATABASE_URL });
  }

  const tokenProvider = new EntraTokenProvider();
  const config: PoolConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_PRINCIPAL,
    password: () => tokenProvider.getToken(),
    ssl: {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
    },
    max: Number(process.env.DB_POOL_MAX ?? '20'),
    connectionTimeoutMillis: Number(process.env.DB_TIMEOUT ?? '10000'),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT ?? '30000'),
    statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT ?? '30000'),
  };

  return new Pool(config);
}
