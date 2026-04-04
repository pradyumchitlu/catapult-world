'use client';

import { colors } from '@/lib/styles';
import type { QueryLogEntry } from '@/types';

interface QueryLogProps {
  entries: QueryLogEntry[];
}

const TYPE_LABEL: Record<string, string> = {
  profile_view: 'Profile View',
  api_query: 'API Query',
  chat_query: 'Chat Evaluation',
  contextual_score: 'Fit Score',
};

const TYPE_STYLE: Record<string, { background: string; color: string }> = {
  profile_view:     { background: 'rgba(100,116,139,0.1)', color: colors.textTertiary },
  api_query:        { background: 'rgba(14,165,233,0.1)',  color: '#0EA5E9' },
  chat_query:       { background: 'rgba(37,99,235,0.1)',   color: colors.primary },
  contextual_score: { background: 'rgba(245,158,11,0.1)',  color: colors.warning },
};

export default function QueryLog({ entries }: QueryLogProps) {
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '14px' }}>
        No profile views yet.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: '13px', fontFamily: 'var(--font-inter), system-ui, sans-serif', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Viewer', 'Type', 'Time'].map((h, i) => (
              <th
                key={h}
                style={{
                  paddingBottom: '12px',
                  fontWeight: 500,
                  color: colors.textMuted,
                  textAlign: i === 2 ? 'right' : 'left',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontSize: '11px',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={entry.id} style={{ borderTop: i > 0 ? '1px solid rgba(37,99,235,0.08)' : 'none' }}>
              <td style={{ padding: '12px 0', color: colors.textPrimary }}>
                {entry.querier_info || 'Anonymous'}
              </td>
              <td style={{ padding: '12px 0' }}>
                <span
                  style={{
                    ...(TYPE_STYLE[entry.query_type] || TYPE_STYLE.profile_view),
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {TYPE_LABEL[entry.query_type] || entry.query_type}
                </span>
              </td>
              <td style={{ padding: '12px 0', textAlign: 'right', color: colors.textMuted }}>
                {formatDate(entry.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
