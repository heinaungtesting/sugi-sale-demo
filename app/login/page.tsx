'use client';

import { useState } from 'react';

import { csrfFetch } from '@/lib/csrf-client';
export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await csrfFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      });
      if (!res.ok) {
        setError('Wrong username or PIN');
        return;
      }
      window.location.assign('/');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <form className="login-card" onSubmit={submit}>
        <h1>Sugi Sale Logger</h1>
        <p className="muted">Login with your pre-made user ID and PIN.</p>
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '8px 12px', fontSize: 14, lineHeight: 1.6 }}>
          <strong>デモ環境</strong>：商品・販売データはすべて架空のものです。<br />
          User ID: <code>demo</code> / PIN: <code>123456</code>
        </div>
        <p className="login-legal-link"><a href="/legal">利用規約・プライバシーポリシー</a></p>
        <label className="field">
          <span>User ID</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus />
        </label>
        <label className="field">
          <span>PIN</span>
          <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" inputMode="numeric" autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      </form>
    </main>
  );
}
