import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import StatusBadge from '../components/common/StatusBadge';

export default function ClientView() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [feedback, setFeedback] = useState({});

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
    apiClient.get(`/api/projects/${user?.project_id}/posts`).then(({ data }) => setPosts(data));
  }, [user]);

  async function respond(postId, decision) {
    // optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: decision === 'approve' ? 'approved' : 'rejected' } : p))
    );
    await apiClient.post(`/api/review/${postId}`, { decision, feedback: feedback[postId] || '' });
  }

  return (
    <div className="client-view">
      <h2>Your Posts</h2>
      {posts.map((post) => (
        <div key={post.id} className="post-card">
          <h3>{post.title}</h3>
          <StatusBadge status={post.status} />
          {post.status === 'client_review' && (
            <div>
              <textarea
                placeholder="Leave feedback..."
                value={feedback[post.id] || ''}
                onChange={(e) => setFeedback((f) => ({ ...f, [post.id]: e.target.value }))}
              />
              <button onClick={() => respond(post.id, 'approve')}>Approve</button>
              <button onClick={() => respond(post.id, 'reject')}>Request Revision</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
