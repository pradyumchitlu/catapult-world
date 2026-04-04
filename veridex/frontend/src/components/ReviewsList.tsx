'use client';

import ReviewCard from './ReviewCard';
import type { Review } from '@/types';

interface ReviewsListProps {
  reviews: Review[];
}

export default function ReviewsList({ reviews }: ReviewsListProps) {
  // Sort reviews by stake amount (most skin in game first)
  const sortedReviews = [...reviews].sort((a, b) => b.stake_amount - a.stake_amount);

  if (sortedReviews.length === 0) {
    return (
      <div className="text-center py-8 text-worldcoin-gray-400">
        No reviews yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedReviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}
