'use client';

import { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface JobDescriptionInputProps {
  onSubmit: (description: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function JobDescriptionInput({
  onSubmit,
  isLoading,
  placeholder = 'Paste a job description or describe the requirements...',
}: JobDescriptionInputProps) {
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onSubmit(description);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="input w-full resize-none mb-3"
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={!description.trim() || isLoading}
        className="btn-primary disabled:opacity-50"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <LoadingSpinner />
            <span>Analyzing...</span>
          </div>
        ) : (
          'Evaluate Fit'
        )}
      </button>
    </form>
  );
}
