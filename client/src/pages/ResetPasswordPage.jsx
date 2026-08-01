
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, ArrowLeft, ShieldAlert } from 'lucide-react';
import { AuthShell } from '../components/auth/AuthShell.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { FullPageLoader } from '../components/common/FullPageLoader.jsx';
import { authService } from '../services/authService.js';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

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

  // Pre-flight: is this link still good? Lets us show "expired" up front.
  useEffect(() => {
    let active = true;
    authService
      .checkResetToken(token)
      .then((data) => active && setValid(Boolean(data?.valid)))
      .catch(() => active && setValid(false))
      .finally(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, [token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords don’t match.');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token, form.password);
      toast.success('Password reset — please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.normalizedMessage || 'Could not reset your password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <FullPageLoader />;

  if (!valid) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <ShieldAlert className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-ink">Link expired</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            This password reset link is invalid or has already been used. Request a fresh one to continue.
          </p>
          <Link to="/forgot-password" className="mt-6">
            <Button size="lg">Request a new link</Button>
          </Link>
        </div>
        <Link
          to="/login"
          className="mt-8 flex items-center justify-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-ink">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-ink-soft">Pick something you haven’t used before.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-ink-soft" />
          <Input
            id="password"
            type="password"
            label="New password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            className="pl-10"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-ink-soft" />
          <Input
            id="confirm"
            type="password"
            label="Confirm password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
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
    </AuthShell>
  );
}
