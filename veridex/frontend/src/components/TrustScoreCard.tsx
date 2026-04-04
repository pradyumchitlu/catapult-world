'use client';

interface TrustScoreCardProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function TrustScoreCard({ score, size = 'lg' }: TrustScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-veridex-success';
    if (score >= 60) return 'text-veridex-primary';
    if (score >= 40) return 'text-veridex-warning';
    return 'text-veridex-error';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Building';
  };

  const sizeClasses = {
    sm: {
      container: 'p-4',
      score: 'text-3xl',
      ring: 'w-20 h-20',
    },
    md: {
      container: 'p-5',
      score: 'text-4xl',
      ring: 'w-28 h-28',
    },
    lg: {
      container: 'p-6',
      score: 'text-5xl',
      ring: 'w-36 h-36',
    },
  };

  const classes = sizeClasses[size];
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`card ${classes.container}`}>
      <div className="flex flex-col items-center">
        {/* Score Ring */}
        <div className={`relative ${classes.ring} mb-4`}>
          <svg className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-worldcoin-gray-700"
            />
            {/* Score ring */}
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className={getScoreColor(score)}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: 'stroke-dashoffset 0.5s ease-in-out',
              }}
            />
          </svg>
          {/* Score number */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`${classes.score} font-bold ${getScoreColor(score)}`}>
              {score}
            </span>
          </div>
        </div>

        {/* Labels */}
        <div className="text-center">
          <div className="text-lg font-semibold">Trust Score</div>
          <div className={`text-sm ${getScoreColor(score)}`}>
            {getScoreLabel(score)}
          </div>
        </div>
      </div>
    </div>
  );
}
