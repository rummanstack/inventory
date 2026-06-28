import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    question: 'Do I need internet all the time to use StockLedger?',
    answer:
      'An internet connection is required to sync data across devices and to access the system from multiple locations. However, for single-location use on a desktop, the system loads fast even on slow connections. We are working on an offline-first mode for future releases.',
  },
  {
    question: 'Can multiple staff members log in at the same time?',
    answer:
      'Yes. Each user gets their own login with a specific role — operator, manager, admin, or super admin. You control exactly what each person can see and do. Multiple users can work simultaneously without any conflict.',
  },
  {
    question: 'Is my business data safe? Who can see it?',
    answer:
      'Your data belongs to you only. Each business account is fully isolated — no other tenant can see your data. All connections are SSL-encrypted, and we run daily automatic backups so nothing is ever lost.',
  },
  {
    question: 'What happens if I want to stop using StockLedger?',
    answer:
      'You can export all your data at any time — products, invoices, purchase records, customer lists, and reports — in Excel format. There are no lock-in contracts. You can cancel any time with no penalties.',
  },
  {
    question: 'Can you help me set it up and train my team?',
    answer:
      'Absolutely. Every new subscription includes free onboarding setup and a training session for your team. Our support team is also available on WhatsApp and phone during business hours to help with any questions.',
  },
  {
    question: 'Does StockLedger support DSR (dealer/distribution) operations?',
    answer:
      'Yes — DSR management is one of our core features. Morning issue, evening settlement, due collection, DSR performance tracking, and cash advance management are all built in and used by distributors across Bangladesh.',
  },
];

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="text-base font-bold text-slate-900">{faq.question}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[var(--brand)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="border-t border-slate-100 px-6 pb-5 pt-4">
          <p className="text-sm font-medium leading-7 text-slate-600">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  function toggle(index) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <section className="landing-section landing-section-soft">
      <div className="landing-container">
        <div className="text-center mb-10">
          <p className="landing-eyebrow">Common Questions</p>
          <h2 className="landing-section-title mt-4">Frequently Asked Questions</h2>
          <p className="landing-section-text mx-auto max-w-xl mt-4">
            Everything you need to know before getting started. Still have questions? Chat with us on WhatsApp.
          </p>
        </div>

        <div className="mx-auto max-w-3xl grid gap-3">
          {FAQS.map((faq, index) => (
            <FaqItem
              key={faq.question}
              faq={faq}
              isOpen={openIndex === index}
              onToggle={() => toggle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
