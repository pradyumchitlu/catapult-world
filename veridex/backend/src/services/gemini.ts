import '../loadEnv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  EvidenceExperienceDraft,
  EvidenceProjectDraft,
} from './evidenceExtraction';

const MODEL = 'gemini-3-flash-preview';

/** Prefer GEMINI_API_KEY for all calls; otherwise chat vs scoring-specific keys. */
function getGenAI(mode: 'chat' | 'scoring'): GoogleGenerativeAI {
  const key =
    process.env.GEMINI_API_KEY ||
    (mode === 'chat'
      ? process.env.GEMINI_CHATBOT_API_KEY
      : process.env.GEMINI_SCORING_API_KEY);
  if (!key) {
    throw new Error(
      'Set GEMINI_API_KEY, or GEMINI_CHATBOT_API_KEY (chat) / GEMINI_SCORING_API_KEY (scoring).'
    );
  }
  return new GoogleGenerativeAI(key);
}

function clampText(text: string, maxChars = 12000): string {
  const trimmed = text.trim();
  return trimmed.length <= maxChars ? trimmed : trimmed.slice(0, maxChars);
}

function extractJsonPayload(text: string): any | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || trimmed;
  const objectMatch = candidate.match(/\{[\s\S]*\}/);

  if (!objectMatch) {
    return null;
  }

  try {
    return JSON.parse(objectMatch[0]);
  } catch (error) {
    return null;
  }
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeStringArray(value: unknown, limit = 20): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .flatMap((entry) => typeof entry === 'string' ? [entry.trim()] : [])
      .filter(Boolean)
  )].slice(0, limit);
}

function normalizeExperience(value: any): EvidenceExperienceDraft {
  return {
    title: normalizeString(value?.title),
    company: normalizeString(value?.company),
    start_date: normalizeString(value?.start_date),
    end_date: normalizeString(value?.end_date),
    description: normalizeString(value?.description),
    skills: normalizeStringArray(value?.skills, 12),
    technologies: normalizeStringArray(value?.technologies, 10),
  };
}

function normalizeProject(value: any): EvidenceProjectDraft {
  return {
    title: normalizeString(value?.title),
    role: normalizeString(value?.role),
    description: normalizeString(value?.description),
    url: normalizeString(value?.url),
    proof_urls: normalizeStringArray(value?.proof_urls, 10),
    start_date: normalizeString(value?.start_date),
    end_date: normalizeString(value?.end_date),
    updated_at: normalizeString(value?.updated_at),
    skills: normalizeStringArray(value?.skills, 12),
    technologies: normalizeStringArray(value?.technologies, 10),
    tags: normalizeStringArray(value?.tags, 8),
  };
}

