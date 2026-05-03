import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuthStore } from '../store';

const FEATURES = [
  'AI-powered content generation',
  'Multi-client project management',
  'Structured review & approval loops',
  'Real-time status updates',
];

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const login    = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.post('/api/auth/login', { email, password });
      login(data.token);
      // Route based on role decoded from token
      const decoded = JSON.parse(atob(data.token.split('.')[1]));
      const role = decoded.role;
      if (role === 'client' || role === 'viewer') {
        navigate('/client');
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="logo-mark" style={{ width: 34, height: 34, fontSize: 17 }}>W</div>
          <span className="logo-text" style={{ fontSize: 17 }}>Wingman AI</span>
        </div>

        <div className="auth-brand-tagline">
          <h1 className="auth-tagline-title">Your AI marketing command center.</h1>
          <p className="auth-tagline-sub">
            Manage clients, generate content, and streamline approvals — all in one place.
          </p>
          <div className="auth-features">
            {FEATURES.map((f) => (
              <div key={f} className="auth-feature">
                <div className="auth-feature-dot" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-box">
          <h2 className="auth-form-title">Welcome back</h2>
          <p className="auth-form-sub">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label className="field-label">Email</label>
              <input
                type="email"
                className="field-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="field">
              <label className="field-label">Password</label>
              <input
                type="password"
                className="field-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px' }}
              disabled={loading}
            >
              {loading ? <><span className="spinner" />Signing in…</> : 'Sign in'}
            </button>
          </form>

          <p className="auth-footer">
            No account? <Link to="/register">Register as a manager</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
