'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReviewForm from '@/components/ReviewForm';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { createReview, getReputation } from '@/lib/api';
import type { User } from '@/types';

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const workerId = params.workerId as string;
  const { user, token, isLoading: authLoading } = useAuth();

  const [worker, setWorker] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/verify');
      return;
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!workerId) return;

    const fetchWorker = async () => {
      try {
        const result = await getReputation(workerId);
        setWorker(result.user || null);
      } catch (error) {
        console.error('Failed to fetch worker:', error);
        setError(error instanceof Error ? error.message : 'Failed to load worker');
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
    if (!token) {
      setError('Sign in before leaving a review.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createReview(workerId, data.rating, data.content, data.jobCategory, data.stakeAmount, token);
      router.push(`/profile/${workerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="text-center py-12">
        <p className="text-veridex-gray-400">Worker not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Leave a Review</h1>
      <p className="text-veridex-gray-400 mb-8">
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
        <h3 className="font-semibold mb-2">Back Your Review with ETH</h3>
        <p className="text-sm text-veridex-gray-300">
          Staking ETH on your review proves you stand behind it. Reviews with higher stakes
          have more impact on the worker&apos;s Veridex score. Your stake is also visible to
          others evaluating this worker.
        </p>
      </div>
    </div>
  );
}
