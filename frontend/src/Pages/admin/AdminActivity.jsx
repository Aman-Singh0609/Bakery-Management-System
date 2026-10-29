import { useCallback, useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { ErrorNote, Spinner } from '../../components/Feedback';

const ACTIONS = {
  'product.create': 'added a product',
  'product.update': 'edited a product',
  'product.stock': 'changed stock',
  'product.delete': 'removed a product',
  'order.status': 'updated an order',
  'user.role': 'changed a role',
  'user.password_change': 'changed their password',
  'auth.login': 'signed in',
};

function describe(entry) {
  const m = entry.metadata || {};
  if (entry.action === 'order.status') return `${m.from} to ${m.to}`;
  if (entry.action === 'product.stock') return `${m.from} to ${m.to}`;
  if (entry.action === 'user.role') return `${m.from} to ${m.to}`;
  if (m.name) return m.name;
  return '';
}

export default function AdminActivity() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/audit', { params: { limit: 100 } });
      setLogs(data.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load activity.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorNote onRetry={load}>{error}</ErrorNote>;
  if (!logs) return <Spinner />;
  if (logs.length === 0) return <p className="text-sm text-cocoa-muted">No staff activity yet.</p>;

  return (
    <ol className="divide-y divide-line border-y border-line text-sm">
      {logs.map((entry) => (
        <li key={entry.id} className="flex flex-wrap justify-between gap-2 py-3">
          <span>
            <span className="font-semibold">{entry.user?.name || 'System'}</span> {ACTIONS[entry.action] || entry.action}
            {describe(entry) && <span className="text-cocoa-soft">: {describe(entry)}</span>}
          </span>
          <span className="text-cocoa-muted">{formatDateTime(entry.createdAt)}</span>
        </li>
      ))}
    </ol>
  );
}
