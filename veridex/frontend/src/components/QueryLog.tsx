'use client';

import type { QueryLogEntry } from '@/types';

interface QueryLogProps {
  entries: QueryLogEntry[];
}

export default function QueryLog({ entries }: QueryLogProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getQueryTypeLabel = (type: string) => {
    switch (type) {
      case 'profile_view':
        return 'Profile View';
      case 'api_query':
        return 'API Query';
      case 'chat_query':
        return 'Chat Evaluation';
      case 'contextual_score':
        return 'Fit Score';
      default:
        return type;
    }
  };

  const getQueryTypeColor = (type: string) => {
    switch (type) {
      case 'profile_view':
        return 'bg-worldcoin-gray-600';
      case 'api_query':
        return 'bg-veridex-secondary/20 text-veridex-secondary';
      case 'chat_query':
        return 'bg-veridex-primary/20 text-veridex-primary';
      case 'contextual_score':
        return 'bg-veridex-warning/20 text-veridex-warning';
      default:
        return 'bg-worldcoin-gray-600';
    }
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-worldcoin-gray-400">
        No profile views yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-worldcoin-gray-400 text-left">
            <th className="pb-3 font-medium">Viewer</th>
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium text-right">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-worldcoin-gray-700">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="py-3">
                {entry.querier_info || 'Anonymous'}
              </td>
              <td className="py-3">
                <span className={`px-2 py-1 rounded text-xs ${getQueryTypeColor(entry.query_type)}`}>
                  {getQueryTypeLabel(entry.query_type)}
                </span>
              </td>
              <td className="py-3 text-right text-worldcoin-gray-400">
                {formatDate(entry.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
