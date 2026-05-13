import { useCallback, useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import { useWebSocket } from '../hooks/useWebSocket';

const PLATFORM_META = {
  telegram: {
    label: 'Telegram',
    icon: '✈',
    fields: [
      { key: 'bot_token',    label: 'Bot Token',    placeholder: '1234567890:AAF...', type: 'password', help: 'From @BotFather on Telegram' },
      { key: 'channel_id',  label: 'Channel ID',   placeholder: '@mychannel or -1001234567890', type: 'text',     help: 'Bot must be admin of the channel' },
      { key: 'channel_name', label: 'Display Name', placeholder: 'My Channel', type: 'text', help: 'Label shown in the dashboard' },
    ],
  },
  instagram: {
    label: 'Instagram',
    icon: '📷',
    fields: [
      { key: 'access_token', label: 'Access Token',  placeholder: 'EAABs...', type: 'password', help: 'Long-lived token from Meta Graph API' },
      { key: 'account_id',  label: 'Account ID',    placeholder: '17841400...', type: 'text',     help: 'Instagram Business/Creator account ID' },
      { key: 'account_name', label: 'Display Name', placeholder: '@mybusiness', type: 'text', help: 'Label shown in the dashboard' },
    ],
  },
};

function ChannelConnectForm({ platform, onSave, onCancel }) {
  const meta = PLATFORM_META[platform];
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function set(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSave({ platform, ...values });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save channel');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12, padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
        {meta.fields.map((f) => (
          <div key={f.key} className="field" style={f.key.includes('token') ? { gridColumn: '1 / -1' } : {}}>
            <label className="field-label">{f.label}</label>
            <input
              type={f.type}
              className="field-input"
              placeholder={f.placeholder}
              value={values[f.key] || ''}
              onChange={(e) => set(f.key, e.target.value)}
              required={f.key !== 'channel_name' && f.key !== 'account_name'}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>{f.help}</span>
          </div>
        ))}
      </div>
      {error && <div className="form-error" style={{ marginTop: 10 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
          {submitting ? <><span className="spinner" />Saving…</> : 'Connect'}
        </button>
      </div>
    </form>
  );
}

function ChannelsSection({ projectId }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null); // platform key being connected
  const [disconnecting, setDisconnecting] = useState(null);
  const [testResults, setTestResults] = useState({}); // { [platform]: { state: 'ok'|'error'|'testing', message } }

  useEffect(() => {
    apiClient.get(`/api/projects/${projectId}/channels`)
      .then(({ data }) => setChannels(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const connectedPlatforms = new Set(channels.map((c) => c.platform));

  async function handleSave(channelData) {
    const { data } = await apiClient.post(`/api/projects/${projectId}/channels`, channelData);
    setChannels((prev) => {
      const existing = prev.findIndex((c) => c.platform === data.platform);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = data;
        return next;
      }
      return [...prev, data];
    });
    setConnecting(null);
  }

  async function handleTest(platform) {
    setTestResults((prev) => ({ ...prev, [platform]: { state: 'testing' } }));
    try {
      await apiClient.post(`/api/projects/${projectId}/channels/${platform}/test`);
      setTestResults((prev) => ({ ...prev, [platform]: { state: 'ok', message: 'Test message sent successfully!' } }));
    } catch (err) {
      const msg = err.response?.data?.error || 'Test failed — check credentials';
      setTestResults((prev) => ({ ...prev, [platform]: { state: 'error', message: msg } }));
    }
    setTimeout(() => setTestResults((prev) => ({ ...prev, [platform]: null })), 6000);
  }

  async function handleDisconnect(platform) {
    setDisconnecting(platform);
    try {
      await apiClient.delete(`/api/projects/${projectId}/channels/${platform}`);
      setChannels((prev) => prev.filter((c) => c.platform !== platform));
    } catch {
      // ignore
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="section">
      <div className="section-header">
        <span className="section-title">Publishing Channels</span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          <span className="spinner spinner-light" style={{ width: 13, height: 13 }} />
          Loading channels…
        </div>
      ) : (
        <>
          {/* Connected channels */}
          {channels.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {channels.map((ch) => {
                const meta = PLATFORM_META[ch.platform];
                const displayName = ch.channel_name || ch.account_name || ch.platform;
                const testResult = testResults[ch.platform];
                const isTesting = testResult?.state === 'testing';
                return (
                  <div key={ch.platform}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: testResult ? 'var(--radius-sm) var(--radius-sm) 0 0' : 'var(--radius-sm)', border: '1px solid var(--border)', borderBottom: testResult ? 'none' : undefined }}>
                      <span style={{ fontSize: 18, lineHeight: 1 }}>{meta?.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{meta?.label || ch.platform}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{displayName}</div>
                      </div>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(200,255,0,0.1)', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>connected</span>
                      {ch.platform === 'telegram' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 11, padding: '3px 10px' }}
                          onClick={() => handleTest(ch.platform)}
                          disabled={isTesting}
                        >
                          {isTesting ? <><span className="spinner" style={{ width: 10, height: 10 }} />Testing…</> : 'Test'}
                        </button>
                      )}
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11, padding: '3px 10px' }}
                        onClick={() => connecting === ch.platform ? setConnecting(null) : setConnecting(ch.platform)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11, padding: '3px 10px', color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }}
                        onClick={() => handleDisconnect(ch.platform)}
                        disabled={disconnecting === ch.platform}
                      >
                        {disconnecting === ch.platform ? <span className="spinner" style={{ width: 10, height: 10 }} /> : 'Disconnect'}
                      </button>
                    </div>
                    {testResult && testResult.state !== 'testing' && (
                      <div style={{
                        padding: '8px 14px',
                        borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                        border: '1px solid var(--border)',
                        borderTop: 'none',
                        background: testResult.state === 'ok' ? 'rgba(200,255,0,0.06)' : 'rgba(255,107,107,0.06)',
                        color: testResult.state === 'ok' ? 'var(--accent)' : '#ff6b6b',
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {testResult.state === 'ok' ? '✓ ' : '✗ '}{testResult.message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Connect form for editing existing or adding new */}
          {connecting && (
            <ChannelConnectForm
              platform={connecting}
              onSave={handleSave}
              onCancel={() => setConnecting(null)}
            />
          )}

          {/* Add new channel buttons */}
          {!connecting && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(PLATFORM_META).map(([key, meta]) => (
                !connectedPlatforms.has(key) && (
                  <button
                    key={key}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 12, gap: 6, display: 'flex', alignItems: 'center' }}
                    onClick={() => setConnecting(key)}
                  >
                    <span>{meta.icon}</span> Connect {meta.label}
                  </button>
                )
              ))}
              {connectedPlatforms.size === Object.keys(PLATFORM_META).length && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>All channels connected.</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// User creation roles (platform-level)
const USER_ROLES = ['client', 'team_member', 'viewer'];
// Project membership roles (project-level)
const MEMBER_ROLES = ['client', 'reviewer', 'viewer'];

function SectionUnavailable({ name }) {
  return (
    <div className="section-unavailable">
      <span>⚡</span>
      <span>{name} is not reachable. Data will appear once the service is running.</span>
    </div>
  );
}

function AddMemberPanel({ projectId, onAdded, onCancel }) {
  const [tab, setTab]             = useState('new'); // 'new' | 'existing'
  const [existingUsers, setExistingUsers] = useState([]);
  const [loadingUsers, setLoadingUsers]   = useState(false);

  // New user form
  const [newName, setNewName]         = useState('');
  const [newEmail, setNewEmail]       = useState('');
  const [newUserRole, setNewUserRole] = useState('client');
  const [memberRole, setMemberRole]   = useState('client');

  // Existing user form
  const [selectedUser, setSelectedUser]     = useState('');
  const [existingMemberRole, setExistingMemberRole] = useState('client');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (tab === 'existing') {
      setLoadingUsers(true);
      apiClient
        .get('/api/users')
        .then(({ data }) => setExistingUsers(Array.isArray(data) ? data : []))
        .catch(() => setError('Failed to load users'))
        .finally(() => setLoadingUsers(false));
    }
  }, [tab]);

  async function handleNewUser(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // Step 1: create user
      const { data: user } = await apiClient.post('/api/users', {
        name: newName,
        email: newEmail,
        role: newUserRole,
      });
      // Step 2: enroll in project
      const { data: membership } = await apiClient.post(
        `/api/projects/${projectId}/members`,
        { user_id: user.id, role: memberRole }
      );
      onAdded({ ...user, role: memberRole, membership });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
      setSubmitting(false);
    }
  }

  async function handleExistingUser(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data: membership } = await apiClient.post(
        `/api/projects/${projectId}/members`,
        { user_id: selectedUser, role: existingMemberRole }
      );
      const user = existingUsers.find((u) => u.id === selectedUser);
      onAdded({ ...user, role: existingMemberRole, membership });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add member');
      setSubmitting(false);
    }
  }

  return (
    <div className="add-member-panel">
      {/* Tab switcher */}
      <div className="tab-switcher">
        <button
          type="button"
          className={`tab-btn${tab === 'new' ? ' active' : ''}`}
          onClick={() => { setTab('new'); setError(''); }}
        >
          New user
        </button>
        <button
          type="button"
          className={`tab-btn${tab === 'existing' ? ' active' : ''}`}
          onClick={() => { setTab('existing'); setError(''); }}
        >
          Existing user
        </button>
      </div>

      {tab === 'new' ? (
        <form onSubmit={handleNewUser}>
          <div className="add-member-fields">
            <div className="field">
              <label className="field-label">Full name</label>
              <input
                type="text"
                className="field-input"
                placeholder="Jane Smith"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <input
                type="email"
                className="field-input"
                placeholder="jane@client.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="field-label">User role</label>
              <select className="field-input" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                {USER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Project role</label>
              <select className="field-input" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                {MEMBER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
          <div className="add-member-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? <><span className="spinner" />Adding…</> : 'Create & Add'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleExistingUser}>
          {loadingUsers ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
              <span className="spinner spinner-light" style={{ width: 14, height: 14 }} />
              Loading users…
            </div>
          ) : (
            <div className="add-member-fields">
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Select user</label>
                <select
                  className="field-input"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  required
                >
                  <option value="">— choose a user —</option>
                  {existingUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Project role</label>
                <select className="field-input" value={existingMemberRole} onChange={(e) => setExistingMemberRole(e.target.value)}>
                  {MEMBER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          )}
          {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
          <div className="add-member-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || loadingUsers || !selectedUser}>
              {submitting ? <><span className="spinner" />Adding…</> : 'Add to Project'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const { id }    = useParams();
  const { state } = useLocation();
  const [detail, setDetail]               = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [localMembers, setLocalMembers]   = useState(null); // optimistic
  const [showAddMember, setShowAddMember] = useState(false);

  const loadDetail = useCallback(() => {
    return apiClient
      .get(`/api/projects/${id}/detail`)
      .then(({ data }) => {
        setDetail(data);
        if (data?.members?.available && Array.isArray(data.members.data)) {
          setLocalMembers(data.members.data);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to reach the API gateway');
      });
  }, [id]);

  useEffect(() => {
    loadDetail().finally(() => setLoading(false));
  }, [loadDetail]);

  // Update post status badges in real-time when review or content events arrive.
  // If the post isn't in the list yet (brand-new post), re-fetch to add it.
  useWebSocket(({ type, payload }) => {
    if (type !== 'POST_STATUS_UPDATED' || String(payload.project_id) !== id) return;
    if (!payload.new_status) return;

    setDetail((prev) => {
      if (!prev?.content?.available || !Array.isArray(prev.content.data)) return prev;

      const exists = prev.content.data.some((p) => String(p.id) === String(payload.post_id));

      if (!exists) {
        // New post — re-fetch posts only to add it to the list
        apiClient.get(`/api/projects/${id}/posts`).then(({ data }) => {
          setDetail((d) => d ? { ...d, content: { available: true, data } } : d);
        });
        return prev;
      }

      return {
        ...prev,
        content: {
          ...prev.content,
          data: prev.content.data.map((p) =>
            String(p.id) === String(payload.post_id)
              ? { ...p, status: payload.new_status }
              : p
          ),
        },
      };
    });
  });

  function handleMemberAdded(newMember) {
    setLocalMembers((prev) => [...(prev || []), newMember]);
    setShowAddMember(false);
  }

  if (loading) {
    return (
      <div className="loading-page">
        <span className="spinner spinner-light" style={{ width: 18, height: 18 }} />
        <span>Loading project…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Link to="/dashboard" className="back-link">← Projects</Link>
        <div className="form-error" style={{ marginTop: 16 }}>{error}</div>
      </div>
    );
  }

  const projectName = state?.project_name || 'Project';
  const posts   = detail?.content?.available ? (Array.isArray(detail.content.data) ? detail.content.data : []) : null;
  const reviews = detail?.reviews?.available ? (Array.isArray(detail.reviews.data) ? detail.reviews.data : []) : null;
  const members = localMembers ?? (detail?.members?.available ? [] : null);

  return (
    <div className="page">
      <Link to="/dashboard" className="back-link">← Projects</Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
        <h1 className="page-title">{projectName}</h1>
        <Link to={`/projects/${id}/posts/new`} className="btn btn-primary btn-sm" style={{ marginTop: 4 }}>
          + Generate Post
        </Link>
      </div>

      <div className="project-stats">
        <div className="stat-item">
          <div className="stat-value">{posts?.length ?? '—'}</div>
          <div className="stat-label">Posts</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{reviews?.length ?? '—'}</div>
          <div className="stat-label">Reviews</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{members?.length ?? '—'}</div>
          <div className="stat-label">Members</div>
        </div>
      </div>

      {/* Posts */}
      <div className="section" style={{ marginTop: 32 }}>
        <div className="section-header">
          <span className="section-title">Posts</span>
          {posts !== null && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              {posts.length} total
            </span>
          )}
        </div>
        {posts === null ? (
          <SectionUnavailable name="Content service" />
        ) : posts.length === 0 ? (
          <div className="empty-state" style={{ padding: '36px 0' }}>
            <div className="empty-title" style={{ fontSize: 14 }}>No posts yet</div>
            <p className="empty-desc" style={{ fontSize: 12.5 }}>Generate your first AI post for this project.</p>
          </div>
        ) : (
          <div className="stagger-list">
            {posts.map((post) => (
              <Link key={post.id} to={`/posts/${post.id}`} className="post-item">
                <div>
                  <div className="post-item-title">{post.title}</div>
                  {post.created_at && (
                    <div className="post-item-meta">
                      {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <StatusBadge status={post.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">Review History</span>
        </div>
        {reviews === null ? (
          <SectionUnavailable name="Review service" />
        ) : reviews.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No reviews yet.</p>
        ) : (
          <div className="stagger-list">
            {reviews.map((r) => (
              <div key={r.id} className="review-item">
                <div className="review-meta">
                  <span className="reviewer-role">{r.reviewer_role}</span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span className="review-decision">{r.decision}</span>
                </div>
                {r.feedback_text && (
                  <p className="review-feedback">"{r.feedback_text}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Publishing Channels */}
      <ChannelsSection projectId={id} />

      {/* Members */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">Team & Members</span>
          {members !== null && !showAddMember && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAddMember(true)}
            >
              + Add Member
            </button>
          )}
        </div>

        {showAddMember && (
          <AddMemberPanel
            projectId={id}
            onAdded={handleMemberAdded}
            onCancel={() => setShowAddMember(false)}
          />
        )}

        {members === null ? (
          <SectionUnavailable name="User service" />
        ) : members.length === 0 && !showAddMember ? (
          <div className="empty-state" style={{ padding: '36px 0' }}>
            <div className="empty-title" style={{ fontSize: 14 }}>No members yet</div>
            <p className="empty-desc" style={{ fontSize: 12.5 }}>Add clients or team members to this project.</p>
          </div>
        ) : (
          <div className="stagger-list" style={{ marginTop: showAddMember ? 14 : 0 }}>
            {members.map((m) => (
              <div key={m.id} className="member-item">
                <div className="member-avatar">
                  {(m.name || m.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="member-name">{m.name || m.email}</div>
                  {m.email && m.name && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                      {m.email}
                    </div>
                  )}
                </div>
                <span className="member-role-badge">{m.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
