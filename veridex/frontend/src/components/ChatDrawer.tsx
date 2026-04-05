'use client';

import ChatPanel from '@/components/ChatPanel';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  workerName: string;
  token: string;
}

export default function ChatDrawer({ isOpen, onClose, workerId, workerName, token }: ChatDrawerProps) {
  return (
    <div
      style={{
        width: isOpen ? '380px' : '0px',
        minWidth: isOpen ? '380px' : '0px',
        overflow: 'hidden',
        transition: 'width 0.3s ease, min-width 0.3s ease',
        flexShrink: 0,
        position: 'sticky',
        top: '72px',
        height: 'calc(100vh - 72px)',
        paddingBottom: '16px',
      }}
    >
      <div
        style={{
          width: '380px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.32) 40%, rgba(219,234,254,0.28) 70%, rgba(255,255,255,0.42) 100%)',
          backdropFilter: 'blur(28px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
          boxShadow:
            '-4px 0 24px rgba(37,99,235,0.08), 0 1px 0 rgba(255,255,255,0.6) inset',
          borderRadius: '24px',
          borderLeft: '1px solid rgba(255,255,255,0.6)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(37,99,235,0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '16px',
              fontWeight: 600,
              color: '#1E293B',
              margin: 0,
            }}
          >
            Ask About {workerName}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#94A3B8',
              fontSize: '20px',
              lineHeight: 1,
            }}
            aria-label="Close chat"
          >
            &times;
          </button>
        </div>

        {/* Chat content */}
        <div style={{ flex: 1, padding: '16px', overflow: 'hidden', minHeight: 0 }}>
          <ChatPanel workerId={workerId} workerName={workerName} token={token} />
        </div>
      </div>
    </div>
  );
}
