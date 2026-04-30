import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusBadge from '../components/common/StatusBadge';

export default function ProjectDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    apiClient.get(`/api/projects/${id}/detail`).then(({ data }) => setDetail(data));
  }, [id]);

  if (!detail) return <p>Loading...</p>;

  return (
    <div className="project-detail">
      <h2>{detail.name}</h2>
      <h3>Posts</h3>
      <ul>
        {detail.posts?.map((post) => (
          <li key={post.id}>
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
            <StatusBadge status={post.status} />
          </li>
        ))}
      </ul>
      <Link to="/dashboard">← Back</Link>
    </div>
  );
}
