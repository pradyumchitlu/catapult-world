'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GitHubConnectButton from '@/components/GitHubConnectButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { useMiniApp } from '@/contexts/MiniAppContext';
import {
  createWalletChallenge,
  saveReputationEvidence,
  triggerIngestion,
  updateProfile,
  uploadEvidenceDraft,
  verifyWalletSignature,
} from '@/lib/api';
import { linkWorldWalletWithMiniKit } from '@/lib/minikit';
import { connectInjectedWallet, signWalletMessage } from '@/lib/wallet';
import {
  col,
  headingMd,
  headingSm,
  sectionLabel,
  separator,
  textSecondary,
  gradientText,
  colors,
} from '@/lib/styles';
import type {
  EvidenceExperience,
  EvidenceProject,
  EvidenceUploadDraft,
  EvidenceUploadedFile,
} from '@/types';

const ONBOARDING_DRAFT_KEY = 'veridex_onboarding_draft';

type EvidenceItemKind = 'project' | 'portfolio' | 'work_sample';
type DraftSource = 'manual' | 'extracted';

interface EditableExperience {
  id: string;
  source: DraftSource;
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  description: string;
  skillsText: string;
  technologiesText: string;
}

interface EditableEvidenceItem {
  id: string;
  kind: EvidenceItemKind;
  source: DraftSource;
  title: string;
  role: string;
  description: string;
  url: string;
  proofUrlsText: string;
  start_date: string;
  end_date: string;
  updated_at: string;
  skillsText: string;
  technologiesText: string;
  tagsText: string;
  source_file?: EvidenceUploadedFile;
}

interface EvidenceState {
  experiences: EditableExperience[];
  items: EditableEvidenceItem[];
  skillsText: string;
  topSkillsText: string;
  specializationsText: string;
  sourceFile: EvidenceUploadedFile | null;
  sourceType: string;
  rawTextExcerpt: string;
  uploadedAt: string;
  uploadedFiles: EvidenceUploadedFile[];
  warnings: string[];
}

interface CompanyDetailsState {
  companyName: string;
  companyWebsite: string;
  companyRole: string;
  companyDescription: string;
}

interface OnboardingDraft {
  displayName: string;
  selectedRoles: string[];
  professionCategory: string | null;
  step: number;
  walletConnected: boolean;
  walletAddress: string | null;
  githubConnected: boolean;
  portfolioUrlsText: string;
  projectUrlsText: string;
  evidence: EvidenceState;
  needsEvidenceAnalysis: boolean;
  companyDetails: CompanyDetailsState;
}

const PROFESSION_CATEGORIES = [
  { id: 'software', label: 'Software Engineering' },
  { id: 'writing', label: 'Writing & Content' },
  { id: 'design', label: 'Design' },
  { id: 'trades', label: 'Trades & Services' },
  { id: 'other', label: 'Other' },
];

const ROLES = [
  { id: 'worker', label: 'Worker', description: 'Build reputation and get hired' },
  { id: 'client', label: 'Client', description: 'Find and evaluate workers' },
];

const WORKER_STEPS = ['Profession', 'Wallet', 'Connect', 'Evidence'];
const CLIENT_STEPS = ['Profession', 'Wallet', 'Company details'];

const fieldLabelStyle = {
  ...headingSm,
  fontSize: '13px',
  color: colors.textTertiary,
  display: 'block',
  marginBottom: '8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};

const reviewCardStyle = {
  padding: '18px',
  borderRadius: '14px',
  border: '1px solid rgba(37,99,235,0.12)',
  background: 'rgba(255,255,255,0.58)',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
};

const textareaStyle = {
  width: '100%',
  minHeight: '92px',
  borderRadius: '12px',
  border: '1px solid rgba(15,23,42,0.08)',
  background: 'rgba(255,255,255,0.8)',
  padding: '14px 16px',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '14px',
  color: colors.textPrimary,
  resize: 'vertical' as const,
};

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function splitList(value: string): string[] {
  return Array.from(new Set(
    value
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  ));
}

function joinList(values?: string[]): string {
  return (values || []).join(', ');
}

function cleanString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function compactRecord<T extends Record<string, any>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (Array.isArray(entry)) {
        return entry.length > 0;
      }

      return entry !== undefined && entry !== null && entry !== '';
    })
  ) as Partial<T>;
}

function createEmptyEvidenceState(): EvidenceState {
  return {
    experiences: [],
    items: [],
    skillsText: '',
    topSkillsText: '',
    specializationsText: '',
    sourceFile: null,
    sourceType: '',
    rawTextExcerpt: '',
    uploadedAt: '',
    uploadedFiles: [],
    warnings: [],
  };
}

function createEmptyCompanyDetails(): CompanyDetailsState {
  return {
    companyName: '',
    companyWebsite: '',
    companyRole: '',
    companyDescription: '',
  };
}

function normalizeStoredEvidence(value: Partial<EvidenceState> | null | undefined): EvidenceState {
  const empty = createEmptyEvidenceState();
  if (!value) {
    return empty;
  }

  return {
    ...empty,
    ...value,
    experiences: Array.isArray(value.experiences) ? value.experiences : [],
    items: Array.isArray(value.items) ? value.items : [],
    uploadedFiles: Array.isArray(value.uploadedFiles) ? value.uploadedFiles : [],
    warnings: Array.isArray(value.warnings) ? value.warnings : [],
    skillsText: typeof value.skillsText === 'string' ? value.skillsText : '',
    topSkillsText: typeof value.topSkillsText === 'string' ? value.topSkillsText : '',
    specializationsText: typeof value.specializationsText === 'string' ? value.specializationsText : '',
    sourceType: typeof value.sourceType === 'string' ? value.sourceType : '',
    rawTextExcerpt: typeof value.rawTextExcerpt === 'string' ? value.rawTextExcerpt : '',
    uploadedAt: typeof value.uploadedAt === 'string' ? value.uploadedAt : '',
    sourceFile: value.sourceFile || null,
  };
}

