import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { canReview } from '../utils/roles';

export default function PostDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const [post, setPost]         = useState(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient.get(`/api/content/${id}`).then(({ data }) => setPost(data));
  }, [id]);

  async function submitReview(decision) {
    setSubmitting(true);
    setPost((prev) => ({
      ...prev,
      status: decision === 'approve' ? 'approved' : 'rejected',
    }));
    try {
      await apiClient.post(`/api/review/${id}`, { decision, feedback });
    } finally {
      setSubmitting(false);
    }
  }

  if (!post) {
    return (
      <div className="loading-page">
        <span className="spinner spinner-light" style={{ width: 18, height: 18 }} />
        <span>Loading post…</span>
      </div>
    );
  }

  return (
    <div className="page">
      <button
        className="back-link"
        style={{ background: 'none', padding: 0, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5 }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 className="page-title">{post.title}</h1>
        <StatusBadge status={post.status} />
      </div>

      {/* Versions */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">Content Versions</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            {post.versions?.length || 0} version{post.versions?.length !== 1 ? 's' : ''}
          </span>
        </div>
        {post.versions?.length ? (
          <div className="stagger-list">
            {post.versions.map((v, i) => (
              <div key={v.id} className="version-card">
                <div className="version-label">Version {i + 1}</div>
                <p className="version-content">{v.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No content versions available.</p>
        )}
      </div>

      {/* Review history */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">Review History</span>
        </div>
        {post.reviews?.length ? (
          <div className="stagger-list">
            {post.reviews.map((r) => (
              <div key={r.id} className="review-item">
                <div className="review-meta">
                  <span className="reviewer-role">{r.reviewer_role}</span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span className="review-decision">{r.decision}</span>
                </div>
                {r.feedback && <p className="review-feedback">"{r.feedback}"</p>}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No reviews yet.</p>
        )}
      </div>

      {/* Review panel */}
      {canReview(user) && post.status === 'manager_review' && (
        <div className="review-panel">
          <div className="review-panel-title">Your Review</div>
          <div className="field">
            <label className="field-label">Feedback (optional)</label>
            <textarea
              className="field-textarea"
              placeholder="Leave feedback for the AI to improve the next revision…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
          <div className="review-actions">
            <button
              className="btn btn-primary"
              onClick={() => submitReview('approve')}
              disabled={submitting}
            >
              ✓ Approve
            </button>
            <button
              className="btn btn-danger"
              onClick={() => submitReview('reject')}
              disabled={submitting}
            >
              ↺ Request Revision
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
