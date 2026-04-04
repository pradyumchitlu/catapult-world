'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import TrustScoreCard from '@/components/TrustScoreCard';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import ReviewsList from '@/components/ReviewsList';
import StakeButton from '@/components/StakeButton';
import ChatPanel from '@/components/ChatPanel';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { WorkerProfile, User, Review } from '@/types';

interface ProfileData {
  user: User;
  profile: WorkerProfile;
  reviews: Review[];
  totalStaked: number;
  stakerCount: number;
}

export default function ProfilePage() {
  const params = useParams();
  const workerId = params.id as string;

  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    // TODO: Fetch worker profile, reviews, and staking data
    const fetchProfile = async () => {
      try {
        // Placeholder data
        setData({
          user: {
            id: workerId,
            world_id_hash: 'hash1',
            display_name: 'Alice Developer',
            roles: ['worker'],
            profession_category: 'software',
            wld_balance: 1000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          profile: {
            id: '1',
            user_id: workerId,
            github_username: 'alice',
            github_data: {
              repos: [
                { name: 'awesome-project', stars: 120, language: 'TypeScript' },
                { name: 'react-components', stars: 45, language: 'TypeScript' },
              ],
              languages: ['TypeScript', 'JavaScript', 'Python', 'Go'],
              totalCommits: 2341,
            },
            linkedin_data: {},
            other_platforms: {},
            computed_skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'GraphQL'],
            specializations: ['Full-stack', 'Web3', 'APIs'],
            years_experience: 5,
            overall_trust_score: 85,
            score_components: {
              developer_competence: 90,
              collaboration: 82,
              consistency: 85,
              specialization_depth: 88,
              activity_recency: 92,
              peer_trust: 78,
            },
            ingestion_status: 'completed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          reviews: [
            {
              id: '1',
              reviewer_id: '2',
              worker_id: workerId,
              rating: 5,
              content: 'Excellent work on our React dashboard. Delivered ahead of schedule with great attention to detail.',
              job_category: 'software',
              stake_amount: 500,
              reviewer_trust_score_at_time: 72,
              is_flagged: false,
              flag_reason: null,
              status: 'active',
              created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              reviewer: {
                id: '2',
                world_id_hash: 'hash2',
                display_name: 'Bob Client',
                roles: ['client'],
                profession_category: null,
                wld_balance: 800,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
          ],
          totalStaked: 5000,
          stakerCount: 12,
        });
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [workerId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-worldcoin-gray-400">Profile not found.</p>
      </div>
    );
  }

  const { user, profile, reviews, totalStaked, stakerCount } = data;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{user.display_name}</h1>
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.computed_skills.map((skill) => (
              <span
                key={skill}
                className="px-2 py-1 bg-worldcoin-gray-700 rounded text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
          {profile.github_username && (
            <a
              href={`https://github.com/${profile.github_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-veridex-secondary hover:underline text-sm"
            >
              @{profile.github_username} on GitHub
            </a>
          )}
        </div>
        <div className="flex gap-3">
          <Link href={`/review/${workerId}`} className="btn-secondary">
            Leave Review
          </Link>
          <StakeButton workerId={workerId} workerName={user.display_name || 'Worker'} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Trust Score */}
        <div className="lg:col-span-1">
          <TrustScoreCard score={profile.overall_trust_score} />
          <div className="card mt-4">
            <div className="flex justify-between mb-2">
              <span className="text-worldcoin-gray-400">Total Staked</span>
              <span className="font-semibold text-veridex-primary">{totalStaked.toLocaleString()} WLD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-worldcoin-gray-400">Stakers</span>
              <span className="font-semibold">{stakerCount}</span>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="lg:col-span-2">
          <ScoreBreakdown components={profile.score_components} />
        </div>
      </div>

      {/* GitHub Highlights */}
      {profile.github_data.repos && profile.github_data.repos.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">GitHub Highlights</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {profile.github_data.repos.slice(0, 4).map((repo: any) => (
              <div key={repo.name} className="p-4 bg-worldcoin-gray-700 rounded-lg">
                <div className="font-medium">{repo.name}</div>
                <div className="text-sm text-worldcoin-gray-400">
                  {repo.language} • {repo.stars} stars
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-worldcoin-gray-400">
            {profile.github_data.totalCommits?.toLocaleString()} total commits •
            Languages: {profile.github_data.languages?.join(', ')}
          </div>
        </div>
      )}

      {/* AI Chat Panel */}
      <div className="card mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Ask About This Worker</h2>
          <button
            onClick={() => setShowChat(!showChat)}
            className="btn-secondary text-sm"
          >
            {showChat ? 'Hide Chat' : 'Open Chat'}
          </button>
        </div>
        {showChat && (
          <ChatPanel workerId={workerId} workerName={user.display_name || 'Worker'} />
        )}
        {!showChat && (
          <p className="text-worldcoin-gray-400">
            Chat with our AI to get detailed insights about this worker&apos;s qualifications, grounded in their real data.
          </p>
        )}
      </div>

      {/* Reviews */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Reviews</h2>
        <ReviewsList reviews={reviews} />
      </div>
    </div>
  );
}
