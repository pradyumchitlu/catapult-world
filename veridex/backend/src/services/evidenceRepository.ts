import supabase from '../lib/supabase';
import type {
  EvidenceExperienceDraft,
  EvidenceProjectDraft,
} from './evidenceExtraction';
import type { WorkerProfileRecord } from './reputationProfile';
import type { StoredEvidenceFile } from './evidenceStorage';

type JsonRecord = Record<string, any>;

export type EvidenceTriggerSource =
  | 'manual_save'
  | 'pipeline_rerun'
  | 'github_ingest'
  | 'legacy_backfill';

export type EvidenceExtractionMethod =
  | 'gemini'
  | 'deterministic'
  | 'hybrid'
  | 'backfill';

export type EvidenceRunStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type EvidenceSourceKind =
  | 'linkedin_file'
  | 'supporting_file'
  | 'portfolio_url'
  | 'project_url'
  | 'legacy_json';

export type EvidenceItemKind =
  | 'experience'
  | 'project'
  | 'portfolio'
  | 'work_sample';

export interface EvidenceExtractionRunRecord {
  id: string;
  worker_profile_id: string;
  user_id: string;
  trigger_source: EvidenceTriggerSource;
  extraction_method: EvidenceExtractionMethod;
  parser_version: string;
  status: EvidenceRunStatus;
  warning_message: string | null;
  error_message: string | null;
  metadata: JsonRecord;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceSourceRecord {
  id: string;
  worker_profile_id: string;
  user_id: string;
  extraction_run_id: string;
  source_kind: EvidenceSourceKind;
  is_active: boolean;
  source_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  file_name: string | null;
  original_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  content_sha256: string | null;
  captured_at: string;
  metadata: JsonRecord;
  created_at: string;
  updated_at: string;
}

export interface EvidenceItemRecord {
  id: string;
  worker_profile_id: string;
  user_id: string;
  extraction_run_id: string;
  primary_source_id: string | null;
  item_kind: EvidenceItemKind;
  is_active: boolean;
  title: string | null;
  company: string | null;
  role: string | null;
  description: string | null;
  url: string | null;
  proof_urls: string[];
  start_date: string | null;
  end_date: string | null;
  evidence_updated_at: string | null;
  skills: string[];
  technologies: string[];
  tags: string[];
  raw_snapshot: JsonRecord;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkerEvidenceSnapshot {
  linkedinData: JsonRecord;
  otherPlatforms: JsonRecord;
  run: EvidenceExtractionRunRecord | null;
  sources: EvidenceSourceRecord[];
  items: EvidenceItemRecord[];
  usesNormalizedEvidence: boolean;
}

export interface SaveNormalizedEvidenceOptions {
  profile: WorkerProfileRecord;
  userId: string;
  linkedinData: JsonRecord;
  otherPlatforms: JsonRecord;
  triggerSource?: EvidenceTriggerSource;
  extractionMethod?: EvidenceExtractionMethod;
  parserVersion?: string;
  warningMessage?: string | null;
}

interface PreparedSource {
  fingerprint: string;
  source_kind: EvidenceSourceKind;
  source_url?: string | null;
  stored_file?: StoredEvidenceFile | null;
  metadata?: JsonRecord;
}

interface PreparedItem {
  item_kind: EvidenceItemKind;
  primary_source_fingerprint: string | null;
  payload: EvidenceExperienceDraft | EvidenceProjectDraft;
  sort_order: number;
}

function isPlainObject(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

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

function uniqueStrings(value: unknown): string[] {
  const strings = safeArray(value)
    .flatMap((entry) => typeof entry === 'string' ? [entry.trim()] : [])
    .filter(Boolean);
  return [...new Set(strings)];
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeJson(value: unknown): JsonRecord {
  return isPlainObject(value) ? value : {};
}

function normalizeStoredFile(value: unknown): StoredEvidenceFile | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const bucket = normalizeText(value.bucket);
  const objectPath = normalizeText(value.path);
  const fileName = normalizeText(value.file_name);
  const originalName = normalizeText(value.original_name);
  const uploadedAt = normalizeText(value.uploaded_at);
  const kind = value.kind === 'linkedin_pdf' ? 'linkedin_pdf' : 'supporting_document';

  if (!bucket || !objectPath || !fileName || !originalName || !uploadedAt) {
    return null;
  }

  return {
    bucket,
    path: objectPath,
    file_name: fileName,
    original_name: originalName,
    content_type: normalizeText(value.content_type) || 'application/octet-stream',
    size_bytes: Number(value.size_bytes || 0),
    uploaded_at: uploadedAt,
    kind,
  };
}

function storedFileFingerprint(file: StoredEvidenceFile): string {
  return `file:${file.bucket}:${file.path}`;
}

function urlFingerprint(kind: EvidenceSourceKind, url: string): string {
  return `url:${kind}:${url}`;
}

function legacyFingerprint(): string {
  return 'legacy:profile';
}

function inferSourceKindFromFile(file: StoredEvidenceFile): EvidenceSourceKind {
  return file.kind === 'linkedin_pdf' ? 'linkedin_file' : 'supporting_file';
}

function sourceKindForItemUrl(kind: EvidenceItemKind): EvidenceSourceKind {
  return kind === 'portfolio' ? 'portfolio_url' : 'project_url';
}

function toStoredEvidenceFile(source: EvidenceSourceRecord): StoredEvidenceFile | null {
  if (!source.storage_bucket || !source.storage_path || !source.original_name) {
    return null;
  }

  return {
    bucket: source.storage_bucket,
    path: source.storage_path,
    file_name: source.file_name || source.original_name,
    original_name: source.original_name,
    content_type: source.content_type || 'application/octet-stream',
    size_bytes: Number(source.size_bytes || 0),
    uploaded_at: source.captured_at,
    kind: source.source_kind === 'linkedin_file' ? 'linkedin_pdf' : 'supporting_document',
  };
}

function compactJson(value: JsonRecord): JsonRecord {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (Array.isArray(entry)) {
        return entry.length > 0;
      }

      if (entry && typeof entry === 'object') {
        return Object.keys(entry as JsonRecord).length > 0;
      }

      return entry !== null && entry !== undefined && entry !== '';
    })
  );
}

