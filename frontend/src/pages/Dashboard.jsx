import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import StatusBadge from '../components/common/StatusBadge';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

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
    apiClient
      .get('/api/projects')
      .then(({ data }) => setProjects(data))
      .catch(() => setError('Failed to load projects'));
  }, []);

  async function handleCreateProject(e) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const { data } = await apiClient.post('/api/projects', newProject);
      setProjects((prev) => [
        { ...data, project_name: data.name, last_post_status: null, total_posts: 0 },
        ...prev,
      ]);
      setNewProject({ name: '', description: '' });
      setShowForm(false);
    } catch {
      setCreateError('Failed to create project');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Projects</h2>
        <button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateProject} style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Project name"
            value={newProject.name}
            onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newProject.description}
            onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))}
          />
          {createError && <p className="error">{createError}</p>}
          <button type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      {error && <p className="error">{error}</p>}

      {projects.length === 0 && !error ? (
        <p>No projects yet. Create your first project above.</p>
      ) : (
        <ul>
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                state={{ project_name: project.project_name }}
              >
                <strong>{project.project_name}</strong>
              </Link>
              <StatusBadge status={project.last_post_status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
