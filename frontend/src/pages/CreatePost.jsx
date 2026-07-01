import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';

// Modal shown when a project has no enrolled members yet.
function NoMembersModal({ projectId, onContinueWithoutClients, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 28, maxWidth: 440, width: '100%',
      }}>
        <div style={{ fontSize: 22, marginBottom: 10 }}>⚠</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--text-primary)', margin: '0 0 10px' }}>
          No members on this project
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
          This project has no clients or team members enrolled yet. You can add members first so they receive review requests, or continue without clients — in which case the post will skip client review and go straight to scheduling after you approve it.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link
            to={`/projects/${projectId}`}
            className="btn btn-primary"
            style={{ textAlign: 'center' }}
            onClick={onClose}
          >
            Add Members First
          </Link>
          <button
            className="btn btn-secondary"
            onClick={onContinueWithoutClients}
          >
            Continue Without Clients
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreatePost() {
  const { projectId } = useParams();
  const navigate      = useNavigate();
  const [platform, setPlatform] = useState('instagram');
  const [prompt, setPrompt]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Safety gate state
  const [membersChecked, setMembersChecked]           = useState(false);
  const [showNoMembersModal, setShowNoMembersModal]   = useState(false);
  const [skipClientReview, setSkipClientReview]       = useState(false);

  // Check project members on mount
  useEffect(() => {
    apiClient.get(`/api/projects/${projectId}/detail`)
      .then(({ data }) => {
        const members = data?.members?.available ? (data.members.data ?? []) : null;
        if (members !== null && members.length === 0) {
          setShowNoMembersModal(true);
        }
      })
      .catch(() => {/* ignore — don't block post creation if check fails */})
      .finally(() => setMembersChecked(true));
  }, [projectId]);

  function handleContinueWithoutClients() {
    setSkipClientReview(true);
    setShowNoMembersModal(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/content', {
        project_id: projectId,
        platform,
        prompt,
        skip_client_review: skipClientReview,
      });
      navigate(`/projects/${projectId}`);
    } catch {
      setError('Failed to generate post. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="page">
      {showNoMembersModal && (
        <NoMembersModal
          projectId={projectId}
          onContinueWithoutClients={handleContinueWithoutClients}
          onClose={() => setShowNoMembersModal(false)}
        />
      )}

      <Link to={`/projects/${projectId}`} className="back-link">← Back to project</Link>

      <div className="page-header" style={{ marginBottom: 30 }}>
        <div>
          <div className="ai-badge">✦ AI Generation</div>
          <h1 className="page-title">Generate New Post</h1>
          <p className="page-subtitle">
            Describe your content and our AI will generate optimized social media copy.
          </p>
        </div>
      </div>

      {skipClientReview && (
        <div style={{
          marginBottom: 20, padding: '10px 14px',
          background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.2)',
          borderRadius: 'var(--radius-sm)', fontSize: 12.5, color: 'var(--accent)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>✓</span>
          <span>Client review will be skipped — post goes straight to scheduling after your approval.</span>
          <button
            type="button"
            onClick={() => setSkipClientReview(false)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11 }}
          >
            Undo
          </button>
        </div>
      )}

      <div className="create-post-page">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="field">
            <label className="field-label">Platform</label>
            <select
              className="field-input"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              required
              autoFocus
            >
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter / X</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label">Generation Prompt</label>
            <textarea
              className="field-textarea"
              placeholder="Describe the content, tone, target audience, and any key messages you want the AI to include…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              rows={8}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || (!membersChecked && !skipClientReview)}
              style={{ minWidth: 160 }}
            >
              {loading ? (
                <><span className="spinner" />Generating…</>
              ) : (
                '✦ Generate Post'
              )}
            </button>
            <Link to={`/projects/${projectId}`} className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
