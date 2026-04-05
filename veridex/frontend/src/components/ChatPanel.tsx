'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import LoadingSpinner from './LoadingSpinner';
import { sendChatMessage } from '@/lib/api';
import { colors } from '@/lib/styles';
import type { ChatMessage } from '@/types';

interface ChatPanelProps {
  workerId: string;
  workerName: string;
  token: string;
}

export default function ChatPanel({ workerId, workerName, token }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Hi! I can help you evaluate ${workerName}'s qualifications based on their verified data. What would you like to know? For example:\n\n• "What's their experience with React?"\n• "How consistent is their work history?"\n• "What do reviewers say about their communication?"`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [workerName]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(workerId, input, sessionId, token);
      setSessionId(response.session_id);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const bubbleStyle = (role: 'user' | 'assistant'): React.CSSProperties =>
    role === 'user'
      ? {
          maxWidth: '80%',
          padding: '12px 16px',
          borderRadius: '14px 14px 4px 14px',
          background: colors.primary,
          color: '#ffffff',
        }
      : {
          maxWidth: '80%',
          padding: '12px 16px',
          borderRadius: '14px 14px 14px 4px',
          background: 'rgba(37,99,235,0.06)',
          border: '1px solid rgba(37,99,235,0.12)',
          color: '#1E293B',
        };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={bubbleStyle(message.role)}>
              {message.role === 'user' ? (
                <p
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: '14px',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    lineHeight: '1.6',
                    margin: 0,
                  }}
                >
                  {message.content}
                </p>
              ) : (
                <div
                  className="chat-markdown"
                  style={{
                    fontSize: '14px',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    lineHeight: '1.6',
                  }}
                >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '14px 14px 14px 4px',
                background: 'rgba(37,99,235,0.06)',
                border: '1px solid rgba(37,99,235,0.12)',
              }}
            >
              <LoadingSpinner />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          className="input"
          style={{ flex: 1, fontSize: '14px' }}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="btn-primary"
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
