import https from 'https';

const DEFAULT_WORLD_API_BASE_URL = 'https://developer.world.org';

interface WorldUserOperationApiResponse {
  userOpHash?: string;
  transaction_hash?: string;
  status?: string;
  sender?: string;
  nonce?: string;
  message?: string;
}

export interface WorldUserOperationStatus {
  userOpHash: string;
  transactionHash?: string;
  transactionStatus: 'pending' | 'mined' | 'failed';
  sender?: string;
  nonce?: string;
  rawStatus?: string;
}

function resolveWorldApiBaseUrl() {
  return (process.env.WORLD_APP_API_BASE_URL || DEFAULT_WORLD_API_BASE_URL).replace(/\/$/, '');
}

function getJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const chunks: Buffer[] = [];

      response.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const parsed = body ? JSON.parse(body) : {};

        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          const message = typeof parsed?.message === 'string' ? parsed.message : `HTTP ${response.statusCode || 500}`;
          reject(new Error(message));
          return;
        }

        resolve(parsed as T);
      });
    });

    request.on('error', reject);
  });
}

export async function getWorldUserOperationStatus(userOpHash: string): Promise<WorldUserOperationStatus> {
  const normalizedHash = userOpHash.trim();

  if (!normalizedHash) {
    throw new Error('A valid userOpHash is required');
  }

  const baseUrl = resolveWorldApiBaseUrl();
  const response = await getJson<WorldUserOperationApiResponse>(
    `${baseUrl}/api/v2/minikit/userop/${encodeURIComponent(normalizedHash)}`
  );

  const rawStatus = (response.status || '').toLowerCase();
  const transactionStatus =
    rawStatus === 'success'
      ? 'mined'
      : rawStatus === 'failed'
        ? 'failed'
        : 'pending';

  return {
    userOpHash: response.userOpHash || normalizedHash,
    transactionHash: response.transaction_hash,
    transactionStatus,
    sender: response.sender,
    nonce: response.nonce,
    rawStatus,
  };
}
