import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, MessageCircle, Phone, Settings, Users } from 'lucide-react';
import { useLanguage } from '../../../app/hooks/useLanguage.js';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import LandingChatWidget from '../components/LandingChatWidget.jsx';
import ContactSection from '../components/ContactSection.jsx';

const contactReasons = [
  {
    title: 'You want a demo matched to your business',
    text: 'Use this page when you want to explain your operation and see the right StockLedger workflows, not a generic feature tour.',
    Icon: MessageCircle,
  },
  {
    title: 'You need pricing or commercial answers',
    text: 'This is the right page for module scope, user count, rollout questions, pricing conversation, and proposal-oriented discussions.',
    Icon: Settings,
  },
  {
    title: 'You want to speak before choosing setup steps',
    text: 'If you still need advice about the best path for retail, wholesale, dealer, accounting, or HR rollout, Contact is the sales conversation page.',
    Icon: Users,
  },
];

const nextSteps = [
  'We review your business type, current workflow, and highest-friction problems first.',
  'We recommend a starting module set instead of pushing every module at once.',
  'We discuss onboarding scope, training, users, branches, and pricing direction clearly.',
];

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
      <section
        className="relative overflow-hidden pb-14 pt-32 text-white sm:pt-40"
        style={{ background: 'linear-gradient(135deg,var(--bg-dark) 0%,var(--brand-strong) 58%,#14532d 100%)' }}
      >
        <div className="landing-container">
          <Link to="/landing" className="text-sm font-bold text-white/70 transition hover:text-white">Home</Link>
          <div className="mt-6 max-w-3xl">
            <p className="landing-eyebrow !text-[var(--landing-accent-teal)]">Contact StockLedger</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl">Book a demo, ask about pricing, or discuss the right rollout</h1>
            <p className="mt-5 text-base font-medium leading-7 text-slate-200 sm:text-lg">This page is for commercial and sales conversations. Talk to the StockLedger team about your business type, users, branches, modules, setup, training, and pricing. If you already know you want to start and need onboarding guidance, the Get Started page is the better next step.</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="grid gap-5 md:grid-cols-3">
            {contactReasons.map(({ title, text, Icon }) => (
              <article key={title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                  <Icon size={20} />
                </div>
                <h2 className="mt-4 text-xl font-black text-slate-950">{title}</h2>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">
                <Clock3 size={14} />
                What happens next
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">A useful contact request should shorten the buying cycle</h2>
              <div className="mt-5 space-y-3">
                {nextSteps.map((step) => (
                  <p key={step} className="flex items-start gap-3 text-[15px] font-medium leading-7 text-slate-600">
                    <ArrowRight size={17} className="mt-1 shrink-0 text-[var(--brand)]" />
                    {step}
                  </p>
                ))}
              </div>
              <p className="mt-5 text-[15px] font-medium leading-7 text-slate-600">That is the difference between Contact and Get Started on this site. Contact is where you confirm fit, ask questions, and evaluate the commercial side. Get Started is where you move into rollout planning and first-module decisions.</p>
            </article>

            <article className="rounded-[28px] border border-[var(--brand)]/15 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Need faster action?</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">If your main question is urgent and operational, use direct contact first. If your main question is onboarding structure, jump to Get Started.</p>
              <div className="mt-6 flex flex-col gap-3">
                <a href="tel:01678560660" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-5 text-sm font-black text-white transition hover:-translate-y-0.5">
                  <Phone size={16} />
                  Call Sales
                </a>
                <Link to="/get-started" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-[var(--brand)]/30">
                  Go to Get Started
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <ContactSection t={t} />

      <LandingFooter t={t} />
      <LandingChatWidget t={t} />
    </main>
  );
}
