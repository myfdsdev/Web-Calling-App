import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthShell } from '../components/auth/AuthShell.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { authService } from '../services/authService.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // The response is intentionally identical whether or not the account exists,
      // so we always show the same confirmation.
      const res = await authService.forgotPassword(email);
      if (res?.devLink) setDevLink(res.devLink); // dev-only convenience
      setSent(true);
    } catch {
      // Even on an unexpected error, don't reveal anything — show the same screen.
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold text-ink">Check your email</h1>
          <p className="mt-2 text-sm text-ink-soft">
            If an account exists for <span className="font-medium text-ink">{email}</span>, a link to
            reset your password is on its way. The link expires in an hour.
          </p>
          {devLink && (
            <a
              href={devLink}
              className="mt-4 break-all rounded-lg border border-line bg-surface px-3 py-2 text-xs text-primary hover:underline"
            >
              Dev link: {devLink}
            </a>
          )}
          <Link to="/login" className="mt-6 text-sm font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Link to="/login" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
      <h1 className="mt-6 text-2xl font-bold text-ink">Reset your password</h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        Enter your account email and we’ll send you a link to set a new password.
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
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
