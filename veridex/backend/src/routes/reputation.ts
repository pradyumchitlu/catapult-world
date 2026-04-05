import path from 'path';
import multer from 'multer';
import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import supabase from '../lib/supabase';
import { computeOverallScore } from '../services/scoring';
import {
  ensureWorkerProfile,
  mergeLinkedInData,
  mergeOtherPlatforms,
} from '../services/reputationProfile';
import { syncWorkerReputation } from '../services/reputationIngestion';
import { extractEvidenceUploadDraft } from '../services/evidenceExtraction';
import {
  loadWorkerEvidenceSnapshot,
  saveNormalizedEvidenceSnapshot,
} from '../services/evidenceRepository';
import { storeEvidenceFile } from '../services/evidenceStorage';
import { loadReputationScoringInputs } from '../services/reputationScoreInputs';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 6,
    fileSize: 10 * 1024 * 1024,
  },
});
const SUPPORTED_EVIDENCE_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.md']);

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

function normalizeGithubUsername(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((entry) => parseStringList(entry)))];
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return parseStringList(parsed);
    } catch (error) {
      // Fall through to newline parsing.
    }
  }

  return [...new Set(
    trimmed
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  )];
}

function ensureAuthorizedUser(req: AuthenticatedRequest, requestedUserId?: unknown): string | null {
  if (!req.userId) {
    return null;
  }

  if (requestedUserId === undefined || requestedUserId === null || requestedUserId === '') {
    return req.userId;
  }

  if (typeof requestedUserId !== 'string' || requestedUserId !== req.userId) {
    return null;
  }

  return req.userId;
}

function isSupportedEvidenceFile(file: Express.Multer.File): boolean {
  const ext = path.extname(file.originalname || '').toLowerCase();
  return SUPPORTED_EVIDENCE_EXTENSIONS.has(ext);
}

/**
 * POST /api/reputation/evidence/upload
 * Upload files and URLs, extract deterministic evidence, and return a draft payload.
 */
router.post(
  '/evidence/upload',
  requireAuth,
  upload.fields([
    { name: 'linkedin_file', maxCount: 1 },
    { name: 'supporting_files', maxCount: 5 },
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const files = (req.files || {}) as Record<string, Express.Multer.File[]>;
      const linkedinFile = files.linkedin_file?.[0] || null;
      const supportingFiles = files.supporting_files || [];
      const allFiles = [linkedinFile, ...supportingFiles].filter(
        (file): file is Express.Multer.File => Boolean(file)
      );
      const portfolioUrls = parseStringList(req.body.portfolio_urls);
      const projectUrls = parseStringList(req.body.project_urls);

      if (allFiles.length === 0 && portfolioUrls.length === 0 && projectUrls.length === 0) {
        return res.status(400).json({ error: 'Provide at least one file or URL to analyze' });
      }

      const unsupportedFile = allFiles.find((file) => !isSupportedEvidenceFile(file));
      if (unsupportedFile) {
        return res.status(400).json({
          error: `Unsupported file type for ${unsupportedFile.originalname}. Allowed: PDF, DOCX, TXT, MD.`,
        });
      }

      const storedLinkedInFile = linkedinFile
        ? {
            file: linkedinFile,
            stored: await storeEvidenceFile(req.userId, linkedinFile, 'linkedin_pdf'),
          }
        : null;

      const storedSupportingFiles = await Promise.all(
        supportingFiles.map(async (file) => ({
          file,
          stored: await storeEvidenceFile(req.userId!, file, 'supporting_document'),
        }))
      );

      const draft = await extractEvidenceUploadDraft({
        linkedinFile: storedLinkedInFile,
        supportingFiles: storedSupportingFiles,
        portfolioUrls,
        projectUrls,
      });

      return res.json({
        success: true,
        draft,
      });
    } catch (error) {
      console.error('Evidence upload error:', error);
      return res.status(500).json({ error: 'Failed to analyze uploaded evidence' });
    }
  }
);

/**
 * POST /api/reputation/evidence
 * Save manual reputation evidence that the scoring engine can use immediately.
 */
