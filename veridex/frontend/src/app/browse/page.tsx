'use client';

import { useState, useEffect } from 'react';
import WorkerCard from '@/components/WorkerCard';
import JobDescriptionInput from '@/components/JobDescriptionInput';
import LoadingSpinner from '@/components/LoadingSpinner';
import GlassCard from '@/components/GlassCard';
import {
  col,
  headingLg,
  headingSm,
  sectionLabel,
  textSecondary,
  textMuted,
} from '@/lib/styles';
import type { WorkerProfile, User } from '@/types';

interface WorkerWithUser extends WorkerProfile {
  user: User;
  reviewCount: number;
  avgRating: number;
  totalStaked: number;
  contextualFitScore?: number;
}

const PROFESSION_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'software', label: 'Software' },
  { id: 'writing', label: 'Writing' },
  { id: 'design', label: 'Design' },
  { id: 'trades', label: 'Trades' },
  { id: 'other', label: 'Other' },
];

export default function BrowsePage() {
  const [workers, setWorkers] = useState<WorkerWithUser[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<WorkerWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [professionFilter, setProfessionFilter] = useState('all');
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [jobDescription, setJobDescription] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    // TODO: Fetch workers from API
    const fetchWorkers = async () => {
      try {
        // Placeholder data
        const placeholderWorkers: WorkerWithUser[] = [
          {
            id: '1',
            user_id: '1',
            user: {
              id: '1',
              world_id_hash: 'hash1',
              display_name: 'Alice Developer',
              roles: ['worker'],
              profession_category: 'software',
              wld_balance: 1000,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            github_username: 'alice',
            github_data: {},
            linkedin_data: {},
            other_platforms: {},
            computed_skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
            specializations: ['Full-stack', 'Web3'],
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
            reviewCount: 12,
            avgRating: 4.8,
            totalStaked: 5000,
          },
        ];
        setWorkers(placeholderWorkers);
        setFilteredWorkers(placeholderWorkers);
      } catch (error) {
        console.error('Failed to fetch workers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkers();
  }, []);

  useEffect(() => {
    let filtered = workers;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.user.display_name?.toLowerCase().includes(query) ||
          w.computed_skills.some((s) => s.toLowerCase().includes(query))
      );
    }

    if (professionFilter !== 'all') {
      filtered = filtered.filter((w) => w.user.profession_category === professionFilter);
    }

    filtered = filtered.filter(
      (w) => w.overall_trust_score >= scoreRange[0] && w.overall_trust_score <= scoreRange[1]
    );

    setFilteredWorkers(filtered);
  }, [workers, searchQuery, professionFilter, scoreRange]);

  const handleEvaluateAll = async (description: string) => {
    setIsEvaluating(true);
    setJobDescription(description);
    try {
      // TODO: Call contextual score API for all workers
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to evaluate workers:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={col}>
        {/* ── Header ── */}
        <div className="fade-up fade-up-1" style={{ marginBottom: '48px' }}>
          <h1 style={{ ...headingLg, fontSize: '48px', margin: '0 0 12px 0' }}>
            Browse Workers
          </h1>
          <p style={textSecondary}>
            Find verified workers with portable trust scores backed by real evidence.
          </p>
        </div>

        {/* ── Filters ── */}
        <GlassCard className="fade-up fade-up-2" style={{ marginBottom: '32px' }}>
          <span style={sectionLabel}>Filters</span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <label style={{ ...headingSm, fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                Search
              </label>
              <input
                type="text"
                placeholder="Name or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label style={{ ...headingSm, fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                Profession
              </label>
              <select
                value={professionFilter}
                onChange={(e) => setProfessionFilter(e.target.value)}
                className="input"
              >
                {PROFESSION_FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ ...headingSm, fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                Min Trust Score
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={scoreRange[0]}
                onChange={(e) => setScoreRange([parseInt(e.target.value) || 0, scoreRange[1]])}
                className="input"
              />
            </div>
            <div>
              <label style={{ ...headingSm, fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                Max Trust Score
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={scoreRange[1]}
                onChange={(e) => setScoreRange([scoreRange[0], parseInt(e.target.value) || 100])}
                className="input"
              />
            </div>
          </div>

          {/* Evaluate for Role */}
          <div style={{ borderTop: '1px solid rgba(37,99,235,0.12)', paddingTop: '20px' }}>
            <label style={{ ...headingSm, fontSize: '13px', display: 'block', marginBottom: '8px' }}>
              Evaluate for a Role (Optional)
            </label>
            <JobDescriptionInput
              onSubmit={handleEvaluateAll}
              isLoading={isEvaluating}
              placeholder="Paste a job description to see contextual fit scores..."
            />
          </div>
        </GlassCard>

        {/* ── Results ── */}
        <div style={{ ...textMuted, marginBottom: '16px' }}>
          {filteredWorkers.length} worker{filteredWorkers.length !== 1 ? 's' : ''} found
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {filteredWorkers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              showContextualScore={!!jobDescription}
            />
          ))}
        </div>

        {filteredWorkers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={textSecondary}>No workers match your filters.</p>
          </div>
        )}

        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}
