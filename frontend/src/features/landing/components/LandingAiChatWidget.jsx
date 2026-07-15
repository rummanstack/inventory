import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { stockLedgerLogoIcon } from '../../../assets/brandAssets.js';
import { landingChatApi } from '../../../services/api/landingChatApi.js';

const COMPOSER_MIN_HEIGHT = 44;
const COMPOSER_MAX_HEIGHT = 120;

function MessageContent({ content }) {
  return String(content || '').split('\n').map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={index} className="h-2" />;
    return <p key={index}>{trimmed}</p>;
  });
}

export default function LandingAiChatWidget({ t }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = `${COMPOSER_MIN_HEIGHT}px`;
    node.style.height = `${Math.min(COMPOSER_MAX_HEIGHT, Math.max(COMPOSER_MIN_HEIGHT, node.scrollHeight))}px`;
  }, [message]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [open, messages.length, sending]);

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

  async function sendMessage(overrideText) {
    const text = String(overrideText ?? message).trim();
    if (!text || sending) return;

    const userMessage = { id: `user-${Date.now()}`, role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setMessage('');
    setSending(true);
    setError('');

    try {
      const result = await landingChatApi.sendLandingChatMessage({
        message: text,
        history: nextMessages.slice(-8).map((entry) => ({ role: entry.role, content: entry.content })),
      });
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: result.answer }]);
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
                <img loading="lazy" decoding="async" src={stockLedgerLogoIcon} alt="" className="h-full w-full object-contain" />
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
                    {isAssistant ? (
                      <span className="landing-chat-avatar">
                        <Sparkles size={15} className="text-[var(--brand-strong)]" />
                      </span>
                    ) : null}
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
            {sending ? (
              <div className="flex items-start gap-2">
                <span className="landing-chat-avatar">
                  <Sparkles size={15} className="text-[var(--brand-strong)]" />
                </span>
                <div className="landing-chat-bubble landing-chat-bubble-support">{t('landing.chat.thinking')}</div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          {!messages.length ? (
            <div className="landing-chat-quickreplies">
              <p className="landing-chat-quickreplies-label">{t('landing.chat.quickRepliesLabel')}</p>
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply) => (
                  <button key={reply} type="button" className="landing-chat-chip" onClick={() => sendMessage(reply)} disabled={sending}>
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
              disabled={sending}
            />
            <button type="button" className="landing-chat-send-btn" onClick={() => sendMessage()} disabled={sending || !message.trim()} aria-label={t('landing.chat.sendMessage')}>
              <Send size={17} />
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={`landing-live-chat ${open ? '' : 'landing-live-chat-idle'}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? t('landing.chat.close') : t('landing.chat.launch')}
      >
        {open ? (
          <X size={18} />
        ) : (
          <>
            <Sparkles size={18} />
            <span className="hidden sm:inline">{t('landing.chat.launch')}</span>
          </>
        )}
      </button>
    </div>
  );
}
