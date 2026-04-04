'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GitHubConnectButton from '@/components/GitHubConnectButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/api';

const PROFESSION_CATEGORIES = [
  { id: 'software', label: 'Software Engineering', icon: '💻' },
  { id: 'writing', label: 'Writing & Content', icon: '✍️' },
  { id: 'design', label: 'Design', icon: '🎨' },
  { id: 'trades', label: 'Trades & Services', icon: '🔧' },
  { id: 'other', label: 'Other', icon: '📋' },
];

const ROLES = [
  { id: 'worker', label: 'Worker', description: 'Build reputation and get hired' },
  { id: 'staker', label: 'Staker', description: 'Stake WLD on workers you believe in' },
  { id: 'client', label: 'Client', description: 'Find and evaluate workers' },
];

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[70vh]"><LoadingSpinner /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isLoading: authLoading, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['worker']);
  const [professionCategory, setProfessionCategory] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);

  // Auth guard: redirect to verify if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/verify');
    }
  }, [user, authLoading, router]);

  // Detect GitHub OAuth callback
  useEffect(() => {
    const githubStatus = searchParams.get('github');
    if (githubStatus === 'connected') {
      setGithubConnected(true);
      setStep(3); // Go to platform connections step
    }
  }, [searchParams]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId]
    );
  };

  const handleGitHubConnect = () => {
    setGithubConnected(true);
  };

  const handleComplete = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const result = await updateProfile(
        {
          display_name: displayName,
          roles: selectedRoles,
          profession_category: professionCategory || 'other',
        },
        token
      );
      updateUser(result.user);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="card max-w-lg w-full">
        {/* Progress indicator */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step
                  ? 'bg-veridex-primary text-white'
                  : s < step
                  ? 'bg-veridex-success text-white'
                  : 'bg-worldcoin-gray-700 text-worldcoin-gray-400'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Veridex!</h2>
            <p className="text-worldcoin-gray-400 mb-6">
              Let&apos;s set up your profile. First, tell us your name.
            </p>
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input w-full mb-6"
            />
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">
                What roles are you interested in?
              </label>
              <div className="space-y-2">
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => toggleRole(role.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedRoles.includes(role.id)
                        ? 'border-veridex-primary bg-veridex-primary/10'
                        : 'border-worldcoin-gray-600 hover:border-worldcoin-gray-500'
                    }`}
                  >
                    <div className="font-medium">{role.label}</div>
                    <div className="text-sm text-worldcoin-gray-400">{role.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!displayName.trim() || selectedRoles.length === 0}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">Your Profession</h2>
            <p className="text-worldcoin-gray-400 mb-6">
              What kind of work do you do? This helps us tailor your profile.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {PROFESSION_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setProfessionCategory(cat.id)}
                  className={`p-4 rounded-lg border text-center transition-colors ${
                    professionCategory === cat.id
                      ? 'border-veridex-primary bg-veridex-primary/10'
                      : 'border-worldcoin-gray-600 hover:border-worldcoin-gray-500'
                  }`}
                >
                  <div className="text-2xl mb-2">{cat.icon}</div>
                  <div className="text-sm font-medium">{cat.label}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!professionCategory}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">Connect Platforms</h2>
            <p className="text-worldcoin-gray-400 mb-6">
              Connect your accounts to build your trust profile. This is optional — you can also build reputation through reviews.
            </p>
            <div className="space-y-3 mb-6">
              <GitHubConnectButton
                onConnect={handleGitHubConnect}
                isConnected={githubConnected}
              />
              <button className="w-full p-4 rounded-lg border border-worldcoin-gray-600 text-left opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💼</span>
                  <div>
                    <div className="font-medium">LinkedIn</div>
                    <div className="text-sm text-worldcoin-gray-400">Coming soon</div>
                  </div>
                </div>
              </button>
            </div>
            <p className="text-sm text-worldcoin-gray-500 mb-6">
              No developer accounts? No problem! You can build reputation through client reviews.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={isLoading}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {isLoading ? <LoadingSpinner /> : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
