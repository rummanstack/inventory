import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bot, Loader2, PackageSearch, RefreshCw, Send, Sparkles, UserRound } from 'lucide-react';
import { Alert, Badge, EmptyState, SectionHeader, Select } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { formatCurrency, formatNumber } from '../../../utils/calculations.js';

const INITIAL_MESSAGES = [
  {
    id: 'welcome',
    role: 'assistant',
    content: 'I can help analyze customer behavior, due collection, repeat purchase risk, profit leakage, and low-stock priority. Select a context, then ask a direct business question.',
  },
];

const QUICK_PROMPTS = [
  { label: 'Customer health', contextType: 'customer', text: 'Analyze this customer like a retailer. Tell me purchase value, due risk, profit quality, and what I should do next.' },
  { label: 'Collection script', contextType: 'customer', text: 'Give me a polite due collection plan for this customer. Include timing, message tone, and risk level.' },
  { label: 'Next sale', contextType: 'customer', text: 'Based on this customer history, what should I recommend next and what discount should I avoid?' },
  { label: 'Low stock plan', contextType: 'low-stock', text: 'Prioritize my low-stock products. Tell me what to buy first, what can wait, and where margin risk exists.' },
  { label: 'Business coach', contextType: 'general', text: 'Act as my retail business coach. What should I check today to protect cash, stock, and profit?' },
];

function MessageContent({ content }) {
  return String(content || '').split('\n').map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={index} className="h-2" />;
    const isHeading = trimmed.endsWith(':') && trimmed.length < 80;
    const isBullet = /^[-*•]\s+/.test(trimmed);
    return (
      <p key={index} className={isHeading ? 'mt-3 font-extrabold text-slate-950 first:mt-0' : isBullet ? 'pl-3' : ''}>
        {trimmed}
      </p>
    );
  });
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser ? (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-slate-950 text-white shadow-crisp">
          <Bot size={18} />
        </div>
      ) : null}
      <div className={`max-w-[min(780px,88%)] rounded-[24px] px-4 py-3 text-sm font-semibold leading-7 shadow-crisp ${isUser ? 'bg-slate-950 text-white' : 'border border-slate-100 bg-white text-slate-750'}`}>
        <MessageContent content={message.content} />
        {message.meta ? <p className={`mt-2 text-xs ${isUser ? 'text-slate-300' : 'text-slate-400'}`}>{message.meta}</p> : null}
      </div>
    </div>
  );
}

function ContextPill({ active, icon: Icon, title, description, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`rounded-card border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'border-slate-950 bg-slate-950 text-white shadow-card' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:shadow-crisp'}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex items-center gap-3">
        <span className={`rounded-control p-2 ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}><Icon size={18} /></span>
        <span className="font-extrabold">{title}</span>
      </div>
      <p className={`mt-2 text-xs font-semibold leading-5 ${active ? 'text-slate-200' : 'text-slate-500'}`}>{description}</p>
    </button>
  );
}

