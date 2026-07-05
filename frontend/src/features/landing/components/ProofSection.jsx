import avatar1 from '../../../assets/landing/testimonial-1.jpg';
import avatar2 from '../../../assets/landing/testimonial-2.jpg';
import avatar3 from '../../../assets/landing/testimonial-3.jpg';
import { Building2, MapPin, Quote } from 'lucide-react';

const FEATURED_CUSTOMERS = [
  {
    name: 'Rafiqul Islam',
    role: 'Grocery Wholesale, Dhaka',
    quote: 'Before StockLedger, I had no idea how much profit I was making daily. Now I check the dashboard every morning and know exactly where my money stands.',
    avatar: avatar1,
  },
  {
    name: 'Mahmudul Hasan',
    role: 'Pharmacy Owner, Chattogram',
    quote: 'The purchase and supplier payment tracking alone saved us from countless disputes. Everything is recorded, and I can pull a supplier statement in seconds.',
    avatar: avatar2,
  },
  {
    name: 'Kamal Hossain',
    role: 'Electronics Retailer, Sylhet',
    quote: 'Serial number tracking and warranty claims are a game changer for my electronics shop. Customers trust us more because we can look up any product history instantly.',
    avatar: avatar3,
  },
];

const INDUSTRY_TAGS = [
  'Grocery wholesale, Dhaka',
  'Pharmacy, Chattogram',
  'Electronics retail, Sylhet',
  'DSR teams, Rajshahi',
];

function ProofCard({ item }) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(var(--slate-900),0.06)] ring-1 ring-slate-200/60">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img loading="lazy" decoding="async" src={item.avatar} alt={item.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm" />
          <div>
            <p className="text-sm font-semibold text-slate-950">{item.name}</p>
            <p className="text-xs text-slate-500">{item.role}</p>
          </div>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
          <Quote size={16} />
        </span>
      </div>
      <p className="mt-4 text-sm font-normal leading-7 text-slate-600">&ldquo;{item.quote}&rdquo;</p>
    </article>
  );
}

export default function ProofSection({ t }) {
  return (
    <section className="landing-section landing-section-soft">
      <div className="landing-container">
        <div className="max-w-3xl">
          <p className="landing-eyebrow">{t('landing.proof.eyebrow')}</p>
          <h2 className="landing-section-title mt-4">{t('landing.proof.title')}</h2>
          <p className="landing-section-text">{t('landing.proof.text')}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {INDUSTRY_TAGS.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-medium text-slate-600 shadow-[0_4px_14px_rgba(var(--slate-900),0.04)]">
              <Building2 size={14} className="text-[var(--brand-strong)]" />
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {FEATURED_CUSTOMERS.map((item) => (
            <ProofCard key={item.name} item={item} />
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} className="text-[var(--brand-strong)]" />
            Dhaka, Chattogram, Sylhet and Rajshahi
          </span>
          <span>Used by retail, pharmacy, electronics and distributor teams</span>
        </div>
      </div>
    </section>
  );
}
