import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { ErrorNote, Spinner } from '../../components/Feedback';

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data.data);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the dashboard.'));
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  if (error) return <ErrorNote onRetry={load}>{error}</ErrorNote>;
  if (!stats) return <Spinner />;

  const max = Math.max(...stats.last7Days.map((d) => d.revenue), 1);

  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
        <Stat label="Sales today" value={formatCurrency(stats.todayRevenue)} sub={`${stats.todayOrders} orders placed today`} />
        <Stat
          label="Orders to handle"
          value={stats.pendingOrders}
          sub={<Link to="/admin/orders?status=OPEN" className="font-semibold text-berry hover:underline">Open the queue</Link>}
        />
        <Stat label="Total sales" value={formatCurrency(stats.revenue)} sub="Paid, not cancelled or refunded" />
        <Stat label="All orders" value={stats.totalOrders} />
      </dl>

      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="text-xl font-bold">Sales, last 7 days</h2>
          <div className="mt-6 flex h-48 items-end gap-3" role="img" aria-label="Daily paid sales for the last seven days">
            {stats.last7Days.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[11px] tabular-nums text-cocoa-muted">{day.revenue > 0 ? formatCurrency(day.revenue) : ''}</span>
                <div className="w-full rounded-t-lg bg-berry/85" style={{ height: `${Math.max((day.revenue / max) * 140, day.revenue > 0 ? 4 : 2)}px` }} title={`${day.orders} orders`} />
                <span className="text-xs text-cocoa-muted">
                  {new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold">Best sellers</h2>
          {stats.topItems.length === 0 ? (
            <p className="mt-4 text-sm text-cocoa-muted">No sales yet.</p>
          ) : (
            <ol className="mt-4 divide-y divide-line">
              {stats.topItems.map((item) => (
                <li key={item.name} className="flex justify-between py-2 text-sm">
                  <span>{item.name}</span>
                  <span className="tabular-nums text-cocoa-soft">{item.quantity} sold</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Running low</h2>
          <Link to="/admin/products" className="text-sm font-semibold text-berry hover:underline">Restock</Link>
        </div>
        {stats.lowStock.length === 0 ? (
          <p className="mt-4 text-sm text-cocoa-muted">Everything has at least 10 in stock.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {stats.lowStock.map((item) => (
              <li key={item.id} className={`chip ${item.stock === 0 ? 'border-berry/40 bg-berry-light text-berry-dark' : 'border-line bg-white'}`}>
                {item.name} <span className="font-bold tabular-nums">{item.stock}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-white p-5">
      <dt className="text-sm text-cocoa-muted">{label}</dt>
      <dd className="mt-1 font-display text-3xl font-bold tabular-nums">{value}</dd>
      {sub && <dd className="mt-1 text-xs text-cocoa-muted">{sub}</dd>}
    </div>
  );
}
