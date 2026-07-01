import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { formatRole, ROLES } from '../../utils/roles';

const NAV_BY_ROLE = {
  [ROLES.MANAGER]:     [
    { label: 'Projects', path: '/dashboard', icon: '◈' },
    { label: 'Posts',    path: '/posts',     icon: '▣' },
    { label: 'Reviews',  path: '/reviews',   icon: '◉' },
    { label: 'Schedule', path: '/schedule',  icon: '◷' },
    { label: 'People',   path: '/people',    icon: '◎' },
  ],
  [ROLES.TEAM_MEMBER]: [
    { label: 'Projects', path: '/dashboard', icon: '◈' },
    { label: 'Posts',    path: '/posts',     icon: '▣' },
    { label: 'Reviews',  path: '/reviews',   icon: '◉' },
    { label: 'Schedule', path: '/schedule',  icon: '◷' },
  ],
  [ROLES.CLIENT]:      [
    { label: 'My Posts',  path: '/client',    icon: '◈' },
    { label: 'Posts',     path: '/posts',     icon: '▣' },
  ],
  [ROLES.VIEWER]:      [
    { label: 'Posts',     path: '/posts',     icon: '▣' },
  ],
};

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  useEffect(() => {
    function handlePointerDown(event) {
      if (!profileRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    if (profileOpen) {
      document.addEventListener('mousedown', handlePointerDown);
    }

    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [profileOpen]);

  const role = user?.role;
  const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE[ROLES.MANAGER];
  const initial = (user?.name || user?.email || '?')[0].toUpperCase();
  const roleLabel = formatRole(role);
  const accountType = role === ROLES.MANAGER ? 'Workspace owner' : 'Project account';
  const position = user?.position || user?.title || user?.job_title || roleLabel;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">W</div>
          <span className="logo-text">Wingman</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active =
              location.pathname === item.path ||
              (item.path === '/dashboard' && location.pathname.startsWith('/projects')) ||
              (item.path === '/posts' && location.pathname.startsWith('/posts'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item${active ? ' active' : ''}`}
                onClick={() => setProfileOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer" ref={profileRef}>
          {profileOpen && (
            <div className="profile-popover" role="dialog" aria-label="User profile">
              <div className="profile-header">
                <div className="profile-avatar">{initial}</div>
                <div className="profile-heading">
                  <div className="profile-name">{user?.name || 'User'}</div>
                  <div className="profile-email">{user?.email || 'No email available'}</div>
                </div>
              </div>

              <div className="profile-fields">
                <div className="profile-field">
                  <span>Display name</span>
                  <strong>{user?.name || 'User'}</strong>
                </div>
                <div className="profile-field">
                  <span>Account</span>
                  <strong>{accountType}</strong>
                </div>
                <div className="profile-field">
                  <span>Position</span>
                  <strong>{position}</strong>
                </div>
                <div className="profile-field">
                  <span>System role</span>
                  <strong>{roleLabel}</strong>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            className={`user-info user-info-btn${profileOpen ? ' active' : ''}`}
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
          >
            <div className="user-avatar">{initial}</div>
            <div className="user-details">
              <div className="user-name">{user?.name || user?.email || 'User'}</div>
              <div className="user-role">{position}</div>
            </div>
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
