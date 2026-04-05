import type { ContextualScore, Review, ScoreComponents, User, WorkerProfile } from '@/types';

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
    throw new Error(error.error || error.message || `HTTP error ${response.status}`);
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

// Reputation
export const triggerIngestion = (userId: string, token: string) =>
  fetchApi<IngestionResponse>('/api/reputation/ingest', {
    method: 'POST',
    body: JSON.stringify({ userId }),
    token,
  });

export const getReputation = (userId: string) =>
  fetchApi<ReputationResponse>(`/api/reputation/${userId}`);

// Browse
export const browseWorkers = () =>
  fetchApi<{ workers: any[] }>('/api/reputation/browse/workers');

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
  fetchApi<ContextualScore>('/api/contextual-score', {
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
