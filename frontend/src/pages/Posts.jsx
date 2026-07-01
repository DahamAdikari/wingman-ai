import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { ROLES } from '../utils/roles';

const VIEW_CONFIG = {
  all: {
    title: 'Posts',
    emptyTitle: 'No posts yet',
    emptyDescription: 'Posts will appear here after content is generated.',
    statuses: null,
  },
  review: {
    title: 'Reviews',
    emptyTitle: 'No reviews pending',
    emptyDescription: 'Posts that need manager or client review will appear here.',
    statuses: ['manager_review', 'client_review', 'manager_revision', 'rejected'],
  },
  schedule: {
    title: 'Schedule',
    emptyTitle: 'No scheduled posts',
    emptyDescription: 'Approved, scheduled, and published posts will appear here.',
    statuses: ['approved', 'scheduled', 'published'],
  },
};

function displayPostTitle(post) {
  if (post.title) return post.title;
  const platform = post.platform ? `${post.platform[0].toUpperCase()}${post.platform.slice(1)}` : 'Social';
  const version = post.version_number ? ` v${post.version_number}` : '';
  return `${platform} post${version}`;
}

function postDate(post) {
  const value = post.updated_at || post.created_at;
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Posts({ view = 'all' }) {
  const { user } = useAuth();
  const config = VIEW_CONFIG[view] || VIEW_CONFIG.all;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const projectRes = user?.role === ROLES.CLIENT || user?.role === ROLES.VIEWER
        ? await apiClient.get('/api/users/my-projects')
        : await apiClient.get('/api/projects');

      const projects = Array.isArray(projectRes.data) ? projectRes.data : [];
      const results = await Promise.allSettled(
        projects.map((project) => apiClient.get(`/api/projects/${project.id}/posts`))
      );

      const nextPosts = results
        .flatMap((result, index) => {
          if (result.status !== 'fulfilled') return [];
          const project = projects[index];
          const projectName = project.project_name || project.name || 'Untitled project';
          return (Array.isArray(result.value.data) ? result.value.data : []).map((post) => ({
            ...post,
            project_name: projectName,
          }));
        })
        .filter((post) => !config.statuses || config.statuses.includes(post.status))
        .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

      setPosts(nextPosts);
    } catch {
      setError('Failed to load posts.');
    } finally {
      setLoading(false);
    }
  }, [config.statuses, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  useWebSocket(({ type }) => {
    if (type === 'POST_STATUS_UPDATED') load();
  });

  const statusCounts = useMemo(() => (
    posts.reduce((acc, post) => {
      acc[post.status] = (acc[post.status] || 0) + 1;
      return acc;
    }, {})
  ), [posts]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{config.title}</h1>
          <p className="page-subtitle">
            {loading
              ? 'Loading…'
              : `${posts.length} post${posts.length !== 1 ? 's' : ''} ${view === 'all' ? 'across projects' : 'in this view'}`}
          </p>
        </div>
      </div>

      {Object.keys(statusCounts).length > 0 && (
        <div className="posts-status-strip">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="posts-status-pill">
              <StatusBadge status={status} />
              <span>{count}</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="form-error" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div className="loading-page" style={{ padding: '80px 0' }}>
          <span className="spinner spinner-light" style={{ width: 18, height: 18 }} />
          <span>Loading posts…</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◈</div>
          <div className="empty-title">{config.emptyTitle}</div>
          <p className="empty-desc">{config.emptyDescription}</p>
        </div>
      ) : (
        <div className="stagger-list">
          {posts.map((post) => (
            <Link key={post.id} to={`/posts/${post.id}`} className="post-item posts-index-item">
              <div className="posts-index-main">
                <div className="post-item-title">{displayPostTitle(post)}</div>
                <div className="post-item-meta">
                  {post.project_name}
                  {postDate(post) ? ` · ${postDate(post)}` : ''}
                </div>
              </div>
              <div className="posts-index-side">
                <span className="posts-index-platform">{post.platform || 'post'}</span>
                <StatusBadge status={post.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
