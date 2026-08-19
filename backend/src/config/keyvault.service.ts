import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

const SECRET_MAP: Record<string, string> = {
  'db-password': 'DATABASE_URL_PASSWORD',
  'jwt-secret': 'JWT_SECRET',
  'admin-password': 'ADMIN_PASSWORD',
  'github-client-secret': 'GITHUB_CLIENT_SECRET',
  'google-client-secret': 'GOOGLE_CLIENT_SECRET',
};

export async function loadSecretsFromKeyVault(): Promise<Record<string, string>> {
  const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
  if (!vaultUrl) {
    console.log('No AZURE_KEY_VAULT_URL set, skipping Key Vault');
    return {};
  }

  console.log('Loading secrets from Azure Key Vault...');
  const credential = new DefaultAzureCredential();
  const client = new SecretClient(vaultUrl, credential);

  const secrets: Record<string, string> = {};

  for (const [kvName, envName] of Object.entries(SECRET_MAP)) {
    try {
      const secret = await client.getSecret(kvName);
      secrets[envName] = secret.value || '';
      console.log(`Loaded secret: ${kvName}`);
    } catch (err) {
      console.error(`Failed to load secret ${kvName}:`, err);
      throw new Error(`Required secret ${kvName} not found in Key Vault`);
    }
  }

  return secrets;
}