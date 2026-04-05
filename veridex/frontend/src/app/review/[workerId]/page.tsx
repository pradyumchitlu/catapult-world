'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReviewForm from '@/components/ReviewForm';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { User } from '@/types';

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const workerId = params.workerId as string;

  const [worker, setWorker] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch worker info
    const fetchWorker = async () => {
      try {
        // Placeholder
        setWorker({
          id: workerId,
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
        });
      } catch (error) {
        console.error('Failed to fetch worker:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorker();
  }, [workerId]);

  const handleSubmit = async (data: {
    rating: number;
    content: string;
    jobCategory: string;
    stakeAmount: number;
  }) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // TODO: Call review API
      // await createReview(workerId, data.rating, data.content, data.jobCategory, data.stakeAmount, token);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Placeholder
      router.push(`/profile/${workerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="text-center py-12">
        <p className="text-worldcoin-gray-400">Worker not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Leave a Review</h1>
      <p className="text-worldcoin-gray-400 mb-8">
        Share your experience working with <span className="text-white font-medium">{worker.display_name}</span>
      </p>

      <div className="card">
        <ReviewForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />

        {error && (
          <div className="mt-4 p-3 bg-veridex-error/20 border border-veridex-error rounded-lg text-veridex-error text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Staking Info */}
      <div className="mt-6 card bg-veridex-primary/10 border-veridex-primary/30">
        <h3 className="font-semibold mb-2">Back Your Review with WLD</h3>
        <p className="text-sm text-worldcoin-gray-300">
          Staking WLD on your review proves you stand behind it. Reviews with higher stakes
          have more impact on the worker&apos;s trust score. Your stake is also visible to
          others evaluating this worker.
        </p>
      </div>
    </div>
  );
}
