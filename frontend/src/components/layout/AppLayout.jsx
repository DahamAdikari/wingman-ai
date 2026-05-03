import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/roles';

const NAV_BY_ROLE = {
  [ROLES.MANAGER]:     [
    { label: 'Projects', path: '/dashboard', icon: '◈' },
    { label: 'People',   path: '/people',    icon: '◎' },
  ],
  [ROLES.TEAM_MEMBER]: [{ label: 'Projects', path: '/dashboard', icon: '◈' }],
  [ROLES.CLIENT]:      [{ label: 'My Posts',  path: '/client',    icon: '◈' }],
};

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const role = user?.role;
  const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE[ROLES.MANAGER];
  const initial = (user?.name || user?.email || '?')[0].toUpperCase();

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
              (item.path === '/dashboard' && location.pathname.startsWith('/projects'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item${active ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{initial}</div>
            <div className="user-details">
              <div className="user-name">{user?.name || user?.email || 'User'}</div>
              <div className="user-role">{role || 'Manager'}</div>
            </div>
          </div>
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
