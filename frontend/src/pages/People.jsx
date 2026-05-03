import { useEffect, useState } from 'react';
import apiClient from '../api/client';

const ROLE_LABELS = {
  client:      'Client',
  team_member: 'Team Member',
  viewer:      'Viewer',
};

const VALID_ROLES = ['client', 'team_member', 'viewer'];

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '??';
}

function CopyButton({ userId }) {
  const [state, setState] = useState('idle'); // idle | loading | copied | error

  async function handleGenerate() {
    setState('loading');
    try {
      const { data } = await apiClient.post(`/api/users/${userId}/invite`);
      await navigator.clipboard.writeText(data.invite_link);
      setState('copied');
      setTimeout(() => setState('idle'), 3000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  const labels = {
    idle:    'Generate & copy link',
    loading: 'Generating…',
    copied:  'Copied!',
    error:   'Failed — retry',
  };

  return (
    <button
      className={`btn btn-sm ${state === 'copied' ? 'btn-primary' : 'btn-secondary'}`}
      onClick={handleGenerate}
      disabled={state === 'loading'}
      style={{ minWidth: 160 }}
    >
      {state === 'loading' && <span className="spinner" style={{ marginRight: 6 }} />}
      {state === 'copied' && <span style={{ marginRight: 6 }}>✓</span>}
      {labels[state]}
    </button>
  );
}

export default function People() {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState('');
  const [newUser, setNewUser]       = useState({ name: '', email: '', role: 'client' });
  const [copiedNew, setCopiedNew]   = useState(false);

  useEffect(() => {
    apiClient
      .get('/api/users')
      .then(({ data }) => setUsers(data))
      .catch(() => setError('Failed to load people'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const { data } = await apiClient.post('/api/users', newUser);
      setUsers((prev) => [data, ...prev]);
      // Auto-copy the invite link if provided
      if (data.invite_link) {
        try {
          await navigator.clipboard.writeText(data.invite_link);
          setCopiedNew(true);
          setTimeout(() => setCopiedNew(false), 4000);
        } catch {
          // clipboard may be blocked; silently ignore
        }
      }
      setNewUser({ name: '', email: '', role: 'client' });
      setShowForm(false);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  const registered   = users.filter((u) => u.has_password);
  const unregistered = users.filter((u) => !u.has_password);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">People</h1>
          <p className="page-subtitle">
            {loading ? 'Loading…' : `${users.length} person${users.length !== 1 ? 's' : ''} across all projects`}
          </p>
        </div>
        <button
          className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'} btn-sm`}
          onClick={() => { setShowForm((v) => !v); setCreateError(''); }}
        >
          {showForm ? '✕ Cancel' : '+ Add person'}
        </button>
      </div>

      {copiedNew && (
        <div className="form-success" style={{
          background: '#c8ff0015',
          border: '1px solid #c8ff0040',
          color: '#c8ff00',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 16,
          fontSize: 13,
        }}>
          ✓ Person added — invite link copied to clipboard.
        </div>
      )}

      {showForm && (
        <div className="create-panel">
          <div className="create-panel-title">Add a person</div>
          <form onSubmit={handleCreate}>
            <div className="create-panel-fields">
              <div className="field">
                <label className="field-label">Full name</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Jane Smith"
                  value={newUser.name}
                  onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label className="field-label">Email</label>
                <input
                  type="email"
                  className="field-input"
                  placeholder="jane@company.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">Role</label>
                <select
                  className="field-input"
                  value={newUser.role}
                  onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                >
                  {VALID_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
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
                {creating ? <><span className="spinner" />Adding…</> : 'Add & copy invite link'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <div className="form-error" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div className="loading-page" style={{ padding: '80px 0' }}>
          <span className="spinner spinner-light" style={{ width: 18, height: 18 }} />
          <span>Loading people…</span>
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◈</div>
          <div className="empty-title">No people yet</div>
          <p className="empty-desc">Add clients, team members, and viewers to your workspace.</p>
        </div>
      ) : (
        <>
          {unregistered.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <div className="people-section-header">
                <span className="people-section-title">Pending activation</span>
                <span className="people-section-badge people-section-badge--pending">
                  {unregistered.length}
                </span>
              </div>
              <p className="people-section-desc">
                These people haven't set a password yet. Generate and share an invite link so they can activate their account.
              </p>
              <div className="people-list">
                {unregistered.map((user) => (
                  <div key={user.id} className="people-row">
                    <div className="people-avatar people-avatar--pending">
                      {getInitials(user.name)}
                    </div>
                    <div className="people-info">
                      <div className="people-name">{user.name}</div>
                      <div className="people-email">{user.email}</div>
                    </div>
                    <div className="people-role-badge">{ROLE_LABELS[user.role] ?? user.role}</div>
                    <div className="people-status people-status--pending">No password set</div>
                    <CopyButton userId={user.id} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {registered.length > 0 && (
            <section>
              <div className="people-section-header">
                <span className="people-section-title">Active</span>
                <span className="people-section-badge people-section-badge--active">
                  {registered.length}
                </span>
              </div>
              <div className="people-list">
                {registered.map((user) => (
                  <div key={user.id} className="people-row">
                    <div className="people-avatar people-avatar--active">
                      {getInitials(user.name)}
                    </div>
                    <div className="people-info">
                      <div className="people-name">{user.name}</div>
                      <div className="people-email">{user.email}</div>
                    </div>
                    <div className="people-role-badge">{ROLE_LABELS[user.role] ?? user.role}</div>
                    <div className="people-status people-status--active">Active</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
