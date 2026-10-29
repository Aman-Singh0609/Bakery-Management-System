export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="mx-auto grid max-w-page gap-0 px-0 pt-0 sm:px-0 md:min-h-[calc(100vh-10rem)] md:grid-cols-2">
      {/* Left panel — decorative */}
      <div className="relative hidden overflow-hidden md:block">
        <div className="ribbon h-full" aria-hidden="true" />
        {/* Floating card mockup */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-10">
          <div className="w-full max-w-xs rounded-3xl bg-white/80 p-6 shadow-xl backdrop-blur-sm ring-1 ring-white">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-berry flex items-center justify-center text-white text-xl shadow-sm">🎂</div>
              <div>
                <p className="font-bold text-cocoa">Your order is ready!</p>
                <p className="text-xs text-cocoa-muted">Out for delivery · 2 items</p>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-line">
              <div className="h-2 w-4/5 rounded-full bg-pistachio" />
            </div>
            <p className="mt-2 text-xs text-right text-cocoa-muted">Almost there 🚀</p>
          </div>
          <div className="w-full max-w-xs rounded-3xl bg-white/80 p-5 shadow-lg backdrop-blur-sm ring-1 ring-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-berry mb-3">Today's favourites</p>
            {[
              ['🍞', 'Sourdough loaf', '₹180'],
              ['🥐', 'Butter croissant', '₹60'],
              ['🎂', 'Black forest cake', '₹850'],
            ].map(([emoji, name, price]) => (
              <div key={name} className="flex items-center justify-between py-2 border-b border-line last:border-0">
                <span className="flex items-center gap-2 text-sm text-cocoa">
                  <span>{emoji}</span>{name}
                </span>
                <span className="text-sm font-semibold text-cocoa">{price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center px-6 py-14 sm:px-10 md:px-14">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold">{title}</h1>
            {subtitle && <p className="mt-2 text-cocoa-soft">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
