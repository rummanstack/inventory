import avatar1 from '../../../assets/landing/testimonial-1.jpg';
import avatar2 from '../../../assets/landing/testimonial-2.jpg';
import avatar3 from '../../../assets/landing/testimonial-3.jpg';
import avatar4 from '../../../assets/landing/testimonial-4.jpg';
import avatar5 from '../../../assets/landing/testimonial-5.jpg';
import avatar6 from '../../../assets/landing/testimonial-6.jpg';
import { Building2, MapPin } from 'lucide-react';

const AVATARS = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6];
const INDUSTRY_TAGS = [
  'Grocery wholesale, Dhaka',
  'Pharmacy, Chattogram',
  'Electronics retail, Sylhet',
  'DSR teams, Rajshahi',
];

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
      <Stars count={5} />
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
        <div className="mb-10 text-center">
          <p className="landing-eyebrow">{t('landing.testimonials.eyebrow')}</p>
          <h2 className="landing-section-title mt-4">{t('landing.testimonials.title')}</h2>
          <p className="landing-section-text mx-auto mt-4 max-w-2xl">{t('landing.testimonials.text')}</p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2.5">
          {INDUSTRY_TAGS.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-medium text-slate-600 shadow-[0_4px_14px_rgba(var(--slate-900),0.04)]">
              <Building2 size={14} className="text-[var(--brand-strong)]" />
              {tag}
            </span>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <TestimonialCard key={item.name} item={item} avatar={AVATARS[index % AVATARS.length]} />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} className="text-[var(--brand-strong)]" />
            Dhaka, Chattogram, Sylhet, Rajshahi, Cumilla and Khulna
          </span>
          <span>Used by retail, pharmacy, electronics and distributor teams</span>
        </div>
      </div>
    </section>
  );
}
