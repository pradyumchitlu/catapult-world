/**
 * Mock Gemini service for testing.
 * Returns deterministic responses without making API calls.
 */

export const evaluateWorker = jest.fn().mockResolvedValue(
  'Based on the worker\'s verified profile, they have strong experience in TypeScript and React with 5 years of consistent contributions.'
);

export const parseJobRequirements = jest.fn().mockResolvedValue({
  required_skills: ['TypeScript', 'React', 'Node.js'],
  preferred_skills: ['PostgreSQL', 'GraphQL'],
  experience_level: 'senior',
  domain: 'web',
  soft_skills: ['communication', 'teamwork'],
  other_requirements: ['3+ years experience'],
});

export const generateContextualEvaluation = jest.fn().mockResolvedValue({
  met: [
    { requirement: 'Communication skills', evidence: 'Reviews highlight strong communication' },
  ],
  partial: [
    { requirement: 'Senior-level experience', evidence: '5 years of activity', gap: 'Leadership experience not directly evidenced' },
  ],
  missing: [
    { requirement: '3+ years experience' },
  ],
});