function latestByCreatedAt<T extends { created_at: string }>(rows: T[]): T | null {
  if (rows.length === 0) {
    return null;
  }

  return [...rows].sort((left, right) =>
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  )[0];
}

function buildRunMetadata(linkedinData: JsonRecord, otherPlatforms: JsonRecord): JsonRecord {
  return compactJson({
    linkedin_data: compactJson({
      source_type: normalizeText(linkedinData.source_type),
      raw_text_excerpt: normalizeText(linkedinData.raw_text_excerpt),
      uploaded_at: normalizeText(linkedinData.uploaded_at),
      skills: uniqueStrings(linkedinData.skills),
      top_skills: uniqueStrings(linkedinData.top_skills),
      specializations: uniqueStrings(linkedinData.specializations),
    }),
    other_platforms: compactJson({
      uploaded_files_count: safeArray(otherPlatforms.uploaded_files).length,
    }),
  });
}

function buildPreparedSources(
  linkedinData: JsonRecord,
  otherPlatforms: JsonRecord
): PreparedSource[] {
  const prepared = new Map<string, PreparedSource>();
  const addSource = (source: PreparedSource) => {
    if (!prepared.has(source.fingerprint)) {
      prepared.set(source.fingerprint, source);
    }
  };

  const linkedinSource = normalizeStoredFile(linkedinData.source_file);
  if (linkedinSource) {
    addSource({
      fingerprint: storedFileFingerprint(linkedinSource),
      source_kind: 'linkedin_file',
      stored_file: linkedinSource,
    });
  }

  for (const rawFile of safeArray(otherPlatforms.uploaded_files)) {
    const file = normalizeStoredFile(rawFile);
    if (!file) {
      continue;
    }

    addSource({
      fingerprint: storedFileFingerprint(file),
      source_kind: inferSourceKindFromFile(file),
      stored_file: file,
    });
  }

  const itemGroups: Array<{ kind: EvidenceItemKind; values: any[] }> = [
    { kind: 'project', values: safeArray(otherPlatforms.projects) },
    { kind: 'portfolio', values: safeArray(otherPlatforms.portfolio) },
    { kind: 'work_sample', values: safeArray(otherPlatforms.work_samples) },
  ];

  for (const group of itemGroups) {
    for (const rawItem of group.values) {
      const item = normalizeJson(rawItem);
      const file = normalizeStoredFile(item.source_file);
      if (file) {
        addSource({
          fingerprint: storedFileFingerprint(file),
          source_kind: inferSourceKindFromFile(file),
          stored_file: file,
        });
      }

      const url = normalizeText(item.url);
      if (url) {
        const sourceKind = sourceKindForItemUrl(group.kind);
        addSource({
          fingerprint: urlFingerprint(sourceKind, url),
          source_kind: sourceKind,
          source_url: url,
          metadata: compactJson({ inferred_from_item_kind: group.kind }),
        });
      }
    }
  }

  if (prepared.size === 0 && (hasMeaningfulData(linkedinData) || hasMeaningfulData(otherPlatforms))) {
    addSource({
      fingerprint: legacyFingerprint(),
      source_kind: 'legacy_json',
      metadata: { fallback: true },
    });
  }

  return [...prepared.values()];
}

