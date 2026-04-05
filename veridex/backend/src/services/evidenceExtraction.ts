import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { load } from 'cheerio';
import path from 'path';
import type { StoredEvidenceFile } from './evidenceStorage';

export interface EvidenceExperienceDraft {
  title?: string;
  company?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  skills?: string[];
  technologies?: string[];
}

export interface EvidenceProjectDraft {
  title?: string;
  role?: string;
  description?: string;
  url?: string;
  proof_urls?: string[];
  start_date?: string;
  end_date?: string;
  updated_at?: string;
  skills?: string[];
  technologies?: string[];
  tags?: string[];
  source_file?: StoredEvidenceFile;
}

export interface EvidenceUploadDraft {
  linkedin_data: Record<string, any>;
  projects: EvidenceProjectDraft[];
  other_platforms: Record<string, any>;
  uploaded_files: StoredEvidenceFile[];
  warnings: string[];
}

export interface UploadedEvidenceInput {
  file: Express.Multer.File;
  stored: StoredEvidenceFile;
}

interface ExtractEvidenceOptions {
  linkedinFile?: UploadedEvidenceInput | null;
  supportingFiles?: UploadedEvidenceInput[];
  portfolioUrls?: string[];
  projectUrls?: string[];
}

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.md']);

const SECTION_HEADINGS = new Set([
  'about',
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'licenses & certifications',
  'licenses and certifications',
  'languages',
  'volunteer experience',
  'accomplishments',
]);

const SKILL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'JavaScript', pattern: /\bjavascript\b/i },
  { label: 'TypeScript', pattern: /\btypescript\b/i },
  { label: 'Python', pattern: /\bpython\b/i },
  { label: 'Java', pattern: /\bjava\b/i },
  { label: 'Rust', pattern: /\brust\b/i },
  { label: 'Go', pattern: /\bgo(lang)?\b/i },
  { label: 'C', pattern: /(^|[^+])\bc\b(?!\+\+)/i },
  { label: 'C++', pattern: /\bc\+\+\b/i },
  { label: 'React', pattern: /\breact\b/i },
  { label: 'Next.js', pattern: /\bnext\.?js\b/i },
  { label: 'Node.js', pattern: /\bnode\.?js\b/i },
  { label: 'Express', pattern: /\bexpress\b/i },
  { label: 'HTML', pattern: /\bhtml\b/i },
  { label: 'CSS', pattern: /\bcss\b/i },
  { label: 'Tailwind CSS', pattern: /\btailwind\b/i },
  { label: 'PostgreSQL', pattern: /\bpostgres(ql)?\b/i },
  { label: 'SQL', pattern: /\bsql\b/i },
  { label: 'Supabase', pattern: /\bsupabase\b/i },
  { label: 'Docker', pattern: /\bdocker\b/i },
  { label: 'Kubernetes', pattern: /\bkubernetes\b|\bk8s\b/i },
  { label: 'AWS', pattern: /\baws\b|\bamazon web services\b/i },
  { label: 'GCP', pattern: /\bgcp\b|\bgoogle cloud\b/i },
  { label: 'TensorFlow', pattern: /\btensorflow\b/i },
  { label: 'PyTorch', pattern: /\bpytorch\b/i },
  { label: 'Machine Learning', pattern: /\bmachine learning\b/i },
  { label: 'Data Science', pattern: /\bdata science\b/i },
  { label: 'Swift', pattern: /\bswift\b/i },
  { label: 'Kotlin', pattern: /\bkotlin\b/i },
  { label: 'Figma', pattern: /\bfigma\b/i },
  { label: 'UI/UX', pattern: /\bui\/ux\b|\bux\b|\buser experience\b/i },
];

const PROOF_LINK_PATTERNS = [
  /github\.com/i,
  /vercel\.app/i,
  /netlify\.app/i,
  /docs\./i,
  /readthedocs/i,
  /npmjs\.com/i,
  /pypi\.org/i,
  /rubygems\.org/i,
  /play\.google\.com/i,
  /apps\.apple\.com/i,
  /youtube\.com/i,
  /youtu\.be/i,
  /loom\.com/i,
];

