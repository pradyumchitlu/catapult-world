'use client';

import type { ContextualScoreBreakdown } from '@/types';

interface ContextualScoreCardProps {
  fitScore: number;
  breakdown: ContextualScoreBreakdown;
}

export default function ContextualScoreCard({ fitScore, breakdown }: ContextualScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-veridex-success';
    if (score >= 60) return 'text-veridex-primary';
    if (score >= 40) return 'text-veridex-warning';
    return 'text-veridex-error';
  };

  return (
    <div className="bg-worldcoin-gray-700/50 rounded-lg p-4">
      {/* Score Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`text-4xl font-bold ${getScoreColor(fitScore)}`}>
          {fitScore}%
        </div>
        <div>
          <div className="font-semibold">Contextual Fit Score</div>
          <div className="text-sm text-worldcoin-gray-400">
            Based on job requirements analysis
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-4">
        {/* Met Requirements */}
        {breakdown.met.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-veridex-success">✓</span>
              <span className="text-sm font-medium text-veridex-success">
                Met ({breakdown.met.length})
              </span>
            </div>
            <div className="space-y-2 pl-6">
              {breakdown.met.map((item, i) => (
                <div key={i} className="text-sm">
                  <div className="text-white">{item.requirement}</div>
                  <div className="text-worldcoin-gray-400">{item.evidence}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Partial Requirements */}
        {breakdown.partial.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-veridex-warning">◐</span>
              <span className="text-sm font-medium text-veridex-warning">
                Partial ({breakdown.partial.length})
              </span>
            </div>
            <div className="space-y-2 pl-6">
              {breakdown.partial.map((item, i) => (
                <div key={i} className="text-sm">
                  <div className="text-white">{item.requirement}</div>
                  <div className="text-worldcoin-gray-400">{item.evidence}</div>
                  <div className="text-veridex-warning">Gap: {item.gap}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing Requirements */}
        {breakdown.missing.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-veridex-error">✗</span>
              <span className="text-sm font-medium text-veridex-error">
                Missing ({breakdown.missing.length})
              </span>
            </div>
            <div className="space-y-1 pl-6">
              {breakdown.missing.map((item, i) => (
                <div key={i} className="text-sm text-worldcoin-gray-400">
                  {item.requirement}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
