import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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

export default function FaqSection({ t }) {
  const [openIndex, setOpenIndex] = useState(0);
  const faqs = t('landing.faq.items') || [];

  function toggle(index) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <section className="landing-section landing-section-soft">
      <div className="landing-container">
        <div className="text-center mb-10">
          <p className="landing-eyebrow">{t('landing.faq.eyebrow')}</p>
          <h2 className="landing-section-title mt-4">{t('landing.faq.title')}</h2>
          <p className="landing-section-text mx-auto max-w-xl mt-4">{t('landing.faq.text')}</p>
        </div>

        <div className="mx-auto max-w-3xl grid gap-3">
          {faqs.map((faq, index) => (
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
