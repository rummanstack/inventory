import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  Landmark,
  MessageCircle,
  Store,
  ReceiptText,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { usePublicLanguage, buildLocalizedPath } from '../../../app/hooks/usePublicLanguage.js';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import DeferredLandingAiChatWidget from '../components/DeferredLandingAiChatWidget.jsx';
import ImagePlaceholder from '../components/shared/ImagePlaceholder.jsx';
import { whatsappUrl } from '../constants.js';
import { getFeaturePage, getSolutionPage } from '../data/seoPages.js';
import { getIntentPage, intentPages } from '../data/intentPages.js';

const intentIcons = {
  'business-management-software-bangladesh': ClipboardList,
  'hr-payroll-software-bangladesh': Users,
  'inventory-software-bangladesh': Boxes,
  'dsr-management-software-bangladesh': Building2,
  'dealer-management-software-bangladesh': Building2,
  'retail-pos-software-bangladesh': ReceiptText,
  'accounting-software-bangladesh': BookOpenText,
  'business-reporting-software-bangladesh': BarChart3,
  'pharmacy-management-software-bangladesh': ShieldCheck,
  'wholesale-software-bangladesh': Building2,
  'shop-management-software-bangladesh': Landmark,
  'grocery-store-software-bangladesh': Store,
};

function useLandingPageMode() {
  useEffect(() => {
    document.documentElement.classList.add('landing-page-active');
    document.body.classList.add('landing-page-active');
    window.scrollTo(0, 0);

    return () => {
      document.documentElement.classList.remove('landing-page-active');
      document.body.classList.remove('landing-page-active');
    };
  }, []);
}

function getRotatingRelatedPages(pages, currentSlug, count = 3) {
  const currentIndex = pages.findIndex((candidate) => candidate.slug === currentSlug);
  if (currentIndex === -1) {
    return pages.slice(0, count);
  }

  const ordered = [
    ...pages.slice(currentIndex + 1),
    ...pages.slice(0, currentIndex),
  ];

  return ordered.slice(0, count);
}

function IntentCard({ page, language }) {
  const Icon = intentIcons[page.slug] || ClipboardList;

  return (
    <Link to={buildLocalizedPath(language, `/software/${page.slug}`)} className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:border-[var(--brand)]/30 hover:shadow-[0_22px_56px_rgba(15,23,42,0.1)]">
      <div className="overflow-hidden rounded-2xl">
        <ImagePlaceholder data={{ src: page.image, alt: page.imageAlt }} heightClass="aspect-[16/10]" fit="cover" position="center" />
      </div>
      <div className="mt-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
          <Icon size={20} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">{page.eyebrow}</p>
          <h3 className="mt-1 text-lg font-black leading-snug text-slate-950">{page.title}</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{page.description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {page.keywords.map((keyword) => (
          <span key={keyword} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{keyword}</span>
        ))}
      </div>
    </Link>
  );
}

export function SoftwareHubPage() {
  const { language, setLanguage, t } = usePublicLanguage();
  useLandingPageMode();

  const pages = intentPages.map((page) => getIntentPage(page.slug, language));

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />
      <section className="relative overflow-hidden pb-16 pt-32 text-white sm:pt-40" style={{ background: 'linear-gradient(135deg,var(--bg-dark) 0%,var(--brand-strong) 58%,#1f3a8a 100%)' }}>
        <div className="landing-container relative">
          <Link to={buildLocalizedPath(language, '/landing')} className="text-sm font-bold text-white/70 transition hover:text-white">{t('seoContent.breadcrumbHome')}</Link>
          <div className="mt-6 max-w-3xl">
            <p className="landing-eyebrow !text-[var(--landing-accent-teal)]">{t('seoContent.hub.softwareEyebrow')}</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl">{t('seoContent.hub.softwareTitle')}</h1>
            <p className="mt-5 text-base font-medium leading-7 text-slate-200 sm:text-lg">{t('seoContent.hub.softwareDescription')}</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pages.map((page) => <IntentCard key={page.slug} page={page} language={language} />)}
          </div>

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">{t('seoContent.hub.softwareWhyLabel')}</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t('seoContent.hub.softwareWhyTitle')}</h2>
            <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">{t('seoContent.hub.softwareWhyBody')}</p>
          </div>
        </div>
      </section>

      <LandingFooter t={t} language={language} />
      <DeferredLandingAiChatWidget t={t} />
    </main>
  );
}

