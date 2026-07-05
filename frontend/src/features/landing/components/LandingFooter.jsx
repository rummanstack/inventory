import { Link } from 'react-router-dom';
import { ArrowUp, Facebook, Instagram, Linkedin, MapPin, MessageCircle, Phone, Send, Twitter } from 'lucide-react';
import { contactPhone, socialLinks, whatsappUrl } from '../constants.js';
import { stockLedgerLogoIcon } from '../../../assets/brandAssets.js';

// Placeholder '#' entries in constants.js are filtered out â€” icons appear
// automatically once real profile URLs are filled in.
const SOCIAL_LINKS = [
  { key: 'facebook', href: socialLinks.facebook, Icon: Facebook },
  { key: 'instagram', href: socialLinks.instagram, Icon: Instagram },
  { key: 'linkedin', href: socialLinks.linkedin, Icon: Linkedin },
  { key: 'twitter', href: socialLinks.twitter, Icon: Twitter },
  { key: 'telegram', href: socialLinks.telegram, Icon: Send },
].filter((link) => link.href && link.href !== '#');

const PRODUCT_LINKS = [
  { key: 'features', href: '#features' },
  { key: 'solutions', href: '#solutions' },
  { key: 'workflow', href: '#workflow' },
  { key: 'pricing', href: '#pricing' },
];

function FooterHeading({ children }) {
  return <p className="text-[12px] font-semibold text-slate-300/90">{children}</p>;
}

const footerLinkClass = 'text-sm font-semibold text-slate-300 transition hover:text-white';

export default function LandingFooter({ t }) {
  return (
    <footer id="contact" className="border-t border-white/10 bg-[linear-gradient(180deg,var(--bg-dark)_0%,var(--brand-strong)_100%)] text-white">
      <div className="landing-container pb-8 pt-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr] lg:gap-8">

          {/* Brand */}
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <img loading="lazy" decoding="async" src={stockLedgerLogoIcon} alt="" className="h-12 w-12 object-contain drop-shadow-[0_10px_24px_rgba(15,23,42,0.24)]" />
              <div>
                <h2 className="text-lg font-black tracking-tight text-white">StockLedger</h2>
                <p className="mt-1 text-[11px] font-medium text-slate-300/80">{t('landing.footer.tagline')}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-300">{t('landing.footer.description')}</p>
            {SOCIAL_LINKS.length > 0 && (
              <div className="mt-5 flex items-center gap-2">
                {SOCIAL_LINKS.map(({ key, href, Icon }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={key}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/20"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Product */}
          <nav className="flex flex-col gap-3" aria-label={t('landing.footer.product')}>
            <FooterHeading>{t('landing.footer.product')}</FooterHeading>
            {PRODUCT_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={footerLinkClass}>
                {t(`landing.nav.${link.key}`)}
              </a>
            ))}
          </nav>

          {/* Company */}
          <nav className="flex flex-col gap-3" aria-label={t('landing.footer.company')}>
            <FooterHeading>{t('landing.footer.company')}</FooterHeading>
            <Link to="/founder" className={footerLinkClass}>{t('landing.footer.aboutFounder')}</Link>
            <a href="#contact-form" className={footerLinkClass}>{t('landing.nav.contact')}</a>
            <a href="#get-started" className={footerLinkClass}>{t('landing.nav.getStarted')}</a>
            <Link to="/login" className={footerLinkClass}>{t('landing.login')}</Link>
          </nav>

          {/* Contact */}
          <div className="flex flex-col gap-3">
            <FooterHeading>{t('landing.footer.contactLabel')}</FooterHeading>
            <a href={`tel:${contactPhone}`} className="inline-flex items-center gap-2.5 text-base font-black tracking-wide text-white transition hover:text-slate-200">
              <Phone size={16} className="shrink-0 text-[var(--brand-soft)]" />
              {contactPhone}
            </a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2.5 text-sm font-semibold text-slate-300 transition hover:text-white">
              <MessageCircle size={16} className="shrink-0 text-[var(--landing-accent-success)]" />
              {t('landing.footer.whatsapp')}
            </a>
            <div className="inline-flex items-start gap-2.5 text-sm text-slate-400">
              <MapPin size={15} className="mt-0.5 shrink-0 text-[var(--brand-soft)]" />
              <address className="not-italic leading-6">
                Middle Paikpara, Mirpur-1<br />
                Dhaka - 1216, Bangladesh
              </address>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
            <p className="text-xs font-semibold text-slate-400">{t('landing.footer.copyright')}</p>
            <div className="flex items-center gap-4">
              <Link to="/privacy-policy" className="text-xs font-bold text-slate-400 transition hover:text-white">{t('landing.footerLinks.privacy')}</Link>
              <Link to="/terms" className="text-xs font-bold text-slate-400 transition hover:text-white">{t('landing.footerLinks.terms')}</Link>
            </div>
          </div>
          <a href="#top" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 transition hover:text-white">
            {t('landing.footer.backToTop')}
            <ArrowUp size={14} />
          </a>
        </div>
      </div>
    </footer>
  );
}
