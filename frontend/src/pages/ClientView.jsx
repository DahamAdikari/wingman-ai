import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import StatusBadge from '../components/common/StatusBadge';

export default function ClientView() {
  const { user } = useAuth();
  const [posts, setPosts]       = useState([]);
  const [feedback, setFeedback] = useState({});
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState({});
  const [errors, setErrors]     = useState({});

  useWebSocket(({ type, payload }) => {
    if (type === 'POST_STATUS_UPDATED') {
      setPosts((prev) =>
        prev.map((p) => (p.id === payload.post_id ? { ...p, status: payload.status } : p))
      );
    }
  });

  useEffect(() => {
    async function load() {
      try {
        // Step 1: find which projects this client is enrolled in
        const { data: projects } = await apiClient.get('/api/users/my-projects');
        if (!projects.length) return;

        // Step 2: fetch posts for all enrolled projects in parallel, keep only client_review ones
        const results = await Promise.allSettled(
          projects.map((p) => apiClient.get(`/api/projects/${p.id}/posts`))
        );

        const allPosts = results
          .filter((r) => r.status === 'fulfilled')
          .flatMap((r) => (Array.isArray(r.value.data) ? r.value.data : []))
          .filter((p) => p.status === 'client_review');

        setPosts(allPosts);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function respond(postId, decision) {
    const feedbackText = feedback[postId] || '';

    if (decision !== 'approved' && !feedbackText.trim()) {
      setErrors((e) => ({ ...e, [postId]: 'Please describe what needs to change.' }));
      return;
    }
    setErrors((e) => ({ ...e, [postId]: '' }));
    setSubmitting((s) => ({ ...s, [postId]: true }));

    try {
      await apiClient.post(`/api/review/${postId}`, {
        reviewer_id:   user.user_id,
        reviewer_role: 'client',
        decision,
        feedback_text: feedbackText.trim() || null,
      });

      // Remove from list after acting — post moves out of client_review
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [postId]: err.response?.data?.error || 'Submission failed. Please try again.',
      }));
    } finally {
      setSubmitting((s) => ({ ...s, [postId]: false }));
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Content for Review</h1>
          <p className="page-subtitle">
            {loading
              ? 'Loading…'
              : posts.length > 0
              ? `${posts.length} post${posts.length !== 1 ? 's' : ''} awaiting your approval`
              : 'All caught up — nothing pending'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading-page" style={{ padding: '60px 0' }}>
          <span className="spinner spinner-light" style={{ width: 18, height: 18 }} />
          <span>Loading posts…</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✓</div>
          <div className="empty-title">Nothing to review</div>
          <p className="empty-desc">
            You're all caught up. New content will appear here when it's ready for your review.
          </p>
        </div>
      ) : (
        <div className="stagger-list">
          {posts.map((post) => (
            <div key={post.id} className="client-post-card needs-review">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  gap: 12,
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.025em',
                    textTransform: 'capitalize',
                  }}
                >
                  {post.platform} post
                </h3>
                <StatusBadge status={post.status} />
              </div>

              {post.image_url && (
                <div style={{ marginBottom: 14 }}>
                  <img
                    src={post.image_url}
                    alt="Post visual"
                    style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              {post.caption_text && (
                <p
                  style={{
                    fontSize: 13.5,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.75,
                    marginBottom: 16,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {post.caption_text}
                </p>
              )}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label className="field-label">Feedback (required for revision requests)</label>
                  <textarea
                    className="field-textarea"
                    placeholder="Describe what needs to change…"
                    value={feedback[post.id] || ''}
                    onChange={(e) =>
                      setFeedback((f) => ({ ...f, [post.id]: e.target.value }))
                    }
                    rows={3}
                  />
                </div>

                {errors[post.id] && (
                  <p style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 10 }}>
                    {errors[post.id]}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => respond(post.id, 'approved')}
                    disabled={submitting[post.id]}
                  >
                    {submitting[post.id] ? <span className="spinner" /> : '✓ Approve'}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => respond(post.id, 'changes_requested')}
                    disabled={submitting[post.id]}
                  >
                    ↺ Request Revision
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
