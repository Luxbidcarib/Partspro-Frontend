'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { auth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || pin.length < 4) return;
    setLoading(true);
    try {
      const { data } = await auth.login(name.trim(), pin);
      localStorage.setItem('pp_token', data.token);
      localStorage.setItem('pp_agent', JSON.stringify(data.agent));
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
            Parts<span style={{ color: 'var(--accent)' }}>Pro</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>Vehicle Parts Sourcing + Quoting</div>
        </div>

        <div className="card">
          <div className="card-title" style={{ textAlign: 'center', marginBottom: 20 }}>Agent Login</div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Your name</label>
              <input
                type="text"
                placeholder="e.g. Marcus"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="off"
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>PIN</label>
              <input
                type="password"
                placeholder="Enter your PIN"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                inputMode="numeric"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !name.trim() || pin.length < 4}
              style={{
                width: '100%', padding: '11px', fontSize: 14, fontWeight: 600,
                background: loading || !name.trim() || pin.length < 4 ? 'var(--surface2)' : 'var(--accent)',
                color: loading || !name.trim() || pin.length < 4 ? 'var(--text3)' : '#0d0f12',
                border: 'none', borderRadius: 6, cursor: loading ? 'wait' : 'pointer', transition: 'all .15s'
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text3)' }}>
          Secure PIN login — no passwords to remember
        </div>
      </div>
    </div>
  );
}