function cleanLines(text: string): string[] {
  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function excerpt(text: string, maxLength = 320): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1)}…`;
}

function safeUrl(raw: string): string | null {
  try {
    return new URL(raw).toString();
  } catch (error) {
    return null;
  }
}

function normalizeHeading(value: string): string {
  return value.toLowerCase().replace(/[:\s]+$/g, '').trim();
}

function inferSkills(text: string): string[] {
  return SKILL_PATTERNS
    .filter((entry) => entry.pattern.test(text))
    .map((entry) => entry.label);
}

function extractUrlsFromText(text: string): string[] {
  return dedupe((text.match(/https?:\/\/[^\s)]+/g) || []).map((value) => value.replace(/[.,;]+$/g, '')));
}

function filterProofUrls(urls: string[]): string[] {
  return dedupe(urls.filter((url) => PROOF_LINK_PATTERNS.some((pattern) => pattern.test(url)))).slice(0, 10);
}

function getSectionLines(lines: string[], heading: string): string[] {
  const normalizedHeading = normalizeHeading(heading);
  const start = lines.findIndex((line) => normalizeHeading(line) === normalizedHeading);
  if (start === -1) {
    return [];
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (SECTION_HEADINGS.has(normalizeHeading(lines[index]))) {
      end = index;
      break;
    }
  }

  return lines.slice(start + 1, end);
}

function parseSkillsSection(lines: string[], fallbackText: string): string[] {
  const values = lines.flatMap((line) =>
    line
      .split(/[•,|]/)
      .map((entry) => entry.replace(/\d+\s*endorsements?/gi, '').trim())
      .filter((entry) => /[a-z]/i.test(entry) && entry.length <= 40)
  );

  const combined = dedupe(values);
  if (combined.length > 0) {
    return combined.slice(0, 20);
  }

  return inferSkills(fallbackText).slice(0, 20);
}

function normalizeCompanyLine(line: string): string {
  return line.split('·')[0]?.trim() || line.trim();
}

function extractDateRange(line: string): { start_date: string; end_date?: string } | null {
  const monthPattern = '(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)';
  const datePattern = `${monthPattern}\\s+\\d{4}`;
  const regex = new RegExp(`(${datePattern})\\s*(?:-|–|—|to)\\s*(Present|Current|Ongoing|${datePattern})`, 'i');
  const match = line.match(regex);

  if (!match) {
    return null;
  }

  return {
    start_date: match[1],
    end_date: match[2],
  };
}

function parseLinkedInExperiences(lines: string[], fullText: string): EvidenceExperienceDraft[] {
  const experiences: EvidenceExperienceDraft[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const range = extractDateRange(lines[index]);
    if (!range) {
      continue;
    }

    const companyLine = lines[index - 1] || '';
    const titleLine = lines[index - 2] || companyLine || 'Professional Experience';
    const descriptionLines: string[] = [];

    let cursor = index + 1;
    while (cursor < lines.length && !extractDateRange(lines[cursor])) {
      if (SECTION_HEADINGS.has(normalizeHeading(lines[cursor]))) {
        break;
      }
      descriptionLines.push(lines[cursor]);
      cursor += 1;
    }

    const description = descriptionLines.join(' ').trim();
    const skillSource = `${titleLine} ${companyLine} ${description} ${fullText}`;
    experiences.push({
      title: titleLine,
      company: normalizeCompanyLine(companyLine),
      start_date: range.start_date,
      end_date: range.end_date,
      description: description || undefined,
      skills: inferSkills(skillSource).slice(0, 10),
      technologies: inferSkills(description || skillSource).slice(0, 8),
    });
  }

  return experiences.slice(0, 15);
}

async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type: ${ext || file.mimetype || 'unknown'}`);
  }

  if (ext === '.pdf') {
    const parser = new PDFParse({ data: file.buffer });
    try {
      const parsed = await parser.getText();
      return parsed.text || '';
    } finally {
      await parser.destroy();
    }
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || '';
  }

  return file.buffer.toString('utf8');
}

function buildLinkedInDraft(file: StoredEvidenceFile, text: string): Record<string, any> {
  const lines = cleanLines(text);
  const experienceLines = getSectionLines(lines, 'Experience');
  const skillsLines = getSectionLines(lines, 'Skills');
  const experiences = parseLinkedInExperiences(experienceLines.length > 0 ? experienceLines : lines, text);
  const skills = parseSkillsSection(skillsLines, text);

  return {
    source_type: 'linkedin_pdf',
    source_file: file,
    uploaded_at: file.uploaded_at,
    experiences,
    skills,
    top_skills: skills.slice(0, 10),
    specializations: skills.slice(0, 5),
    raw_text_excerpt: excerpt(text, 800),
  };
}

