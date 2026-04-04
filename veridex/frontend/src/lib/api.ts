const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

// Auth
export const verifyWorldId = (proof: any) =>
  fetchApi<{ success: boolean; user: any; isNewUser: boolean; token: string }>(
    '/api/auth/verify',
    { method: 'POST', body: JSON.stringify(proof) }
  );

export const getMe = (token: string) =>
  fetchApi<{ user: any }>('/api/auth/me', { token });

export const updateProfile = (
  data: { display_name: string; roles: string[]; profession_category: string },
  token: string
) =>
  fetchApi<{ success: boolean; user: any }>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
    token,
  });

// Reputation
export const triggerIngestion = (userId: string, token: string) =>
  fetchApi('/api/reputation/ingest', {
    method: 'POST',
    body: JSON.stringify({ userId }),
    token,
  });

export const getReputation = (userId: string) =>
  fetchApi(`/api/reputation/${userId}`);

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
  fetchApi('/api/contextual-score', {
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

// Chat
export const sendChatMessage = (workerId: string, message: string, sessionId: string | null, token: string) =>
  fetchApi('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ worker_id: workerId, message, session_id: sessionId }),
    token,
  });
