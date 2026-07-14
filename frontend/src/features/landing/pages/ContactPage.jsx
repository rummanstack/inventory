import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../app/hooks/useLanguage.js';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import LandingChatWidget from '../components/LandingChatWidget.jsx';
import ContactSection from '../components/ContactSection.jsx';
import CtaSection from '../components/CtaSection.jsx';

export default function ContactPage() {
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
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,var(--bg-dark)_0%,var(--brand-strong)_58%,#14532d_100%)] pb-14 pt-32 text-white sm:pt-40">
        <div className="landing-container">
          <Link to="/landing" className="text-sm font-bold text-white/70 transition hover:text-white">Home</Link>
          <div className="mt-6 max-w-3xl">
            <p className="landing-eyebrow !text-[var(--landing-accent-teal)]">Contact StockLedger</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl">Book a demo or ask about the right setup</h1>
            <p className="mt-5 text-base font-medium leading-7 text-slate-200 sm:text-lg">Talk to the StockLedger team about your business type, users, branches, modules, setup, training, and pricing.</p>
          </div>
        </div>
      </section>
      <ContactSection t={t} />
      <CtaSection t={t} />
      <LandingFooter t={t} />
      <LandingChatWidget t={t} />
    </main>
  );
}
