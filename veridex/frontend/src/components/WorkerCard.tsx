'use client';

import Link from 'next/link';
import type { WorkerProfile, User } from '@/types';

interface WorkerWithUser extends WorkerProfile {
  user: User;
  reviewCount: number;
  avgRating: number;
  totalStaked: number;
  contextualFitScore?: number;
}

interface WorkerCardProps {
  worker: WorkerWithUser;
  showContextualScore?: boolean;
}

export default function WorkerCard({ worker, showContextualScore }: WorkerCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-veridex-success';
    if (score >= 60) return 'text-veridex-primary';
    if (score >= 40) return 'text-veridex-warning';
    return 'text-veridex-error';
  };

  return (
    <Link href={`/profile/${worker.user_id}`}>
      <div className="card hover:border-veridex-primary/50 transition-colors cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">{worker.user.display_name}</h3>
            <p className="text-sm text-worldcoin-gray-400 capitalize">
              {worker.user.profession_category}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getScoreColor(worker.overall_trust_score)}`}>
              {worker.overall_trust_score}
            </div>
            <div className="text-xs text-worldcoin-gray-400">Trust Score</div>
          </div>
        </div>

        {/* Contextual Score (if evaluating) */}
        {showContextualScore && worker.contextualFitScore !== undefined && (
          <div className="mb-4 p-3 bg-worldcoin-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-worldcoin-gray-400">Fit Score</span>
              <span className={`font-semibold ${getScoreColor(worker.contextualFitScore)}`}>
                {worker.contextualFitScore}%
              </span>
            </div>
          </div>
        )}

        {/* Skills */}
        <div className="flex flex-wrap gap-1 mb-4">
          {worker.computed_skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 bg-worldcoin-gray-700 rounded text-xs"
            >
              {skill}
            </span>
          ))}
          {worker.computed_skills.length > 4 && (
            <span className="px-2 py-0.5 text-xs text-worldcoin-gray-400">
              +{worker.computed_skills.length - 4} more
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-between text-sm">
          <div>
            <span className="text-worldcoin-gray-400">Reviews: </span>
            <span className="font-medium">{worker.reviewCount}</span>
          </div>
          <div>
            <span className="text-worldcoin-gray-400">Rating: </span>
            <span className="font-medium">{worker.avgRating.toFixed(1)} ★</span>
          </div>
          <div>
            <span className="text-veridex-primary font-medium">
              {worker.totalStaked.toLocaleString()} WLD
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
