import { DefaultAzureCredential } from '@azure/identity';
import { spawn } from 'node:child_process';

const POSTGRES_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required database configuration: ${name}`);
  }

  return value;
}

async function main(): Promise<void> {
  const token = await new DefaultAzureCredential().getToken(POSTGRES_SCOPE);
  if (!token) {
    throw new Error('Azure credential did not return a PostgreSQL access token');
  }

  const user = encodeURIComponent(required('DB_PRINCIPAL'));
  const password = encodeURIComponent(token.token);
  const host = required('DB_HOST');
  const port = process.env.DB_PORT ?? '5432';
  const database = encodeURIComponent(required('DB_NAME'));

  process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${database}`;

  const child = spawn('prisma', process.argv.slice(2), {
    env: process.env,
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exitCode = code ?? 1;
  });
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Prisma command failed',
  );
  process.exitCode = 1;
});