function createEditableExperience(
  value: Partial<EvidenceExperience> = {},
  source: DraftSource = 'extracted'
): EditableExperience {
  return {
    id: createId(),
    source,
    title: value.title || '',
    company: value.company || '',
    start_date: value.start_date || '',
    end_date: value.end_date || '',
    description: value.description || '',
    skillsText: joinList(value.skills),
    technologiesText: joinList(value.technologies),
  };
}

function createEditableItem(
  value: Partial<EvidenceProject> = {},
  kind: EvidenceItemKind = 'project',
  source: DraftSource = 'extracted'
): EditableEvidenceItem {
  return {
    id: createId(),
    kind,
    source,
    title: value.title || '',
    role: value.role || '',
    description: value.description || '',
    url: value.url || '',
    proofUrlsText: joinList(value.proof_urls),
    start_date: value.start_date || '',
    end_date: value.end_date || '',
    updated_at: value.updated_at || '',
    skillsText: joinList(value.skills),
    technologiesText: joinList(value.technologies),
    tagsText: joinList(value.tags),
    source_file: value.source_file,
  };
}

function sanitizeExperience(value: EditableExperience): EvidenceExperience {
  return compactRecord({
    title: cleanString(value.title),
    company: cleanString(value.company),
    start_date: cleanString(value.start_date),
    end_date: cleanString(value.end_date),
    description: cleanString(value.description),
    skills: splitList(value.skillsText),
    technologies: splitList(value.technologiesText),
  }) as EvidenceExperience;
}

function sanitizeItem(value: EditableEvidenceItem): EvidenceProject {
  return compactRecord({
    title: cleanString(value.title),
    role: cleanString(value.role),
    description: cleanString(value.description),
    url: cleanString(value.url),
    proof_urls: splitList(value.proofUrlsText),
    start_date: cleanString(value.start_date),
    end_date: cleanString(value.end_date),
    updated_at: cleanString(value.updated_at) || new Date().toISOString(),
    skills: splitList(value.skillsText),
    technologies: splitList(value.technologiesText),
    tags: splitList(value.tagsText),
    source_file: value.source_file,
  }) as EvidenceProject;
}

function buildEvidenceStateFromUpload(
  draft: EvidenceUploadDraft,
  previous: EvidenceState
): EvidenceState {
  const manualExperiences = previous.experiences.filter((experience) => experience.source === 'manual');
  const manualItems = previous.items.filter((item) => item.source === 'manual');

  const extractedItems = [
    ...(draft.projects || []).map((item) => createEditableItem(item, 'project', 'extracted')),
    ...((draft.other_platforms?.portfolio || []).map((item) => createEditableItem(item, 'portfolio', 'extracted'))),
    ...((draft.other_platforms?.work_samples || []).map((item) => createEditableItem(item, 'work_sample', 'extracted'))),
  ];

  return {
    experiences: [
      ...manualExperiences,
      ...((draft.linkedin_data?.experiences || []).map((experience) =>
        createEditableExperience(experience, 'extracted')
      )),
    ],
    items: [...manualItems, ...extractedItems],
    skillsText: joinList(draft.linkedin_data?.skills),
    topSkillsText: joinList(draft.linkedin_data?.top_skills),
    specializationsText: joinList(draft.linkedin_data?.specializations),
    sourceFile: draft.linkedin_data?.source_file || previous.sourceFile || null,
    sourceType: draft.linkedin_data?.source_type || previous.sourceType,
    rawTextExcerpt: draft.linkedin_data?.raw_text_excerpt || previous.rawTextExcerpt,
    uploadedAt: draft.linkedin_data?.uploaded_at || previous.uploadedAt,
    uploadedFiles: draft.uploaded_files?.length
      ? draft.uploaded_files
      : (draft.other_platforms?.uploaded_files || previous.uploadedFiles),
    warnings: draft.warnings || [],
  };
}

function hasPendingEvidenceInputs(
  portfolioUrlsText: string,
  projectUrlsText: string,
  linkedinFile: File | null,
  supportingFiles: File[]
): boolean {
  return Boolean(
    portfolioUrlsText.trim() ||
    projectUrlsText.trim() ||
    linkedinFile ||
    supportingFiles.length
  );
}

function hasStructuredEvidence(state: EvidenceState): boolean {
  return Boolean(
    state.experiences.some((experience) =>
      Boolean(experience.title.trim() || experience.company.trim() || experience.description.trim())
    ) ||
    state.items.some((item) =>
      Boolean(item.title.trim() || item.url.trim() || item.description.trim() || item.proofUrlsText.trim())
    ) ||
    state.skillsText.trim() ||
    state.topSkillsText.trim() ||
    state.specializationsText.trim() ||
    state.uploadedFiles.length
  );
}

function getDraftStep(
  displayName: string,
  selectedRoles: string[],
  professionCategory: string | null,
  fallbackStep = 1
): number {
  const maxStep = isClientOnlyRole(selectedRoles) ? 4 : 5;

  if (!displayName.trim() || selectedRoles.length === 0) {
    return 1;
  }

  if (!professionCategory) {
    return 2;
  }

  return Math.min(Math.max(3, fallbackStep), maxStep);
}

function isClientOnlyRole(selectedRoles: string[]): boolean {
  return selectedRoles.includes('client') && !selectedRoles.includes('worker');
}

