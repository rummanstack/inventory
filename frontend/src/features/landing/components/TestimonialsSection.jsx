import avatar1 from '../../../assets/landing/testimonial-1.jpg';
import avatar2 from '../../../assets/landing/testimonial-2.jpg';
import avatar3 from '../../../assets/landing/testimonial-3.jpg';
import avatar4 from '../../../assets/landing/testimonial-4.jpg';
import avatar5 from '../../../assets/landing/testimonial-5.jpg';
import avatar6 from '../../../assets/landing/testimonial-6.jpg';

const TESTIMONIALS = [
  {
    avatar: avatar1,
    name: 'Rafiqul Islam',
    role: 'Grocery Wholesale, Dhaka',
    stars: 5,
    quote:
      'Before Arinda, I had no idea how much profit I was making daily. Now I check the dashboard every morning and know exactly where my money stands. My DSRs are more accountable too.',
  },
  {
    avatar: avatar2,
    name: 'Mahmudul Hasan',
    role: 'Pharmacy Owner, Chittagong',
    stars: 5,
    quote:
      'The purchase and supplier payment tracking alone saved us from countless disputes. Everything is recorded, and I can pull a supplier statement in seconds. Highly recommended.',
  },
  {
    avatar: avatar3,
    name: 'Kamal Hossain',
    role: 'Electronics Retailer, Sylhet',
    stars: 5,
    quote:
      "Serial number tracking and warranty claims are a game changer for my electronics shop. Customers trust us more because we can look up any product's history instantly.",
  },
  {
    avatar: avatar4,
    name: 'Shahadat Hossain',
    role: 'Clothing Distributor, Rajshahi',
    stars: 5,
    quote:
      'I manage 12 DSRs across three districts. The morning issue and evening settlement flow is so smooth now — dues are clear, cash is tracked, no more end-of-day confusion.',
  },
  {
    avatar: avatar5,
    name: 'Farzana Akter',
    role: 'FMCG Trader, Comilla',
    stars: 5,
    quote:
      'The profit report section is outstanding. I can filter by date, see which products are most profitable, and share the report with my accountant in one click.',
  },
  {
    avatar: avatar6,
    name: 'Nusrat Jahan',
    role: 'Hardware & Tools Shop, Khulna',
    stars: 5,
    quote:
      'Stock management used to be a nightmare with so many SKUs. Now I get low-stock alerts before I run out, and the purchase history keeps every supplier deal on record.',
  },
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

export default function TestimonialsSection({ t }) {
  return (
    <section className="landing-section landing-section-soft">
      <div className="landing-container">
        <div className="text-center mb-12">
          <p className="landing-eyebrow">Customer Stories</p>
          <h2 className="landing-section-title mt-4">Trusted by Business Owners Across Bangladesh</h2>
          <p className="landing-section-text mx-auto max-w-2xl mt-4">
            From small retail shops to large wholesale distributors — real businesses, real results.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <TestimonialCard key={item.name} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ item }) {
  return (
    <div className="flex flex-col gap-4 rounded-[28px] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/60">
      <Stars count={item.stars} />
      <p className="flex-1 text-[15px] leading-relaxed text-slate-700">
        &ldquo;{item.quote}&rdquo;
      </p>
      <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
        <img
          src={item.avatar}
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
