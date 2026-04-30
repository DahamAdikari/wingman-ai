import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';

export default function CreatePost() {
  const { projectId } = useParams();
  const navigate      = useNavigate();
  const [title, setTitle]       = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [prompt, setPrompt]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/content', { project_id: projectId, platform, prompt });
      navigate(`/projects/${projectId}`);
    } catch {
      setError('Failed to generate post. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="page">
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
              disabled={loading}
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
