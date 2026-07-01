import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, History, Loader2, MessageSquarePlus, RefreshCw, ShieldQuestion, Sparkles, Ticket, TriangleAlert, Users } from 'lucide-react';
import { Alert, Badge, EmptyState, Modal, SectionHeader, StatCard, StatCardSkeleton, TableSkeleton, Select } from '../../../components/ui.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatDateTime, formatNumber } from '../../../utils/calculations.js';

const TAB_KEYS = ['tickets', 'escalations', 'knowledge', 'reports'];
const STATUS_KEYS = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
const PRIORITY_KEYS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const CATEGORY_KEYS = ['INVOICE_ISSUE', 'PAYMENT_MISMATCH', 'STOCK_CORRECTION', 'RETURN_REFUND', 'LOYALTY_ISSUE', 'PRINTER_ISSUE', 'LOGIN_ISSUE', 'APP_DEVICE_ISSUE', 'DATA_CORRECTION', 'OTHER'];

function ticketAgeDays(ticket) {
  const created = new Date(ticket.createdAt);
  if (Number.isNaN(created.getTime())) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000));
}

function getStatusTone(status) {
  switch (status) {
    case 'URGENT':
      return 'rose';
    case 'HIGH':
      return 'amber';
    case 'IN_PROGRESS':
      return 'blue';
    case 'WAITING_CUSTOMER':
      return 'slate';
    case 'RESOLVED':
      return 'emerald';
    case 'CLOSED':
      return 'emerald';
    default:
      return 'slate';
  }
}

function isUrgentTicket(ticket) {
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    return false;
  }
  return ticket.priority === 'URGENT' || (ticket.priority === 'HIGH' && ticketAgeDays(ticket) >= 2);
}

function isEscalationCandidate(ticket) {
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    return false;
  }
  return isUrgentTicket(ticket) || ticket.status === 'WAITING_CUSTOMER';
}

function buildTimeline(ticket, t, language) {
  const timeline = [
    {
      id: `${ticket.id}-created`,
      label: t('helpDesk.timelineCreated'),
      value: formatDateTime(ticket.createdAt, language),
      tone: 'slate',
    },
    {
      id: `${ticket.id}-updated`,
      label: t('helpDesk.timelineUpdated'),
      value: formatDateTime(ticket.updatedAt, language),
      tone: 'blue',
    },
  ];

  if (ticket.closedAt) {
    timeline.push({
      id: `${ticket.id}-closed`,
      label: t('helpDesk.timelineClosed'),
      value: formatDateTime(ticket.closedAt, language),
      tone: 'emerald',
    });
  }

  if (ticket.escalatedAt) {
    timeline.push({
      id: `${ticket.id}-escalated`,
      label: t('helpDesk.timelineEscalated'),
      value: formatDateTime(ticket.escalatedAt, language),
      tone: 'rose',
    });
  }

  return timeline;
}

