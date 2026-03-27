'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { login } from '@/utils/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login({ Email: email, Password: password });
      toast.success('Login successful!');
      router.push('/');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '2.5rem', borderRadius: '1rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '50px', height: '50px', backgroundColor: '#eff6ff', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <Shield className="text-blue-600" size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Welcome Back</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Sign in to access your ERP dashboard</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.95rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', outline: 'none', transition: 'border-color 0.2s', color: 'var(--text-primary)' }}
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.95rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', outline: 'none', transition: 'border-color 0.2s', color: 'var(--text-primary)' }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ 
              width: '100%', 
              padding: '0.8rem', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              borderRadius: '0.5rem', 
              fontWeight: 600, 
              border: 'none', 
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              transition: 'background-color 0.2s'
            }}
          >
            {isLoading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