function buildPreparedItems(
  linkedinData: JsonRecord,
  otherPlatforms: JsonRecord
): PreparedItem[] {
  const linkedinSource = normalizeStoredFile(linkedinData.source_file);
  const fallbackFingerprint = legacyFingerprint();
  const experienceSourceFingerprint = linkedinSource
    ? storedFileFingerprint(linkedinSource)
    : fallbackFingerprint;

  const items: PreparedItem[] = [];

  safeArray(linkedinData.experiences).forEach((rawExperience, index) => {
    const experience = normalizeJson(rawExperience);
    items.push({
      item_kind: 'experience',
      primary_source_fingerprint: experienceSourceFingerprint,
      payload: compactJson({
        title: normalizeText(experience.title),
        company: normalizeText(experience.company),
        start_date: normalizeText(experience.start_date),
        end_date: normalizeText(experience.end_date),
        description: normalizeText(experience.description),
        skills: uniqueStrings(experience.skills),
        technologies: uniqueStrings(experience.technologies),
      }),
      sort_order: index,
    });
  });

  const itemGroups: Array<{ kind: EvidenceItemKind; values: any[] }> = [
    { kind: 'project', values: safeArray(otherPlatforms.projects) },
    { kind: 'portfolio', values: safeArray(otherPlatforms.portfolio) },
    { kind: 'work_sample', values: safeArray(otherPlatforms.work_samples) },
  ];

  for (const group of itemGroups) {
    group.values.forEach((rawItem, index) => {
      const item = normalizeJson(rawItem);
      const file = normalizeStoredFile(item.source_file);
      const url = normalizeText(item.url);
      const primarySourceFingerprint = file
        ? storedFileFingerprint(file)
        : (url ? urlFingerprint(sourceKindForItemUrl(group.kind), url) : fallbackFingerprint);

      items.push({
        item_kind: group.kind,
        primary_source_fingerprint: primarySourceFingerprint,
        payload: compactJson({
          title: normalizeText(item.title),
          company: normalizeText(item.company),
          role: normalizeText(item.role),
          description: normalizeText(item.description),
          url,
          proof_urls: uniqueStrings(item.proof_urls),
          start_date: normalizeText(item.start_date),
          end_date: normalizeText(item.end_date),
          updated_at: normalizeText(item.updated_at),
          skills: uniqueStrings(item.skills),
          technologies: uniqueStrings(item.technologies),
          tags: uniqueStrings(item.tags),
          source_file: file || undefined,
        }),
        sort_order: index,
      });
    });
  }

  return items;
}

function projectExperienceItem(item: EvidenceItemRecord): EvidenceExperienceDraft {
  return compactJson({
    title: item.title,
    company: item.company,
    start_date: item.start_date,
    end_date: item.end_date,
    description: item.description,
    skills: uniqueStrings(item.skills),
    technologies: uniqueStrings(item.technologies),
  });
}

function projectProjectItem(
  item: EvidenceItemRecord,
  sourceMap: Map<string, EvidenceSourceRecord>
): EvidenceProjectDraft {
  const primarySource = item.primary_source_id ? sourceMap.get(item.primary_source_id) || null : null;

  return compactJson({
    title: item.title,
    company: item.company,
    role: item.role,
    description: item.description,
    url: item.url,
    proof_urls: uniqueStrings(item.proof_urls),
    start_date: item.start_date,
    end_date: item.end_date,
    updated_at: item.evidence_updated_at,
    skills: uniqueStrings(item.skills),
    technologies: uniqueStrings(item.technologies),
    tags: uniqueStrings(item.tags),
    source_file: primarySource ? toStoredEvidenceFile(primarySource) || undefined : undefined,
  });
}