function TicketEditorModal({ ticket, onClose, onSave }) {
  const { t } = useInventoryApp();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subject: ticket?.subject || '',
    category: ticket?.category || 'OTHER',
    priority: ticket?.priority || 'MEDIUM',
    status: ticket?.status || 'OPEN',
    customerName: ticket?.customerName || '',
    customerPhone: ticket?.customerPhone || '',
    referenceNumber: ticket?.referenceNumber || '',
    channel: ticket?.channel || 'IN_APP',
    description: ticket?.description || '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ticket) {
      return;
    }
    setForm({
      subject: ticket.subject || '',
      category: ticket.category || 'OTHER',
      priority: ticket.priority || 'MEDIUM',
      status: ticket.status || 'OPEN',
      customerName: ticket.customerName || '',
      customerPhone: ticket.customerPhone || '',
      referenceNumber: ticket.referenceNumber || '',
      channel: ticket.channel || 'IN_APP',
      description: ticket.description || '',
    });
  }, [ticket]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.subject.trim()) {
      setError(t('helpDesk.requiredSubject'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await onSave(form);
      if (!result?.ok) {
        setError(result?.message || t('alerts.requestFailed'));
      }
    } catch (error) {
      setError(error?.message || t('alerts.requestFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={ticket ? t('helpDesk.editTicket') : t('helpDesk.newTicket')}
      description={t('helpDesk.modalDescription')}
      onClose={onClose}
      width="max-w-3xl"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="label">{t('helpDesk.subject')}</span>
            <input className="input" value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} />
          </label>
          <label className="block">
            <span className="label">{t('helpDesk.category')}</span>
            <Select className="input" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}>
              {CATEGORY_KEYS.map((category) => (
                <option key={category} value={category}>{t(`helpDesk.categories.${category}`)}</option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="label">{t('helpDesk.priority')}</span>
            <Select className="input" value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}>
              {PRIORITY_KEYS.map((priority) => (
                <option key={priority} value={priority}>{t(`helpDesk.priorities.${priority}`)}</option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="label">{t('helpDesk.status')}</span>
            <Select className="input" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              {STATUS_KEYS.map((status) => (
                <option key={status} value={status}>{t(`helpDesk.statuses.${status}`)}</option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="label">{t('helpDesk.channel')}</span>
            <Select className="input" value={form.channel} onChange={(event) => setForm((prev) => ({ ...prev, channel: event.target.value }))}>
              {['IN_APP', 'PHONE', 'WHATSAPP', 'EMAIL'].map((channel) => (
                <option key={channel} value={channel}>{t(`helpDesk.channels.${channel}`)}</option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="label">{t('helpDesk.customerName')}</span>
            <input className="input" value={form.customerName} onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))} />
          </label>
          <label className="block">
            <span className="label">{t('helpDesk.customerPhone')}</span>
            <input className="input" value={form.customerPhone} onChange={(event) => setForm((prev) => ({ ...prev, customerPhone: event.target.value }))} />
          </label>
          <label className="block">
            <span className="label">{t('helpDesk.referenceNumber')}</span>
            <input className="input" value={form.referenceNumber} onChange={(event) => setForm((prev) => ({ ...prev, referenceNumber: event.target.value }))} />
          </label>
          <label className="block md:col-span-2">
            <span className="label">{t('helpDesk.description')}</span>
            <textarea className="input min-h-[120px] resize-y" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          </label>
        </div>
        <div className="row-actions flex items-center justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {ticket ? t('common.save') : t('helpDesk.createTicket')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function HelpDeskTicketRow({ ticket, active, onSelect, t, language }) {
  const ageDays = ticketAgeDays(ticket);
  return (
    <button
      type="button"
      className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${active ? 'border-[var(--secondary)] bg-[var(--secondary-soft)]/50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
      onClick={onSelect}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold text-slate-950">{ticket.ticketNumber}</p>
          <p className="text-sm font-semibold text-slate-700">{ticket.subject}</p>
        </div>
        <Badge tone={getStatusTone(ticket.priority)}>{t(`helpDesk.priorities.${ticket.priority}`)}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
        <span>{t(`helpDesk.categories.${ticket.category}`)}</span>
        <span>|</span>
        <span>{t(`helpDesk.statuses.${ticket.status}`)}</span>
        <span>|</span>
        <span>{ticket.customerName || t('helpDesk.walkInCustomer')}</span>
        <span>|</span>
        <span>{formatNumber(ageDays, language)} {t('helpDesk.daysAgo')}</span>
      </div>
    </button>
  );
}

export default function HelpDeskPage() {
  const { t, tenant, user, language, pushToast } = useInventoryApp();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('tickets');
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);

  function applyTicket(nextTicket) {
    setTickets((current) => {
      const exists = current.some((ticket) => ticket.id === nextTicket.id);
      if (!exists) {
        return [nextTicket, ...current];
      }
      return current.map((ticket) => (ticket.id === nextTicket.id ? nextTicket : ticket));
    });
    setSelectedTicketId(nextTicket.id);
  }

  async function refreshTickets() {
    setLoading(true);
    setLoadError('');
    try {
      const result = await inventoryApi.listHelpDeskTickets();
      const loaded = Array.isArray(result.items) ? result.items : [];
      setTickets(loaded);
      setSelectedTicketId((current) => {
        if (current && loaded.some((ticket) => ticket.id === current)) {
          return current;
        }
        return loaded[0]?.id || '';
      });
    } catch (error) {
      const message = error?.message || t('alerts.requestFailed');
      setLoadError(message);
      pushToast('error', t('alerts.unableToLoad'), message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshTickets();
  }, [tenant?.id, user?.id]);

  const stats = useMemo(() => {
    const openTickets = tickets.filter((ticket) => ticket.status === 'OPEN').length;
    const inProgress = tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length;
    const waiting = tickets.filter((ticket) => ticket.status === 'WAITING_CUSTOMER').length;
    const resolved = tickets.filter((ticket) => ticket.status === 'RESOLVED' || ticket.status === 'CLOSED').length;
    const urgent = tickets.filter(isUrgentTicket).length;

    return {
      total: tickets.length,
      openTickets,
      inProgress,
      waiting,
      resolved,
      urgent,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      // Keep the ticket you're actively viewing visible even if a status
      // change just moved it out of the active filter, so the detail panel
      // never silently jumps to a different ticket mid-action.
      if (ticket.id === selectedTicketId) {
        return true;
      }

      if (activeTab === 'escalations' && !isEscalationCandidate(ticket)) {
        return false;
      }

      if (statusFilter && ticket.status !== statusFilter) {
        return false;
      }
      if (priorityFilter && ticket.priority !== priorityFilter) {
        return false;
      }
      if (categoryFilter && ticket.category !== categoryFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }

      return [
        ticket.ticketNumber,
        ticket.subject,
        ticket.customerName,
        ticket.customerPhone,
        ticket.referenceNumber,
        ticket.description,
        ticket.assigneeName,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    });
  }, [tickets, activeTab, statusFilter, priorityFilter, categoryFilter, search, selectedTicketId]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || filteredTickets[0] || null,
    [tickets, filteredTickets, selectedTicketId],
  );

  useEffect(() => {
    if (!selectedTicket && filteredTickets.length) {
      setSelectedTicketId(filteredTickets[0].id);
    }
  }, [selectedTicket, filteredTickets]);

  async function createOrUpdateTicket(payload) {
    try {
      const request = editingTicket
        ? inventoryApi.updateHelpDeskTicket({ ...editingTicket, ...payload })
        : inventoryApi.createHelpDeskTicket(payload);
      const result = await request;
      if (!result?.ticket) {
        throw new Error(t('alerts.requestFailed'));
      }

      applyTicket(result.ticket);
      setEditorOpen(false);
      setEditingTicket(null);
      pushToast('success', t('helpDesk.title'), editingTicket ? t('alerts.updated') : t('alerts.created'));
      return { ok: true };
    } catch (error) {
      const message = error?.message || t('alerts.requestFailed');
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function addNote(ticketId) {
    const body = draftNote.trim();
    if (!body) {
      return;
    }

    try {
      const result = await inventoryApi.addHelpDeskTicketNote(ticketId, body);
      if (!result?.ticket) {
        throw new Error(t('alerts.requestFailed'));
      }

      applyTicket(result.ticket);
      setDraftNote('');
      pushToast('success', t('helpDesk.addNote'), t('alerts.updated'));
    } catch (error) {
      const message = error?.message || t('alerts.requestFailed');
      pushToast('error', t('helpDesk.addNote'), message);
    }
  }

  async function transitionTicket(ticketId, nextStatus, options = {}) {
    try {
      const result = await inventoryApi.transitionHelpDeskTicket(ticketId, {
        status: nextStatus,
        priority: options.priority,
        assigneeId: options.assigneeId,
        assigneeName: options.assigneeName,
        escalated: Boolean(options.escalated),
        note: options.note,
      });
      if (!result?.ticket) {
        throw new Error(t('alerts.requestFailed'));
      }

      applyTicket(result.ticket);
      if (options.note) {
        setDraftNote('');
      }
      pushToast('success', t('helpDesk.title'), t('alerts.updated'));
    } catch (error) {
      const message = error?.message || t('alerts.requestFailed');
      pushToast('error', t('helpDesk.title'), message);
    }
  }

  function openNewTicket() {
    setEditingTicket(null);
    setEditorOpen(true);
  }

  function openEditTicket(ticket) {
    setEditingTicket(ticket);
    setEditorOpen(true);
  }

  const faqItems = [
    {
      title: t('helpDesk.faq.invoiceTitle'),
      description: t('helpDesk.faq.invoiceDescription'),
      icon: Ticket,
    },
    {
      title: t('helpDesk.faq.paymentTitle'),
      description: t('helpDesk.faq.paymentDescription'),
      icon: AlertCircle,
    },
    {
      title: t('helpDesk.faq.stockTitle'),
      description: t('helpDesk.faq.stockDescription'),
      icon: Sparkles,
    },
    {
      title: t('helpDesk.faq.loginTitle'),
      description: t('helpDesk.faq.loginDescription'),
      icon: ShieldQuestion,
    },
  ];

  const reportRows = [
    { label: t('helpDesk.reports.totalTickets'), value: stats.total },
    { label: t('helpDesk.reports.openTickets'), value: stats.openTickets },
    { label: t('helpDesk.reports.inProgressTickets'), value: stats.inProgress },
    { label: t('helpDesk.reports.waitingTickets'), value: stats.waiting },
    { label: t('helpDesk.reports.resolvedTickets'), value: stats.resolved },
    { label: t('helpDesk.reports.urgentTickets'), value: stats.urgent },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={t('nav.helpDesk')}
        title={t('helpDesk.title')}
        description={t('helpDesk.description')}
        action={(
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={openNewTicket}>
              <MessageSquarePlus size={16} />
              {t('helpDesk.newTicket')}
            </button>
            <button type="button" className="btn-secondary" onClick={refreshTickets}>
              <RefreshCw size={16} />
              {t('helpDesk.reload')}
            </button>
          </div>
        )}
      />

      {loadError ? <Alert type="error">{loadError}</Alert> : null}

      {loading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => <StatCardSkeleton key={index} />)}
          </div>
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="h-4 w-48 animate-pulse rounded-full bg-slate-200" />
            </div>
            <TableSkeleton rows={6} columns={5} />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard title={t('helpDesk.reports.totalTickets')} value={formatNumber(stats.total, language)} icon={Users} tone="slate" />
            <StatCard title={t('helpDesk.reports.openTickets')} value={formatNumber(stats.openTickets, language)} icon={TriangleAlert} tone="rose" />
            <StatCard title={t('helpDesk.reports.inProgressTickets')} value={formatNumber(stats.inProgress, language)} icon={History} tone="blue" />
            <StatCard title={t('helpDesk.reports.waitingTickets')} value={formatNumber(stats.waiting, language)} icon={CalendarClock} tone="amber" />
            <StatCard title={t('helpDesk.reports.urgentTickets')} value={formatNumber(stats.urgent, language)} icon={Sparkles} tone="emerald" />
          </div>

          <div className="surface overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {TAB_KEYS.map((tabKey) => (
                    <button
                      key={tabKey}
                      type="button"
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === tabKey ? 'bg-[var(--secondary)] text-white shadow-[0_14px_28px_var(--secondary-shadow)]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      onClick={() => setActiveTab(tabKey)}
                    >
                      {t(`helpDesk.tabs.${tabKey}`)}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select className="input h-10 w-40" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="">{t('helpDesk.filters.allStatuses')}</option>
                    {STATUS_KEYS.map((status) => (
                      <option key={status} value={status}>{t(`helpDesk.statuses.${status}`)}</option>
                    ))}
                  </Select>
                  <Select className="input h-10 w-40" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                    <option value="">{t('helpDesk.filters.allPriorities')}</option>
                    {PRIORITY_KEYS.map((priority) => (
                      <option key={priority} value={priority}>{t(`helpDesk.priorities.${priority}`)}</option>
                    ))}
                  </Select>
                  <Select className="input h-10 w-44" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                    <option value="">{t('helpDesk.filters.allCategories')}</option>
                    {CATEGORY_KEYS.map((category) => (
                      <option key={category} value={category}>{t(`helpDesk.categories.${category}`)}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('helpDesk.searchPlaceholder')} />
              </div>
            </div>

            <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="border-b border-slate-100 xl:border-b-0 xl:border-r">
                <div className="max-h-[42rem] overflow-y-auto p-4 space-y-3">
                  {filteredTickets.length ? filteredTickets.map((ticket) => (
                    <HelpDeskTicketRow
                      key={ticket.id}
                      ticket={ticket}
                      active={selectedTicket?.id === ticket.id}
                      onSelect={() => setSelectedTicketId(ticket.id)}
                      t={t}
                      language={language}
                    />
                  )) : (
                    <EmptyState title={t('helpDesk.noMatchesTitle')} description={t('helpDesk.noMatchesDescription')} icon={Ticket} />
                  )}
                </div>
              </div>

              <div className="space-y-0">
                {activeTab === 'knowledge' ? (
                  <div className="p-5">
                    <div className="grid gap-4">
                      {faqItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.title} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-start gap-3">
                              <div className="rounded-2xl bg-white p-2 text-[var(--secondary-strong)] ring-1 ring-slate-200">
                                <Icon size={18} />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-slate-950">{item.title}</h3>
                                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : activeTab === 'reports' ? (
                  <div className="p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {reportRows.map((row) => (
                        <div key={row.label} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{row.label}</p>
                          <p className="mt-2 text-3xl font-black text-slate-950">{formatNumber(row.value, language)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-600">{t('helpDesk.reports.summary')}</p>
                      <p className="mt-1 text-sm text-slate-500">{t('helpDesk.reports.summaryDescription')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-5">
                    {selectedTicket ? (
                      <div className="space-y-4">
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge tone={getStatusTone(selectedTicket.priority)}>{t(`helpDesk.priorities.${selectedTicket.priority}`)}</Badge>
                                <Badge tone={getStatusTone(selectedTicket.status)}>{t(`helpDesk.statuses.${selectedTicket.status}`)}</Badge>
                              </div>
                              <h3 className="mt-3 text-lg font-black text-slate-950">{selectedTicket.subject}</h3>
                              <p className="mt-1 text-sm text-slate-600">{selectedTicket.ticketNumber}</p>
                            </div>
                            <button type="button" className="btn-secondary h-9 px-3" onClick={() => openEditTicket(selectedTicket)}>
                              {t('helpDesk.editTicket')}
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-slate-600">{t('helpDesk.customer')}</span>
                              <span className="font-black text-slate-950">{selectedTicket.customerName || t('helpDesk.walkInCustomer')}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-slate-600">{t('helpDesk.channel')}</span>
                              <span className="font-black text-slate-950">{t(`helpDesk.channels.${selectedTicket.channel}`)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-slate-600">{t('helpDesk.referenceNumber')}</span>
                              <span className="font-black text-slate-950">{selectedTicket.referenceNumber || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-slate-600">{t('helpDesk.assignee')}</span>
                              <span className="font-black text-slate-950">{selectedTicket.assigneeName || t('helpDesk.unassigned')}</span>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{t('helpDesk.description')}</p>
                            <p className="mt-2 text-sm text-slate-700">{selectedTicket.description || '-'}</p>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {!(selectedTicket.status === 'IN_PROGRESS' && selectedTicket.assigneeId === user?.id) ? (
                              <button type="button" className="btn-secondary h-9 px-3" onClick={() => transitionTicket(selectedTicket.id, 'IN_PROGRESS', { assigneeId: user?.id || '', assigneeName: user?.name || t('helpDesk.systemUser'), note: t('helpDesk.notes.assignedToMe') })}>
                                {t('helpDesk.assignToMe')}
                              </button>
                            ) : null}
                            {selectedTicket.status !== 'IN_PROGRESS' ? (
                              <button type="button" className="btn-secondary h-9 px-3" onClick={() => transitionTicket(selectedTicket.id, 'IN_PROGRESS', { note: t('helpDesk.notes.markInProgress') })}>
                                {t('helpDesk.markInProgress')}
                              </button>
                            ) : null}
                            {selectedTicket.status !== 'WAITING_CUSTOMER' ? (
                              <button type="button" className="btn-secondary h-9 px-3" onClick={() => transitionTicket(selectedTicket.id, 'WAITING_CUSTOMER', { note: t('helpDesk.notes.waitingCustomer') })}>
                                {t('helpDesk.waitingCustomer')}
                              </button>
                            ) : null}
                            {selectedTicket.status !== 'RESOLVED' ? (
                              <button type="button" className="btn-secondary h-9 px-3" onClick={() => transitionTicket(selectedTicket.id, 'RESOLVED', { note: t('helpDesk.notes.resolved') })}>
                                {t('helpDesk.resolve')}
                              </button>
                            ) : null}
                            {selectedTicket.status !== 'CLOSED' ? (
                              <button type="button" className="btn-secondary h-9 px-3" onClick={() => transitionTicket(selectedTicket.id, 'CLOSED', { note: t('helpDesk.notes.closed') })}>
                                {t('helpDesk.closeTicket')}
                              </button>
                            ) : null}
                            {selectedTicket.status !== 'OPEN' ? (
                              <button type="button" className="btn-secondary h-9 px-3" onClick={() => transitionTicket(selectedTicket.id, 'OPEN', { note: t('helpDesk.notes.reopened') })}>
                                {t('helpDesk.reopen')}
                              </button>
                            ) : null}
                            {selectedTicket.priority !== 'URGENT' ? (
                              <button type="button" className="btn-primary h-9 px-3" onClick={() => transitionTicket(selectedTicket.id, 'IN_PROGRESS', { priority: 'URGENT', escalated: true, note: t('helpDesk.notes.escalated') })}>
                                {t('helpDesk.escalate')}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                          <h4 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">{t('helpDesk.timelineTitle')}</h4>
                          <div className="mt-3 space-y-2">
                            {buildTimeline(selectedTicket, t, language).map((entry) => (
                              <div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                                <span className="text-sm font-semibold text-slate-600">{entry.label}</span>
                                <span className="text-sm font-bold text-slate-950">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                          <h4 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">{t('helpDesk.notesTitle')}</h4>
                          <div className="mt-3 space-y-2">
                            {(selectedTicket.notes || []).map((note) => (
                              <div key={note.id} className="rounded-2xl bg-slate-50 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm font-bold text-slate-950">{note.authorName || '-'}</span>
                                  <span className="text-xs font-semibold text-slate-500">{formatDateTime(note.createdAt, language)}</span>
                                </div>
                                <p className="mt-1 text-sm text-slate-600">{note.body}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3">
                            <textarea
                              className="input min-h-[92px] resize-y"
                              value={draftNote}
                              onChange={(event) => setDraftNote(event.target.value)}
                              placeholder={t('helpDesk.addNotePlaceholder')}
                            />
                            <div className="mt-2 flex justify-end">
                              <button type="button" className="btn-primary" onClick={() => addNote(selectedTicket.id)}>
                                {t('helpDesk.addNote')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmptyState title={t('helpDesk.noSelectionTitle')} description={t('helpDesk.noSelectionDescription')} icon={Ticket} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {activeTab === 'escalations' ? (
            <div className="surface overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="section-title">{t('helpDesk.escalationsTitle')}</h2>
                    <p className="mt-1 text-sm text-slate-500">{t('helpDesk.escalationsDescription')}</p>
                  </div>
                  <Badge tone="rose">{formatNumber(stats.urgent, language)}</Badge>
                </div>
              </div>
              <div className="grid gap-4 p-5 lg:grid-cols-3">
                {tickets.filter(isEscalationCandidate).map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left hover:bg-white"
                    onClick={() => setSelectedTicketId(ticket.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={getStatusTone(ticket.priority)}>{t(`helpDesk.priorities.${ticket.priority}`)}</Badge>
                      <span className="text-xs font-semibold text-slate-500">{formatNumber(ticketAgeDays(ticket), language)} {t('helpDesk.daysAgo')}</span>
                    </div>
                    <p className="mt-2 font-bold text-slate-950">{ticket.subject}</p>
                    <p className="mt-1 text-sm text-slate-600">{ticket.customerName || t('helpDesk.walkInCustomer')}</p>
                  </button>
                ))}
                {!tickets.some(isEscalationCandidate) ? (
                  <EmptyState title={t('helpDesk.noEscalationsTitle')} description={t('helpDesk.noEscalationsDescription')} icon={CheckCircle2} />
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'tickets' ? (
            <div className="surface overflow-hidden">
              <div className="border-t border-slate-100 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-500">{t('helpDesk.quickActionHint')}</p>
                  <button type="button" className="btn-secondary h-9 px-3" onClick={openNewTicket}>
                    <ArrowRight size={16} />
                    {t('helpDesk.newTicket')}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      {editorOpen ? (
        <TicketEditorModal
          ticket={editingTicket}
          onClose={() => {
            setEditorOpen(false);
            setEditingTicket(null);
          }}
          onSave={createOrUpdateTicket}
        />
      ) : null}
    </div>
  );
}

