import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, Lock } from 'lucide-react';
import { AuthShell } from '../components/auth/AuthShell.jsx';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useAuthStore } from '../stores/authStore.js';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goHome = () =>
    navigate(location.state?.from?.pathname || '/dashboard', { replace: true });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form);
      toast.success('Welcome back!');
      goHome();
    } catch (err) {
      setError(err.normalizedMessage || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async (credential) => {
    setError('');
    try {
      await loginWithGoogle(credential);
      toast.success('Welcome back!');
      goHome();
    } catch (err) {
      setError(err.normalizedMessage || 'Google sign-in failed.');
    }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
      <p className="mt-1.5 text-sm text-ink-soft">Sign in to manage your voice agents.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-ink-soft" />
          <Input
            id="email"
            type="email"
            label="Email"
            autoComplete="email"
            placeholder="you@company.com"
            className="pl-10"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-ink-soft" />
          <Input
            id="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="pl-10"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      <GoogleSignInButton onCredential={onGoogle} text="signin_with" />

      <p className="mt-6 text-center text-sm text-ink-soft">
        Don’t have an account?{' '}
        <Link to="/signup" className="font-semibold text-primary hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