export async function extractLinkedInEvidenceWithGemini(text: string): Promise<{
  experiences: EvidenceExperienceDraft[];
  skills: string[];
  top_skills: string[];
  specializations: string[];
} | null> {
  const systemPrompt = `You extract structured professional evidence from LinkedIn-style resume or profile text.

Return JSON only with this exact shape:
{
  "experiences": [
    {
      "title": "string",
      "company": "string",
      "start_date": "string",
      "end_date": "string",
      "description": "string",
      "skills": ["string"],
      "technologies": ["string"]
    }
  ],
  "skills": ["string"],
  "top_skills": ["string"],
  "specializations": ["string"]
}

Rules:
- Extract only facts grounded in the provided text.
- Preserve fuzzy dates exactly as written.
- Prefer 3-8 most relevant technologies per role.
- Keep skills concrete and deduplicated.
- top_skills must be a subset of skills.
- Do not invent employers, dates, or projects.
- If something is missing, omit it or return an empty array.
- Output JSON only.`;

  const prompt = `LinkedIn or resume text:\n${clampText(text)}`;

  try {
    const model = getGenAI('scoring').getGenerativeModel({
      model: MODEL,
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(prompt);
    const parsed = extractJsonPayload(result.response.text());

    if (!parsed) {
      return null;
    }

    const experiences = Array.isArray(parsed.experiences)
      ? parsed.experiences.map(normalizeExperience).filter((entry: EvidenceExperienceDraft) =>
          Boolean(entry.title || entry.company || entry.description)
        )
      : [];
    const skills = normalizeStringArray(parsed.skills, 20);
    const topSkills = normalizeStringArray(parsed.top_skills, 10);
    const specializations = normalizeStringArray(parsed.specializations, 8);

    return {
      experiences: experiences.slice(0, 15),
      skills,
      top_skills: topSkills.length > 0 ? topSkills : skills.slice(0, 10),
      specializations: specializations.length > 0 ? specializations : skills.slice(0, 5),
    };
  } catch (error) {
    console.error('Gemini LinkedIn extraction error:', error);
    return null;
  }
}

export async function extractProjectEvidenceWithGemini(
  input: {
    kind: 'project' | 'portfolio' | 'work_sample';
    text: string;
    sourceUrl?: string | null;
    sourceName?: string | null;
  }
): Promise<EvidenceProjectDraft | null> {
  const systemPrompt = `You extract structured project evidence from documents and portfolio pages.

Return JSON only with this exact shape:
{
  "title": "string",
  "role": "string",
  "description": "string",
  "url": "string",
  "proof_urls": ["string"],
  "start_date": "string",
  "end_date": "string",
  "updated_at": "string",
  "skills": ["string"],
  "technologies": ["string"],
  "tags": ["string"]
}

Rules:
- Only use evidence grounded in the supplied text.
- Keep descriptions concise and factual.
- Include the provided source URL if it is clearly the main URL for the item.
- Use proof_urls only for links that directly support the project.
- Prefer concrete technologies and skills.
- Output JSON only.`;

  const prompt = [
    `Item kind: ${input.kind}`,
    input.sourceName ? `Source name: ${input.sourceName}` : null,
    input.sourceUrl ? `Source URL: ${input.sourceUrl}` : null,
    '',
    `Document or page text:\n${clampText(input.text)}`,
  ].filter(Boolean).join('\n');

  try {
    const model = getGenAI('scoring').getGenerativeModel({
      model: MODEL,
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(prompt);
    const parsed = extractJsonPayload(result.response.text());

    if (!parsed) {
      return null;
    }

    return normalizeProject(parsed);
  } catch (error) {
    console.error('Gemini project extraction error:', error);
    return null;
  }
}

/**
 * Evaluate a worker based on their profile and answer client questions
 */
export async function evaluateWorker(
  workerData: {
    name: string;
    profile: any;
    reviews: any[];
  },
  clientQuestion: string,
  previousMessages: { role: string; content: string }[] = []
): Promise<string> {
  const systemPrompt = `You are a trust evaluation assistant for Veridex, a decentralized reputation platform.

You have access to a worker's verified data including:
- GitHub activity (repositories, languages, contribution patterns)
- Peer reviews (with stake amounts indicating reviewer confidence)
- Trust scores and component breakdowns

Your role is to help clients evaluate workers by answering questions about their qualifications.

IMPORTANT GUIDELINES:
1. Be specific - cite actual repos, skills, review quotes, and stats
2. If the data doesn't support a claim, say so honestly
3. Consider review stake amounts as a signal of review credibility (higher stakes = more confidence)
4. Balance positive and negative signals fairly
5. Never make claims that aren't supported by the provided data

Worker Profile:
${JSON.stringify(workerData.profile, null, 2)}

Recent Reviews (sorted by stake amount):
${workerData.reviews.map((r: any) => `- Rating: ${r.rating}/5, Stake: ${r.stake_amount} WLD, Category: ${r.job_category || 'General'}
  Review: "${r.content || 'No written feedback'}"
  Reviewer: ${r.reviewer?.display_name || 'Anonymous'}`).join('\n')}`;

  const model = getGenAI('chat').getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt,
  });

  const history = previousMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  try {
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(clientQuestion);
    const text = result.response.text();
    return text || 'Unable to generate response.';
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

/**
 * Parse a job description into structured requirements
 */
export async function parseJobRequirements(jobDescription: string): Promise<any> {
  const systemPrompt = `You are a job requirements parser. Extract structured requirements from job descriptions.

Return a JSON object with:
{
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1", "skill2"],
  "experience_level": "junior|mid|senior|lead",
  "domain": "web|mobile|data|devops|etc",
  "soft_skills": ["communication", "teamwork", etc],
  "other_requirements": ["requirement1", "requirement2"]
}

Be specific about technologies mentioned. Include both explicit and implied requirements.`;

  try {
    const model = getGenAI('scoring').getGenerativeModel({
      model: MODEL,
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(jobDescription);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      required_skills: [],
      preferred_skills: [],
      experience_level: 'mid',
      domain: 'general',
      soft_skills: [],
      other_requirements: [],
    };
  } catch (error) {
    console.error('Error parsing job requirements:', error);
    return {
      required_skills: [],
      preferred_skills: [],
      experience_level: 'mid',
      domain: 'general',
      soft_skills: [],
      other_requirements: [],
    };
  }
}

/**
 * Generate contextual evaluation of worker fit for parsed requirements
 */
export async function generateContextualEvaluation(
  workerProfile: any,
  requirements: any
): Promise<{
  met: { requirement: string; evidence: string }[];
  partial: { requirement: string; evidence: string; gap: string }[];
  missing: { requirement: string }[];
}> {
  const systemPrompt = `You are evaluating a worker's fit for a role based on their profile and the job requirements.

Analyze the match and return a JSON object with:
{
  "met": [
    { "requirement": "requirement text", "evidence": "specific evidence from profile" }
  ],
  "partial": [
    { "requirement": "requirement text", "evidence": "what they have", "gap": "what's missing" }
  ],
  "missing": [
    { "requirement": "requirement text" }
  ]
}

Focus on:
- Soft skills and experience level matches
- Domain expertise
- Other non-technical requirements

Be specific about evidence. Reference actual data from the profile.`;

  const prompt = `Worker Profile:
${JSON.stringify(workerProfile, null, 2)}

Requirements to evaluate:
- Experience level: ${requirements.experience_level || 'not specified'}
- Domain: ${requirements.domain || 'general'}
- Soft skills: ${requirements.soft_skills?.join(', ') || 'none specified'}
- Other requirements: ${requirements.other_requirements?.join(', ') || 'none'}

Evaluate how well this worker matches these requirements.`;

  try {
    const model = getGenAI('scoring').getGenerativeModel({
      model: MODEL,
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { met: [], partial: [], missing: [] };
  } catch (error) {
    console.error('Error generating contextual evaluation:', error);
    return { met: [], partial: [], missing: [] };
  }
}
