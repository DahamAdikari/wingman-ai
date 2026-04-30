import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import StatusBadge from '../components/common/StatusBadge';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);

  useWebSocket(({ type, payload }) => {
    if (type === 'POST_STATUS_UPDATED') {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === payload.project_id ? { ...p, ...payload } : p
        )
      );
    }
  });

  useEffect(() => {
    apiClient.get('/api/projects').then(({ data }) => setProjects(data));
  }, []);

  return (
    <div className="dashboard">
      <h2>Projects</h2>
      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            <Link to={`/projects/${project.id}`}>
              <strong>{project.name}</strong>
            </Link>
            <StatusBadge status={project.latest_post_status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
