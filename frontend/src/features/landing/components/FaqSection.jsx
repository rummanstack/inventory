import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const INITIAL_FAQ_COUNT = 6;

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
  const [openIndex, setOpenIndex] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const faqs = t('landing.faq.items') || [];
  const visibleFaqs = showAll ? faqs : faqs.slice(0, INITIAL_FAQ_COUNT);
  const visibleFaqEntries = visibleFaqs.map((faq, index) => ({ faq, index }));

  function toggle(index) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <section className="landing-section landing-section-soft">
      <div className="landing-container">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="landing-eyebrow">{t('landing.faq.eyebrow')}</p>
          <h2 className="landing-section-title mt-4">{t('landing.faq.title')}</h2>
          <p className="landing-section-text mt-4">{t('landing.faq.text')}</p>
        </div>

        <div className="faq-list mx-auto grid max-w-6xl items-start gap-3 lg:hidden">
          {visibleFaqEntries.map(({ faq, index }) => (
            <FaqItem
              key={faq.question}
              faq={faq}
              isOpen={openIndex === index}
              onToggle={() => toggle(index)}
            />
          ))}
        </div>

        <div className="mx-auto hidden max-w-6xl grid-cols-2 items-start gap-5 lg:grid">
          {[0, 1].map((columnIndex) => (
            <div key={columnIndex} className="faq-list grid content-start gap-4">
              {visibleFaqEntries
                .filter(({ index }) => index % 2 === columnIndex)
                .map(({ faq, index }) => (
                  <FaqItem
                    key={faq.question}
                    faq={faq}
                    isOpen={openIndex === index}
                    onToggle={() => toggle(index)}
                  />
                ))}
            </div>
          ))}
        </div>

        {faqs.length > INITIAL_FAQ_COUNT ? (
          <button
            type="button"
            className="mx-auto mt-6 flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-[var(--brand-strong)] shadow-sm transition hover:border-[var(--brand)]/25 hover:bg-[var(--brand-soft)]"
            onClick={() => setShowAll((current) => !current)}
            aria-expanded={showAll}
          >
            {showAll ? t('landing.faq.showLess') : t('landing.faq.showAll')}
            <ChevronDown size={16} className={(showAll ? 'rotate-180 ' : '') + 'transition-transform'} />
          </button>
        ) : null}
      </div>
    </section>
  );
}