function projectSnapshotFromRows(
  profile: WorkerProfileRecord,
  run: EvidenceExtractionRunRecord | null,
  sources: EvidenceSourceRecord[],
  items: EvidenceItemRecord[]
): WorkerEvidenceSnapshot {
  if (sources.length === 0 && items.length === 0) {
    return {
      linkedinData: normalizeJson(profile.linkedin_data),
      otherPlatforms: normalizeJson(profile.other_platforms),
      run: null,
      sources: [],
      items: [],
      usesNormalizedEvidence: false,
    };
  }

  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const linkedinSource = latestByCreatedAt(
    sources.filter((source) => source.source_kind === 'linkedin_file')
  );
  const uploadedFiles = sources
    .map((source) => toStoredEvidenceFile(source))
    .filter((file): file is StoredEvidenceFile => Boolean(file));

  const metadata = normalizeJson(run?.metadata);
  const linkedinMetadata = normalizeJson(metadata.linkedin_data);

  const experiences = items
    .filter((item) => item.item_kind === 'experience')
    .sort((left, right) => left.sort_order - right.sort_order)
    .map(projectExperienceItem);
  const projects = items
    .filter((item) => item.item_kind === 'project')
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((item) => projectProjectItem(item, sourceMap));
  const portfolio = items
    .filter((item) => item.item_kind === 'portfolio')
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((item) => projectProjectItem(item, sourceMap));
  const workSamples = items
    .filter((item) => item.item_kind === 'work_sample')
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((item) => projectProjectItem(item, sourceMap));

  const derivedSkills = uniqueStrings([
    ...uniqueStrings(linkedinMetadata.skills),
    ...experiences.flatMap((experience) => uniqueStrings(experience.skills)),
    ...projects.flatMap((item) => uniqueStrings(item.skills)),
    ...portfolio.flatMap((item) => uniqueStrings(item.skills)),
    ...workSamples.flatMap((item) => uniqueStrings(item.skills)),
  ]);
  const derivedSpecializations = uniqueStrings([
    ...uniqueStrings(linkedinMetadata.specializations),
    ...derivedSkills.slice(0, 5),
  ]);

  return {
    linkedinData: compactJson({
      source_type: normalizeText(linkedinMetadata.source_type) || (linkedinSource ? 'linkedin_pdf' : null),
      source_file: linkedinSource ? toStoredEvidenceFile(linkedinSource) : undefined,
      uploaded_at: normalizeText(linkedinMetadata.uploaded_at) || linkedinSource?.captured_at || run?.created_at || null,
      raw_text_excerpt: normalizeText(linkedinMetadata.raw_text_excerpt),
      experiences,
      skills: uniqueStrings(linkedinMetadata.skills).length > 0
        ? uniqueStrings(linkedinMetadata.skills)
        : derivedSkills,
      top_skills: uniqueStrings(linkedinMetadata.top_skills).length > 0
        ? uniqueStrings(linkedinMetadata.top_skills)
        : derivedSkills.slice(0, 10),
      specializations: derivedSpecializations,
    }),
    otherPlatforms: compactJson({
      projects,
      portfolio,
      work_samples: workSamples,
      uploaded_files: uploadedFiles,
    }),
    run,
    sources,
    items,
    usesNormalizedEvidence: true,
  };
}

