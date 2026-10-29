import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-page flex-col items-center justify-center px-4 py-32 text-center sm:px-6">
      <div className="mb-6 text-8xl">🥐</div>
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-berry">404 · Not found</p>
      <h1 className="text-4xl font-extrabold sm:text-5xl">This page isn&apos;t on the menu</h1>
      <p className="mt-4 max-w-sm text-cocoa-soft">
        The link may be old, or the page has moved. Head back to the menu and pick something fresh.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/menu" className="btn-primary px-6 py-3 text-base">
          Go to the menu <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/" className="btn-secondary px-6 py-3 text-base">
          Back to home
        </Link>
      </div>
    </div>
  );
}
