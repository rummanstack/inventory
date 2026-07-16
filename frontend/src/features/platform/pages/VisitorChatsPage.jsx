import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, MessageCircle, RefreshCw, Send } from 'lucide-react';
import { Alert, Badge, EmptyState, SectionHeader, Select } from '../../../components/ui.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { usePolling } from '../../../hooks/usePolling.js';
import { formatDateTime } from '../../../utils/calculations.js';
import { useTenantApiQuery } from '../../../queries/useTenantApiQuery.js';
import { useMutation } from '@tanstack/react-query';

function VisitorChatRow({ chat, active, onSelect, t, language }) {
  return (
    <button
      type="button"
      className={`w-full rounded-card border px-4 py-3 text-left transition ${active ? 'border-[var(--secondary)] bg-[var(--secondary-soft)]/50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
      onClick={onSelect}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-slate-950">{chat.visitorName || t('visitorChats.anonymousVisitor')}</p>
        {chat.unreadForAdmin ? <Badge tone="rose">{t('visitorChats.unread')}</Badge> : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
        <span>{t(`visitorChats.statuses.${chat.status}`)}</span>
        <span>|</span>
        <span>{chat.lastMessageAt ? formatDateTime(chat.lastMessageAt, language) : '-'}</span>
      </div>
    </button>
  );
}

export default function VisitorChatsPage() {
  const { t, language, pushToast } = useInventoryApp();
  const [chats, setChats] = useState([]);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [selectedChatId, setSelectedChatId] = useState('');
  const [messages, setMessages] = useState([]);
  const [draftReply, setDraftReply] = useState('');
  const afterIdRef = useRef(0);
  const markedReadRef = useRef('');
  const chatMutation = useMutation({
    mutationFn: ({ action, chatId, body }) => {
      if (action === 'read') return inventoryApi.markVisitorChatRead(chatId);
      if (action === 'reply') return inventoryApi.postVisitorChatReply(chatId, body);
      return inventoryApi.closeVisitorChat(chatId);
    },
  });
  const sending = chatMutation.isPending && chatMutation.variables?.action === 'reply';
  const chatsQuery = useTenantApiQuery({
    scope: 'platform-visitor-chats',
    params: { statusFilter },
    queryFn: () => inventoryApi.listVisitorChats({ status: statusFilter || undefined }),
    requireTenant: false,
  });
  const messagesQuery = useTenantApiQuery({
    scope: 'platform-visitor-chat-messages',
    params: { selectedChatId },
    queryFn: () => inventoryApi.listVisitorChatMessages(selectedChatId, 0),
    enabled: Boolean(selectedChatId),
    requireTenant: false,
  });
  const loading = chatsQuery.isLoading || chatsQuery.isFetching;
  const loadError = chatsQuery.error?.message || '';
  const refreshChats = () => chatsQuery.refetch();

  useEffect(() => {
      const result = chatsQuery.data;
      const loaded = Array.isArray(result?.items) ? result.items : [];
      setChats(loaded);
      setSelectedChatId((current) => {
        if (current && loaded.some((chat) => chat.id === current)) {
          return current;
        }
        return loaded[0]?.id || '';
      });
  }, [chatsQuery.data]);

  useEffect(() => {
    afterIdRef.current = 0;
    setMessages([]);
    if (!selectedChatId) {
      return;
    }

    if (messagesQuery.data) {
      (async () => {
      try {
        const loaded = messagesQuery.data?.messages || [];
        setMessages(loaded);
        afterIdRef.current = loaded.length ? loaded[loaded.length - 1].id : 0;
        if (markedReadRef.current !== selectedChatId) {
          markedReadRef.current = selectedChatId;
          await chatMutation.mutateAsync({ action: 'read', chatId: selectedChatId });
          setChats((current) => current.map((chat) => (chat.id === selectedChatId ? { ...chat, unreadForAdmin: false } : chat)));
        }
      } catch (error) {
        pushToast('error', t('alerts.requestFailed'), error?.message || t('alerts.requestFailed'));
      }
      })();
    }
  }, [selectedChatId, messagesQuery.data]);

  async function pollSelectedChatMessages() {
    if (!selectedChatId) {
      return;
    }
    try {
      const result = await inventoryApi.listVisitorChatMessages(selectedChatId, afterIdRef.current);
      const incoming = result?.messages || [];
      if (incoming.length) {
        setMessages((current) => [...current, ...incoming]);
        afterIdRef.current = incoming[incoming.length - 1].id;
      }
    } catch {
      // Silent — retried on the next poll tick.
    }
  }

  usePolling(pollSelectedChatMessages, 1500, { enabled: Boolean(selectedChatId) });

  async function sendReply() {
    const body = draftReply.trim();
    if (!body || !selectedChatId || sending) {
      return;
    }

    try {
      await chatMutation.mutateAsync({ action: 'reply', chatId: selectedChatId, body });
      setDraftReply('');
      await pollSelectedChatMessages();
    } catch (error) {
      pushToast('error', t('visitorChats.replyFailed'), error?.message || t('alerts.requestFailed'));
    }
  }

  async function closeChat(chatId) {
    try {
      const result = await chatMutation.mutateAsync({ action: 'close', chatId });
      setChats((current) => current.map((chat) => (chat.id === chatId ? result.chat : chat)));
      pushToast('success', t('visitorChats.title'), t('visitorChats.closed'));
    } catch (error) {
      pushToast('error', t('alerts.requestFailed'), error?.message || t('alerts.requestFailed'));
    }
  }

  const selectedChat = chats.find((chat) => chat.id === selectedChatId) || null;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={t('nav.visitorChats')}
        title={t('visitorChats.title')}
        description={t('visitorChats.description')}
        action={(
          <button type="button" className="btn-secondary" onClick={refreshChats}>
            <RefreshCw size={16} />
            {t('visitorChats.reload')}
          </button>
        )}
      />

      {loadError ? <Alert type="error">{loadError}</Alert> : null}

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <Select className="input h-10 w-44" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">{t('visitorChats.filters.all')}</option>
            <option value="OPEN">{t('visitorChats.statuses.OPEN')}</option>
            <option value="CLOSED">{t('visitorChats.statuses.CLOSED')}</option>
          </Select>
        </div>

        <div className="grid gap-0 xl:grid-cols-[1fr_1.2fr]">
          <div className="border-b border-slate-100 xl:border-b-0 xl:border-r">
            <div className="max-h-[42rem] space-y-3 overflow-y-auto p-4">
              {loading ? (
                <div className="h-4 w-48 animate-pulse rounded-full bg-slate-200" />
              ) : chats.length ? (
                chats.map((chat) => (
                  <VisitorChatRow
                    key={chat.id}
                    chat={chat}
                    active={selectedChatId === chat.id}
                    onSelect={() => setSelectedChatId(chat.id)}
                    t={t}
                    language={language}
                  />
                ))
              ) : (
                <EmptyState title={t('visitorChats.noMatchesTitle')} description={t('visitorChats.noMatchesDescription')} icon={MessageCircle} />
              )}
            </div>
          </div>

          <div className="p-5">
            {selectedChat ? (
              <div className="flex h-full flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{selectedChat.visitorName || t('visitorChats.anonymousVisitor')}</p>
                    <p className="text-sm text-slate-500">{selectedChat.visitorPhone || '-'}</p>
                  </div>
                  {selectedChat.status !== 'CLOSED' ? (
                    <button type="button" className="btn-secondary h-9 px-3" onClick={() => closeChat(selectedChat.id)}>
                      <CheckCircle2 size={16} />
                      {t('visitorChats.markClosed')}
                    </button>
                  ) : null}
                </div>

                <div className="max-h-[26rem] flex-1 space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-4">
                  {messages.length ? messages.map((item) => (
                    <div
                      key={item.id}
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm font-medium ${item.senderRole === 'ADMIN' ? 'ml-auto bg-[var(--secondary)] text-white' : 'bg-white text-slate-900 ring-1 ring-slate-200'}`}
                    >
                      <p>{item.body}</p>
                      <p className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${item.senderRole === 'ADMIN' ? 'text-white/70' : 'text-slate-400'}`}>
                        {formatDateTime(item.createdAt, language)}
                      </p>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500">{t('visitorChats.noMessages')}</p>
                  )}
                </div>

                <div className="flex items-end gap-2">
                  <textarea
                    className="input min-h-[60px] flex-1 resize-y"
                    value={draftReply}
                    onChange={(event) => setDraftReply(event.target.value)}
                    placeholder={t('visitorChats.replyPlaceholder')}
                  />
                  <button type="button" className="btn-primary h-10" onClick={sendReply} disabled={sending || !draftReply.trim()}>
                    <Send size={16} />
                    {t('visitorChats.reply')}
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState title={t('visitorChats.noSelectionTitle')} description={t('visitorChats.noSelectionDescription')} icon={MessageCircle} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

