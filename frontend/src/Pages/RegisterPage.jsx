import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage, apiFieldErrors } from '../lib/api';
import AuthShell from '../components/AuthShell';
import { ErrorNote } from '../components/Feedback';

const safeRedirect = (value) => (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null);

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const from = safeRedirect(location.state?.from);

  if (user && !submitting) return <Navigate to={from || '/menu'} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your name';
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) next.phone = 'Enter a 10-digit mobile number';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      next.password = 'Use at least 8 characters with a letter and a number';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.phone ? { phone: form.phone } : {}),
      });
      navigate(from || '/menu', { replace: true });
    } catch (err) {
      setErrors(apiFieldErrors(err));
      setError(apiErrorMessage(err, 'Could not create your account.'));
      setSubmitting(false);
    }
  };

  const set = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <AuthShell title="Create an account" subtitle="It takes a minute, and you can follow every order afterwards.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <label className="block">
          <span className="field-label">Full name</span>
          <input autoComplete="name" className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} />
          {errors.name && <span className="field-error block">{errors.name}</span>}
        </label>
        <label className="block">
          <span className="field-label">Email</span>
          <input type="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={set('email')} />
          {errors.email && <span className="field-error block">{errors.email}</span>}
        </label>
        <label className="block">
          <span className="field-label">Mobile number (optional)</span>
          <input inputMode="numeric" autoComplete="tel-national" maxLength={10} className={`input ${errors.phone ? 'input-error' : ''}`} value={form.phone} onChange={set('phone')} />
          {errors.phone && <span className="field-error block">{errors.phone}</span>}
        </label>
        <label className="block">
          <span className="field-label">Password</span>
          <input type="password" autoComplete="new-password" className={`input ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={set('password')} />
          {errors.password ? <span className="field-error block">{errors.password}</span> : <span className="field-hint block">At least 8 characters, with a letter and a number</span>}
        </label>
        {error && <ErrorNote>{error}</ErrorNote>}
        <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Create account
        </button>
      </form>
      <p className="mt-6 text-sm text-cocoa-soft">
        Already have an account?{' '}
        <Link to="/login" state={location.state} className="font-semibold text-berry hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