export function SoftwareDetailPage() {
  const { slug } = useParams();
  const { language, setLanguage, t } = usePublicLanguage();
  useLandingPageMode();

  const page = getIntentPage(slug, language);
  if (!page) {
    return <Navigate to={buildLocalizedPath(language, '/software')} replace />;
  }

  const Icon = intentIcons[page.slug] || ClipboardList;
  const featurePage = getFeaturePage(page.primaryFeatureSlug, language);
  const solutionPage = getSolutionPage(page.primarySolutionSlug, language);
  const relatedIntentPages = getRotatingRelatedPages(intentPages, page.slug).map((entry) => getIntentPage(entry.slug, language));
  const connectedLinks = [
    featurePage ? { href: buildLocalizedPath(language, `/features/${featurePage.slug}`), eyebrow: featurePage.eyebrow, title: featurePage.title } : null,
    solutionPage ? { href: buildLocalizedPath(language, `/solutions/${solutionPage.slug}`), eyebrow: solutionPage.eyebrow, title: solutionPage.title } : null,
  ].filter(Boolean);

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />

      <section className="relative overflow-hidden pb-16 pt-32 text-white sm:pt-40" style={{ background: 'linear-gradient(135deg,var(--bg-dark) 0%,var(--brand-strong) 58%,#14532d 100%)' }}>
        <div className="landing-container grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white/70">
              <Link to={buildLocalizedPath(language, '/landing')} className="transition hover:text-white">{t('seoContent.breadcrumbHome')}</Link>
              <span>/</span>
              <Link to={buildLocalizedPath(language, '/software')} className="transition hover:text-white">{t('seoContent.breadcrumbSoftware')}</Link>
            </div>
            <div className="mt-6 max-w-3xl">
              <p className="landing-eyebrow !text-[var(--landing-accent-teal)]">{page.eyebrow}</p>
              <h1 className="mt-3 text-4xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl">{page.title}</h1>
              <p className="mt-5 text-base font-medium leading-7 text-slate-200 sm:text-lg">{page.description}</p>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {page.keywords.map((keyword) => (
                <span key={keyword} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">{keyword}</span>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--landing-accent-success)] px-6 text-sm font-black text-white shadow-[0_14px_30px_var(--landing-accent-success-shadow)] transition hover:-translate-y-0.5">
                <MessageCircle size={17} />
                {t('seoContent.detail.bookDemo')}
              </a>
              <Link to={buildLocalizedPath(language, '/pricing')} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15">
                {t('seoContent.detail.seePricing')}
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/15 bg-white/10 p-3 shadow-[0_28px_80px_rgba(15,23,42,0.28)] backdrop-blur">
            <ImagePlaceholder data={{ src: page.image, alt: page.imageAlt }} heightClass="aspect-[16/11]" fit="cover" position="center" />
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="landing-container grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                <Icon size={24} />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950">{t('seoContent.detail.bestFitFor')}</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{page.fit}</p>
              <div className="mt-5 space-y-3">
                {page.keywords.map((keyword) => (
                  <p key={keyword} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={17} className="text-[var(--landing-accent-success)]" />
                    {keyword}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-black text-slate-950">{t('seoContent.detail.connectedModulesTitle')}</h2>
              <div className="mt-4 grid gap-3">
                {connectedLinks.map((link) => (
                  <Link key={link.href} to={link.href} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-[var(--brand)]/25 hover:bg-white">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">{link.eyebrow}</p>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{link.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            {page.sections.map((section) => (
              <article key={section.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">{t('seoContent.detail.highIntentLabel')}</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{section.title}</h2>
                <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">{section.body}</p>
              </article>
            ))}

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">{t('seoContent.detail.softwareWhyMattersLabel')}</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t('seoContent.detail.softwareWhyMattersTitle')}</h2>
              <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">{t('seoContent.detail.softwareWhyMattersBody')}</p>
            </article>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{t('seoContent.detail.faqTitle')}</h2>
              <div className="mt-5 divide-y divide-slate-100">
                {page.faqs.map(([question, answer]) => (
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

      <section className="landing-section landing-section-brand">
        <div className="landing-container">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="landing-eyebrow">{t('seoContent.detail.exploreMore')}</p>
              <h2 className="landing-section-title">{t('seoContent.detail.relatedSoftware')}</h2>
              <p className="landing-section-text">{t('seoContent.detail.relatedSoftwareText')}</p>
            </div>
            <Link to={buildLocalizedPath(language, '/software')} className="inline-flex items-center gap-2 text-sm font-black text-[var(--brand)] transition hover:gap-3">
              {t('seoContent.detail.viewAll')}
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {relatedIntentPages.map((related) => <IntentCard key={related.slug} page={related} language={language} />)}
          </div>
        </div>
      </section>

      <LandingFooter t={t} language={language} />
      <DeferredLandingAiChatWidget t={t} />
    </main>
  );
}
