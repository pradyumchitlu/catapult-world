import supabase from '../lib/supabase';

export interface ReputationScoringInputs {
  reviews: any[];
  stakes: any[];
  employerReviews: any[];
}

function deriveEmployerOutcomeFromRating(rating: number): 'positive' | 'neutral' | 'negative' {
  if (rating >= 4) {
    return 'positive';
  }

  if (rating <= 2) {
    return 'negative';
  }

  return 'neutral';
}

function extractEmployerReviews(reviews: any[]): any[] {
  return reviews
    .filter((review) => Array.isArray(review.reviewer?.roles) && review.reviewer.roles.includes('client'))
    .map((review) => ({
      outcome: deriveEmployerOutcomeFromRating(Number(review.rating || 0)),
      created_at: review.created_at,
      review_id: review.id,
    }));
}

export async function loadReputationScoringInputs(
  workerId: string
): Promise<ReputationScoringInputs> {
  const [reviewsResult, stakesResult] = await Promise.all([
    supabase
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id(
          roles
        )
      `)
      .eq('worker_id', workerId)
      .eq('status', 'active'),
    supabase
      .from('stakes')
      .select(`
        id,
        staker_id,
        worker_id,
        amount,
        status,
        created_at,
        staker:staker_id(
          worker_profiles(overall_trust_score)
        )
      `)
      .eq('worker_id', workerId)
      .eq('status', 'active'),
  ]);

  if (reviewsResult.error) {
    throw reviewsResult.error;
  }

  if (stakesResult.error) {
    throw stakesResult.error;
  }

  return {
    reviews: reviewsResult.data || [],
    stakes: stakesResult.data || [],
    employerReviews: extractEmployerReviews(reviewsResult.data || []),
  };
}
