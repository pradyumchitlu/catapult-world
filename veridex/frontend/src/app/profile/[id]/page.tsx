'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TrustScoreCard from '@/components/TrustScoreCard';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import ReviewsList from '@/components/ReviewsList';
import StakeButton from '@/components/StakeButton';
import ChatPanel from '@/components/ChatPanel';
import CreateContractModal from '@/components/CreateContractModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { createContract, getReputation } from '@/lib/api';
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
  const router = useRouter();
  const workerId = params.id as string;
  const { user: currentUser, token } = useAuth();

  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [isCreatingContract, setIsCreatingContract] = useState(false);

  const isEmployer = currentUser?.roles?.includes('client');

  const handleCreateContract = async (contractData: { worker_id: string; title: string; description: string; payment_amount: number; duration_days: number }) => {
    if (!token) return;
    setIsCreatingContract(true);
    try {
      await createContract(contractData, token);
      setShowHireModal(false);
      router.push('/employer');
    } catch (error) {
      console.error('Failed to create contract:', error);
    } finally {
      setIsCreatingContract(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const result = await getReputation(workerId);
        setData({
          user: result.user,
          profile: result.profile!,
          reviews: result.reviews || [],
          totalStaked: result.totalStaked || 0,
          stakerCount: result.stakerCount || 0,
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
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13px',
                  color: '#2563EB',
                  background: 'rgba(37,99,235,0.08)',
                  border: '1px solid rgba(37,99,235,0.15)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                }}
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
          {isEmployer && (
            <button onClick={() => setShowHireModal(true)} className="btn-primary">
              Hire
            </button>
          )}
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
          <div className="glass-card mt-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#94A3B8' }}>Total Staked</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#2563EB' }}>{totalStaked.toLocaleString()} WLD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', color: '#94A3B8' }}>Stakers</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{stakerCount}</span>
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
        <div className="glass-card mb-8">
          <h2 style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '18px', fontWeight: 600, color: '#1E293B', marginBottom: '16px' }}>GitHub Highlights</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {profile.github_data.repos.slice(0, 4).map((repo: any) => (
              <div key={repo.name} style={{ padding: '16px', background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.12)', borderRadius: '12px' }}>
                <div style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{repo.name}</div>
                <div style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                  {repo.language} · {repo.stars} stars
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '13px', color: '#94A3B8', marginTop: '16px' }}>
            {profile.github_data.contributions?.total_commits_last_year?.toLocaleString()} commits last year
          </div>
        </div>
      )}

      {/* AI Chat Panel */}
      <div className="glass-card mb-8">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '18px', fontWeight: 600, color: '#1E293B' }}>Ask About This Worker</h2>
          <button
            onClick={() => setShowChat(!showChat)}
            className="btn-secondary"
            style={{ fontSize: '13px', padding: '8px 16px' }}
          >
            {showChat ? 'Hide Chat' : 'Open Chat'}
          </button>
        </div>
        {showChat && (
          <ChatPanel workerId={workerId} workerName={user.display_name || 'Worker'} />
        )}
        {!showChat && (
          <p style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '14px', color: '#94A3B8' }}>
            Chat with our AI to get detailed insights about this worker&apos;s qualifications, grounded in their real data.
          </p>
        )}
      </div>

      {/* Reviews */}
      <div className="glass-card">
        <h2 style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '18px', fontWeight: 600, color: '#1E293B', marginBottom: '16px' }}>Reviews</h2>
        <ReviewsList reviews={reviews} />
      </div>

      {showHireModal && currentUser && token && (
        <CreateContractModal
          workerName={user.display_name || 'Worker'}
          workerId={workerId}
          balance={currentUser.wld_balance}
          token={token}
          onSubmit={handleCreateContract}
          onClose={() => setShowHireModal(false)}
          isLoading={isCreatingContract}
        />
      )}
    </div>
  );
}
