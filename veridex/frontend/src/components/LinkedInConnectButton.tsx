'use client';

import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/lib/styles';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface LinkedInConnectButtonProps {
  onConnect: () => void;
  isConnected: boolean;
}

export default function LinkedInConnectButton({
  onConnect,
  isConnected,
}: LinkedInConnectButtonProps) {
  const { token } = useAuth();

  const handleConnect = () => {
    if (token) {
      window.location.href = `${API_URL}/api/auth/linkedin?token=${token}`;
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
        border: `1.5px solid ${isConnected ? colors.success : 'rgba(10,102,194,0.2)'}`,
        background: isConnected ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.5)',
        textAlign: 'left',
        cursor: isConnected ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      <div
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '5px',
          background: isConnected ? colors.success : '#0A66C2',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: '13px',
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        in
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            color: isConnected ? colors.success : colors.textPrimary,
            marginBottom: '2px',
          }}
        >
          {isConnected ? 'LinkedIn Connected' : 'Connect LinkedIn'}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '13px',
            color: colors.textTertiary,
          }}
        >
          {isConnected
            ? 'Verified identity and basic profile linked'
            : 'Verify account ownership and basic profile'}
        </div>
      </div>

      {isConnected && (
        <svg width="18" height="18" viewBox="0 0 20 20" fill={colors.success}>
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}
