'use client';

import type { Review } from '@/types';

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-veridex-warning' : 'text-worldcoin-gray-600'}>
        ★
      </span>
    ));
  };

  return (
    <div className={`p-4 bg-worldcoin-gray-700/50 rounded-lg ${review.is_flagged ? 'opacity-60 border border-veridex-warning' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{review.reviewer?.display_name || 'Anonymous'}</span>
            {review.reviewer_trust_score_at_time && (
              <span className="text-xs px-2 py-0.5 bg-worldcoin-gray-600 rounded">
                Trust: {review.reviewer_trust_score_at_time}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-lg">{renderStars(review.rating)}</div>
            {review.job_category && (
              <span className="text-xs text-worldcoin-gray-400 capitalize">
                • {review.job_category}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-veridex-primary font-medium">
            {review.stake_amount.toLocaleString()} WLD
          </div>
          <div className="text-xs text-worldcoin-gray-400">staked</div>
        </div>
      </div>

      {/* Content */}
      {review.content && (
        <p className="text-worldcoin-gray-300 mb-3">{review.content}</p>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center text-xs text-worldcoin-gray-400">
        <span>{formatDate(review.created_at)}</span>
        {review.is_flagged && (
          <span className="text-veridex-warning">
            ⚠ {review.flag_reason || 'Flagged for review'}
          </span>
        )}
      </div>
    </div>
  );
}
