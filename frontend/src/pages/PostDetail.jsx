import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { canReview } from '../utils/roles';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    apiClient.get(`/api/content/${id}`).then(({ data }) => setPost(data));
  }, [id]);

  async function submitReview(decision) {
    // optimistic update
    setPost((prev) => ({ ...prev, status: decision === 'approve' ? 'approved' : 'rejected' }));
    await apiClient.post(`/api/review/${id}`, { decision, feedback });
  }

  if (!post) return <p>Loading...</p>;

  return (
    <div className="post-detail">
      <h2>{post.title}</h2>
      <StatusBadge status={post.status} />

      <h3>Versions</h3>
      {post.versions?.map((v, i) => (
        <div key={v.id} className="version">
          <strong>v{i + 1}</strong>
          <p>{v.content}</p>
        </div>
      ))}

      <h3>Review History</h3>
      {post.reviews?.map((r) => (
        <div key={r.id} className="review-entry">
          <span>{r.reviewer_role}:</span> {r.feedback}
        </div>
      ))}

      {canReview(user) && post.status === 'manager_review' && (
        <div className="review-panel">
          <textarea
            placeholder="Feedback (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <button onClick={() => submitReview('approve')}>Approve</button>
          <button onClick={() => submitReview('reject')}>Request Revision</button>
        </div>
      )}
    </div>
  );
}
