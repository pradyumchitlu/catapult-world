'use client';

import { useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import GitHubConnectButton from '@/components/GitHubConnectButton';
import {
  headingMd,
  sectionLabel,
  textSecondary,
  textMuted,
  colors,
} from '@/lib/styles';
import {
  uploadEvidenceDraft,
  saveReputationEvidence,
  triggerIngestion,
} from '@/lib/api';

interface UpdateEvidenceModalProps {
  userId: string;
  token: string;
  githubUsername: string | null;
  onClose: () => void;
  onComplete: (warning?: string | null) => void;
}

const fileButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '13px',
  fontWeight: 500,
  color: colors.primary,
  background: 'rgba(37,99,235,0.06)',
  border: '1.5px dashed rgba(37,99,235,0.3)',
  borderRadius: '10px',
  padding: '10px 20px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
};

const fieldLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '13px',
  fontWeight: 600,
  color: '#1E293B',
  display: 'block',
  marginBottom: '8px',
};

const textareaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '14px',
  color: '#1E293B',
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(37,99,235,0.2)',
  borderRadius: '12px',
  padding: '12px 16px',
  width: '100%',
  minHeight: '80px',
  resize: 'vertical' as const,
  outline: 'none',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(37,99,235,0.03)',
  border: '1px solid rgba(37,99,235,0.12)',
  borderRadius: '14px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