router.post('/evidence', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      userId,
      github_username,
      linkedin_data,
      projects,
      other_platforms,
    } = req.body;

    const targetUserId = ensureAuthorizedUser(req, userId);
    if (!targetUserId) {
      return res.status(403).json({ error: 'Evidence can only be saved for the authenticated user' });
    }

    const nextGithubUsername = normalizeGithubUsername(github_username);
    const manualEvidenceChanged =
      linkedin_data !== undefined ||
      projects !== undefined ||
      other_platforms !== undefined;
    const hasPayload =
      nextGithubUsername !== undefined ||
      manualEvidenceChanged;

    if (!hasPayload) {
      return res.status(400).json({ error: 'No evidence payload provided' });
    }

    const profile = await ensureWorkerProfile(targetUserId);
    const currentEvidenceSnapshot = await loadWorkerEvidenceSnapshot(profile);

    const mergedLinkedInData = manualEvidenceChanged
      ? mergeLinkedInData(currentEvidenceSnapshot.linkedinData, linkedin_data)
      : currentEvidenceSnapshot.linkedinData;

    const mergedOtherPlatforms = mergeOtherPlatforms(
      currentEvidenceSnapshot.otherPlatforms,
      {
        ...(other_platforms || {}),
        ...(projects !== undefined ? { projects } : {}),
      }
    );

    const githubUsernameToStore = nextGithubUsername !== undefined
      ? nextGithubUsername
      : profile.github_username;
    const normalizedEvidenceSnapshot = manualEvidenceChanged
      ? await saveNormalizedEvidenceSnapshot({
          profile,
          userId: targetUserId,
          linkedinData: mergedLinkedInData,
          otherPlatforms: mergedOtherPlatforms,
          triggerSource: 'manual_save',
          extractionMethod: 'hybrid',
          parserVersion: 'v1',
        })
      : currentEvidenceSnapshot;

    const { reviews, stakes, employerReviews } = await loadReputationScoringInputs(targetUserId);

    const scoreResult = await computeOverallScore(
      {
        githubData: profile.github_data,
        linkedinData: normalizedEvidenceSnapshot.linkedinData,
        otherPlatforms: normalizedEvidenceSnapshot.otherPlatforms,
      },
      reviews,
      stakes,
      employerReviews
    );

    const { data: updatedProfile, error: updateError } = await supabase
      .from('worker_profiles')
      .update({
        github_username: githubUsernameToStore,
        linkedin_data: normalizedEvidenceSnapshot.linkedinData,
        other_platforms: normalizedEvidenceSnapshot.otherPlatforms,
        computed_skills: scoreResult.computed_skills,
        specializations: scoreResult.specializations,
        years_experience: scoreResult.years_experience,
        overall_trust_score: scoreResult.overall,
        score_components: {
          ...scoreResult.components,
          grouped_scores: scoreResult.groupedScores,
        },
        ingestion_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select('*')
      .single();

    if (updateError || !updatedProfile) {
      throw updateError || new Error('Failed to update worker profile');
    }

    return res.json({
      success: true,
      profile: {
        ...updatedProfile,
        linkedin_data: normalizedEvidenceSnapshot.linkedinData,
        other_platforms: normalizedEvidenceSnapshot.otherPlatforms,
      },
      warning: githubUsernameToStore && !hasMeaningfulData(profile.github_data)
        ? 'GitHub username saved. Trigger /api/reputation/ingest after OAuth completes to sync repository data.'
        : null,
    });
  } catch (error) {
    console.error('Reputation evidence error:', error);
    return res.status(500).json({ error: 'Failed to save reputation evidence' });
  }
});

/**
 * POST /api/reputation/ingest
 * Trigger GitHub data ingestion and score computation for a user
 */
router.post('/ingest', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.body;
    const targetUserId = ensureAuthorizedUser(req, userId);
    if (!targetUserId) {
      return res.status(403).json({ error: 'Ingestion can only run for the authenticated user' });
    }

    const { scoreResult, warning } = await syncWorkerReputation(targetUserId);

    return res.json({
      success: true,
      overall_trust_score: scoreResult.overall,
      score_components: {
        ...scoreResult.components,
        grouped_scores: scoreResult.groupedScores,
      },
      computed_skills: scoreResult.computed_skills,
      specializations: scoreResult.specializations,
      years_experience: scoreResult.years_experience,
      warning,
    });
  } catch (error) {
    console.error('Reputation ingest error:', error);
    const message = error instanceof Error ? error.message : 'Ingestion failed';
    const statusCode = /No reputation evidence found/i.test(message) ? 400 : 500;
    return res.status(statusCode).json({ error: message });
  }
});

/**
 * GET /api/reputation/:userId
 * Get computed reputation profile for a user
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user and worker profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*, worker_profiles(*)')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, reviewer:reviewer_id(id, display_name, world_id_hash, roles)')
      .eq('worker_id', userId)
      .eq('status', 'active')
      .order('stake_amount', { ascending: false });

    // Get total stakes
    const { data: stakes } = await supabase
      .from('stakes')
      .select('amount')
      .eq('worker_id', userId)
      .eq('status', 'active');

    const totalStaked = stakes?.reduce((sum, s) => sum + s.amount, 0) || 0;
    const stakerCount = stakes?.length || 0;
    const workerProfile = user.worker_profiles
      ? await loadWorkerEvidenceSnapshot(user.worker_profiles as any).then((snapshot) => ({
          ...user.worker_profiles,
          linkedin_data: snapshot.linkedinData,
          other_platforms: snapshot.otherPlatforms,
        }))
      : null;

    // Separate worker_profiles from the user object
    const { worker_profiles, ...userData } = user as any;

    return res.json({
      user: userData,
      profile: worker_profiles || null,
      reviews: reviews || [],
      totalStaked,
      stakerCount,
    });
  } catch (error) {
    console.error('Get reputation error:', error);
    return res.status(500).json({ error: 'Failed to get reputation' });
  }
});

/**
 * GET /api/reputation/browse/workers
 * Get all workers with profiles for the browse page
 */
router.get('/browse/workers', async (req, res) => {
  try {
    // Get all worker profiles with user data
    const { data: profiles, error } = await supabase
      .from('worker_profiles')
      .select(`
        *,
        user:user_id(id, display_name, roles, profession_category, wld_balance)
      `)
      .order('overall_trust_score', { ascending: false });

    if (error) throw error;

    // Get review stats and stake totals for each worker
    const workers = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('worker_id', profile.user_id)
          .eq('status', 'active');

        const { data: stakes } = await supabase
          .from('stakes')
          .select('amount')
          .eq('worker_id', profile.user_id)
          .eq('status', 'active');

        const reviewCount = reviews?.length || 0;
        const avgRating = reviewCount > 0
          ? (reviews ?? []).reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0;
        const totalStaked = (stakes || []).reduce((sum, s) => sum + s.amount, 0);

        return {
          ...profile,
          reviewCount,
          avgRating: Math.round(avgRating * 10) / 10,
          totalStaked,
        };
      })
    );

    return res.json({ workers });
  } catch (error) {
    console.error('Browse workers error:', error);
    return res.status(500).json({ error: 'Failed to browse workers' });
  }
});

export default router;
