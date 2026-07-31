import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, MailCheck } from 'lucide-react';
import { AuthShell } from '../components/auth/AuthShell.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { authService } from '../services/authService.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authService.forgotPassword(email.trim());
      setSent(true);
      // Dev-only convenience: the API returns the token when no email provider
      // is configured, so you can test the flow without a real inbox.
      if (import.meta.env.DEV && data?.devToken) {
        setDevLink(`/reset-password/${data.devToken}`);
      }
    } catch (err) {
      setError(err.normalizedMessage || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <MailCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-ink">Check your email</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            If an account exists for <span className="font-semibold text-ink">{email}</span>, we’ve sent a
            link to reset your password. It expires in 60 minutes.
          </p>

          {devLink && (
            <Link
              to={devLink}
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-3.5 py-2 text-[13px] font-semibold text-ink hover:border-white/25"
            >
              Open reset link (dev)
            </Link>
          )}
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
      <h1 className="text-2xl font-bold text-ink">Forgot your password?</h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        Enter your account email and we’ll send you a link to reset it.
      </p>

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </AuthShell>
  );
}
