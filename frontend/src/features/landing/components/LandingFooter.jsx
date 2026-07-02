import { Link } from 'react-router-dom';
import { ArrowUp, Facebook, Instagram, Linkedin, MapPin, MessageCircle, Phone, Send, Twitter } from 'lucide-react';
import { contactPhone, navLinks, socialLinks, whatsappUrl } from '../constants.js';
import { stockLedgerLogoIcon } from '../../../assets/brandAssets.js';

const SOCIAL_LINKS = [
  { key: 'facebook', href: socialLinks.facebook, Icon: Facebook },
  { key: 'instagram', href: socialLinks.instagram, Icon: Instagram },
  { key: 'linkedin', href: socialLinks.linkedin, Icon: Linkedin },
  { key: 'twitter', href: socialLinks.twitter, Icon: Twitter },
  { key: 'telegram', href: socialLinks.telegram, Icon: Send },
];

export default function LandingFooter({ t }) {
  return (
    <footer id="contact" className="border-t border-white/10 bg-[linear-gradient(180deg,var(--bg-dark)_0%,var(--brand-strong)_100%)] text-white">
      <div className="landing-container py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <img loading="lazy" decoding="async" src={stockLedgerLogoIcon} alt="" className="h-12 w-12 object-contain drop-shadow-[0_10px_24px_rgba(15,23,42,0.24)]" />
              <div>
                <h2 className="text-lg font-black tracking-tight text-white">StockLedger</h2>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">{t('landing.footer.tagline')}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-300">{t('landing.footer.description')}</p>
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
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 lg:pt-2" aria-label="Footer navigation">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-bold text-slate-300 transition hover:text-white">
                {t(`landing.nav.${link.key}`)}
              </a>
            ))}
            <Link to="/login" className="text-sm font-bold text-slate-300 transition hover:text-white">
              {t('landing.login')}
            </Link>
            <Link to="/founder" className="text-sm font-bold text-slate-300 transition hover:text-white">
              About the Founder
            </Link>
          </nav>

          <div className="flex flex-col gap-3 sm:items-end">
            <a href={`tel:${contactPhone}`} className="inline-flex items-center gap-2 text-base font-black text-white transition hover:text-slate-200">
              <Phone size={16} className="text-[var(--blue-200)]" />
              {contactPhone}
            </a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white">
              <MessageCircle size={16} className="text-[var(--blue-200)]" />
              {t('landing.footer.whatsapp')}
            </a>
            <div className="inline-flex items-start gap-2 text-sm text-slate-400 sm:text-right">
              <MapPin size={15} className="mt-0.5 shrink-0 text-[var(--blue-200)]" />
              <address className="not-italic leading-5">
                Middle Paikpara, Mirpur-1<br />
                Dhaka - 1216, Bangladesh
              </address>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-xs font-semibold text-slate-400">{t('landing.footer.copyright')}</p>
            <Link to="/privacy-policy" className="text-xs font-bold text-slate-400 transition hover:text-white">{t('landing.footerLinks.privacy')}</Link>
            <Link to="/terms" className="text-xs font-bold text-slate-400 transition hover:text-white">{t('landing.footerLinks.terms')}</Link>
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
