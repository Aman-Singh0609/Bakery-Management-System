import { useState } from 'react';
import { Cake, Cookie, Croissant, Sandwich, Wheat } from 'lucide-react';

const FALLBACKS = {
  Bread: { icon: Wheat, bg: 'bg-butter-light', fg: 'text-[#9A7420]' },
  Cake: { icon: Cake, bg: 'bg-box-light', fg: 'text-berry' },
  Pastry: { icon: Croissant, bg: 'bg-butter-light', fg: 'text-[#9A7420]' },
  Cookie: { icon: Cookie, bg: 'bg-[#F3E7DF]', fg: 'text-cocoa-soft' },
  Snack: { icon: Sandwich, bg: 'bg-pistachio-light', fg: 'text-pistachio' },
};

/** Product photo with a designed fallback when there is no image or it fails to load. */
export default function ProductImage({ src, alt, category, className = '', iconClass = 'h-10 w-10' }) {
  const [failed, setFailed] = useState(false);
  const fallback = FALLBACKS[category] || { icon: Cake, bg: 'bg-box-light', fg: 'text-berry' };
  const Icon = fallback.icon;

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center ${fallback.bg} ${className}`} role="img" aria-label={alt}>
        <Icon className={`${iconClass} ${fallback.fg}`} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
