import '../loadEnv';
import supabase from '../lib/supabase';
import {
  loadWorkerEvidenceSnapshot,
  saveNormalizedEvidenceSnapshot,
} from '../services/evidenceRepository';
import type { WorkerProfileRecord } from '../services/reputationProfile';

function hasMeaningfulData(value: unknown): boolean {
  if (!value) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasMeaningfulData);
  }

  return true;
}

async function main() {
  const { data: profiles, error } = await supabase
    .from('worker_profiles')
    .select('*')
    .order('updated_at', { ascending: true });

  if (error) {
    throw error;
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const rawProfile of (profiles || [])) {
    const profile = rawProfile as WorkerProfileRecord;
    const hasLegacyEvidence =
      hasMeaningfulData(profile.linkedin_data) ||
      hasMeaningfulData(profile.other_platforms);

    if (!hasLegacyEvidence) {
      skipped += 1;
      continue;
    }

    const snapshot = await loadWorkerEvidenceSnapshot(profile);
    if (snapshot.usesNormalizedEvidence) {
      skipped += 1;
      continue;
    }

    try {
      await saveNormalizedEvidenceSnapshot({
        profile,
        userId: profile.user_id,
        linkedinData: profile.linkedin_data || {},
        otherPlatforms: profile.other_platforms || {},
        triggerSource: 'legacy_backfill',
        extractionMethod: 'backfill',
        parserVersion: 'legacy_json_v1',
      });
      processed += 1;
    } catch (backfillError) {
      failed += 1;
      console.error(`Failed to backfill worker profile ${profile.id}:`, backfillError);
    }
  }

  console.log(JSON.stringify({ processed, skipped, failed }, null, 2));
}

main().catch((error) => {
  console.error('Normalized evidence backfill failed:', error);
  process.exit(1);
});
