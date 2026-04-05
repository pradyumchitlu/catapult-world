'use client';

import { useState } from 'react';
import { headingSm, headingMd, textSecondary, textMuted, sectionLabel, colors } from '@/lib/styles';

interface ContractReviewFormProps {
  contractTitle: string;
  contractPayment: number;
  workerName: string;
  onSubmit: (data: { rating: number; content: string; job_category: string }) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function ContractReviewForm({
  contractTitle,
  contractPayment,
  workerName,
  onSubmit,
  onClose,
  isLoading,
}: ContractReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [jobCategory, setJobCategory] = useState('software');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) return;
    onSubmit({ rating, content: content.trim(), job_category: jobCategory });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '100%',
          margin: '48px 24px',
          backgroundColor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.85)',
          boxShadow: '0 8px 40px rgba(37,99,235,0.12)',
          borderRadius: '20px',
          maxHeight: 'calc(100vh - 96px)',
          overflowY: 'auto',
        }}
      >
        <div className="p-10">
          <span style={sectionLabel}>Leave a Review</span>
          <h2 style={{ ...headingMd, fontSize: '22px', margin: '0 0 4px 0' }}>
            Review {workerName}
          </h2>
          <p style={{ ...textMuted, marginBottom: '24px' }}>
            Contract: {contractTitle} ({contractPayment.toLocaleString()} WLD)
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Star rating */}
            <div>
              <label style={{ ...headingSm, fontSize: '13px', display: 'block', marginBottom: '8px' }}>Rating</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '28px',
                      color: star <= rating ? colors.warning : 'rgba(37,99,235,0.15)',
                      transition: 'color 0.1s ease',
                      padding: '2px',
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ ...headingSm, fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Job Category
              </label>
              <select
                className="input"
                value={jobCategory}
                onChange={(e) => setJobCategory(e.target.value)}
              >
                <option value="software">Software</option>
                <option value="design">Design</option>
                <option value="writing">Writing</option>
                <option value="trades">Trades</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ ...headingSm, fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                Review
              </label>
              <textarea
                className="input"
                placeholder="How was your experience working with this person?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="submit"
                disabled={isLoading || rating === 0}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                {isLoading ? 'Submitting...' : 'Submit Review'}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
