'use client';

import { useState, useRef, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import type { ChatMessage } from '@/types';

interface ChatPanelProps {
  workerId: string;
  workerName: string;
}

export default function ChatPanel({ workerId, workerName }: ChatPanelProps) {
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

  // Initial prompt
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
      // TODO: Call chat API
      // const response = await sendChatMessage(workerId, input, sessionId, token);
      // setSessionId(response.session_id);
      // setMessages((prev) => [...prev, { role: 'assistant', content: response.message, timestamp: new Date().toISOString() }]);

      // Placeholder response
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: `Based on ${workerName}'s verified data:\n\nThis worker has demonstrated strong capabilities in this area. Their GitHub activity shows consistent contributions, and their reviews highlight positive experiences.\n\n*This is a placeholder response. Full AI evaluation coming soon.*`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
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

  return (
    <div className="flex flex-col h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-veridex-primary text-white'
                  : 'bg-worldcoin-gray-700 text-white'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-worldcoin-gray-700 p-3 rounded-lg">
              <LoadingSpinner />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this worker's qualifications..."
          className="input flex-1"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="btn-primary px-4 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
