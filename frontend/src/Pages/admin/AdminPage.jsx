import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { BarChart2, Package, ShoppingBag, Users, Activity, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminOverview from './AdminOverview';
import AdminOrders from './AdminOrders';
import AdminProducts from './AdminProducts';
import AdminUsers from './AdminUsers';
import AdminActivity from './AdminActivity';
import AdminSystem from './AdminSystem';

const tabClass = ({ isActive }) =>
  `flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 ${
    isActive
      ? 'bg-cocoa text-white shadow-sm'
      : 'text-cocoa-muted hover:bg-box-light hover:text-cocoa'
  }`;

const TABS = [
  { to: '/admin', end: true, label: 'Today', Icon: BarChart2 },
  { to: '/admin/orders', label: 'Orders', Icon: ShoppingBag },
  { to: '/admin/products', label: 'Products', Icon: Package },
];
const ADMIN_TABS = [
  { to: '/admin/users', label: 'People', Icon: Users },
  { to: '/admin/activity', label: 'Activity', Icon: Activity },
];
const SYSTEM_TAB = { to: '/admin/system', label: 'System', Icon: Settings };

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';

  const allTabs = [...TABS, ...(isAdmin ? ADMIN_TABS : []), SYSTEM_TAB];

  return (
    <div className="mx-auto max-w-page px-4 pt-8 sm:px-6">
      <div className="flex items-center gap-3 animate-fade-up">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cocoa text-white text-lg">🍞</div>
        <h1 className="text-3xl font-extrabold">Bakery dashboard</h1>
      </div>

      {/* Tab nav */}
      <nav className="mt-6 flex gap-1.5 overflow-x-auto pb-1" aria-label="Dashboard sections">
        {allTabs.map(({ to, end, label, Icon }) => (
          <NavLink key={to} end={end} to={to} className={tabClass}>
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 pb-16">
        <Routes>
          <Route index element={<AdminOverview />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          {isAdmin && <Route path="users" element={<AdminUsers />} />}
          {isAdmin && <Route path="activity" element={<AdminActivity />} />}
          <Route path="system" element={<AdminSystem />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  );
}