async function createEvidenceRun(
  profile: WorkerProfileRecord,
  userId: string,
  options: SaveNormalizedEvidenceOptions
): Promise<EvidenceExtractionRunRecord> {
  const { data, error } = await supabase
    .from('evidence_extraction_runs')
    .insert({
      worker_profile_id: profile.id,
      user_id: userId,
      trigger_source: options.triggerSource || 'manual_save',
      extraction_method: options.extractionMethod || 'deterministic',
      parser_version: options.parserVersion || 'v1',
      status: 'processing',
      warning_message: options.warningMessage || null,
      metadata: buildRunMetadata(options.linkedinData, options.otherPlatforms),
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error || !data) {
    throw error || new Error('Failed to create evidence extraction run');
  }

  return data as EvidenceExtractionRunRecord;
}

async function completeEvidenceRun(
  runId: string,
  patch: Partial<EvidenceExtractionRunRecord>
): Promise<void> {
  const { error } = await supabase
    .from('evidence_extraction_runs')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', runId);

  if (error) {
    throw error;
  }
}

export async function loadWorkerEvidenceSnapshot(
  profile: WorkerProfileRecord
): Promise<WorkerEvidenceSnapshot> {
  const [{ data: runs, error: runsError }, { data: sources, error: sourcesError }, { data: items, error: itemsError }] = await Promise.all([
    supabase
      .from('evidence_extraction_runs')
      .select('*')
      .eq('worker_profile_id', profile.id)
      .in('status', ['completed', 'processing'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('evidence_sources')
      .select('*')
      .eq('worker_profile_id', profile.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('evidence_items')
      .select('*')
      .eq('worker_profile_id', profile.id)
      .eq('is_active', true)
      .order('item_kind', { ascending: true })
      .order('sort_order', { ascending: true }),
  ]);

  if (runsError) {
    throw runsError;
  }

  if (sourcesError) {
    throw sourcesError;
  }

  if (itemsError) {
    throw itemsError;
  }

  const latestRun = latestByCreatedAt((runs || []) as EvidenceExtractionRunRecord[]);
  return projectSnapshotFromRows(
    profile,
    latestRun,
    (sources || []) as EvidenceSourceRecord[],
    (items || []) as EvidenceItemRecord[]
  );
}

export async function saveNormalizedEvidenceSnapshot(
  options: SaveNormalizedEvidenceOptions
): Promise<WorkerEvidenceSnapshot> {
  const { profile, userId, linkedinData, otherPlatforms } = options;
  const run = await createEvidenceRun(profile, userId, options);

  try {
    const preparedSources = buildPreparedSources(linkedinData, otherPlatforms);
    const { data: insertedSources, error: sourcesError } = await supabase
      .from('evidence_sources')
      .insert(preparedSources.map((source) => ({
        worker_profile_id: profile.id,
        user_id: userId,
        extraction_run_id: run.id,
        source_kind: source.source_kind,
        is_active: true,
        source_url: source.source_url || null,
        storage_bucket: source.stored_file?.bucket || null,
        storage_path: source.stored_file?.path || null,
        file_name: source.stored_file?.file_name || null,
        original_name: source.stored_file?.original_name || null,
        content_type: source.stored_file?.content_type || null,
        size_bytes: source.stored_file?.size_bytes ?? null,
        content_sha256: null,
        captured_at: source.stored_file?.uploaded_at || new Date().toISOString(),
        metadata: compactJson({
          fingerprint: source.fingerprint,
          ...(source.metadata || {}),
        }),
        updated_at: new Date().toISOString(),
      })))
      .select('*');

    if (sourcesError) {
      throw sourcesError;
    }

    const sourceIdByFingerprint = new Map<string, string>();
    for (const source of (insertedSources || []) as EvidenceSourceRecord[]) {
      const fingerprint = normalizeText(source.metadata?.fingerprint);
      if (fingerprint) {
        sourceIdByFingerprint.set(fingerprint, source.id);
      }
    }

    const preparedItems = buildPreparedItems(linkedinData, otherPlatforms);
    if (preparedItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('evidence_items')
        .insert(preparedItems.map((item) => {
          const payload = normalizeJson(item.payload);
          return {
            worker_profile_id: profile.id,
            user_id: userId,
            extraction_run_id: run.id,
            primary_source_id: item.primary_source_fingerprint
              ? sourceIdByFingerprint.get(item.primary_source_fingerprint) || null
              : null,
            item_kind: item.item_kind,
            is_active: true,
            title: normalizeText(payload.title),
            company: normalizeText(payload.company),
            role: normalizeText(payload.role),
            description: normalizeText(payload.description),
            url: normalizeText(payload.url),
            proof_urls: uniqueStrings(payload.proof_urls),
            start_date: normalizeText(payload.start_date),
            end_date: normalizeText(payload.end_date),
            evidence_updated_at: normalizeText(payload.updated_at),
            skills: uniqueStrings(payload.skills),
            technologies: uniqueStrings(payload.technologies),
            tags: uniqueStrings(payload.tags),
            raw_snapshot: payload,
            sort_order: item.sort_order,
            updated_at: new Date().toISOString(),
          };
        }));

      if (itemsError) {
        throw itemsError;
      }
    }

    await Promise.all([
      supabase
        .from('evidence_sources')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('worker_profile_id', profile.id)
        .eq('is_active', true)
        .neq('extraction_run_id', run.id),
      supabase
        .from('evidence_items')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('worker_profile_id', profile.id)
        .eq('is_active', true)
        .neq('extraction_run_id', run.id),
    ]);

    await completeEvidenceRun(run.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      metadata: buildRunMetadata(linkedinData, otherPlatforms),
    });

    return loadWorkerEvidenceSnapshot(profile);
  } catch (error) {
    await completeEvidenceRun(run.id, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Failed to save normalized evidence',
      completed_at: new Date().toISOString(),
    });
    throw error;
  }
}
