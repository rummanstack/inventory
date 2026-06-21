import { useMemo, useRef, useState } from 'react';
import { ArrowRight, MessageCircle, Phone, X } from 'lucide-react';
import logoMark from '../../../assets/stockledger-logo-mark.svg';
import { contactPhone, whatsappUrl } from '../constants.js';
import { getOrCreateVisitorToken, getVisitorToken } from '../lib/visitorIdentity.js';
import { visitorChatApi } from '../../../services/api/visitorChatApi.js';
import { usePolling } from '../../../hooks/usePolling.js';

function buildWhatsAppLink(message) {
  const text = message.trim() || 'Hi, I need help with StockLedger.';
  return `${whatsappUrl}?text=${encodeURIComponent(text)}`;
}

export default function LandingChatWidget({ t }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const visitorTokenRef = useRef(getVisitorToken());
  const afterIdRef = useRef(0);

  const quickReplies = useMemo(
    () => [
      t('landing.chat.quickReplies.pricing'),
      t('landing.chat.quickReplies.setup'),
      t('landing.chat.quickReplies.demo'),
    ],
    [t],
  );

  async function fetchMessages() {
    const token = visitorTokenRef.current;
    if (!token) {
      return;
    }

    try {
      const result = await visitorChatApi.listVisitorMessages({ visitorToken: token, afterId: afterIdRef.current });
      const incoming = result?.messages || [];
      if (incoming.length) {
        setMessages((current) => [...current, ...incoming]);
        afterIdRef.current = incoming[incoming.length - 1].id;
      }
    } catch {
      // Polling failures shouldn't interrupt the chat UI — it'll just retry on the next tick.
    }
  }

  usePolling(fetchMessages, 5000, { enabled: open });

  async function sendMessage() {
    const trimmed = message.trim();
    if (!trimmed || sending) {
      return;
    }

    setSending(true);
    setError('');
    try {
      const token = getOrCreateVisitorToken();
      visitorTokenRef.current = token;
      await visitorChatApi.sendVisitorMessage({ visitorToken: token, body: trimmed });
      setMessage('');
      await fetchMessages();
    } catch {
      setError(t('landing.chat.sendError'));
    } finally {
      setSending(false);
    }
  }

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
            {messages.length ? (
              <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                {messages.map((item) => (
                  <div
                    key={item.id}
                    className={`landing-chat-bubble ${item.senderRole === 'ADMIN' ? 'landing-chat-bubble-support' : 'landing-chat-bubble-visitor'}`}
                  >
                    {item.senderRole === 'ADMIN' ? <span className="landing-chat-avatar">SL</span> : null}
                    <p className="min-w-0 flex-1 text-sm font-medium text-slate-900">{item.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-2">
                {quickReplies.map((reply) => (
                  <button key={reply} type="button" className="landing-chat-chip" onClick={() => setMessage(reply)}>
                    {reply}
                  </button>
                ))}
              </div>
            )}

            <label className="block">
              <span className="landing-chat-label">{t('landing.chat.label')}</span>
              <textarea
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t('landing.chat.placeholder')}
                className="landing-chat-input"
              />
            </label>

            {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}

            <button type="button" className="landing-chat-primary" onClick={sendMessage} disabled={sending || !message.trim()}>
              <MessageCircle size={18} />
              {sending ? t('landing.chat.sending') : t('landing.chat.sendMessage')}
              <ArrowRight size={16} />
            </button>

            <div className="mt-1 border-t border-slate-100 pt-3">
              <p className="text-center text-xs font-semibold text-slate-400">{t('landing.chat.preferOtherChannel')}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <a href={buildWhatsAppLink(message)} target="_blank" rel="noreferrer" className="landing-chat-secondary h-10 text-xs">
                  <MessageCircle size={16} />
                  {t('landing.chat.openWhatsApp')}
                </a>
                <a href={`tel:${contactPhone}`} className="landing-chat-secondary h-10 text-xs">
                  <Phone size={16} />
                  {t('landing.chat.callUs')}
                </a>
              </div>
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
