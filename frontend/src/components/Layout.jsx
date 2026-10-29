import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, ShoppingBag, User, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { STORE } from '../lib/store';
import Logo from './Logo';

const navClass = ({ isActive }) =>
  `rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-150 ${
    isActive ? 'bg-box-light text-cocoa' : 'text-cocoa-soft hover:bg-box-light/60 hover:text-cocoa'
  }`;

export default function Layout() {
  const { totalItems } = useCart();
  const { user, isStaff } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = (
    <>
      <NavLink to="/menu" className={navClass}>Menu</NavLink>
      {user && <NavLink to="/account" className={navClass}>My orders</NavLink>}
      {isStaff && <NavLink to="/admin" className={navClass}>Dashboard</NavLink>}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <div className="ribbon h-2" aria-hidden="true" />
      <header className={`sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-md transition-shadow duration-300 ${scrolled ? 'shadow-sm shadow-cocoa/5' : ''}`}>
        <div className="mx-auto flex h-16 max-w-page items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="mr-auto shrink-0" aria-label={`${STORE.name} home`}>
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">{links}</nav>
          <Link
            to={user ? '/account' : '/login'}
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-cocoa-soft transition-all duration-150 hover:bg-box-light hover:text-cocoa md:flex"
          >
            <User className="h-4 w-4" />
            {user ? user.name.split(' ')[0] : 'Sign in'}
          </Link>
          <Link to="/cart" className="btn-primary relative px-4" aria-label={`Basket, ${totalItems} items`}>
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Basket</span>
            {totalItems > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-berry">
                {totalItems}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="btn-ghost md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="Open menu"
          >
            {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <nav className="flex flex-col gap-1 border-t border-line bg-paper/98 px-4 py-3 md:hidden animate-fade-up" aria-label="Mobile">
            {links}
            <NavLink to={user ? '/account' : '/login'} className={navClass}>
              {user ? 'Account' : 'Sign in'}
            </NavLink>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-20 border-t border-line bg-white">
        <div className="mx-auto grid max-w-page gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-cocoa-soft">{STORE.tagline}</p>
            <a
              href={`tel:${STORE.phone.replace(/\s/g, '')}`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-cocoa-soft transition-colors hover:border-berry hover:text-berry"
            >
              📞 {STORE.phone}
            </a>
          </div>
          <div className="text-sm">
            <h2 className="mb-3 text-base font-semibold">Visit us</h2>
            {STORE.address.map((line) => (
              <p key={line} className="text-cocoa-soft">{line}</p>
            ))}
            <p className="mt-2 text-cocoa-soft">{STORE.phone}</p>
          </div>
          <div className="text-sm">
            <h2 className="mb-3 text-base font-semibold">Opening hours</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-cocoa-soft">
              {STORE.hours.map(([days, time]) => (
                <div key={days} className="contents">
                  <dt>{days}</dt>
                  <dd>{time}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="border-t border-line px-4 py-5">
          <p className="text-center text-xs text-cocoa-muted">
            © {new Date().getFullYear()} {STORE.name} · Baked with ❤️ every morning
          </p>
        </div>
      </footer>
    </div>
  );
}
