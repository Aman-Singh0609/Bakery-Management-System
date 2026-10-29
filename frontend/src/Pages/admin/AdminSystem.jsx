import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { STATUS_LABELS } from '../../lib/format';
import { ErrorNote, Spinner } from '../../components/Feedback';

export default function AdminSystem() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/diagnostics');
      setData(res.data.data);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load system status.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorNote onRetry={load}>{error}</ErrorNote>;
  if (!data) return <Spinner />;

  const uptime = data.server.uptimeSeconds;
  const rows = [
    ['Database', `Connected, ${data.database.latencyMs} ms`],
    ['Online payments', data.payments.razorpayConfigured ? 'Razorpay connected' : 'Not configured (cash on delivery only)'],
    ['Server uptime', `${Math.floor(uptime / 3600)} h ${Math.floor((uptime % 3600) / 60)} min`],
    ['Memory', `${data.server.memory.heapUsedMb} MB used of ${data.server.memory.heapTotalMb} MB`],
    ['Registered people', data.users.totalUsers],
    ['Out of stock', data.inventory.outOfStockCount],
    ['Background jobs waiting', data.outbox.pending + data.outbox.processing],
    ['Background jobs failed', data.outbox.failed],
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Health</h2>
          <button type="button" className="btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-2.5">
              <dt className="text-cocoa-soft">{label}</dt>
              <dd className={`text-right font-medium ${label === 'Background jobs failed' && value > 0 ? 'text-berry' : ''}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section>
        <h2 className="text-xl font-bold">Orders by status</h2>
        <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <div key={status} className="flex justify-between py-2.5">
              <dt className="text-cocoa-soft">{label}</dt>
              <dd className="font-medium tabular-nums">{data.orders.byStatus[status] || 0}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
