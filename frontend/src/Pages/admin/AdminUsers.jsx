import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ErrorNote, Spinner } from '../../components/Feedback';

const ROLE_LABELS = { CUSTOMER: 'Customer', STAFF: 'Staff', ADMIN: 'Admin' };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { notify } = useToast();
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/users', { params: { limit: 100, ...(search.trim() ? { search: search.trim() } : {}) } });
      setUsers(data.data);
      setError('');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load people.'));
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const changeRole = async (person, role) => {
    if (!window.confirm(`Make ${person.name} ${ROLE_LABELS[role].toLowerCase()}? They will be signed out and need to sign in again.`)) {
      return;
    }
    try {
      const { data } = await api.patch(`/admin/users/${person.id}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === person.id ? { ...u, ...data.data } : u)));
      notify(`${person.name} is now ${ROLE_LABELS[role].toLowerCase()}.`);
    } catch (err) {
      notify(apiErrorMessage(err, 'Could not change the role.'), 'error');
    }
  };

  return (
    <div>
      <p className="max-w-xl text-sm text-cocoa-soft">
        Staff can handle orders and stock. Admins can also refund orders, remove products and manage people.
      </p>
      <label className="relative mt-4 block sm:w-72">
        <span className="sr-only">Search people</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-muted" />
        <input type="search" className="input rounded-full py-2 pl-9" placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      <div className="mt-6">
        {error ? (
          <ErrorNote onRetry={load}>{error}</ErrorNote>
        ) : !users ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-line text-cocoa-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((person) => (
                  <tr key={person.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{person.name}</p>
                      <p className="text-xs text-cocoa-muted">{person.email}</p>
                    </td>
                    <td className="px-4 py-3 text-cocoa-soft">{formatDate(person.createdAt)}</td>
                    <td className="px-4 py-3 tabular-nums">{person.orderCount}</td>
                    <td className="px-4 py-3">
                      {person.id === me.id ? (
                        <span className="text-cocoa-muted">{ROLE_LABELS[person.role]} (you)</span>
                      ) : (
                        <select
                          aria-label={`Role for ${person.name}`}
                          className="input w-36 py-1.5"
                          value={person.role}
                          onChange={(e) => changeRole(person, e.target.value)}
                        >
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
