import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, Package, User, Lock } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { api, apiErrorMessage, apiFieldErrors } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDateTime } from '../lib/format';
import StatusBadge from '../components/StatusBadge';
import { EmptyState, ErrorNote, Spinner } from '../components/Feedback';

const TABS = [
  { value: 'orders', label: 'Orders', Icon: Package },
  { value: 'profile', label: 'Profile', Icon: User },
  { value: 'security', label: 'Password', Icon: Lock },
];

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-up">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-berry text-2xl font-bold text-white shadow-sm shadow-berry/30">
            {user.name[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold">Hi, {user.name.split(' ')[0]} 👋</h1>
            <p className="text-sm text-cocoa-soft">{user.email}</p>
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="btn-ghost text-sm">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      {/* Tab bar */}
      <div className="mt-8 flex gap-1 border-b border-line" role="tablist">
        {TABS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${tab === value ? 'border-berry text-cocoa' : 'border-transparent text-cocoa-muted hover:text-cocoa'
              }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8 pb-16">
        {tab === 'orders' && <OrdersList />}
        {tab === 'profile' && <ProfileForm />}
        {tab === 'security' && <PasswordForm />}
      </div>
    </div>
  );
}

function OrdersList() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/orders', { params: { limit: 50 } });
      setOrders(data.data);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load your orders.'));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorNote onRetry={load}>{error}</ErrorNote>;
  if (!orders) return <Spinner label="Loading your orders" />;
  if (orders.length === 0) {
    return (
      <EmptyState title="No orders yet" action={<Link to="/menu" className="btn-primary">Browse the menu</Link>}>
        When you place an order you can follow it here, from the oven to your door.
      </EmptyState>
    );
  }

  return (
    <ul className="space-y-2">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            to={`/orders/${order.id}`}
            className="group flex items-center gap-4 rounded-2xl border border-line bg-white px-4 py-4 shadow-sm transition-all hover:border-cocoa-muted hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-box-light">
              <Package className="h-5 w-5 text-cocoa-soft" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-cocoa">{formatCurrency(order.totalAmount)}</span>
                <StatusBadge status={order.status} />
              </div>
              <p className="mt-0.5 truncate text-sm text-cocoa-soft">
                {order.items.map((item) => `${item.quantity} × ${item.productName}`).join(', ')}
              </p>
              <p className="text-xs text-cocoa-muted">{formatDateTime(order.createdAt)} · {order.orderNumber}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-cocoa-muted transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ProfileForm() {
  const { user, setUser } = useAuth();
  const { notify } = useToast();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const { data } = await api.patch('/auth/me', { name: form.name.trim(), phone: form.phone.trim() || null });
      setUser(data.user);
      notify('Profile saved.');
    } catch (err) {
      setErrors(apiFieldErrors(err));
      notify(apiErrorMessage(err, 'Could not save your profile.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="panel max-w-md p-6 space-y-4" noValidate>
      <h2 className="font-bold text-lg">Personal details</h2>
      <label className="block">
        <span className="field-label">Name</span>
        <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        {errors.name && <span className="field-error block">{errors.name}</span>}
      </label>
      <label className="block">
        <span className="field-label">Mobile number</span>
        <input className={`input ${errors.phone ? 'input-error' : ''}`} inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        {errors.phone ? <span className="field-error block">{errors.phone}</span> : <span className="field-hint block">Used to fill in checkout faster</span>}
      </label>
      <label className="block">
        <span className="field-label">Email</span>
        <input className="input" value={user.email} disabled />
      </label>
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save profile
      </button>
    </form>
  );
}

function PasswordForm() {
  const { notify } = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) {
      setError('The new passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      notify(data.message || 'Password updated.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update your password.'));
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  return (
    <form onSubmit={submit} className="panel max-w-md p-6 space-y-4">
      <h2 className="font-bold text-lg">Change password</h2>
      <label className="block">
        <span className="field-label">Current password</span>
        <input type="password" autoComplete="current-password" required className="input" value={form.currentPassword} onChange={set('currentPassword')} />
      </label>
      <label className="block">
        <span className="field-label">New password</span>
        <input type="password" autoComplete="new-password" required minLength={8} className="input" value={form.newPassword} onChange={set('newPassword')} />
        <span className="field-hint block">At least 8 characters, with a letter and a number</span>
      </label>
      <label className="block">
        <span className="field-label">Repeat new password</span>
        <input type="password" autoComplete="new-password" required className="input" value={form.confirm} onChange={set('confirm')} />
      </label>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Update password
        </button>
        <p className="mt-3 text-xs text-cocoa-muted">Updating your password signs you out on every other device.</p>
      </div>
    </form>
  );
}
