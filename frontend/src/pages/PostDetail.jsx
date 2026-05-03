import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';

export default function PostDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [post, setPost]             = useState(null);   // latest row (post meta + version)
  const [versions, setVersions]     = useState([]);
  const [reviews, setReviews]       = useState([]);
  const [approvalStage, setApprovalStage] = useState(null); // from review service — always in sync
  const [loading, setLoading]       = useState(true);
  const [feedback, setFeedback]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loadData = useCallback(async () => {
    const [contentRes, reviewRes, stateRes] = await Promise.allSettled([
      apiClient.get(`/api/content/${id}`),
      apiClient.get(`/api/review/${id}`),
      apiClient.get(`/api/review/${id}/state`),
    ]);

    if (contentRes.status === 'fulfilled') {
      const rows = contentRes.value.data;
      if (Array.isArray(rows) && rows.length) {
        setPost(rows[0]);       // newest version first (ORDER BY version_number DESC)
        setVersions(rows);
      }
    }

    if (reviewRes.status === 'fulfilled') {
      const data = reviewRes.value.data;
      setReviews(Array.isArray(data) ? data : []);
    }

    if (stateRes.status === 'fulfilled') {
      setApprovalStage(stateRes.value.data?.current_stage ?? null);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // When content finishes regenerating the content service emits CONTENT_CREATED,
  // which the realtime service broadcasts as POST_STATUS_UPDATED. Reload so the
  // new caption/version appears without requiring a manual page refresh.
  useWebSocket(({ type, payload }) => {
    if (type === 'POST_STATUS_UPDATED' && String(payload.post_id) === id) {
      loadData();
    }
  });

  const isClient  = user?.role === 'client' || user?.role === 'viewer';
  const isManager = !isClient; // manager or team_member

  async function submitReview(decision) {
    if (decision !== 'approved' && !feedback.trim()) {
      setSubmitError('Feedback is required when requesting changes.');
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      await apiClient.post(`/api/review/${id}`, {
        reviewer_id:   isClient ? user.user_id : user.manager_id,
        reviewer_role: isClient ? 'client' : 'manager',
        decision,
        feedback_text: feedback.trim() || null,
      });
      setFeedback('');
      await loadData();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Review submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        <span className="spinner spinner-light" style={{ width: 18, height: 18 }} />
        <span>Loading post…</span>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page">
        <button
          className="back-link"
          style={{ background: 'none', padding: 0, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5 }}
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <p style={{ marginTop: 24, color: 'var(--text-muted)', fontSize: 13 }}>Post not found.</p>
      </div>
    );
  }

  // approvalStage comes from the review service and is updated synchronously on every review action.
  // post.status (from content service) lags by one async event, so use approvalStage for UI decisions.
  const currentStage    = approvalStage ?? post.status;
  const isManagerReview = currentStage === 'manager_review';
  const isClientReview  = currentStage === 'client_review';
  const isRegenerating  = currentStage === 'rejected';
  const canReview       = (isManager && isManagerReview) || (isClient && isClientReview);

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
        <h1 className="page-title" style={{ textTransform: 'capitalize' }}>
          {post.platform} post
        </h1>
        <StatusBadge status={currentStage} />
      </div>

      {/* Latest generated content */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">Generated Content</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            v{post.version_number}
          </span>
        </div>

        {post.image_url && (
          <div style={{ marginBottom: 16 }}>
            <img
              src={post.image_url}
              alt="Generated post visual"
              style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {post.caption_text ? (
          <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
            {post.caption_text}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Caption not available.</p>
        )}
      </div>

      {/* Regenerating notice */}
      {isRegenerating && (
        <div className="section" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="spinner spinner-light" style={{ width: 14, height: 14 }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Content is being regenerated with your feedback…
          </span>
        </div>
      )}

      {/* All versions (only shown when more than one) */}
      {versions.length > 1 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Version History</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              {versions.length} versions
            </span>
          </div>
          <div className="stagger-list">
            {versions.map((v) => (
              <div key={v.version_id} className="version-card">
                <div className="version-label">Version {v.version_number}</div>
                {v.revision_notes && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Notes: {v.revision_notes}
                  </p>
                )}
                <p className="version-content">{v.caption_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review history */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">Review History</span>
        </div>
        {reviews.length ? (
          <div className="stagger-list">
            {reviews.map((r) => (
              <div key={r.id} className="review-item">
                <div className="review-meta">
                  <span className="reviewer-role">{r.reviewer_role}</span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span className="review-decision">{r.decision}</span>
                </div>
                {r.feedback_text && (
                  <p className="review-feedback">"{r.feedback_text}"</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No reviews yet.</p>
        )}
      </div>

      {/* Review panel — shown to manager at manager_review, or client at client_review */}
      {canReview && (
        <div className="review-panel">
          <div className="review-panel-title">
            {isClientReview ? 'Client Review' : 'Submit Review'}
          </div>
          <div className="field">
            <label className="field-label">Feedback</label>
            <textarea
              className="field-textarea"
              placeholder="Describe what needs to change so the AI can regenerate with your feedback…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
          {submitError && (
            <div className="form-error" style={{ marginBottom: 12 }}>{submitError}</div>
          )}
          <div className="review-actions">
            <button
              className="btn btn-primary"
              onClick={() => submitReview('approved')}
              disabled={submitting}
            >
              {submitting ? <span className="spinner" /> : null}
              ✓ Approve
            </button>
            <button
              className="btn btn-danger"
              onClick={() => submitReview('changes_requested')}
              disabled={submitting}
            >
              ↺ Request Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
