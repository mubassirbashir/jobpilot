import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store.js';
import { Button, Input } from '../components/UI.jsx';

export default function Login({ register: isRegister }) {
  const [mode, setMode] = useState(isRegister ? 'register' : 'login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useStore();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        // Auto-fill demo credentials
        await login(form.email || 'demo@jobpilot.ai', form.password || 'demo1234');
      } else {
        if (!form.name || !form.email || !form.password) throw new Error('All fields required');
        await register(form.name, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-16 bg-surface border-r border-white/7 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent2/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-xl">🚀</div>
            <span className="font-display font-extrabold text-xl">Job<span className="text-accent">Pilot</span> AI</span>
          </div>
          <h1 className="font-display font-extrabold text-5xl leading-tight mb-6">
            Let AI land your<br /><span className="text-accent">dream job</span>
          </h1>
          <p className="text-muted text-lg leading-relaxed">
            Connect LinkedIn, set your preferences, and watch Claude autonomously scan jobs, tailor your CV, write cover letters, and apply — 24/7.
          </p>
        </div>
        <div className="relative z-10 flex flex-col gap-4">
          {[
            { icon: '🔍', text: 'Scans 100s of jobs daily matching your criteria' },
            { icon: '🧠', text: 'Claude reads every JD and tailors your application' },
            { icon: '📝', text: 'Fills forms, signs up to portals, submits automatically' },
            { icon: '📈', text: 'Users land interviews 3× faster on average' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-3 text-sm text-muted">
              <span className="text-base">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-sm">🚀</div>
            <span className="font-display font-extrabold">Job<span className="text-accent">Pilot</span> AI</span>
          </div>

          <h2 className="font-display font-bold text-2xl mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-muted text-sm mb-8">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button className="text-accent hover:underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Sign up free' : 'Log in'}
            </button>
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <Input label="Full name" placeholder="Jane Doe" value={form.name} onChange={e => set('name', e.target.value)} />
            )}
            <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
            <Input label="Password" type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} />

            {error && <div className="text-danger text-xs bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</div>}

            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full justify-center">
              {mode === 'login' ? '→ Sign in' : '→ Create account'}
            </Button>

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => { set('email', 'demo@jobpilot.ai'); set('password', 'demo1234'); }}
                className="text-xs text-center text-muted hover:text-accent transition-colors"
              >
                Fill demo credentials
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
