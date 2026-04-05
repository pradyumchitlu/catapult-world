'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TrustScoreCard from '@/components/TrustScoreCard';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import ReviewsList from '@/components/ReviewsList';
import StakeButton from '@/components/StakeButton';
import ChatDrawer from '@/components/ChatDrawer';
import CreateContractModal from '@/components/CreateContractModal';
import GlassCard from '@/components/GlassCard';
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
    <div style={{ display: 'flex', gap: '24px', maxWidth: '1400px', margin: '0 auto', padding: '0 24px', alignItems: 'flex-start' }}>
      {/* Profile content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          maxWidth: showChat ? 'calc(100% - 404px)' : '1152px',
          margin: showChat ? '0' : '0 auto',
          transition: 'max-width 0.3s ease, margin 0.3s ease',
        }}
      >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{user.display_name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {user.profession_category && (
              <span style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: '#1E293B',
                textTransform: 'capitalize',
              }}>
                {user.profession_category}
              </span>
            )}
            {user.profession_category && profile.years_experience != null && (
              <span style={{ color: 'rgba(37,99,235,0.3)', fontSize: '14px' }}>·</span>
            )}
            {profile.years_experience != null && (
              <span style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '14px',
                color: '#64748B',
              }}>
                {profile.years_experience} {profile.years_experience === 1 ? 'year' : 'years'} experience
              </span>
            )}
            {profile.github_username && (
              <>
                <span style={{ color: 'rgba(37,99,235,0.3)', fontSize: '14px' }}>·</span>
                <a
                  href={`https://github.com/${profile.github_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '14px',
                    color: '#2563EB',
                    textDecoration: 'none',
                  }}
                >
                  @{profile.github_username}
                </a>
              </>
            )}
          </div>
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
        </div>
        <div className="flex gap-3" style={{ flexShrink: 0 }}>
          {token && (
            <button
              onClick={() => setShowChat(!showChat)}
              className="btn-secondary"
              style={{ fontSize: '13px', padding: '8px 16px', whiteSpace: 'nowrap' }}
            >
              {showChat ? 'Close Chat' : 'Ask AI'}
            </button>
          )}
          {isEmployer && (
            <button onClick={() => setShowHireModal(true)} className="btn-primary">
              Hire
            </button>
          )}
          {isEmployer && (
            <Link href={`/review/${workerId}`} className="btn-secondary">
              Leave Review
            </Link>
          )}
          <StakeButton workerId={workerId} workerName={user.display_name || 'Worker'} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Trust Score */}
        <div className="lg:col-span-1">
          <TrustScoreCard score={profile.overall_trust_score} />
          <GlassCard className="mt-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#94A3B8' }}>Total Staked</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#2563EB' }}>{totalStaked.toLocaleString()} WLD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', color: '#94A3B8' }}>Stakers</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>{stakerCount}</span>
            </div>
          </GlassCard>
        </div>

        {/* Score Breakdown */}
        <div className="lg:col-span-2">
          <ScoreBreakdown components={profile.score_components} />
        </div>
      </div>

      {/* GitHub Highlights */}
      {profile.github_data.repos && profile.github_data.repos.length > 0 && (
        <GlassCard className="mb-8">
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
        </GlassCard>
      )}

      {/* Reviews */}
      <GlassCard>
        <h2 style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '18px', fontWeight: 600, color: '#1E293B', marginBottom: '16px' }}>Reviews</h2>
        <ReviewsList reviews={reviews} />
      </GlassCard>

      <div style={{ height: '64px' }} />

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

      {/* Chat Drawer */}
      {token && (
        <ChatDrawer
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          workerId={workerId}
          workerName={user.display_name || 'Worker'}
          token={token}
        />
      )}
    </div>
  );
}
