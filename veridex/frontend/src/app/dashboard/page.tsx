'use client';

import { useState, useEffect } from 'react';
import TrustScoreCard from '@/components/TrustScoreCard';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import ReviewsList from '@/components/ReviewsList';
import QueryLog from '@/components/QueryLog';
import JobDescriptionInput from '@/components/JobDescriptionInput';
import ContextualScoreCard from '@/components/ContextualScoreCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { WorkerProfile, Review, QueryLogEntry, ContextualScoreBreakdown } from '@/types';

export default function DashboardPage() {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [queryLog, setQueryLog] = useState<QueryLogEntry[]>([]);
  const [totalStaked, setTotalStaked] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [contextualScore, setContextualScore] = useState<{
    fit_score: number;
    breakdown: ContextualScoreBreakdown;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    // TODO: Fetch user profile, reviews, query log, and stakes
    const fetchData = async () => {
      try {
        // Placeholder data for scaffolding
        setProfile({
          id: '1',
          user_id: '1',
          github_username: 'example',
          github_data: {},
          linkedin_data: {},
          other_platforms: {},
          computed_skills: ['TypeScript', 'React', 'Node.js'],
          specializations: ['Frontend', 'Full-stack'],
          years_experience: 5,
          overall_trust_score: 78,
          score_components: {
            developer_competence: 85,
            collaboration: 72,
            consistency: 80,
            specialization_depth: 75,
            activity_recency: 90,
            peer_trust: 65,
          },
          ingestion_status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        setTotalStaked(2500);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEvaluateFit = async (jobDescription: string) => {
    setIsEvaluating(true);
    try {
      // TODO: Call contextual score API
      // const result = await getContextualScore(profile.user_id, jobDescription);
      // setContextualScore(result);

      // Placeholder
      setContextualScore({
        fit_score: 72,
        breakdown: {
          met: [
            { requirement: 'React experience', evidence: '8 React repositories over 2 years' },
            { requirement: 'TypeScript', evidence: 'Primary language in 12 repos' },
          ],
          partial: [
            { requirement: 'AWS experience', evidence: 'Some Lambda usage', gap: 'No extensive cloud infrastructure experience' },
          ],
          missing: [
            { requirement: 'Kubernetes' },
          ],
        },
      });
    } catch (error) {
      console.error('Failed to evaluate fit:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-worldcoin-gray-400">No profile found. Please complete onboarding.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Worker Dashboard</h1>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Trust Score */}
        <div className="lg:col-span-1">
          <TrustScoreCard score={profile.overall_trust_score} />
          <div className="card mt-4">
            <div className="text-sm text-worldcoin-gray-400 mb-1">Total WLD Staked on You</div>
            <div className="text-2xl font-bold text-veridex-primary">{totalStaked.toLocaleString()} WLD</div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="lg:col-span-2">
          <ScoreBreakdown components={profile.score_components} />
        </div>
      </div>

      {/* Evaluate My Fit Section */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Evaluate My Fit</h2>
        <p className="text-worldcoin-gray-400 mb-4">
          Paste a job description to see how well your profile matches the requirements.
        </p>
        <JobDescriptionInput onSubmit={handleEvaluateFit} isLoading={isEvaluating} />
        {contextualScore && (
          <div className="mt-6">
            <ContextualScoreCard
              fitScore={contextualScore.fit_score}
              breakdown={contextualScore.breakdown}
            />
          </div>
        )}
      </div>

      {/* Recent Reviews */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Reviews</h2>
        <ReviewsList reviews={reviews} />
      </div>

      {/* Query Log */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Profile Views</h2>
        <QueryLog entries={queryLog} />
      </div>
    </div>
  );
}