function buildWorkSampleDraft(file: StoredEvidenceFile, text: string): EvidenceProjectDraft {
  const urls = extractUrlsFromText(text);
  const inferredSkills = inferSkills(text);

  return {
    title: path.parse(file.original_name).name || 'Uploaded work sample',
    description: excerpt(text),
    proof_urls: filterProofUrls(urls),
    updated_at: file.uploaded_at,
    skills: inferredSkills.slice(0, 12),
    technologies: inferredSkills.slice(0, 10),
    tags: dedupe(['uploaded file', path.extname(file.original_name).replace('.', '')]).slice(0, 5),
    source_file: file,
  };
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VeridexEvidenceBot/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function buildUrlDraft(url: string, type: 'portfolio' | 'project', html: string | null): EvidenceProjectDraft {
  const normalizedUrl = safeUrl(url) || url;
  const fallbackHostname = (() => {
    try {
      return new URL(normalizedUrl).hostname.replace(/^www\./, '');
    } catch (error) {
      return normalizedUrl;
    }
  })();

  if (!html) {
    return {
      title: fallbackHostname,
      description: '',
      url: normalizedUrl,
      proof_urls: [],
      updated_at: new Date().toISOString(),
      tags: [type],
    };
  }

  const $ = load(html);
  const title = $('title').first().text().trim() || fallbackHostname;
  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    excerpt($('p').slice(0, 3).text(), 320);

  const links = dedupe(
    $('a[href]')
      .map((_, element) => $(element).attr('href'))
      .get()
      .map((href) => {
        if (!href) {
          return null;
        }

        try {
          return new URL(href, normalizedUrl).toString();
        } catch (error) {
          return null;
        }
      })
      .filter((value): value is string => Boolean(value))
  );

  const pageText = `${title} ${description} ${$('main').text()} ${$('body').text()}`;
  const inferredSkills = inferSkills(pageText).slice(0, 12);

  return {
    title,
    description,
    url: normalizedUrl,
    proof_urls: filterProofUrls(links),
    updated_at: new Date().toISOString(),
    skills: inferredSkills,
    technologies: inferredSkills.slice(0, 8),
    tags: dedupe([type, ...links.map((link) => {
      try {
        return new URL(link).hostname.replace(/^www\./, '');
      } catch (error) {
        return '';
      }
    })]).slice(0, 6),
  };
}

async function extractUrlDrafts(
  urls: string[],
  type: 'portfolio' | 'project',
  warnings: string[]
): Promise<EvidenceProjectDraft[]> {
  const drafts: EvidenceProjectDraft[] = [];

  for (const rawUrl of urls) {
    const url = safeUrl(rawUrl);
    if (!url) {
      warnings.push(`Skipped invalid URL: ${rawUrl}`);
      continue;
    }

    try {
      const html = await fetchHtml(url);
      drafts.push(buildUrlDraft(url, type, html));
    } catch (error) {
      warnings.push(`Could not fully analyze ${url}; added it as a manual ${type} entry.`);
      drafts.push(buildUrlDraft(url, type, null));
    }
  }

  return drafts;
}

export async function extractEvidenceUploadDraft(
  options: ExtractEvidenceOptions
): Promise<EvidenceUploadDraft> {
  const warnings: string[] = [];
  const uploadedFiles: StoredEvidenceFile[] = [];
  const portfolioEntries: EvidenceProjectDraft[] = [];
  const projectEntries: EvidenceProjectDraft[] = [];
  const workSamples: EvidenceProjectDraft[] = [];
  let linkedinData: Record<string, any> = {};

  if (options.linkedinFile) {
    const text = await extractTextFromFile(options.linkedinFile.file);
    linkedinData = buildLinkedInDraft(options.linkedinFile.stored, text);
    uploadedFiles.push(options.linkedinFile.stored);

    if (!linkedinData.experiences?.length) {
      warnings.push('We could not confidently parse every LinkedIn role from the PDF. Review the extracted work history before saving.');
    }
  }

  for (const file of options.supportingFiles || []) {
    const text = await extractTextFromFile(file.file);
    workSamples.push(buildWorkSampleDraft(file.stored, text));
    uploadedFiles.push(file.stored);
  }

  portfolioEntries.push(...await extractUrlDrafts(options.portfolioUrls || [], 'portfolio', warnings));
  projectEntries.push(...await extractUrlDrafts(options.projectUrls || [], 'project', warnings));

  return {
    linkedin_data: linkedinData,
    projects: projectEntries,
    other_platforms: {
      portfolio: portfolioEntries,
      work_samples: workSamples,
      uploaded_files: uploadedFiles,
    },
    uploaded_files: uploadedFiles,
    warnings,
  };
}
