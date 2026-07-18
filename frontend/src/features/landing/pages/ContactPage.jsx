import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, MessageCircle, Phone, Settings, Users } from 'lucide-react';
import { usePublicLanguage, buildLocalizedPath } from '../../../app/hooks/usePublicLanguage.js';
import { usePublicPageEffects } from '../hooks/usePublicPageEffects.js';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import DeferredLandingAiChatWidget from '../components/DeferredLandingAiChatWidget.jsx';
import ContactSection from '../components/ContactSection.jsx';

const contactReasonIcons = [MessageCircle, Settings, Users];

export default function ContactPage() {
  const { language, setLanguage, t } = usePublicLanguage();
  const contactReasons = t('contactPage.contactReasons').map((item, index) => ({ ...item, Icon: contactReasonIcons[index] }));
  const nextSteps = t('contactPage.nextSteps');
  const relatedDecisionPages = t('contactPage.relatedDecisionPages');
  const contactFaqs = t('contactPage.contactFaqs');

  usePublicPageEffects();

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />
      <section className="public-hero">
        <div className="landing-container">
          <Link to={buildLocalizedPath(language, '/landing')} className="public-hero-breadcrumb">{t('seoContent.breadcrumbHome')}</Link>
          <div className="mt-6 max-w-3xl">
            <p className="landing-eyebrow">{t('contactPage.eyebrow')}</p>
            <h1 className="public-hero-title">{t('contactPage.heroTitle')}</h1>
            <p className="public-hero-text">{t('contactPage.heroText')}</p>
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
                {t('contactPage.whatsNextLabel')}
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t('contactPage.whatsNextTitle')}</h2>
              <div className="mt-5 space-y-3">
                {nextSteps.map((step) => (
                  <p key={step} className="flex items-start gap-3 text-[15px] font-medium leading-7 text-slate-600">
                    <ArrowRight size={17} className="mt-1 shrink-0 text-[var(--brand)]" />
                    {step}
                  </p>
                ))}
              </div>
              <p className="mt-5 text-[15px] font-medium leading-7 text-slate-600">{t('contactPage.whatsNextText2')}</p>
            </article>

            <article className="rounded-[28px] border border-[var(--brand)]/15 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{t('contactPage.needFasterTitle')}</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{t('contactPage.needFasterText')}</p>
              <div className="mt-6 flex flex-col gap-3">
                <a href="tel:01678560660" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-strong)] px-5 text-sm font-black text-white transition hover:-translate-y-0.5">
                  <Phone size={16} />
                  {t('contactPage.callSales')}
                </a>
                <Link to={buildLocalizedPath(language, '/get-started')} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-[var(--brand)]/30">
                  {t('contactPage.goToGetStarted')}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">{t('contactPage.relatedLabel')}</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t('contactPage.relatedTitle')}</h2>
              <div className="mt-5 grid gap-4">
                {relatedDecisionPages.map((item) => (
                  <Link key={item.href} to={buildLocalizedPath(language, item.href)} className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 transition hover:border-[var(--brand)]/25 hover:bg-white">
                    <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{item.text}</p>
                  </Link>
                ))}
              </div>
            </article>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{t('contactPage.faqTitle')}</h2>
              <div className="mt-5 divide-y divide-slate-100">
                {contactFaqs.map(([question, answer]) => (
                  <div key={question} className="py-4 first:pt-0 last:pb-0">
                    <h3 className="text-base font-black text-slate-950">{question}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{answer}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <ContactSection t={t} />

      <LandingFooter t={t} language={language} />
      <DeferredLandingAiChatWidget t={t} />
    </main>
  );
}

