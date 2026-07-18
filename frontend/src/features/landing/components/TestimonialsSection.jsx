import avatar1 from '../../../assets/landing/testimonial-1.jpg';
import avatar2 from '../../../assets/landing/testimonial-2.jpg';
import avatar3 from '../../../assets/landing/testimonial-3.jpg';
import { Quote } from 'lucide-react';

const AVATARS = [avatar1, avatar2, avatar3];

function Stars({ count }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ item, avatar }) {
  return (
    <div className="flex flex-col gap-4 rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/60">
      <div className="flex items-center justify-between gap-3">
        <Stars count={5} />
        <Quote size={20} className="text-[var(--brand)]/25" />
      </div>
      <p className="flex-1 text-[15px] leading-relaxed text-slate-700">
        &ldquo;{item.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
        <img
          loading="lazy"
          decoding="async"
          src={avatar}
          alt={item.name}
          className="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow-sm"
        />
        <div>
          <p className="text-sm font-bold text-slate-900">{item.name}</p>
          <p className="text-xs text-slate-500">{item.role}</p>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection({ t }) {
  const items = t('landing.testimonials.items') || [];

  return (
    <section className="landing-section landing-section-soft">
      <div className="landing-container">
        <div className="mb-10 max-w-3xl">
          <p className="landing-eyebrow">{t('landing.testimonials.eyebrow')}</p>
          <h2 className="landing-section-title mt-4">{t('landing.testimonials.title')}</h2>
          <p className="landing-section-text mt-4">{t('landing.testimonials.text')}</p>
        </div>

        <div
          className="mobile-snap-track testimonial-track grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          role="region"
          aria-label={t('landing.testimonials.title')}
          tabIndex={0}
        >
          {items.slice(0, 3).map((item, index) => (
            <TestimonialCard key={item.name} item={item} avatar={AVATARS[index % AVATARS.length]} />
          ))}
        </div>
      </div>
    </section>
  );
}
