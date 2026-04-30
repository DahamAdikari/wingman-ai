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

  useWebSocket(({ type, payload }) => {
    if (type === 'POST_SENT_TO_CLIENT') {
      setPosts((prev) => [...prev, payload]);
    }
    if (type === 'POST_STATUS_UPDATED') {
      setPosts((prev) =>
        prev.map((p) => (p.id === payload.id ? { ...p, status: payload.status } : p))
      );
    }
  });

  useEffect(() => {
    apiClient
      .get(`/api/projects/${user?.project_id}/posts`)
      .then(({ data }) => setPosts(data))
      .finally(() => setLoading(false));
  }, [user]);

  async function respond(postId, decision) {
    setSubmitting((s) => ({ ...s, [postId]: true }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, status: decision === 'approve' ? 'approved' : 'rejected' }
          : p
      )
    );
    try {
      await apiClient.post(`/api/review/${postId}`, {
        decision,
        feedback: feedback[postId] || '',
      });
    } finally {
      setSubmitting((s) => ({ ...s, [postId]: false }));
    }
  }

  const pendingCount = posts.filter((p) => p.status === 'client_review').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Content for Review</h1>
          <p className="page-subtitle">
            {loading
              ? 'Loading…'
              : pendingCount > 0
              ? `${pendingCount} post${pendingCount !== 1 ? 's' : ''} awaiting your approval`
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
            <div
              key={post.id}
              className={`client-post-card${post.status === 'client_review' ? ' needs-review' : ''}`}
            >
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
                  }}
                >
                  {post.title}
                </h3>
                <StatusBadge status={post.status} />
              </div>

              {post.content && (
                <p
                  style={{
                    fontSize: 13.5,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.75,
                    marginBottom: 16,
                  }}
                >
                  {post.content}
                </p>
              )}

              {post.status === 'client_review' && (
                <div
                  style={{
                    borderTop: '1px solid var(--border)',
                    paddingTop: 16,
                    marginTop: 4,
                  }}
                >
                  <div className="field" style={{ marginBottom: 12 }}>
                    <label className="field-label">Feedback (optional)</label>
                    <textarea
                      className="field-textarea"
                      placeholder="Share your thoughts or request changes…"
                      value={feedback[post.id] || ''}
                      onChange={(e) =>
                        setFeedback((f) => ({ ...f, [post.id]: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => respond(post.id, 'approve')}
                      disabled={submitting[post.id]}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => respond(post.id, 'reject')}
                      disabled={submitting[post.id]}
                    >
                      ↺ Request Revision
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
