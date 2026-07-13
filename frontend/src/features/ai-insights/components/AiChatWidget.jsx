import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Check, Copy, Loader2, PackageSearch, Send, Sparkles, UserRound, X } from 'lucide-react';
import { Badge, Select, cx } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useAiChatWidgetViewModel, QUICK_PROMPTS } from '../viewmodels/useAiChatWidgetViewModel.js';

function MessageContent({ content }) {
  return String(content || '').split('\n').map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={index} className="h-2" />;
    const isHeading = trimmed.endsWith(':') && trimmed.length < 80;
    const isBullet = /^[-*]\s+/.test(trimmed);
    return (
      // No explicit color here — inherits whatever the surrounding bubble set
      // (bubble text color already differs between user/assistant and light/dark).
      <p key={index} className={isHeading ? 'mt-2 font-extrabold first:mt-0' : isBullet ? 'pl-3' : ''}>
        {trimmed}
      </p>
    );
  });
}

function CopyMessageButton({ text }) {
  const { t } = useInventoryApp();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failures in unsupported browsers.
    }
  }

  const label = copied ? t('common.copied') : t('common.copy');

  return (
    <button
      type="button"
      className={cx(
        'mt-1.5 inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700',
        copied && 'text-emerald-600 hover:text-emerald-600',
      )}
      onClick={handleCopy}
      title={label}
      aria-label={label}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {label}
    </button>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={cx('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser ? (
        // Literal hex, not bg-slate-950 — the slate scale inverts in dark mode
        // (adaptive ink scale) while text-white stays genuinely white, so the
        // pair would turn into white-on-white. This chip must stay dark in
        // both themes.
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-[#1e293b] text-white shadow-crisp">
          <Bot size={16} />
        </div>
      ) : null}
      <div className={cx(
        'max-w-[82%] rounded-[20px] px-3.5 py-2.5 text-[13px] font-semibold leading-6 shadow-crisp',
        // Same literal-hex reasoning as the avatar chip above for the user bubble.
        isUser ? 'bg-[#1e293b] text-white' : 'border border-slate-100 bg-white text-slate-700',
      )}
      >
        <MessageContent content={message.content} />
        {message.meta ? (
          <p className={cx('mt-1.5 text-[11px]', isUser ? 'text-[#ffffffb3]' : 'text-slate-400')}>{message.meta}</p>
        ) : null}
        {!isUser ? <CopyMessageButton text={message.content} /> : null}
      </div>
    </div>
  );
}

