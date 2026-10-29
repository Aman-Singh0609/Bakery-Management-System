import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../lib/api';
import AuthShell from '../components/AuthShell';
import { ErrorNote } from '../components/Feedback';

/** Only allow redirects to paths inside this app. */
const safeRedirect = (value) => (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null);

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const from = safeRedirect(location.state?.from);

  if (user && !submitting) return <Navigate to={from || '/menu'} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const signedIn = await login(form.email.trim(), form.password);
      navigate(from || (['ADMIN', 'STAFF'].includes(signedIn.role) ? '/admin' : '/menu'), { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not sign you in.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Sign in to place orders and see their progress.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="field-label">Email</span>
          <input type="email" autoComplete="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="block">
          <span className="field-label">Password</span>
          <input type="password" autoComplete="current-password" required className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        {error && <ErrorNote>{error}</ErrorNote>}
        <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
      </form>
      <p className="mt-6 text-sm text-cocoa-soft">
        New here?{' '}
        <Link to="/register" state={location.state} className="font-semibold text-berry hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
