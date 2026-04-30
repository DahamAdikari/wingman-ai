import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusBadge from '../components/common/StatusBadge';

export default function ProjectDetail() {
  const { id } = useParams();
  const { state } = useLocation();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get(`/api/projects/${id}/detail`)
      .then(({ data }) => setDetail(data))
      .catch((err) => {
        const msg = err.response?.data?.error || 'Failed to load project detail';
        setError(msg);
      });
  }, [id]);

  if (error) {
    return (
      <div className="project-detail">
        <p className="error">{error}</p>
        <Link to="/dashboard">← Back</Link>
      </div>
    );
  }

  if (!detail) return <p>Loading...</p>;

  // Gateway returns: { content: [...posts], reviews: [...], members: [...] }
  const projectName = state?.project_name || 'Project';
  const posts = Array.isArray(detail.content) ? detail.content : [];

  return (
    <div className="project-detail">
      <h2>{projectName}</h2>
      <h3>Posts</h3>
      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <Link to={`/posts/${post.id}`}>{post.title}</Link>
              <StatusBadge status={post.status} />
            </li>
          ))}
        </ul>
      )}
      <Link to="/dashboard">← Back</Link>
    </div>
  );
}
