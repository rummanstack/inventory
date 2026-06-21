import { useMemo, useState } from 'react';
import { ArrowRight, MessageCircle, Phone, X } from 'lucide-react';
import logoMark from '../../../assets/stockledger-logo-mark.svg';
import { contactPhone, whatsappUrl } from '../constants.js';

function buildWhatsAppLink(message) {
  const text = message.trim() || 'Hi, I need help with StockLedger.';
  return `${whatsappUrl}?text=${encodeURIComponent(text)}`;
}

export default function LandingChatWidget({ t }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  const quickReplies = useMemo(
    () => [
      t('landing.chat.quickReplies.pricing'),
      t('landing.chat.quickReplies.setup'),
      t('landing.chat.quickReplies.demo'),
    ],
    [t],
  );

  return (
    <div className="landing-chat-root">
      {open ? (
        <div className="landing-chat-panel" role="dialog" aria-label={t('landing.chat.title')}>
          <div className="landing-chat-header">
            <div className="landing-chat-brand">
              <span className="landing-chat-logo">
                <img src={logoMark} alt="" className="h-full w-full object-contain" />
              </span>
            </div>
            <button type="button" className="landing-chat-close" onClick={() => setOpen(false)} aria-label={t('landing.chat.close')}>
              <X size={18} />
            </button>
          </div>

          <div className="landing-chat-body">
            <div className="grid gap-2">
              {quickReplies.map((reply) => (
                <button key={reply} type="button" className="landing-chat-chip" onClick={() => setMessage(reply)}>
                  {reply}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="landing-chat-label">{t('landing.chat.label')}</span>
              <textarea
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t('landing.chat.placeholder')}
                className="landing-chat-input"
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <a href={buildWhatsAppLink(message)} target="_blank" rel="noreferrer" className="landing-chat-primary">
                <MessageCircle size={18} />
                {t('landing.chat.sendMessage')}
                <ArrowRight size={16} />
              </a>
              <a href={`tel:${contactPhone}`} className="landing-chat-secondary">
                <Phone size={18} />
                {t('landing.chat.callUs')}
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <button type="button" className="landing-live-chat" onClick={() => setOpen((prev) => !prev)} aria-label={t('landing.chat.launch')}>
        <span className="landing-live-chat-dot" />
        <MessageCircle size={18} />
        <span className="hidden sm:inline">{t('landing.chat.launch')}</span>
      </button>
    </div>
  );
}
