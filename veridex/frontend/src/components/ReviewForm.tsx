'use client';

import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const JOB_CATEGORIES = [
  { id: 'software', label: 'Software Development' },
  { id: 'design', label: 'Design' },
  { id: 'writing', label: 'Writing & Content' },
  { id: 'consulting', label: 'Consulting' },
  { id: 'gardening', label: 'Gardening' },
  { id: 'trades', label: 'Trades & Repairs' },
  { id: 'other', label: 'Other' },
];

interface ReviewFormProps {
  onSubmit: (data: {
    rating: number;
    content: string;
    jobCategory: string;
    stakeAmount: number;
  }) => void;
  isSubmitting: boolean;
}

export default function ReviewForm({ onSubmit, isSubmitting }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  const [jobCategory, setJobCategory] = useState('');
  const [stakeAmount, setStakeAmount] = useState(50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !jobCategory) return;
    onSubmit({ rating, content, jobCategory, stakeAmount });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Star Rating */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Rating *</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="text-3xl transition-colors"
            >
              <span
                className={
                  star <= (hoverRating || rating)
                    ? 'text-veridex-warning'
                    : 'text-veridex-gray-600'
                }
              >
                ★
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Job Category */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Job Category *</label>
        <select
          value={jobCategory}
          onChange={(e) => setJobCategory(e.target.value)}
          className="input w-full"
          required
        >
          <option value="">Select category...</option>
          {JOB_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Written Feedback */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Your Experience</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share details about your experience working with them..."
          rows={4}
          className="input w-full resize-none"
        />
      </div>

      {/* Stake Amount */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Stake Amount (ETH) — Back your review
        </label>
        <input
          type="range"
          min={0}
          max={500}
          step={10}
          value={stakeAmount}
          onChange={(e) => setStakeAmount(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-sm mt-2">
          <span className="text-veridex-gray-400">0 ETH</span>
          <span className="font-medium text-veridex-primary">{stakeAmount} ETH</span>
          <span className="text-veridex-gray-400">500 ETH</span>
        </div>
        <p className="text-xs text-veridex-gray-500 mt-2">
          Higher stakes mean more impact on their trust score. You lose stake if your review is flagged as dishonest.
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || rating === 0 || !jobCategory}
        className="btn-primary w-full disabled:opacity-50"
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-2">
            <LoadingSpinner />
            <span>Submitting...</span>
          </div>
        ) : (
          `Submit Review${stakeAmount > 0 ? ` (${stakeAmount} ETH stake)` : ''}`
        )}
      </button>
    </form>
  );
}
