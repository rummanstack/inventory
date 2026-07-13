import { useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';

const INITIAL_MESSAGES = [
  {
    id: 'welcome',
    role: 'assistant',
    content: 'I can help analyze customer behavior, due collection, repeat purchase risk, profit leakage, and low-stock priority. Select a context, then ask a direct business question.',
  },
];

export const QUICK_PROMPTS = [
  { label: 'Customer health', contextType: 'customer', text: 'Analyze this customer like a retailer. Tell me purchase value, due risk, profit quality, and what I should do next.' },
  { label: 'Collection script', contextType: 'customer', text: 'Give me a polite due collection plan for this customer. Include timing, message tone, and risk level.' },
  { label: 'Next sale', contextType: 'customer', text: 'Based on this customer history, what should I recommend next and what discount should I avoid?' },
  { label: 'Low stock plan', contextType: 'low-stock', text: 'Prioritize my low-stock products. Tell me what to buy first, what can wait, and where margin risk exists.' },
  { label: 'Business coach', contextType: 'general', text: 'Act as my retail business coach. What should I check today to protect cash, stock, and profit?' },
];

export function useAiChatWidgetViewModel() {
  const { t, can, hasFeature } = useInventoryApp();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [contextType, setContextType] = useState('general');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const selectedCustomer = useMemo(() => customers.find((customer) => customer.id === customerId) || null, [customers, customerId]);
  const canUseCustomer = can('view_retail_customers') && hasFeature('retail-customers');
  const canUseLowStock = can('view_products') && hasFeature('low-stock-alerts');

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
      setLoaded(true);
    }
  }

  // Loaded lazily on first open, not on mount — the widget is now mounted
  // globally for the whole session, so there is no natural "page visit" moment
  // to trigger this from.
  useEffect(() => {
    if (open && !loaded) {
      loadInitial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loaded]);

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
      setError(t('aiChat.selectCustomerFirst'));
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      meta: contextType === 'customer' && selectedCustomer ? `${t('aiChat.contextCustomer')}: ${selectedCustomer.name}` : contextType === 'low-stock' ? t('aiChat.contextLowStock') : t('aiChat.contextGeneral'),
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
        meta: t('aiChat.requestFailed'),
      }]);
    } finally {
      setSending(false);
    }
  }

  function startNewChat() {
    setMessages(INITIAL_MESSAGES);
    setError('');
  }

  return {
    open,
    setOpen,
    status,
    customers,
    customerId,
    setCustomerId,
    selectedCustomer,
    contextType,
    setContextType,
    message,
    setMessage,
    messages,
    loading,
    sending,
    error,
    canUseCustomer,
    canUseLowStock,
    setPrompt,
    sendMessage,
    startNewChat,
  };
}
