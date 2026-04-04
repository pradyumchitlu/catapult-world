import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-2.0-flash';

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