function splitList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function UpdateEvidenceModal({
  userId,
  token,
  githubUsername,
  onClose,
  onComplete,
}: UpdateEvidenceModalProps) {
  const [linkedinFile, setLinkedinFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [portfolioUrlsText, setPortfolioUrlsText] = useState('');
  const [projectUrlsText, setProjectUrlsText] = useState('');
  const [linkedinInputKey, setLinkedinInputKey] = useState(0);
  const [supportingInputKey, setSupportingInputKey] = useState(0);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const hasNewInputs =
    linkedinFile !== null ||
    supportingFiles.length > 0 ||
    portfolioUrlsText.trim().length > 0 ||
    projectUrlsText.trim().length > 0;

  const handleAnalyze = async () => {
    const portfolioUrls = splitList(portfolioUrlsText);
    const projectUrls = splitList(projectUrlsText);

    if (!linkedinFile && supportingFiles.length === 0 && portfolioUrls.length === 0 && projectUrls.length === 0) {
      setError('Add a LinkedIn PDF, supporting files, or URLs before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await uploadEvidenceDraft(
        { linkedinFile, supportingFiles, portfolioUrls, projectUrls },
        token
      );
      setDraftData(result.draft);
      setAnalyzed(true);
      setLinkedinFile(null);
      setSupportingFiles([]);
      setLinkedinInputKey((v) => v + 1);
      setSupportingInputKey((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze evidence');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunPipeline = async () => {
    setIsRunning(true);
    setError(null);

    try {
      // Save analyzed evidence if we have it
      if (draftData) {
        const linkedinData: Record<string, any> = {};
        if (draftData.linkedin_data) {
          Object.assign(linkedinData, draftData.linkedin_data);
        }

        await saveReputationEvidence(
          {
            linkedin_data: Object.keys(linkedinData).length > 0 ? linkedinData : undefined,
            projects: draftData.projects || undefined,
            other_platforms: {
              portfolio: draftData.portfolio || [],
              work_samples: draftData.work_samples || [],
              uploaded_files: draftData.uploaded_files || [],
            },
          },
          token
        );
      }

      // Re-run the full pipeline
      const result = await triggerIngestion(userId, token);
      onComplete(result.warning || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run pipeline');
    } finally {
      setIsRunning(false);
    }
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
        background: 'rgba(15,23,42,0.4)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !isRunning && !isAnalyzing) onClose(); }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.92)',
          borderRadius: '20px',
          border: '1px solid rgba(37,99,235,0.12)',
          boxShadow: '0 24px 64px rgba(15,23,42,0.18)',
          width: '100%',
          maxWidth: '640px',
          maxHeight: 'calc(100vh - 96px)',
          overflow: 'auto',
          padding: '36px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ ...headingMd, fontSize: '22px', margin: 0 }}>Update Evidence</h2>
          <button
            onClick={onClose}
            disabled={isRunning || isAnalyzing}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94A3B8', padding: '4px' }}
          >
            &times;
          </button>
        </div>
        <p style={{ ...textSecondary, fontSize: '14px', marginBottom: '24px' }}>
          Add or update your evidence sources, then re-run the scoring pipeline.
        </p>

        {/* GitHub Connection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ ...fieldLabelStyle, marginBottom: '10px' }}>GitHub</label>
          <GitHubConnectButton
            onConnect={() => {}}
            isConnected={!!githubUsername}
            returnTo="dashboard"
          />
          {githubUsername && (
            <p style={{ ...textMuted, fontSize: '12px', marginTop: '8px' }}>
              Connected as @{githubUsername}. The pipeline will re-fetch your latest GitHub data.
            </p>
          )}
        </div>

        {/* LinkedIn PDF */}
        <div style={{ ...cardStyle, marginBottom: '16px' }}>
          <div>
            <label style={fieldLabelStyle}>LinkedIn Profile PDF</label>
            <input
              key={linkedinInputKey}
              id="update-linkedin-file"
              type="file"
              accept=".pdf,.docx,.txt,.md"
              style={{ display: 'none' }}
              onChange={(e) => {
                setLinkedinFile(e.target.files?.[0] || null);
                setAnalyzed(false);
              }}
            />
            <button
              type="button"
              onClick={() => document.getElementById('update-linkedin-file')?.click()}
              style={fileButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(37,99,235,0.12)';
                e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(37,99,235,0.06)';
                e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Choose File
            </button>
            {linkedinFile && (
              <p style={{ ...textMuted, fontSize: '12px', marginTop: '8px' }}>Selected: {linkedinFile.name}</p>
            )}
          </div>

          {/* Supporting Documents */}
          <div>
            <label style={fieldLabelStyle}>Supporting Documents</label>
            <input
              key={supportingInputKey}
              id="update-supporting-files"
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              style={{ display: 'none' }}
              onChange={(e) => {
                setSupportingFiles(Array.from(e.target.files || []));
                setAnalyzed(false);
              }}
            />
            <button
              type="button"
              onClick={() => document.getElementById('update-supporting-files')?.click()}
              style={fileButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(37,99,235,0.12)';
                e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(37,99,235,0.06)';
                e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Choose Files
            </button>
            {supportingFiles.length > 0 && (
              <p style={{ ...textMuted, fontSize: '12px', marginTop: '8px' }}>
                Selected: {supportingFiles.map((f) => f.name).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* URLs */}
        <div style={{ ...cardStyle, marginBottom: '16px' }}>
          <div>
            <label style={fieldLabelStyle}>Portfolio URLs</label>
            <textarea
              value={portfolioUrlsText}
              onChange={(e) => { setPortfolioUrlsText(e.target.value); setAnalyzed(false); }}
              placeholder="One URL per line"
              style={textareaStyle}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>Project URLs / Proof Links</label>
            <textarea
              value={projectUrlsText}
              onChange={(e) => { setProjectUrlsText(e.target.value); setAnalyzed(false); }}
              placeholder="GitHub repos, demos, docs, package pages..."
              style={textareaStyle}
            />
          </div>
        </div>

        {/* Analyze button */}
        {hasNewInputs && !analyzed && (
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="btn-secondary"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
          >
            {isAnalyzing ? <LoadingSpinner /> : 'Analyze New Evidence'}
          </button>
        )}

        {analyzed && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              fontSize: '13px',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              color: colors.success,
              marginBottom: '16px',
            }}
          >
            Evidence analyzed successfully. Click below to save and re-run the pipeline.
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.2)',
              fontSize: '13px',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              color: colors.rose,
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={isRunning || isAnalyzing}
            className="btn-secondary"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            onClick={handleRunPipeline}
            disabled={isRunning || isAnalyzing || (hasNewInputs && !analyzed)}
            className="btn-primary"
            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {isRunning ? <LoadingSpinner /> : 'Save & Re-run Pipeline'}
          </button>
        </div>

        {hasNewInputs && !analyzed && (
          <p style={{ ...textMuted, fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
            Analyze your new evidence before running the pipeline.
          </p>
        )}
      </div>
    </div>
  );
}
