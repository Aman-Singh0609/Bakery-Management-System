import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { Spinner } from './components/Feedback';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import HomePage from './Pages/HomePage';
import MenuPage from './Pages/MenuPage';
import CartPage from './Pages/CartPage';
import LoginPage from './Pages/LoginPage';
import RegisterPage from './Pages/RegisterPage';
import NotFoundPage from './Pages/NotFoundPage';

// Pages only signed-in customers or staff need are loaded on demand.
const CheckoutPage = lazy(() => import('./Pages/CheckoutPage'));
const OrderPage = lazy(() => import('./Pages/OrderPage'));
const AccountPage = lazy(() => import('./Pages/AccountPage'));
const AdminPage = lazy(() => import('./Pages/admin/AdminPage'));

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="menu" element={<MenuPage />} />
                  <Route path="cart" element={<CartPage />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="register" element={<RegisterPage />} />
                  <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                  <Route path="orders/:id" element={<ProtectedRoute><OrderPage /></ProtectedRoute>} />
                  <Route path="account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
                  <Route path="admin/*" element={<ProtectedRoute roles={['ADMIN', 'STAFF']}><AdminPage /></ProtectedRoute>} />
                  {/* Old URLs from the previous version. */}
                  <Route path="payment" element={<Navigate to="/checkout" replace />} />
                  <Route path="service" element={<Navigate to="/admin" replace />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
