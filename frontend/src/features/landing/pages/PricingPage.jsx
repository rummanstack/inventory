import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../../../app/hooks/useLanguage.js';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import LandingChatWidget from '../components/LandingChatWidget.jsx';
import PricingSection from '../components/PricingSection.jsx';
import FaqSection from '../components/FaqSection.jsx';

export default function PricingPage() {
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    document.documentElement.classList.add('landing-page-active');
    document.body.classList.add('landing-page-active');
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.classList.remove('landing-page-active');
      document.body.classList.remove('landing-page-active');
    };
  }, []);

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />
      <section
        className="relative overflow-hidden pb-14 pt-32 text-white sm:pt-40"
        style={{ background: 'linear-gradient(135deg,var(--bg-dark) 0%,var(--brand-strong) 58%,#1f3a8a 100%)' }}
      >
        <div className="landing-container">
          <Link to="/landing" className="text-sm font-bold text-white/70 transition hover:text-white">Home</Link>
          <div className="mt-6 max-w-3xl">
            <p className="landing-eyebrow !text-[var(--landing-accent-teal)]">Pricing</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl">StockLedger pricing for growing businesses</h1>
            <p className="mt-5 text-base font-medium leading-7 text-slate-200 sm:text-lg">Choose the right plan for sales, inventory, accounting, HR, DSR, installments, reports, and business control.</p>
            <Link to="/contact" className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-[var(--brand-strong)] transition hover:-translate-y-0.5">
              Talk to Sales
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <PricingSection t={t} />
      <FaqSection t={t} />
      <LandingFooter t={t} />
      <LandingChatWidget t={t} />
    </main>
  );
}