function hasCompanyDetails(details: CompanyDetailsState): boolean {
  return Boolean(
    details.companyName.trim() ||
    details.companyWebsite.trim() ||
    details.companyRole.trim() ||
    details.companyDescription.trim()
  );
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function kindLabel(kind: EvidenceItemKind): string {
  if (kind === 'portfolio') return 'Portfolio';
  if (kind === 'work_sample') return 'Work Sample';
  return 'Project';
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
          <LoadingSpinner />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isLoading: authLoading, updateUser } = useAuth();
  const { isInWorldApp, isMiniKitReady } = useMiniApp();
  const githubStatus = searchParams.get('github');

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzingEvidence, setIsAnalyzingEvidence] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['worker']);
  const isClientOnly = isClientOnlyRole(selectedRoles);
  const visibleSteps = isClientOnly ? CLIENT_STEPS : WORKER_STEPS;
  const [professionCategory, setProfessionCategory] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubMessage, setGithubMessage] = useState<string | null>(null);
  const [portfolioUrlsText, setPortfolioUrlsText] = useState('');
  const [projectUrlsText, setProjectUrlsText] = useState('');
  const [evidence, setEvidence] = useState<EvidenceState>(createEmptyEvidenceState());
  const [needsEvidenceAnalysis, setNeedsEvidenceAnalysis] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetailsState>(createEmptyCompanyDetails());
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [linkedinFile, setLinkedinFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [linkedinInputKey, setLinkedinInputKey] = useState(0);
  const [supportingInputKey, setSupportingInputKey] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/verify');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || hasHydratedDraft) {
      return;
    }

    let draft: Partial<OnboardingDraft> | null = null;
    try {
      const rawDraft = sessionStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (rawDraft) {
        draft = JSON.parse(rawDraft) as Partial<OnboardingDraft>;
      }
    } catch (error) {
      console.warn('Failed to restore onboarding draft:', error);
    }

    const nextDisplayName = typeof draft?.displayName === 'string'
      ? draft.displayName
      : (user.display_name || '');
    const nextSelectedRoles = Array.isArray(draft?.selectedRoles) && draft.selectedRoles.length > 0
      ? draft.selectedRoles
      : (user.roles?.length ? user.roles : ['worker']);
    const nextProfessionCategory = typeof draft?.professionCategory === 'string'
      ? draft.professionCategory
      : (user.profession_category || null);
    const nextWalletConnected = Boolean(draft?.walletConnected) || Boolean(user.wallet_address);
    const nextWalletAddress = typeof draft?.walletAddress === 'string'
      ? draft.walletAddress
      : (user.wallet_address || null);
    const nextGithubConnected = Boolean(draft?.githubConnected) || githubStatus === 'connected';
    const fallbackStep = typeof draft?.step === 'number' ? draft.step : 1;

    setDisplayName(nextDisplayName);
    setSelectedRoles(nextSelectedRoles);
    setProfessionCategory(nextProfessionCategory);
    setWalletConnected(nextWalletConnected);
    setWalletAddress(nextWalletAddress);
    setGithubConnected(nextGithubConnected);
    setPortfolioUrlsText(typeof draft?.portfolioUrlsText === 'string' ? draft.portfolioUrlsText : '');
    setProjectUrlsText(typeof draft?.projectUrlsText === 'string' ? draft.projectUrlsText : '');
    setEvidence(normalizeStoredEvidence(draft?.evidence));
    setNeedsEvidenceAnalysis(Boolean(draft?.needsEvidenceAnalysis));
    setCompanyDetails({
      ...createEmptyCompanyDetails(),
      ...(draft?.companyDetails || {}),
    });
    setStep(getDraftStep(nextDisplayName, nextSelectedRoles, nextProfessionCategory, fallbackStep));
    setHasHydratedDraft(true);
  }, [user, githubStatus, hasHydratedDraft]);

  useEffect(() => {
    if (githubStatus === 'connected') {
      setGithubConnected(true);
      setGithubMessage('GitHub connected. We will sync your repositories and calculate your Veridex score after setup.');
    } else if (githubStatus === 'error') {
      setGithubMessage('GitHub connection did not complete. You can try again anytime.');
    }
  }, [githubStatus]);

  useEffect(() => {
    if (!user || !hasHydratedDraft) {
      return;
    }

    const draft: OnboardingDraft = {
      displayName,
      selectedRoles,
      professionCategory,
      step,
      walletConnected,
      walletAddress,
      githubConnected,
      portfolioUrlsText,
      projectUrlsText,
      evidence,
      needsEvidenceAnalysis,
      companyDetails,
    };

    sessionStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  }, [
    displayName,
    selectedRoles,
    professionCategory,
    step,
    walletConnected,
    walletAddress,
    githubConnected,
    portfolioUrlsText,
    projectUrlsText,
    evidence,
    needsEvidenceAnalysis,
    companyDetails,
    user,
    hasHydratedDraft,
  ]);

  useEffect(() => {
    if (!professionCategory && step > 2) {
      setStep(2);
      return;
    }

    if ((!displayName.trim() || selectedRoles.length === 0) && step > 1) {
      setStep(1);
    }
  }, [displayName, selectedRoles, professionCategory, step]);

  useEffect(() => {
    const maxStep = isClientOnly ? 4 : 5;
    if (step > maxStep) {
      setStep(maxStep);
    }
  }, [isClientOnly, step]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(roleId)) {
        return prev.filter((r) => r !== roleId);
      }
      // Worker and client are mutually exclusive
      if (roleId === 'worker') {
        return [...prev.filter((r) => r !== 'client'), roleId];
      }
      if (roleId === 'client') {
        return [...prev.filter((r) => r !== 'worker'), roleId];
      }
      return [...prev, roleId];
    });
  };

  const handleConnectWallet = async () => {
    if (!token) return;
    setWalletConnecting(true);
    setWalletError(null);

    try {
      if (isInWorldApp && isMiniKitReady) {
        const result = await linkWorldWalletWithMiniKit(token);
        updateUser(result.user);
        setWalletAddress(result.wallet_address);
        setWalletConnected(true);
        return;
      }

      const { address } = await connectInjectedWallet();
      const challenge = await createWalletChallenge(address, token);
      const { signature } = await signWalletMessage(challenge.challenge);
      const result = await verifyWalletSignature(
        {
          wallet_address: address,
          message: challenge.challenge,
          signature,
          nonce: challenge.nonce,
        },
        token
      );
      updateUser(result.user);
      setWalletAddress(result.wallet_address);
      setWalletConnected(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setWalletError(message);
    } finally {
      setWalletConnecting(false);
    }
  };

  const updateExperienceField = (id: string, field: keyof EditableExperience, value: string) => {
    setEvidence((prev) => ({
      ...prev,
      experiences: prev.experiences.map((experience) =>
        experience.id === id ? { ...experience, [field]: value } : experience
      ),
    }));
  };

  const updateItemField = (id: string, field: keyof EditableEvidenceItem, value: string) => {
    setEvidence((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addManualExperience = () => {
    setEvidence((prev) => ({
      ...prev,
      experiences: [...prev.experiences, createEditableExperience({}, 'manual')],
    }));
  };

  const removeExperience = (id: string) => {
    setEvidence((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((experience) => experience.id !== id),
    }));
  };

  const addManualItem = (kind: EvidenceItemKind = 'project') => {
    setEvidence((prev) => ({
      ...prev,
      items: [...prev.items, createEditableItem({}, kind, 'manual')],
    }));
  };

  const removeItem = (id: string) => {
    setEvidence((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const handleAnalyzeEvidence = async () => {
    if (!token) {
      return;
    }

    const portfolioUrls = splitList(portfolioUrlsText);
    const projectUrls = splitList(projectUrlsText);

    if (!linkedinFile && supportingFiles.length === 0 && portfolioUrls.length === 0 && projectUrls.length === 0) {
      setEvidenceError('Add a LinkedIn PDF, supporting files, or URLs before analyzing evidence.');
      return;
    }

    setIsAnalyzingEvidence(true);
    setEvidenceError(null);

    try {
      const result = await uploadEvidenceDraft(
        {
          linkedinFile,
          supportingFiles,
          portfolioUrls,
          projectUrls,
        },
        token
      );

      setEvidence((prev) => buildEvidenceStateFromUpload(result.draft, prev));
      setNeedsEvidenceAnalysis(false);
      setLinkedinFile(null);
      setSupportingFiles([]);
      setLinkedinInputKey((value) => value + 1);
      setSupportingInputKey((value) => value + 1);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to analyze evidence';
      setEvidenceError(message);
    } finally {
      setIsAnalyzingEvidence(false);
    }
  };

  const handleComplete = async () => {
    if (!token) {
      return;
    }

    if (needsEvidenceAnalysis && hasPendingEvidenceInputs(portfolioUrlsText, projectUrlsText, linkedinFile, supportingFiles)) {
      setEvidenceError('Analyze your current files and URLs before finishing setup so they can be saved into your profile.');
      return;
    }

    setIsLoading(true);
    setEvidenceError(null);

    try {
      const result = await updateProfile(
        {
          display_name: displayName,
          roles: selectedRoles,
          profession_category: professionCategory || 'other',
        },
        token
      );

      updateUser(result.user);

      if (isClientOnly && hasCompanyDetails(companyDetails)) {
        await saveReputationEvidence(
          {
            other_platforms: {
              client_company_details: compactRecord({
                company_name: cleanString(companyDetails.companyName),
                website: cleanString(companyDetails.companyWebsite),
                role: cleanString(companyDetails.companyRole),
                description: cleanString(companyDetails.companyDescription),
              }),
            },
          },
          token
        );
      } else if (hasStructuredEvidence(evidence)) {
        const items = evidence.items.map(sanitizeItem);
        const linkedinData = compactRecord({
          source_type: cleanString(evidence.sourceType),
          source_file: evidence.sourceFile || undefined,
          uploaded_at: cleanString(evidence.uploadedAt),
          raw_text_excerpt: cleanString(evidence.rawTextExcerpt),
          experiences: evidence.experiences.map(sanitizeExperience).filter((value) => Object.keys(value).length > 0),
          skills: splitList(evidence.skillsText),
          top_skills: splitList(evidence.topSkillsText),
          specializations: splitList(evidence.specializationsText),
        });

        await saveReputationEvidence(
          {
            linkedin_data: linkedinData,
            projects: items.filter((item, index) => evidence.items[index]?.kind === 'project'),
            other_platforms: {
              portfolio: items.filter((item, index) => evidence.items[index]?.kind === 'portfolio'),
              work_samples: items.filter((item, index) => evidence.items[index]?.kind === 'work_sample'),
              uploaded_files: evidence.uploadedFiles,
            },
          },
          token
        );
      }

      if (githubConnected) {
        triggerIngestion(result.user.id, token).catch(() => {});
      }

      sessionStorage.removeItem(ONBOARDING_DRAFT_KEY);
      router.push(isClientOnly ? '/employer' : '/dashboard');
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to complete onboarding';
      setEvidenceError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPendingInputs = hasPendingEvidenceInputs(portfolioUrlsText, projectUrlsText, linkedinFile, supportingFiles);
  const finishDisabled =
    isLoading ||
    !displayName.trim() ||
    selectedRoles.length === 0 ||
    !professionCategory ||
    (isClientOnly && !companyDetails.companyName.trim()) ||
    (needsEvidenceAnalysis && hasPendingInputs);

  return (
    <div
      style={{ minHeight: '100vh' }}
    >
      <div style={{ ...col, maxWidth: '720px', paddingTop: '80px', paddingBottom: '80px' }}>
        <div className="fade-up fade-up-1" style={{ marginBottom: '40px' }}>
          <span style={sectionLabel}>Onboarding</span>
          <h1
            style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: '42px',
              fontWeight: 700,
              lineHeight: '1.15',
              letterSpacing: '-0.02em',
              margin: '0 0 12px 0',
              ...gradientText,
            }}
          >
            Welcome to Veridex.
          </h1>
          <p style={{ ...textSecondary, maxWidth: '520px' }}>
            Let&apos;s set up your profile, connect your wallet, and tailor the rest of onboarding to the kind of user you are.
          </p>
        </div>

        {step > 1 && (
          <div className="fade-up fade-up-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
            {visibleSteps.map((label, index) => {
              const actualStepNumber = index + 2;
              const displayStepNumber = index + 1;
              const isDone = actualStepNumber < step;
              const isActive = actualStepNumber === step;

              return (
                <div key={displayStepNumber} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        background: isDone
                          ? colors.success
                          : isActive
                            ? colors.primary
                            : 'rgba(37,99,235,0.08)',
                        color: isDone || isActive ? '#fff' : colors.textMuted,
                        transition: 'all 0.3s ease',
                        boxShadow: isActive ? '0 0 0 4px rgba(37,99,235,0.12)' : 'none',
                      }}
                    >
                      {isDone ? '✓' : displayStepNumber}
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? colors.primary : colors.textTertiary,
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {index < visibleSteps.length - 1 && (
                    <div
                      style={{
                        width: '32px',
                        height: '1px',
                        background: actualStepNumber < step ? colors.success : 'rgba(37,99,235,0.15)',
                        transition: 'background 0.3s ease',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <GlassCard className="fade-up fade-up-3" style={{ padding: '40px' }}>
          {step === 1 && (
            <div>
              <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>Who are you?</h2>
              <p style={{ ...textSecondary, fontSize: '14px', marginBottom: '28px' }}>
                Pick a display name and the roles you&apos;re interested in.
              </p>

              <div style={{ marginBottom: '24px' }}>
                <label style={fieldLabelStyle}>Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Chen"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="input"
                  style={{ fontSize: '15px' }}
                />
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={{ ...fieldLabelStyle, marginBottom: '12px' }}>I am a...</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ROLES.map((role) => {
                    const selected = selectedRoles.includes(role.id);

                    return (
                      <button
                        key={role.id}
                        onClick={() => toggleRole(role.id)}
                        style={{
                          padding: '14px 18px',
                          borderRadius: '12px',
                          border: `1.5px solid ${selected ? colors.primary : 'rgba(37,99,235,0.15)'}`,
                          background: selected ? 'rgba(37,99,235,0.06)' : 'rgba(255,255,255,0.5)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: selected ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-inter), system-ui, sans-serif',
                            fontSize: '15px',
                            fontWeight: 600,
                            color: selected ? colors.primary : colors.textPrimary,
                            marginBottom: '2px',
                          }}
                        >
                          {role.label}
                        </div>
                        <div style={{ ...textSecondary, fontSize: '13px' }}>{role.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!displayName.trim() || selectedRoles.length === 0}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>Your profession</h2>
              <p style={{ ...textSecondary, fontSize: '14px', marginBottom: '28px' }}>
                What kind of work do you do? This helps tailor your trust profile.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '28px',
                }}
              >
                {PROFESSION_CATEGORIES.map((category) => {
                  const selected = professionCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setProfessionCategory(category.id)}
                      style={{
                        padding: '20px 12px',
                        borderRadius: '12px',
                        border: `1.5px solid ${selected ? colors.primary : 'rgba(37,99,235,0.15)'}`,
                        background: selected ? 'rgba(37,99,235,0.06)' : 'rgba(255,255,255,0.5)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: selected ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: selected ? colors.primary : colors.textPrimary,
                        }}
                      >
                        {category.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep(1)} className="btn-secondary" style={{ flex: 1 }}>
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!professionCategory}
                  className="btn-primary"
                  style={{ flex: 2 }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>
                {isInWorldApp && isMiniKitReady ? 'Link your World wallet' : 'Connect your wallet'}
              </h2>
              <p style={{ ...textSecondary, fontSize: '14px', marginBottom: '28px' }}>
                {isInWorldApp && isMiniKitReady
                  ? 'Link your World wallet so you can stake directly inside World App.'
                  : 'Link your browser wallet for staking and on-chain identity verification.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {walletConnected && walletAddress ? (
                  <div
                    style={{
                      padding: '18px 20px',
                      borderRadius: '14px',
                      border: `1.5px solid ${colors.success}`,
                      background: 'rgba(34,197,94,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: colors.success,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '16px',
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </div>
                    <div>
                      <div style={{ ...headingSm, fontSize: '14px', color: colors.textPrimary }}>
                        Wallet connected
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          fontSize: '13px',
                          color: colors.textTertiary,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {truncateAddress(walletAddress)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectWallet}
                    disabled={walletConnecting}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '14px',
                      border: '1.5px solid rgba(37,99,235,0.2)',
                      background: 'rgba(255,255,255,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      cursor: walletConnecting ? 'wait' : 'pointer',
                      transition: 'all 0.2s ease',
                      width: '100%',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #f6851b, #e2761b)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '18px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      M
                    </div>
                    <div>
                      <div style={{ ...headingSm, fontSize: '14px', color: colors.textPrimary }}>
                        {walletConnecting
                          ? 'Connecting...'
                          : isInWorldApp && isMiniKitReady
                            ? 'Link World Wallet'
                            : 'Connect Wallet'}
                      </div>
                      <div style={{ ...textSecondary, fontSize: '12px' }}>
                        {isInWorldApp && isMiniKitReady
                          ? 'Approve Wallet Auth in World App to verify your wallet'
                          : 'Sign a message to verify wallet ownership'}
                      </div>
                    </div>
                  </button>
                )}

                {walletError && (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(244,63,94,0.24)',
                      background: 'rgba(244,63,94,0.06)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '13px',
                      color: '#e11d48',
                    }}
                  >
                    {walletError}
                  </div>
                )}
              </div>

              <div style={separator} />

              <p style={{ ...textSecondary, fontSize: '13px', marginBottom: '24px' }}>
                Wallet connection is optional. You can always add it later from your dashboard.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep(2)} className="btn-secondary" style={{ flex: 1 }}>
                  ← Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="btn-primary"
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {walletConnected ? 'Continue →' : 'Skip for now →'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && isClientOnly && (
            <div>
              <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>Company details</h2>
              <p style={{ ...textSecondary, fontSize: '14px', marginBottom: '28px' }}>
                Tell us a bit about your company so your client profile starts with the right context.
              </p>

              <div style={{ display: 'grid', gap: '20px', marginBottom: '28px' }}>
                <div style={reviewCardStyle}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={fieldLabelStyle}>Company Name</label>
                      <input
                        value={companyDetails.companyName}
                        onChange={(event) => setCompanyDetails((prev) => ({ ...prev, companyName: event.target.value }))}
                        placeholder="Acme Labs"
                        className="input"
                      />
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>Company Website</label>
                      <input
                        value={companyDetails.companyWebsite}
                        onChange={(event) => setCompanyDetails((prev) => ({ ...prev, companyWebsite: event.target.value }))}
                        placeholder="https://acme.com"
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Your Role</label>
                    <input
                      value={companyDetails.companyRole}
                      onChange={(event) => setCompanyDetails((prev) => ({ ...prev, companyRole: event.target.value }))}
                      placeholder="Founder, hiring manager, team lead..."
                      className="input"
                    />
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>What are you hiring for?</label>
                    <textarea
                      value={companyDetails.companyDescription}
                      onChange={(event) => setCompanyDetails((prev) => ({ ...prev, companyDescription: event.target.value }))}
                      placeholder="Share a short description of your company, hiring needs, or the type of talent you look for."
                      style={textareaStyle}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep(3)} className="btn-secondary" style={{ flex: 1 }}>
                  ← Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={finishDisabled}
                  className="btn-primary"
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {isLoading ? <LoadingSpinner /> : 'Finish Setup'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && !isClientOnly && (
            <div>
              <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>Connect platforms</h2>
              <p style={{ ...textSecondary, fontSize: '14px', marginBottom: '28px' }}>
                GitHub is optional but valuable. You can also prove reputation through uploaded evidence and client reviews.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <GitHubConnectButton
                  onConnect={() => setGithubConnected(true)}
                  isConnected={githubConnected}
                />

                {githubMessage && (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: `1px solid ${githubStatus === 'error' ? 'rgba(244,63,94,0.24)' : 'rgba(37,99,235,0.16)'}`,
                      background: githubStatus === 'error'
                        ? 'rgba(244,63,94,0.06)'
                        : 'rgba(37,99,235,0.05)',
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '13px',
                      color: githubStatus === 'error' ? colors.rose : colors.primary,
                    }}
                  >
                    {githubMessage}
                  </div>
                )}
              </div>

              <div style={separator} />

              <p style={{ ...textSecondary, fontSize: '13px', marginBottom: '24px' }}>
                No developer accounts? Continue anyway and strengthen your score with evidence in the next step.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep(3)} className="btn-secondary" style={{ flex: 1 }}>
                  ← Back
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="btn-primary"
                  style={{ flex: 2 }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 5 && !isClientOnly && (
            <div>
              <h2 style={{ ...headingMd, fontSize: '22px', marginBottom: '8px' }}>
                Add evidence
              </h2>
              <p style={{ ...textSecondary, fontSize: '14px', marginBottom: '28px' }}>
                Upload a LinkedIn PDF, add portfolio or project URLs, then review the structured evidence before it gets scored.
              </p>

              <div style={{ display: 'grid', gap: '20px', marginBottom: '28px' }}>
                <div style={reviewCardStyle}>
                  <div>
                    <label style={fieldLabelStyle}>LinkedIn Profile PDF</label>
                    <input
                      key={linkedinInputKey}
                      id="linkedin-file-input"
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      style={{ display: 'none' }}
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setLinkedinFile(file);
                        setNeedsEvidenceAnalysis(
                          hasPendingEvidenceInputs(portfolioUrlsText, projectUrlsText, file, supportingFiles)
                        );
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('linkedin-file-input')?.click()}
                      style={{
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: colors.primary,
                        background: 'rgba(37,99,235,0.06)',
                        border: '1.5px dashed rgba(37,99,235,0.3)',
                        borderRadius: '10px',
                        padding: '10px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(37,99,235,0.12)';
                        e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(37,99,235,0.06)';
                        e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Choose File
                    </button>
                    <p style={{ ...textSecondary, fontSize: '12px', marginTop: '8px' }}>
                      Best path for prior work history: upload a LinkedIn PDF export and we&apos;ll deterministically extract experience and skills.
                    </p>
                    {linkedinFile && (
                      <p style={{ ...textSecondary, fontSize: '12px', marginTop: '8px' }}>
                        Selected: {linkedinFile.name}
                      </p>
                    )}
                    {!linkedinFile && evidence.sourceFile && (
                      <p style={{ ...textSecondary, fontSize: '12px', marginTop: '8px' }}>
                        Parsed from: {evidence.sourceFile.original_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Supporting Documents</label>
                    <input
                      key={supportingInputKey}
                      id="supporting-file-input"
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt,.md"
                      style={{ display: 'none' }}
                      onChange={(event) => {
                        const files = Array.from(event.target.files || []);
                        setSupportingFiles(files);
                        setNeedsEvidenceAnalysis(
                          hasPendingEvidenceInputs(portfolioUrlsText, projectUrlsText, linkedinFile, files)
                        );
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('supporting-file-input')?.click()}
                      style={{
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: colors.primary,
                        background: 'rgba(37,99,235,0.06)',
                        border: '1.5px dashed rgba(37,99,235,0.3)',
                        borderRadius: '10px',
                        padding: '10px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(37,99,235,0.12)';
                        e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(37,99,235,0.06)';
                        e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Choose Files
                    </button>
                    <p style={{ ...textSecondary, fontSize: '12px', marginTop: '8px' }}>
                      Upload supporting docs for projects, case studies, or proof artifacts.
                    </p>
                    {supportingFiles.length > 0 && (
                      <p style={{ ...textSecondary, fontSize: '12px', marginTop: '8px' }}>
                        Selected: {supportingFiles.map((file) => file.name).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                <div style={reviewCardStyle}>
                  <div>
                    <label style={fieldLabelStyle}>Portfolio URLs</label>
                    <textarea
                      value={portfolioUrlsText}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setPortfolioUrlsText(nextValue);
                        setNeedsEvidenceAnalysis(
                          hasPendingEvidenceInputs(nextValue, projectUrlsText, linkedinFile, supportingFiles)
                        );
                      }}
                      placeholder="One URL per line"
                      style={textareaStyle}
                    />
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Project URLs Or Proof Links</label>
                    <textarea
                      value={projectUrlsText}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setProjectUrlsText(nextValue);
                        setNeedsEvidenceAnalysis(
                          hasPendingEvidenceInputs(portfolioUrlsText, nextValue, linkedinFile, supportingFiles)
                        );
                      }}
                      placeholder="GitHub repos, demos, docs, package pages, videos, app store links..."
                      style={textareaStyle}
                    />
                  </div>

                  <button
                    onClick={handleAnalyzeEvidence}
                    className="btn-primary"
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    disabled={isAnalyzingEvidence}
                  >
                    {isAnalyzingEvidence ? <LoadingSpinner /> : 'Analyze Evidence'}
                  </button>

                  {needsEvidenceAnalysis && hasPendingInputs && (
                    <p style={{ ...textSecondary, fontSize: '12px' }}>
                      Your latest files or URLs haven&apos;t been analyzed yet. Run the analyzer before finishing setup.
                    </p>
                  )}
                </div>
              </div>

              {evidenceError && (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(244,63,94,0.24)',
                    background: 'rgba(244,63,94,0.06)',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '13px',
                    color: colors.rose,
                    marginBottom: '20px',
                  }}
                >
                  {evidenceError}
                </div>
              )}

              {evidence.warnings.length > 0 && (
                <div
                  style={{
                    ...reviewCardStyle,
                    border: '1px solid rgba(37,99,235,0.16)',
                    background: 'rgba(37,99,235,0.05)',
                    marginBottom: '20px',
                  }}
                >
                  <label style={fieldLabelStyle}>Extraction Notes</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {evidence.warnings.map((warning) => (
                      <p key={warning} style={{ ...textSecondary, fontSize: '13px', margin: 0 }}>
                        {warning}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gap: '20px', marginBottom: '28px' }}>
                <div style={reviewCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <label style={fieldLabelStyle}>LinkedIn Work History Review</label>
                      <p style={{ ...textSecondary, fontSize: '12px', margin: 0 }}>
                        Add or edit any extracted roles before saving them into `linkedin_data`.
                      </p>
                    </div>
                    <button onClick={addManualExperience} className="btn-secondary">
                      + Add Experience
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: '12px' }}>
                    {evidence.experiences.length === 0 && (
                      <p style={{ ...textSecondary, fontSize: '13px', margin: 0 }}>
                        No experiences extracted yet. Upload a LinkedIn PDF or add entries manually.
                      </p>
                    )}

                    {evidence.experiences.map((experience) => (
                      <div key={experience.id} style={reviewCardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: colors.primary,
                              }}
                            >
                              {experience.source === 'manual' ? 'Manual' : 'Extracted'}
                            </span>
                          </div>
                          <button onClick={() => removeExperience(experience.id)} className="btn-secondary">
                            Remove
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <input
                            value={experience.title}
                            onChange={(event) => updateExperienceField(experience.id, 'title', event.target.value)}
                            placeholder="Role title"
                            className="input"
                          />
                          <input
                            value={experience.company}
                            onChange={(event) => updateExperienceField(experience.id, 'company', event.target.value)}
                            placeholder="Company"
                            className="input"
                          />
                          <input
                            value={experience.start_date}
                            onChange={(event) => updateExperienceField(experience.id, 'start_date', event.target.value)}
                            placeholder="Start date (e.g. Jan 2022)"
                            className="input"
                          />
                          <input
                            value={experience.end_date}
                            onChange={(event) => updateExperienceField(experience.id, 'end_date', event.target.value)}
                            placeholder="End date or Present"
                            className="input"
                          />
                        </div>

                        <textarea
                          value={experience.description}
                          onChange={(event) => updateExperienceField(experience.id, 'description', event.target.value)}
                          placeholder="Describe the work, scope, or impact"
                          style={textareaStyle}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <input
                            value={experience.skillsText}
                            onChange={(event) => updateExperienceField(experience.id, 'skillsText', event.target.value)}
                            placeholder="Skills (comma-separated)"
                            className="input"
                          />
                          <input
                            value={experience.technologiesText}
                            onChange={(event) => updateExperienceField(experience.id, 'technologiesText', event.target.value)}
                            placeholder="Technologies (comma-separated)"
                            className="input"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <input
                      value={evidence.skillsText}
                      onChange={(event) => setEvidence((prev) => ({ ...prev, skillsText: event.target.value }))}
                      placeholder="LinkedIn skills"
                      className="input"
                    />
                    <input
                      value={evidence.topSkillsText}
                      onChange={(event) => setEvidence((prev) => ({ ...prev, topSkillsText: event.target.value }))}
                      placeholder="Top skills"
                      className="input"
                    />
                    <input
                      value={evidence.specializationsText}
                      onChange={(event) => setEvidence((prev) => ({ ...prev, specializationsText: event.target.value }))}
                      placeholder="Specializations"
                      className="input"
                    />
                  </div>
                </div>

                <div style={reviewCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <label style={fieldLabelStyle}>Project And Portfolio Evidence</label>
                      <p style={{ ...textSecondary, fontSize: '12px', margin: 0 }}>
                        These entries feed directly into the existing reputation scorer. Proof links and solid descriptions are high signal.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={() => addManualItem('project')} className="btn-secondary">
                        + Add Project
                      </button>
                      <button onClick={() => addManualItem('portfolio')} className="btn-secondary">
                        + Add Portfolio
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '12px' }}>
                    {evidence.items.length === 0 && (
                      <p style={{ ...textSecondary, fontSize: '13px', margin: 0 }}>
                        No project cards yet. Analyze URLs or add a project manually.
                      </p>
                    )}

                    {evidence.items.map((item) => (
                      <div key={item.id} style={reviewCardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <select
                              value={item.kind}
                              onChange={(event) => updateItemField(item.id, 'kind', event.target.value)}
                              className="input"
                              style={{ minWidth: '150px' }}
                            >
                              <option value="project">Project</option>
                              <option value="portfolio">Portfolio</option>
                              <option value="work_sample">Work Sample</option>
                            </select>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: colors.primary,
                              }}
                            >
                              {item.source === 'manual' ? 'Manual' : 'Extracted'}
                            </span>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="btn-secondary">
                            Remove
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <input
                            value={item.title}
                            onChange={(event) => updateItemField(item.id, 'title', event.target.value)}
                            placeholder={`${kindLabel(item.kind)} title`}
                            className="input"
                          />
                          <input
                            value={item.role}
                            onChange={(event) => updateItemField(item.id, 'role', event.target.value)}
                            placeholder="Your role"
                            className="input"
                          />
                          <input
                            value={item.url}
                            onChange={(event) => updateItemField(item.id, 'url', event.target.value)}
                            placeholder="Primary URL"
                            className="input"
                          />
                          <input
                            value={item.proofUrlsText}
                            onChange={(event) => updateItemField(item.id, 'proofUrlsText', event.target.value)}
                            placeholder="Proof URLs (comma-separated)"
                            className="input"
                          />
                          <input
                            value={item.start_date}
                            onChange={(event) => updateItemField(item.id, 'start_date', event.target.value)}
                            placeholder="Start date"
                            className="input"
                          />
                          <input
                            value={item.end_date}
                            onChange={(event) => updateItemField(item.id, 'end_date', event.target.value)}
                            placeholder="End date"
                            className="input"
                          />
                        </div>

                        <textarea
                          value={item.description}
                          onChange={(event) => updateItemField(item.id, 'description', event.target.value)}
                          placeholder="Describe the project, impact, or proof"
                          style={textareaStyle}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                          <input
                            value={item.skillsText}
                            onChange={(event) => updateItemField(item.id, 'skillsText', event.target.value)}
                            placeholder="Skills"
                            className="input"
                          />
                          <input
                            value={item.technologiesText}
                            onChange={(event) => updateItemField(item.id, 'technologiesText', event.target.value)}
                            placeholder="Technologies"
                            className="input"
                          />
                          <input
                            value={item.tagsText}
                            onChange={(event) => updateItemField(item.id, 'tagsText', event.target.value)}
                            placeholder="Tags"
                            className="input"
                          />
                        </div>

                        <input
                          value={item.updated_at}
                          onChange={(event) => updateItemField(item.id, 'updated_at', event.target.value)}
                          placeholder="Updated at (optional; defaults to now)"
                          className="input"
                        />

                        {item.source_file && (
                          <p style={{ ...textSecondary, fontSize: '12px', margin: 0 }}>
                            Source file: {item.source_file.original_name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {evidence.uploadedFiles.length > 0 && (
                  <div style={reviewCardStyle}>
                    <label style={fieldLabelStyle}>Uploaded Files</label>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {evidence.uploadedFiles.map((file) => (
                        <div key={file.path} style={{ ...textSecondary, fontSize: '13px' }}>
                          {file.original_name} · {kindLabel(file.kind === 'linkedin_pdf' ? 'work_sample' : 'work_sample')} · {(file.size_bytes / 1024).toFixed(1)} KB
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep(4)} className="btn-secondary" style={{ flex: 1 }}>
                  ← Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={finishDisabled}
                  className="btn-primary"
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {isLoading ? <LoadingSpinner /> : 'Finish Setup'}
                </button>
              </div>
            </div>
          )}
        </GlassCard>

        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}
