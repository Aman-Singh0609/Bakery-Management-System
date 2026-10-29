import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Truck, Star, ShieldCheck, Leaf } from 'lucide-react';
import { api } from '../lib/api';
import { STORE } from '../lib/store';
import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import { useStoreSettings } from '../hooks/useStore';
import { formatCurrency } from '../lib/format';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const settings = useStoreSettings();

  useEffect(() => {
    api.get('/products', { params: { featured: 'true', limit: 8 } }).then(({ data }) => setFeatured(data.data)).catch(() => {});
    api.get('/categories').then(({ data }) => setCategories(data.data)).catch(() => {});
  }, []);

  const hero = featured.filter((p) => p.image).slice(0, 2);

  const deliveryLine = !settings
    ? ''
    : settings.deliveryFee === 0
      ? 'Free delivery on every order'
      : settings.freeDeliveryAbove > 0
        ? `Free delivery over ${formatCurrency(settings.freeDeliveryAbove)}`
        : `Delivery ${formatCurrency(settings.deliveryFee)}`;

  return (
    <>
      {/* ── Hero ── */}
      <section className="mx-auto grid max-w-page items-center gap-10 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-16">
        <div className="animate-fade-up">
          {/* Trust pill */}
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-pistachio/40 bg-pistachio-light px-3.5 py-1.5 text-xs font-semibold text-[#4A6326]">
            <span className="h-2 w-2 rounded-full bg-pistachio animate-pulse-dot" />
            Fresh baked this morning
          </span>

          <h1 className="text-[2.75rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
            Fresh from our{' '}
            <span className="relative whitespace-nowrap text-berry">
              oven
              <svg className="absolute -bottom-1 left-0 h-3 w-full" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 10 Q25 2 50 8 Q75 14 100 6" stroke="#B4234F" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.35" />
              </svg>
            </span>{' '}
            to your table.
          </h1>
          <p className="mt-5 max-w-md text-lg text-cocoa-soft">
            Sourdough, croissants, celebration cakes and warm veg puffs, baked every morning and delivered the same day.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/menu" className="btn-primary px-6 py-3 text-base">
              See today&apos;s menu <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/menu" className="btn-secondary px-6 py-3 text-base">
              How it works
            </Link>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-cocoa-soft">
            {deliveryLine && (
              <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-pistachio" /> {deliveryLine}</li>
            )}
            <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-pistachio" /> {STORE.hours[0][0]} {STORE.hours[0][1]}</li>
          </ul>
        </div>

        <div className="relative grid grid-cols-5 gap-3" aria-hidden={hero.length === 0}>
          <div className="col-span-3 aspect-[3/4] overflow-hidden rounded-[2rem] bg-box-light shadow-lg shadow-cocoa/10">
            {hero[0] ? (
              <ProductImage src={hero[0].image} alt={hero[0].name} category={hero[0].category} className="h-full w-full transition-transform duration-700 hover:scale-105" />
            ) : (
              <div className="ribbon h-full w-full opacity-60" />
            )}
          </div>
          <div className="col-span-2 flex flex-col gap-3 pt-12">
            <div className="aspect-square overflow-hidden rounded-[1.5rem] bg-butter-light shadow-md shadow-cocoa/10">
              {hero[1] && <ProductImage src={hero[1].image} alt={hero[1].name} category={hero[1].category} className="h-full w-full transition-transform duration-700 hover:scale-105" />}
            </div>
            <div className="ribbon flex-1 rounded-[1.5rem]" />
          </div>
          {/* Floating badge */}
          <div className="absolute -bottom-4 left-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 shadow-lg shadow-cocoa/10 ring-1 ring-line">
            <Star className="h-4 w-4 fill-butter text-butter" />
            <span className="text-sm font-semibold">Loved by 500+ customers</span>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto flex max-w-page flex-wrap justify-center gap-8 px-4 py-5 sm:px-6">
          {[
            [ShieldCheck, 'Hygienic kitchen', 'FSSAI certified'],
            [Leaf, 'Fresh ingredients', 'Sourced daily'],
            [Truck, 'Same-day delivery', 'Order by 11 AM'],
            [Star, 'Top rated', '4.8 ★ on Google'],
          ].map(([Icon, title, sub]) => (
            <div key={title} className="flex items-center gap-3 text-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pistachio-light">
                <Icon className="h-4 w-4 text-pistachio" />
              </div>
              <div>
                <p className="font-semibold text-cocoa">{title}</p>
                <p className="text-cocoa-muted">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Category pills ── */}
      {categories.length > 0 && (
        <section className="border-b border-line bg-paper">
          <div className="mx-auto flex max-w-page gap-2 overflow-x-auto px-4 py-4 sm:px-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/menu?category=${category.slug}`}
                className="chip border-line bg-white text-cocoa shadow-sm hover:border-berry hover:text-berry hover:shadow"
              >
                {category.name}
                <span className="text-cocoa-muted">{category.productCount}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured products ── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-page px-4 pt-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-berry">Hand-picked</p>
              <h2 className="text-3xl font-bold sm:text-4xl">Customer favourites</h2>
            </div>
            <Link to="/menu" className="shrink-0 text-sm font-semibold text-berry hover:underline">
              Full menu →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4">
            {featured.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section className="mx-auto max-w-page px-4 pt-20 sm:px-6">
        <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-berry">Simple process</div>
        <h2 className="text-3xl font-bold sm:text-4xl">How ordering works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            ['🛒', 'Pick your bakes', 'Choose from what is on the shelf today. Stock updates live, so what you see is what we have.'],
            ['💳', 'Pay your way', 'Pay online by UPI or card, or pay in cash when your order arrives.'],
            ['📍', 'Track it to your door', 'Follow your order from the oven to your door in your account.'],
          ].map(([emoji, title, body], index) => (
            <li key={title} className="group rounded-2xl border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-box-light text-xl">{emoji}</span>
                <span className="font-display text-4xl font-extrabold text-box group-hover:text-berry/30 transition-colors">{index + 1}</span>
              </div>
              <h3 className="mt-2 text-xl font-bold">{title}</h3>
              <p className="mt-1 text-sm text-cocoa-soft">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── CTA banner ── */}
      <section className="mx-auto max-w-page px-4 pt-20 pb-4 sm:px-6">
        <div className="relative overflow-hidden flex flex-col gap-6 rounded-[2rem] bg-cocoa px-6 py-10 text-white sm:px-10 md:flex-row md:items-center md:justify-between">
          {/* Decorative blob */}
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 translate-x-1/3 -translate-y-1/3 rounded-full bg-berry/30 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-white">Ordering for a celebration?</h2>
            <p className="mt-2 max-w-lg text-white/75">
              Call us a day ahead for custom cakes and large orders, or drop by the shop.
            </p>
          </div>
          <div className="relative flex flex-col gap-3">
            <div className="flex flex-col gap-1 text-sm text-white/85">
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {STORE.address.join(', ')}</span>
              <span className="pl-6">{STORE.phone}</span>
            </div>
            <a href={`tel:${STORE.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/25 transition-colors">
              📞 Call us now
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
