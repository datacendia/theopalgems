import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from './api';
import './admin.css';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      if (adminLogin(password)) {
        navigate('/admin/dashboard');
      } else {
        setError('Invalid password. Please try again.');
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <div className="admin-login__logo">Opal Gems</div>
        <p className="admin-login__subtitle">Admin Panel</p>

        <form onSubmit={handleSubmit} className="admin-login__form">
          <div className="admin-field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
              required
            />
          </div>

          {error && <p className="admin-login__error">{error}</p>}

          <button type="submit" className="admin-btn admin-btn--primary admin-btn--full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}
