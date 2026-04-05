import type {
  ContextualScoreApiResponse,
  EvidenceProject,
  EvidenceUploadDraft,
  Review,
  ScoreComponents,
  User,
  WorkerProfile,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface VerifyWorldIdResponse {
  success: boolean;
  user: User;
  isNewUser: boolean;
  token: string;
}

interface MeResponse {
  user: User;
}

interface UpdateProfileResponse {
  success: boolean;
  user: User;
}

interface IngestionResponse {
  success: boolean;
  overall_trust_score: number;
  score_components: ScoreComponents;
  computed_skills: string[];
  specializations: string[];
  years_experience: number | null;
  warning?: string | null;
}

interface ReputationResponse {
  user: User;
  profile: WorkerProfile | null;
  reviews: Review[];
  totalStaked: number;
  stakerCount: number;
}

interface SaveEvidenceResponse {
  success: boolean;
  profile: WorkerProfile;
  warning?: string | null;
}

interface EvidenceUploadResponse {
  success: boolean;
  draft: EvidenceUploadDraft;
}

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error ${response.status}`);
  }

  return response.json();
}

async function fetchFormApi<T>(endpoint: string, formData: FormData, token?: string): Promise<T> {
  const headers: HeadersInit = {};

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.message || error.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

// Auth
export const verifyWorldId = (proof: any) =>
  fetchApi<VerifyWorldIdResponse>(
    '/api/auth/verify',
    { method: 'POST', body: JSON.stringify(proof) }
  );

export const getMe = (token: string) =>
  fetchApi<MeResponse>('/api/auth/me', { token });

export const updateProfile = (
  data: { display_name: string; roles: string[]; profession_category: string },
  token: string
) =>
  fetchApi<UpdateProfileResponse>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
    token,
  });

export const createWalletChallenge = (walletAddress: string, token: string) =>
  fetchApi<{
    challenge: string;
    nonce: string;
    expires_at: string;
  }>('/api/auth/wallet/challenge', {
    method: 'POST',
    body: JSON.stringify({ wallet_address: walletAddress }),
    token,
  });

export const verifyWalletSignature = (
  data: { wallet_address: string; message: string; signature: string; nonce: string },
  token: string
) =>
  fetchApi<{
    success: boolean;
    wallet_address: string;
    verified_at: string;
    wallet: {
      wallet_address: string | null;
      wallet_verified_at: string | null;
      wallet_verification_method: string | null;
      wallet_last_balance_sync_at: string | null;
    };
    user: any;
  }>('/api/auth/wallet/verify', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });

// Reputation
export const triggerIngestion = (userId: string, token: string) =>
  fetchApi<IngestionResponse>('/api/reputation/ingest', {
    method: 'POST',
    body: JSON.stringify({ userId }),
    token,
  });

export const getReputation = (userId: string) =>

  fetchApi<ReputationResponse>(`/api/reputation/${userId}`);

export const saveReputationEvidence = (
  data: {
    github_username?: string | null;
    linkedin_data?: Record<string, any>;
    projects?: EvidenceProject[];
    other_platforms?: Record<string, any>;
  },
  token: string
) =>
  fetchApi<SaveEvidenceResponse>('/api/reputation/evidence', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });

export const uploadEvidenceDraft = (
  data: {
    linkedinFile?: File | null;
    supportingFiles?: File[];
    portfolioUrls?: string[];
    projectUrls?: string[];
  },
  token: string
) => {
  const formData = new FormData();

  if (data.linkedinFile) {
    formData.append('linkedin_file', data.linkedinFile);
  }

  for (const file of data.supportingFiles || []) {
    formData.append('supporting_files', file);
  }

  if (data.portfolioUrls?.length) {
    formData.append('portfolio_urls', JSON.stringify(data.portfolioUrls));
  }

  if (data.projectUrls?.length) {
    formData.append('project_urls', JSON.stringify(data.projectUrls));
  }

  return fetchFormApi<EvidenceUploadResponse>('/api/reputation/evidence/upload', formData, token);
};

export const getWalletMe = (token: string) =>
  fetchApi<{
    wallet: {
      wallet_address: string | null;
      wallet_verified_at: string | null;
      wallet_verification_method: string | null;
      wallet_last_balance_sync_at: string | null;
    };
    chain: Record<string, any>;
  }>('/api/wallet/me', { token });

export const getWalletBalances = (
  token: string,
  options?: { tokens?: string[]; includeNative?: boolean }
) => {
  const params = new URLSearchParams();
  if (options?.tokens && options.tokens.length > 0) {
    params.set('tokens', options.tokens.join(','));
  }
  if (options?.includeNative === false) {
    params.set('include_native', 'false');
  }

  const query = params.toString();
  return fetchApi<{
    wallet_address: string;
    chain_id: number;
    chain_name: string;
    native_balance: {
      symbol: string;
      decimals: number;
      raw_balance: string;
      formatted_balance: string;
    } | null;
    tokens: Array<{
      token_address: string;
      symbol: string;
      name: string;
      decimals: number | null;
      is_valid: boolean;
      raw_balance: string | null;
      formatted_balance: string | null;
      error?: string;
    }>;
    fetched_at: string;
  }>(`/api/wallet/balances${query ? `?${query}` : ''}`, { token });
};

export const resolveWalletTokens = (tokenAddresses: string[], token: string) =>
  fetchApi<{
    tokens: Array<{
      token_address: string;
      symbol: string;
      name: string;
      decimals: number | null;
      is_valid: boolean;
      error?: string;
    }>;
    chain: Record<string, any>;
  }>('/api/wallet/tokens/resolve', {
    method: 'POST',
    body: JSON.stringify({ token_addresses: tokenAddresses }),
    token,
  });


// Trust Query
export const getTrustScore = (veridexId: string) =>
  fetchApi(`/api/trust/${veridexId}`);

export const getAgent = (agentId: string) =>
  fetchApi(`/api/agent/${agentId}`);

// Stakes
export const createStake = (workerId: string, amount: number, token: string) =>
  fetchApi('/api/stake', {
    method: 'POST',
    body: JSON.stringify({ workerId, amount }),
    token,
  });

export const getStakes = (userId: string, token: string) =>
  fetchApi(`/api/stake/${userId}`, { token });

export const withdrawStake = (stakeId: string, token: string) =>
  fetchApi('/api/stake/withdraw', {
    method: 'POST',
    body: JSON.stringify({ stakeId }),
    token,
  });

// Reviews
export const createReview = (
  workerId: string,
  rating: number,
  content: string,
  jobCategory: string,
  stakeAmount: number,
  token: string
) =>
  fetchApi('/api/review', {
    method: 'POST',
    body: JSON.stringify({ worker_id: workerId, rating, content, job_category: jobCategory, stake_amount: stakeAmount }),
    token,
  });

export const getReviews = (workerId: string) =>
  fetchApi(`/api/review/${workerId}`);

// Contextual Score
export const getContextualScore = (workerId: string, jobDescription: string, token?: string) =>
  fetchApi<ContextualScoreApiResponse>('/api/contextual-score', {
    method: 'POST',
    body: JSON.stringify({ worker_id: workerId, job_description: jobDescription }),
    token,
  });

// Agents
export const spawnAgent = (name: string, token: string) =>
  fetchApi('/api/agent/spawn', {
    method: 'POST',
    body: JSON.stringify({ name }),
    token,
  });

export const listAgents = (userId: string, token: string) =>
  fetchApi(`/api/agent/list/${userId}`, { token });

// Contracts
export const estimateBuyIn = (workerId: string, salary: number, token: string) =>
  fetchApi<{ salary: number; stakerReward: number; platformFee: number; totalBuyIn: number; totalStakedOnWorker: number; stakerRewardRate: number }>(
    `/api/contract/estimate?worker_id=${workerId}&salary=${salary}`,
    { token }
  );

export const createContract = (
  data: { worker_id: string; title: string; description: string; payment_amount: number; duration_days: number },
  token: string
) =>
  fetchApi('/api/contract', {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });

export const activateContract = (contractId: string, token: string) =>
  fetchApi(`/api/contract/${contractId}/activate`, { method: 'PUT', token });

export const completeContract = (contractId: string, token: string) =>
  fetchApi(`/api/contract/${contractId}/complete`, { method: 'PUT', token });

export const closeContract = (contractId: string, token: string) =>
  fetchApi(`/api/contract/${contractId}/close`, { method: 'PUT', token });

export const getEmployerContracts = (token: string) =>
  fetchApi<{ contracts: any[] }>('/api/contract/employer', { token });

export const getWorkerContracts = (token: string) =>
  fetchApi<{ contracts: any[] }>('/api/contract/worker', { token });

export const getContractDetail = (contractId: string, token: string) =>
  fetchApi<{ contract: any; payments: any[]; review: any }>(`/api/contract/${contractId}`, { token });

export const createContractReview = (
  contractId: string,
  rating: number,
  content: string,
  jobCategory: string,
  token: string
) =>
  fetchApi('/api/review', {
    method: 'POST',
    body: JSON.stringify({ contract_id: contractId, rating, content, job_category: jobCategory, stake_amount: 0 }),
    token,
  });

// Chat
export const sendChatMessage = (workerId: string, message: string, sessionId: string | null, token: string) =>
  fetchApi('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ worker_id: workerId, message, session_id: sessionId }),
    token,
  });
