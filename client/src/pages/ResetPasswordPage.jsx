import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { AuthShell } from '../components/auth/AuthShell.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { authService } from '../services/authService.js';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token, form.password);
      toast.success('Your password has been reset. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.normalizedMessage || 'This reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell>
        <h1 className="text-2xl font-bold text-ink">Invalid reset link</h1>
        <p className="mt-2 text-sm text-ink-soft">
          This link is missing its token. Request a new one and try again.
        </p>
        <Link
          to="/forgot-password"
          className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-ink">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-ink-soft">Enter and confirm your new password below.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-ink-soft" />
          <Input
            id="password"
            type="password"
            label="New password"
            autoComplete="new-password"
            placeholder="••••••••"
            className="pl-10"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-ink-soft" />
          <Input
            id="confirm"
            type="password"
            label="Confirm password"
            autoComplete="new-password"
            placeholder="••••••••"
            className="pl-10"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Reset password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
