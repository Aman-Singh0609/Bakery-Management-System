import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './Feedback';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-md px-4 py-24">
        <h1 className="text-3xl font-bold">This page is for bakery staff</h1>
        <p className="mt-2 text-cocoa-soft">Your account does not have access to the dashboard.</p>
        <Link to="/menu" className="btn-primary mt-6">Go to the menu</Link>
      </div>
    );
  }

  return children;
}
