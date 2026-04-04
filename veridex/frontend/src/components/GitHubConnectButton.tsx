'use client';

import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/lib/styles';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface GitHubConnectButtonProps {
  onConnect: () => void;
  isConnected: boolean;
}

export default function GitHubConnectButton({ onConnect, isConnected }: GitHubConnectButtonProps) {
  const { token } = useAuth();

  const handleConnect = () => {
    if (token) {
      window.location.href = `${API_URL}/api/auth/github?token=${token}`;
    } else {
      onConnect();
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={isConnected}
      style={{
        width: '100%',
        padding: '16px 18px',
        borderRadius: '12px',
        border: `1.5px solid ${isConnected ? colors.success : 'rgba(37,99,235,0.2)'}`,
        background: isConnected ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.5)',
        textAlign: 'left',
        cursor: isConnected ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill={isConnected ? colors.success : colors.textSecondary}>
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>

      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '15px', fontWeight: 600, color: isConnected ? colors.success : colors.textPrimary, marginBottom: '2px' }}>
          {isConnected ? 'GitHub Connected' : 'Connect GitHub'}
        </div>
        <div style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', fontSize: '13px', color: colors.textTertiary }}>
          {isConnected ? 'Your repositories are linked' : 'Import your developer activity'}
        </div>
      </div>

      {isConnected && (
        <svg width="18" height="18" viewBox="0 0 20 20" fill={colors.success}>
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}
