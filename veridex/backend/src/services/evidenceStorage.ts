import crypto from 'crypto';
import path from 'path';
import supabase from '../lib/supabase';

export type EvidenceFileKind = 'linkedin_pdf' | 'supporting_document';

export interface StoredEvidenceFile {
  bucket: string;
  path: string;
  file_name: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
  kind: EvidenceFileKind;
}

const DEFAULT_EVIDENCE_BUCKET = process.env.EVIDENCE_STORAGE_BUCKET || 'worker-evidence';

let ensureBucketPromise: Promise<void> | null = null;

function sanitizeFileStem(fileName: string): string {
  const stem = path.parse(fileName).name;
  return stem
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'evidence';
}

async function ensureEvidenceBucket(bucket = DEFAULT_EVIDENCE_BUCKET): Promise<void> {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) {
        throw listError;
      }

      const existing = buckets?.some((entry) => entry.name === bucket);
      if (existing) {
        return;
      }

      const { error: createError } = await supabase.storage.createBucket(bucket, {
        public: false,
      });

      if (createError && !/already exists/i.test(createError.message)) {
        throw createError;
      }
    })().catch((error) => {
      ensureBucketPromise = null;
      throw error;
    });
  }

  return ensureBucketPromise;
}

export async function storeEvidenceFile(
  userId: string,
  file: Express.Multer.File,
  kind: EvidenceFileKind
): Promise<StoredEvidenceFile> {
  const bucket = DEFAULT_EVIDENCE_BUCKET;
  await ensureEvidenceBucket(bucket);

  const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
  const hash = crypto.createHash('sha256').update(file.buffer).digest('hex').slice(0, 12);
  const folderDate = new Date().toISOString().slice(0, 10);
  const safeStem = sanitizeFileStem(file.originalname || `${kind}${ext}`);
  const objectPath = `${userId}/${kind}/${folderDate}/${Date.now()}-${hash}-${safeStem}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  return {
    bucket,
    path: objectPath,
    file_name: path.basename(objectPath),
    original_name: file.originalname,
    content_type: file.mimetype || 'application/octet-stream',
    size_bytes: file.size,
    uploaded_at: new Date().toISOString(),
    kind,
  };
}
