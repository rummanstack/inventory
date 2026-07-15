import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, User, X } from 'lucide-react';
import { stockLedgerLogoIcon } from '../../../assets/brandAssets.js';
import { landingChatApi } from '../../../services/api/landingChatApi.js';

const COMPOSER_MIN_HEIGHT = 44;
const COMPOSER_MAX_HEIGHT = 120;
const REVEAL_CHARS_PER_TICK = 4;
const REVEAL_TICK_MS = 18;

// Defensive cleanup: the assistant is instructed to avoid markdown, but models
// sometimes slip in **bold** or stray `*`/`-` bullets anyway. This chat only
// renders plain text, so bold markers become real emphasis and bullet lines
// get a clean dot instead of a literal asterisk showing up in the bubble.
function renderInline(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${keyPrefix}-${index}`}>{part}</span>;
  });
}

function MessageContent({ content }) {
  return String(content || '').split('\n').map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={index} className="h-2" />;
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)/);
    if (bulletMatch) {
      return (
        <p key={index} className="flex gap-2 pl-0.5">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
          <span>{renderInline(bulletMatch[1], index)}</span>
        </p>
      );
    }
    return <p key={index}>{renderInline(trimmed, index)}</p>;
  });
}

export default function LandingAiChatWidget({ t }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const revealTimerRef = useRef(null);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = `${COMPOSER_MIN_HEIGHT}px`;
    node.style.height = `${Math.min(COMPOSER_MAX_HEIGHT, Math.max(COMPOSER_MIN_HEIGHT, node.scrollHeight))}px`;
  }, [message]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [open, messages, awaitingResponse]);

  useEffect(() => () => {
    if (revealTimerRef.current) clearInterval(revealTimerRef.current);
  }, []);

  useEffect(() => {
    if (!open || statusLoaded) return;
    setStatusLoaded(true);
    landingChatApi.getLandingChatStatus()
      .then(setStatus)
      .catch(() => setStatus({ configured: false }));
  }, [open, statusLoaded]);

  const quickReplies = [
    t('landing.chat.quickReplies.pricing'),
    t('landing.chat.quickReplies.features'),
    t('landing.chat.quickReplies.setup'),
    t('landing.chat.quickReplies.demo'),
  ];

  function revealAnswer(fullText) {
    return new Promise((resolve) => {
      const text = String(fullText || '');
      const id = `assistant-${Date.now()}`;
      setMessages((current) => [...current, { id, role: 'assistant', content: '' }]);

      if (!text) {
        resolve();
        return;
      }

      let index = 0;
      revealTimerRef.current = setInterval(() => {
        index = Math.min(text.length, index + REVEAL_CHARS_PER_TICK);
        setMessages((current) => current.map((entry) => (entry.id === id ? { ...entry, content: text.slice(0, index) } : entry)));
        if (index >= text.length) {
          clearInterval(revealTimerRef.current);
          revealTimerRef.current = null;
          resolve();
        }
      }, REVEAL_TICK_MS);
    });
  }

  async function sendMessage(overrideText) {
    const text = String(overrideText ?? message).trim();
    if (!text || busy) return;

    const userMessage = { id: `user-${Date.now()}`, role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setMessage('');
    setBusy(true);
    setAwaitingResponse(true);
    setError('');

    try {
      const result = await landingChatApi.sendLandingChatMessage({
        message: text,
        history: nextMessages.slice(-8).map((entry) => ({ role: entry.role, content: entry.content })),
      });
      setAwaitingResponse(false);
      await revealAnswer(result.answer);
    } catch {
      setAwaitingResponse(false);
      setError(t('landing.chat.sendError'));
    } finally {
      setBusy(false);
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
                <img loading="lazy" decoding="async" src={stockLedgerLogoIcon} alt="" className="h-full w-full object-contain" />
                <span className="landing-chat-logo-badge"><Sparkles size={11} /></span>
              </span>
              <div>
                <p className="landing-chat-agent-name">{t('landing.chat.assistantName')}</p>
                <p className="landing-chat-agent-status">
                  <span className="landing-chat-status-dot" />
                  {status && !status.configured ? t('landing.chat.statusOffline') : t('landing.chat.statusReady')}
                </p>
              </div>
            </div>
            <button type="button" className="landing-chat-close" onClick={() => setOpen(false)} aria-label={t('landing.chat.close')}>
              <X size={18} />
            </button>
          </div>

          <div className="landing-chat-messages">
            {messages.length ? (
              messages.map((item) => {
                const isAssistant = item.role === 'assistant';
                return (
                  <div key={item.id} className={`flex items-end gap-2 ${isAssistant ? '' : 'flex-row-reverse'}`}>
                    <span className={`landing-chat-avatar ${isAssistant ? '' : 'landing-chat-avatar-user'}`}>
                      {isAssistant ? <Sparkles size={15} className="text-[var(--brand-strong)]" /> : <User size={14} className="text-white" />}
                    </span>
                    <div className="flex max-w-[78%] flex-col gap-1">
                      <div className={`landing-chat-bubble ${isAssistant ? 'landing-chat-bubble-support' : 'landing-chat-bubble-visitor'}`}>
                        <MessageContent content={item.content} />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-start gap-2">
                <span className="landing-chat-avatar">
                  <Sparkles size={15} className="text-[var(--brand-strong)]" />
                </span>
                <div className="landing-chat-bubble landing-chat-bubble-support">{t('landing.chat.greeting')}</div>
              </div>
            )}
            {awaitingResponse ? (
              <div className="flex items-start gap-2">
                <span className="landing-chat-avatar">
                  <Sparkles size={15} className="text-[var(--brand-strong)]" />
                </span>
                <div className="landing-chat-bubble landing-chat-bubble-support inline-flex items-center gap-1.5 py-3">
                  <span className="sr-only">{t('landing.chat.thinking')}</span>
                  <span className="landing-chat-typing-dot" style={{ animationDelay: '-0.3s' }} />
                  <span className="landing-chat-typing-dot" style={{ animationDelay: '-0.15s' }} />
                  <span className="landing-chat-typing-dot" />
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          {!messages.length ? (
            <div className="landing-chat-quickreplies">
              <p className="landing-chat-quickreplies-label">{t('landing.chat.quickRepliesLabel')}</p>
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply) => (
                  <button key={reply} type="button" className="landing-chat-chip" onClick={() => sendMessage(reply)} disabled={busy}>
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <p className="px-4 pb-1 text-xs font-semibold text-rose-600">{error}</p> : null}
          {status && !status.configured ? <p className="px-4 pb-1 text-xs font-semibold text-amber-600">{t('landing.chat.notConfigured')}</p> : null}

          <div className="landing-chat-composer">
            <textarea
              ref={textareaRef}
              rows={1}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder={t('landing.chat.placeholder')}
              className="landing-chat-input"
              disabled={busy}
            />
            <button type="button" className="landing-chat-send-btn" onClick={() => sendMessage()} disabled={busy || !message.trim()} aria-label={t('landing.chat.sendMessage')}>
              <Send size={17} />
            </button>
          </div>
        </div>
      ) : null}

      {!open ? (
        <button
          type="button"
          className="landing-live-chat landing-live-chat-idle"
          onClick={() => setOpen(true)}
          aria-label={t('landing.chat.launch')}
        >
          <Sparkles size={18} />
          <span className="hidden sm:inline">{t('landing.chat.launch')}</span>
        </button>
      ) : null}
    </div>
  );
}