function ContextPill({ active, icon: Icon, label, onClick, disabled }) {
  return (
    <button
      type="button"
      className={cx(
        'flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40',
        // Literal hex, not bg-slate-950 — see ChatBubble comment above.
        active ? 'bg-[#1e293b] text-white shadow-crisp' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

export default function AiChatWidget() {
  const { t, can, hasFeature } = useInventoryApp();
  const vm = useAiChatWidgetViewModel();
  const scrollRef = useRef(null);

  const visible = (can('view_retail_customers') || can('view_products')) && hasFeature('ai-assistant');

  useEffect(() => {
    if (vm.open) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [vm.open, vm.messages, vm.sending]);

  if (!visible) return null;

  function handleSubmit(event) {
    event.preventDefault();
    vm.sendMessage();
  }

  return (
    <>
      {vm.open ? (
        <div
          role="dialog"
          aria-label={t('aiChat.title')}
          className="panel-strong fixed bottom-20 right-6 z-50 flex w-[380px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[24px] shadow-modal max-lg:bottom-[calc(8.5rem+env(safe-area-inset-bottom))]"
          style={{ height: 'min(600px, calc(100vh - 8rem))' }}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-[linear-gradient(135deg,var(--secondary-strong),var(--brand-strong))] text-white shadow-crisp">
                <Sparkles size={17} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-950">{t('aiChat.title')}</p>
                {vm.status ? (
                  <Badge tone={vm.status.configured ? 'emerald' : 'amber'}>
                    {vm.status.configured ? t('aiChat.ready') : t('aiChat.notConfigured')}
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" className="icon-btn" title={t('aiChat.newChat')} onClick={vm.startNewChat} disabled={vm.sending}>
                <Sparkles size={15} />
              </button>
              <button type="button" className="icon-btn" title={t('common.close')} onClick={() => vm.setOpen(false)}>
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="shrink-0 space-y-2 border-b border-slate-100 px-4 py-3">
            <div className="flex gap-1.5">
              <ContextPill active={vm.contextType === 'general'} icon={Sparkles} label={t('aiChat.contextGeneral')} onClick={() => vm.setContextType('general')} />
              <ContextPill active={vm.contextType === 'customer'} icon={UserRound} label={t('aiChat.contextCustomer')} onClick={() => vm.setContextType('customer')} disabled={!vm.canUseCustomer} />
              <ContextPill active={vm.contextType === 'low-stock'} icon={PackageSearch} label={t('aiChat.contextLowStock')} onClick={() => vm.setContextType('low-stock')} disabled={!vm.canUseLowStock} />
            </div>
            {vm.contextType === 'customer' ? (
              <Select className="input h-9 text-xs" value={vm.customerId} onChange={(event) => vm.setCustomerId(event.target.value)} disabled={vm.loading || vm.sending}>
                {vm.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</option>
                ))}
              </Select>
            ) : null}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-4 py-4">
            {vm.error ? <p className="text-xs font-semibold text-rose-600">{vm.error}</p> : null}
            {vm.loading ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Loader2 size={15} className="animate-spin" /> {t('aiChat.loading')}</div>
            ) : null}
            {!vm.loading && vm.status && !vm.status.configured ? (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                {t('aiChat.geminiMissing')}
              </div>
            ) : null}
            {vm.messages.map((entry) => <ChatBubble key={entry.id} message={entry} />)}
            {vm.messages.length === 1 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_PROMPTS.map((prompt) => {
                  const disabled = (prompt.contextType === 'customer' && !vm.canUseCustomer) || (prompt.contextType === 'low-stock' && !vm.canUseLowStock);
                  return (
                    <button
                      key={prompt.label}
                      type="button"
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => vm.setPrompt(prompt)}
                      disabled={disabled}
                    >
                      {prompt.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {vm.sending ? (
              <div className="flex gap-2.5">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-[#1e293b] text-white shadow-crisp"><Bot size={16} /></div>
                <div className="rounded-[20px] border border-slate-100 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-500 shadow-crisp">
                  <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> {t('aiChat.thinking')}</span>
                </div>
              </div>
            ) : null}
            <div ref={scrollRef} />
          </div>

          <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-100 bg-white p-3">
            <div className="flex items-end gap-2 rounded-[22px] border border-slate-200 bg-slate-50 p-1.5 shadow-inner">
              <textarea
                className="min-h-10 max-h-28 flex-1 resize-none bg-transparent px-3 py-2 text-[13px] font-semibold leading-6 text-slate-900 outline-none placeholder:text-slate-400"
                value={vm.message}
                onChange={(event) => vm.setMessage(event.target.value)}
                placeholder={t('aiChat.placeholder')}
                disabled={vm.sending || !vm.status?.configured}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    vm.sendMessage();
                  }
                }}
              />
              <button type="submit" className="icon-btn shrink-0 bg-[#1e293b] text-white hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-50" disabled={!vm.message.trim() || vm.sending || !vm.status?.configured} aria-label={t('aiChat.send')}>
                {vm.sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className="fixed bottom-5 right-6 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--secondary-strong),var(--brand-strong))] text-white shadow-lg transition-all hover:brightness-105 active:scale-95 max-lg:bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
        onClick={() => vm.setOpen((current) => !current)}
        title={vm.open ? t('common.close') : t('aiChat.launch')}
        aria-label={vm.open ? t('common.close') : t('aiChat.launch')}
      >
        {vm.open ? <X size={22} /> : <Sparkles size={22} />}
      </button>
    </>
  );
}
