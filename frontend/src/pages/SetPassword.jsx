import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../api/client';

export default function SetPassword() {
  const [searchParams]          = useSearchParams();
  const token                   = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const navigate                = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/api/auth/set-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-layout">
        <div className="auth-form-panel">
          <div className="auth-form-box">
            <h2 className="auth-form-title">Invalid link</h2>
            <p className="auth-form-sub">This invite link is missing or malformed.</p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-layout">
        <div className="auth-form-panel">
          <div className="auth-form-box">
            <h2 className="auth-form-title">Password set!</h2>
            <p className="auth-form-sub">Redirecting you to login…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="logo-mark" style={{ width: 34, height: 34, fontSize: 17 }}>W</div>
          <span className="logo-text" style={{ fontSize: 17 }}>Wingman AI</span>
        </div>
        <div className="auth-brand-tagline">
          <h1 className="auth-tagline-title">You've been invited.</h1>
          <p className="auth-tagline-sub">
            Set a password to access your client portal and start reviewing content.
          </p>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-box">
          <h2 className="auth-form-title">Set your password</h2>
          <p className="auth-form-sub">Choose a password to activate your account</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label className="field-label">Password</label>
              <input
                type="password"
                className="field-input"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                autoComplete="new-password"
              />
            </div>

            <div className="field">
              <label className="field-label">Confirm password</label>
              <input
                type="password"
                className="field-input"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? <><span className="spinner" />Setting password…</> : 'Set password & activate'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
