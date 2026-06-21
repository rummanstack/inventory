import { useMemo, useRef, useState } from 'react';
import { MessageCircle, Phone, Send, X } from 'lucide-react';
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

  usePolling(fetchMessages, 1500, { enabled: open });

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

  function handleComposerKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
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
              <div>
                <p className="landing-chat-agent-name">{t('landing.chat.team')}</p>
                <p className="landing-chat-agent-status">
                  <span className="landing-chat-status-dot" />
                  {t('landing.chat.statusOnline')}
                </p>
              </div>
            </div>
            <button type="button" className="landing-chat-close" onClick={() => setOpen(false)} aria-label={t('landing.chat.close')}>
              <X size={18} />
            </button>
          </div>

          <div className="landing-chat-messages">
            {messages.length ? (
              messages.map((item) => (
                <div
                  key={item.id}
                  className={`landing-chat-bubble ${item.senderRole === 'ADMIN' ? 'landing-chat-bubble-support' : 'landing-chat-bubble-visitor'}`}
                >
                  {item.body}
                </div>
              ))
            ) : (
              <div className="flex items-start gap-2">
                <span className="landing-chat-avatar">SL</span>
                <div className="landing-chat-bubble landing-chat-bubble-support">{t('landing.chat.greeting')}</div>
              </div>
            )}
          </div>

          {!messages.length ? (
            <div className="landing-chat-quickreplies">
              {quickReplies.map((reply) => (
                <button key={reply} type="button" className="landing-chat-chip" onClick={() => setMessage(reply)}>
                  {reply}
                </button>
              ))}
            </div>
          ) : null}

          {error ? <p className="px-4 pb-1 text-xs font-semibold text-rose-600">{error}</p> : null}

          <div className="landing-chat-composer">
            <textarea
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={t('landing.chat.placeholder')}
              className="landing-chat-input"
            />
            <button type="button" className="landing-chat-send-btn" onClick={sendMessage} disabled={sending || !message.trim()} aria-label={t('landing.chat.sendMessage')}>
              <Send size={17} />
            </button>
          </div>

          <div className="landing-chat-fallback">
            <a href={buildWhatsAppLink(message)} target="_blank" rel="noreferrer" className="landing-chat-fallback-link">
              <MessageCircle size={13} />
              {t('landing.chat.openWhatsApp')}
            </a>
            <span className="h-3 w-px bg-slate-200" />
            <a href={`tel:${contactPhone}`} className="landing-chat-fallback-link">
              <Phone size={13} />
              {t('landing.chat.callUs')}
            </a>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="landing-live-chat"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? t('landing.chat.close') : t('landing.chat.launch')}
      >
        {open ? (
          <X size={18} />
        ) : (
          <>
            <span className="landing-live-chat-dot" />
            <MessageCircle size={18} />
            <span className="hidden sm:inline">{t('landing.chat.launch')}</span>
          </>
        )}
      </button>
    </div>
  );
}
