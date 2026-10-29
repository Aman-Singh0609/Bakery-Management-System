export default function Logo({ className = '' }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#B4234F" />
        <path d="M14 38c0-10 8-18 18-18s18 8 18 18v4a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z" fill="#FFF8F6" />
        <path d="M24 26c2 4 2 10 0 16M32 22v20M40 26c-2 4-2 10 0 16" stroke="#F4C9D2" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
      <span className="font-display text-lg font-bold leading-none tracking-tight text-cocoa">
        Sweet Dreams
        <span className="block text-[11px] font-medium tracking-normal text-cocoa-muted">Bakery</span>
      </span>
    </span>
  );
}
