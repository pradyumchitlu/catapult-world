/**
 * Unit tests for backend/src/services/contextual.ts
 *
 * Tests: computeContextualScore, matchHardSkills (indirectly), fit score calculation
 */

import '../setup';

import { computeContextualScore } from '../../services/contextual';
import { fakeWorkerProfile, fakeReviews } from '../fixtures';

// The mock gemini is auto-loaded via jest.config.js moduleNameMapper

describe('computeContextualScore', () => {
  it('should return a valid contextual score result', async () => {
    const result = await computeContextualScore(
      { profile: fakeWorkerProfile, reviews: fakeReviews },
      'Looking for a senior TypeScript developer with React and Node.js experience.'
    );

    expect(result).toBeDefined();
    expect(typeof result.fit_score).toBe('number');
    expect(result.fit_score).toBeGreaterThanOrEqual(0);
    expect(result.fit_score).toBeLessThanOrEqual(100);
    expect(result.breakdown).toBeDefined();
    expect(Array.isArray(result.breakdown.met)).toBe(true);
    expect(Array.isArray(result.breakdown.partial)).toBe(true);
    expect(Array.isArray(result.breakdown.missing)).toBe(true);
    expect(result.parsed_requirements).toBeDefined();
  });

  it('should match hard skills from computed_skills', async () => {
    // The mock parseJobRequirements returns required_skills: ['TypeScript', 'React', 'Node.js']
    // The fake profile has computed_skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'GraphQL']
    // So TypeScript, React, Node.js should be in `met` from the hard skills matcher
    const result = await computeContextualScore(
      { profile: fakeWorkerProfile, reviews: fakeReviews },
      'Need TypeScript and React developer'
    );

    const metRequirements = result.breakdown.met.map((m) => m.requirement);
    // Hard skills match should find TypeScript and React
    expect(metRequirements).toContain('TypeScript');
    expect(metRequirements).toContain('React');
  });

  it('should match skills from github languages', async () => {
    // fakeWorkerProfile has github_data.languages: ['TypeScript', 'JavaScript', 'Python']
    const profileWithOnlyGithub = {
      ...fakeWorkerProfile,
      computed_skills: [], // Remove computed skills to test github languages path
    };

    const result = await computeContextualScore(
      { profile: profileWithOnlyGithub, reviews: [] },
      'Looking for TypeScript developer'
    );

    // TypeScript should still be matched via github languages
    const metRequirements = result.breakdown.met.map((m) => m.requirement);
    expect(metRequirements).toContain('TypeScript');
  });

  it('should put unmatched skills in missing', async () => {
    const emptyProfile = {
      ...fakeWorkerProfile,
      computed_skills: [],
      github_data: { repos: [], languages: [] },
    };

    const result = await computeContextualScore(
      { profile: emptyProfile, reviews: [] },
      'Need expert in everything'
    );

    // With empty skills, required skills should be missing from hard match
    // But LLM mock still returns its fixed response
    expect(result.breakdown.missing.length).toBeGreaterThan(0);
  });

  it('should calculate fit_score correctly', async () => {
    // Test the formula: ((met * 100) + (partial * 50)) / total
    const result = await computeContextualScore(
      { profile: fakeWorkerProfile, reviews: fakeReviews },
      'Any job description'
    );

    const { met, partial, missing } = result.breakdown;
    const total = met.length + partial.length + missing.length;

    if (total > 0) {
      const expectedScore = Math.round(
        ((met.length * 100) + (partial.length * 50)) / total
      );
      expect(result.fit_score).toBe(expectedScore);
    }
  });

  it('should default to 50 when there are no requirements', async () => {
    // Override the mock to return empty requirements
    const geminiMock = require('../../__mocks__/gemini');
    geminiMock.parseJobRequirements.mockResolvedValueOnce({
      required_skills: [],
      preferred_skills: [],
      experience_level: 'mid',
      domain: 'general',
      soft_skills: [],
      other_requirements: [],
    });
    geminiMock.generateContextualEvaluation.mockResolvedValueOnce({
      met: [],
      partial: [],
      missing: [],
    });

    const result = await computeContextualScore(
      { profile: fakeWorkerProfile, reviews: [] },
      ''
    );

    expect(result.fit_score).toBe(50);
  });

  it('should include LLM evaluation results in breakdown', async () => {
    const result = await computeContextualScore(
      { profile: fakeWorkerProfile, reviews: fakeReviews },
      'Looking for communicative senior dev'
    );

    // The mock generateContextualEvaluation returns a "Communication skills" met item
    const metRequirements = result.breakdown.met.map((m) => m.requirement);
    expect(metRequirements).toContain('Communication skills');
  });

  it('should handle partial skill matches via related skills map', async () => {
    // Mock parseJobRequirements to ask for 'React' when worker only has 'JavaScript'
    const geminiMock = require('../../__mocks__/gemini');
    geminiMock.parseJobRequirements.mockResolvedValueOnce({
      required_skills: ['React'],
      preferred_skills: [],
      experience_level: 'mid',
      domain: 'web',
      soft_skills: [],
      other_requirements: [],
    });
    geminiMock.generateContextualEvaluation.mockResolvedValueOnce({
      met: [],
      partial: [],
      missing: [],
    });

    const profileWithJsOnly = {
      ...fakeWorkerProfile,
      computed_skills: ['JavaScript'], // Related to React
      github_data: { repos: [], languages: ['JavaScript'] },
    };

    const result = await computeContextualScore(
      { profile: profileWithJsOnly, reviews: [] },
      'Need React developer'
    );

    // React should be partial match since JavaScript is related
    const partialRequirements = result.breakdown.partial.map((p) => p.requirement);
    expect(partialRequirements).toContain('React');
  });
});
