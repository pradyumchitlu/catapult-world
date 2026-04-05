'use client';

import { useState, useEffect } from 'react';
import WorkerCard from '@/components/WorkerCard';
import JobDescriptionInput from '@/components/JobDescriptionInput';
import LoadingSpinner from '@/components/LoadingSpinner';
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
              wallet_address: null,
              wallet_verified_at: null,
              wallet_verification_method: null,
              wallet_last_balance_sync_at: null,
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

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.user.display_name?.toLowerCase().includes(query) ||
          w.computed_skills.some((s) => s.toLowerCase().includes(query))
      );
    }

    // Profession filter
    if (professionFilter !== 'all') {
      filtered = filtered.filter((w) => w.user.profession_category === professionFilter);
    }

    // Score range filter
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
      // This would add contextualFitScore to each worker
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Placeholder
    } catch (error) {
      console.error('Failed to evaluate workers:', error);
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

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Browse Workers</h1>

      {/* Filters */}
      <div className="card mb-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-worldcoin-gray-400 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Name or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-worldcoin-gray-400 mb-2">
              Profession
            </label>
            <select
              value={professionFilter}
              onChange={(e) => setProfessionFilter(e.target.value)}
              className="input w-full"
            >
              {PROFESSION_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-worldcoin-gray-400 mb-2">
              Min Trust Score
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={scoreRange[0]}
              onChange={(e) => setScoreRange([parseInt(e.target.value) || 0, scoreRange[1]])}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-worldcoin-gray-400 mb-2">
              Max Trust Score
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={scoreRange[1]}
              onChange={(e) => setScoreRange([scoreRange[0], parseInt(e.target.value) || 100])}
              className="input w-full"
            />
          </div>
        </div>

        {/* Evaluate for Role */}
        <div className="border-t border-worldcoin-gray-700 pt-4">
          <label className="block text-sm font-medium text-worldcoin-gray-400 mb-2">
            Evaluate for a Role (Optional)
          </label>
          <JobDescriptionInput
            onSubmit={handleEvaluateAll}
            isLoading={isEvaluating}
            placeholder="Paste a job description to see contextual fit scores..."
          />
        </div>
      </div>

      {/* Results */}
      <div className="mb-4 text-worldcoin-gray-400">
        {filteredWorkers.length} workers found
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkers.map((worker) => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            showContextualScore={!!jobDescription}
          />
        ))}
      </div>

      {filteredWorkers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-worldcoin-gray-400">No workers match your filters.</p>
        </div>
      )}
    </div>
  );
}
