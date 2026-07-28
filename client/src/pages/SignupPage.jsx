import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { User, Mail, Lock } from 'lucide-react';
import { AuthShell } from '../components/auth/AuthShell.jsx';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useAuthStore } from '../stores/authStore.js';

export default function SignupPage() {
  const register = useAuthStore((s) => s.register);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const navigate = useNavigate();
  const location = useLocation();
  // When arriving from an invite link, come back to it after signing up
  // (and pre-fill the invited email so it matches the invitation).
  const [form, setForm] = useState({ name: '', email: location.state?.email || '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goHome = () => navigate(location.state?.from?.pathname || '/dashboard', { replace: true });

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      // Trigger the API-keys onboarding popup on the first authed screen.
      localStorage.setItem('vox.justSignedUp', '1');
      toast.success('Account created — welcome to Vox!');
      goHome();
    } catch (err) {
      setError(err.normalizedMessage || 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async (credential) => {
    setError('');
    try {
      await loginWithGoogle(credential);
      localStorage.setItem('vox.justSignedUp', '1');
      toast.success('Welcome to Vox!');
      goHome();
    } catch (err) {
      setError(err.normalizedMessage || 'Google sign-up failed.');
    }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-ink">Create your account</h1>
      <p className="mt-1.5 text-sm text-ink-soft">Start building voice agents in minutes.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-ink-soft" />
          <Input
            id="name"
            label="Full name"
            autoComplete="name"
            placeholder="Jane Cooper"
            className="pl-10"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
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
            autoComplete="new-password"
            placeholder="At least 6 characters"
            className="pl-10"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>

      <GoogleSignInButton onCredential={onGoogle} text="signup_with" />

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