export default function AiInsightsPage() {
  const { t, language, can, hasFeature } = useInventoryApp();
  const [status, setStatus] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [contextType, setContextType] = useState('general');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  const selectedCustomer = useMemo(() => customers.find((customer) => customer.id === customerId) || null, [customers, customerId]);
  const canUseCustomer = can('view_retail_customers') && hasFeature('retail-customers');
  const canUseLowStock = can('view_products') && hasFeature('low-stock-alerts');

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  async function loadInitial() {
    try {
      setLoading(true);
      setError('');
      const [statusResult, customerResultData] = await Promise.all([
        inventoryApi.getAiInsightStatus(),
        inventoryApi.getActiveRetailCustomers().catch(() => ({ items: [] })),
      ]);
      const rows = customerResultData.items || customerResultData.customers || [];
      setStatus(statusResult);
      setCustomers(rows);
      setCustomerId((current) => current || rows[0]?.id || '');
    } catch (requestError) {
      setError(requestError?.message || t('alerts.requestFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitial();
  }, []);

  function setPrompt(prompt) {
    if (prompt.contextType === 'customer' && !canUseCustomer) return;
    if (prompt.contextType === 'low-stock' && !canUseLowStock) return;
    setContextType(prompt.contextType);
    setMessage(prompt.text);
  }

  async function sendMessage(overrideText) {
    const text = String(overrideText ?? message).trim();
    if (!text || sending) return;
    if (contextType === 'customer' && !customerId) {
      setError('Select a customer before asking customer-context questions.');
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      meta: contextType === 'customer' && selectedCustomer ? `Customer: ${selectedCustomer.name}` : contextType === 'low-stock' ? 'Context: low stock' : 'Context: general',
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setMessage('');
    setSending(true);
    setError('');

    try {
      const result = await inventoryApi.sendAiChatMessage({
        message: text,
        contextType,
        customerId: contextType === 'customer' ? customerId : undefined,
        history: nextMessages.slice(-10).map((entry) => ({ role: entry.role, content: entry.content })),
      });
      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        meta: `${result.model || 'Gemini'} · ${result.usedContext || 'general'} context`,
      }]);
    } catch (requestError) {
      setMessages((current) => [...current, {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: requestError?.message || t('alerts.requestFailed'),
        meta: 'Request failed',
      }]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Gemini AI"
        title="AI Assistant"
        description="Chat with your business data using safe summarized context. Choose customer, stock, or general mode before asking."
        action={(
          <button type="button" className="btn-secondary" onClick={loadInitial} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Reload
          </button>
        )}
      />

      {error ? <Alert type="error">{error}</Alert> : null}
      {status && !status.configured ? <Alert type="warning">Gemini is not configured. Add GEMINI_API_KEY in backend/.env, then restart the backend.</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="section-title">Assistant Context</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">This controls what business data Gemini receives.</p>
            </div>
            <div className="space-y-3 p-5">
              <ContextPill active={contextType === 'general'} icon={Sparkles} title="General" description="No live records. Good for business coaching and feature guidance." onClick={() => setContextType('general')} />
              <ContextPill active={contextType === 'customer'} icon={UserRound} title="Customer" description="Uses selected customer purchase, due, profit, returns, loyalty, and installment summary." onClick={() => setContextType('customer')} disabled={!canUseCustomer} />
              <ContextPill active={contextType === 'low-stock'} icon={PackageSearch} title="Low Stock" description="Uses summarized low-stock products, reorder level, price, and margin estimate." onClick={() => setContextType('low-stock')} disabled={!canUseLowStock} />
            </div>
          </div>

          {contextType === 'customer' ? (
            <div className="surface p-5">
              <label className="block text-sm font-bold text-slate-700" htmlFor="ai-customer-select">Customer</label>
              <Select id="ai-customer-select" className="input mt-2 h-11" value={customerId} onChange={(event) => setCustomerId(event.target.value)} disabled={loading || sending}>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ''}</option>
                ))}
              </Select>
              {selectedCustomer ? (
                <div className="mt-4 grid gap-3 rounded-card border border-slate-100 bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between gap-3"><span className="font-semibold text-slate-500">Current Due</span><span className="font-bold text-slate-950">{formatCurrency(selectedCustomer.currentDue || 0, language)}</span></div>
                  <div className="flex justify-between gap-3"><span className="font-semibold text-slate-500">Total Spent</span><span className="font-bold text-slate-950">{formatCurrency(selectedCustomer.totalSpent || 0, language)}</span></div>
                  <div className="flex justify-between gap-3"><span className="font-semibold text-slate-500">Points</span><span className="font-bold text-slate-950">{formatNumber(selectedCustomer.loyaltyPointsBalance || 0, language)}</span></div>
                </div>
              ) : <p className="mt-3 text-sm font-semibold text-slate-500">No active customers found.</p>}
            </div>
          ) : null}

          <div className="surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Quick Prompts</h2>
              {status?.configured ? <Badge tone="emerald">Ready</Badge> : <Badge tone="amber">No key</Badge>}
            </div>
            <div className="mt-4 space-y-2">
              {QUICK_PROMPTS.map((prompt) => {
                const disabled = (prompt.contextType === 'customer' && !canUseCustomer) || (prompt.contextType === 'low-stock' && !canUseLowStock);
                return (
                  <button key={prompt.label} type="button" className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setPrompt(prompt)} disabled={disabled}>
                    {prompt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="surface flex min-h-[720px] flex-col overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="section-title">Conversation</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Ask follow-up questions. The last messages are sent back as conversation memory.</p>
              </div>
              <button type="button" className="btn-secondary py-2 text-xs" onClick={() => setMessages(INITIAL_MESSAGES)} disabled={sending}>New Chat</button>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-5">
            {loading ? (
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading assistant...</div>
            ) : null}
            {!loading && !status?.configured ? (
              <EmptyState title="Gemini key missing" description="Add GEMINI_API_KEY in backend/.env and restart backend to use chat." icon={AlertTriangle} />
            ) : null}
            {messages.map((entry) => <ChatBubble key={entry.id} message={entry} />)}
            {sending ? (
              <div className="flex gap-3">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-slate-950 text-white shadow-crisp"><Bot size={18} /></div>
                <div className="rounded-[24px] border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-crisp">
                  <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Thinking with your selected context...</span>
                </div>
              </div>
            ) : null}
            <div ref={scrollRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-100 bg-white p-4">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-2 shadow-inner">
              <textarea
                className="min-h-24 w-full resize-none bg-transparent px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none placeholder:text-slate-400"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask: Which customer is risky? What should I collect first? Which low stock product should I buy?"
                disabled={sending || !status?.configured}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1">
                <p className="text-xs font-semibold text-slate-500">Mode: {contextType === 'customer' && selectedCustomer ? `Customer · ${selectedCustomer.name}` : contextType === 'low-stock' ? 'Low Stock' : 'General'}</p>
                <button type="submit" className="btn-primary disabled:cursor-not-allowed disabled:opacity-60" disabled={!message.trim() || sending || !status?.configured}>
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Send
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
