import supabase from '../lib/supabase';

export interface WorkerProfileRecord {
  id: string;
  user_id: string;
  github_username: string | null;
  github_data: Record<string, any>;
  linkedin_data: Record<string, any>;
  other_platforms: Record<string, any>;
  computed_skills: string[];
  specializations: string[];
  years_experience: number | null;
  overall_trust_score: number;
  score_components: Record<string, any>;
  ingestion_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

type JsonRecord = Record<string, any>;

function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeJson(existing: JsonRecord, incoming: JsonRecord): JsonRecord {
  const merged: JsonRecord = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      merged[key] = value;
      continue;
    }

    if (isPlainObject(value) && isPlainObject(existing[key])) {
      merged[key] = mergeJson(existing[key], value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

export async function ensureWorkerProfile(userId: string): Promise<WorkerProfileRecord> {
  const { data: existingProfile, error: fetchError } = await supabase
    .from('worker_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existingProfile) {
    return existingProfile as WorkerProfileRecord;
  }

  const { data: createdProfile, error: createError } = await supabase
    .from('worker_profiles')
    .insert({
      user_id: userId,
      github_data: {},
      linkedin_data: {},
      other_platforms: {},
      score_components: {},
    })
    .select('*')
    .single();

  if (createError || !createdProfile) {
    throw createError || new Error('Failed to create worker profile');
  }

  return createdProfile as WorkerProfileRecord;
}

export function mergeLinkedInData(
  existingData: JsonRecord | null | undefined,
  incomingData: JsonRecord | undefined
): JsonRecord {
  if (!incomingData) {
    return existingData ?? {};
  }

  return mergeJson(existingData ?? {}, incomingData);
}

export function mergeOtherPlatforms(
  existingData: JsonRecord | null | undefined,
  incomingData: JsonRecord | undefined
): JsonRecord {
  if (!incomingData) {
    return existingData ?? {};
  }

  return mergeJson(existingData ?? {}, incomingData);
}
