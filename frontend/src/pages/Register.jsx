import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuthStore } from '../store';

const FEATURES = [
  'Unlimited client projects',
  'AI image & copy generation',
  'Approval workflow automation',
  'Real-time team collaboration',
];

export default function Register() {
  const [name, setName]         = useState('');
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
      const { data } = await apiClient.post('/api/auth/register', { name, email, password });
      login(data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
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
          <h1 className="auth-tagline-title">Start managing smarter.</h1>
          <p className="auth-tagline-sub">
            Create your manager account and run AI-powered marketing campaigns for all your clients.
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
          <h2 className="auth-form-title">Create account</h2>
          <p className="auth-form-sub">Set up your manager workspace</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label className="field-label">Full name</label>
              <input
                type="text"
                className="field-input"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

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
              />
            </div>

            <div className="field">
              <label className="field-label">Password</label>
              <input
                type="password"
                className="field-input"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px' }}
              disabled={loading}
            >
              {loading ? <><span className="spinner" />Creating account…</> : 'Create account'}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
