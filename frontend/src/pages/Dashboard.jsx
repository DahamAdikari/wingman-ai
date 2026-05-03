import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import StatusBadge from '../components/common/StatusBadge';

const ACCENT_COLORS = ['#c8ff00', '#00ffb3', '#ff6b6b', '#60a5fa', '#f59e0b', '#a78bfa', '#34d399'];

function getProjectColor(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ACCENT_COLORS[Math.abs(h) % ACCENT_COLORS.length];
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '??';
}

export default function Dashboard() {
  const [projects, setProjects]       = useState([]);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [newProject, setNewProject]   = useState({ name: '', description: '' });
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState('');

  useWebSocket(({ type, payload }) => {
    if (type === 'POST_STATUS_UPDATED' && payload.new_status) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === payload.project_id
            ? { ...p, last_post_status: payload.new_status }
            : p
        )
      );
    }
  });

  useEffect(() => {
    apiClient
      .get('/api/projects')
      .then(({ data }) => setProjects(data))
      .catch(() => setError('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
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
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${projects.length} client project${projects.length !== 1 ? 's' : ''} under management`}
          </p>
        </div>
        <button
          className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'} btn-sm`}
          onClick={() => { setShowForm((v) => !v); setCreateError(''); }}
        >
          {showForm ? '✕ Cancel' : '+ New Project'}
        </button>
      </div>

      {showForm && (
        <div className="create-panel">
          <div className="create-panel-title">New project</div>
          <form onSubmit={handleCreate}>
            <div className="create-panel-fields">
              <div className="field">
                <label className="field-label">Project name</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="e.g. Nike Q2 Campaign"
                  value={newProject.name}
                  onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label className="field-label">Description</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Optional — what's this project about?"
                  value={newProject.description}
                  onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            {createError && <div className="form-error" style={{ marginBottom: 12 }}>{createError}</div>}
            <div className="create-panel-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>
                {creating ? <><span className="spinner" />Creating…</> : 'Create project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <div className="form-error" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div className="loading-page" style={{ padding: '80px 0' }}>
          <span className="spinner spinner-light" style={{ width: 18, height: 18 }} />
          <span>Loading projects…</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◈</div>
          <div className="empty-title">No projects yet</div>
          <p className="empty-desc">
            Create your first client project to start generating AI-powered marketing content.
          </p>
        </div>
      ) : (
        <div className="projects-grid stagger-list">
          {projects.map((project) => {
            const color = getProjectColor(project.project_name);
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                state={{ project_name: project.project_name }}
                className="project-card"
              >
                <div
                  className="project-card-icon"
                  style={{
                    background: `${color}12`,
                    border: `1px solid ${color}28`,
                    color,
                  }}
                >
                  {getInitials(project.project_name)}
                </div>
                <div className="project-card-name">{project.project_name}</div>
                {project.description && (
                  <div className="project-card-desc">{project.description}</div>
                )}
                <div className="project-card-meta">
                  <span className="project-card-stat">{project.total_posts || 0} posts</span>
                  {project.last_post_status && (
                    <StatusBadge status={project.last_post_status} />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
