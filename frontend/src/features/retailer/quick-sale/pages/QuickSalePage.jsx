import { useEffect, useRef, useState } from 'react';
import { Clock3, Loader2, Play, Printer, Save, Square } from 'lucide-react';
import { Alert, Modal, SectionHeader } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { useTenantApiQuery } from '../../../../queries/useTenantApiQuery.js';
import { useMutation } from '@tanstack/react-query';
import { printRetailReceipt } from '../../../../services/receiptService.js';
import { formatCurrency, formatDateTime, formatNumber } from '../../../../utils/calculations.js';
import { useSalesInvoiceFormViewModel } from '../../sales-invoices/viewmodels/useSalesInvoiceFormViewModel';
import SalesInvoiceFormFields from '../../sales-invoices/components/SalesInvoiceFormFields';

const CASH_SESSION_SNAPSHOT_KEY = 'retail.cashSessionSnapshot';

function readCashSessionSnapshot() {
  try {
    const raw = window.localStorage.getItem(CASH_SESSION_SNAPSHOT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && parsed.id ? parsed : null;
  } catch {
    return null;
  }
}

function persistCashSessionSnapshot(session) {
  try {
    if (session) {
      window.localStorage.setItem(CASH_SESSION_SNAPSHOT_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(CASH_SESSION_SNAPSHOT_KEY);
    }
  } catch {
    // Ignore storage write failures.
  }
}

function mergeCashSessionSnapshots(primary, secondary) {
  if (!primary && !secondary) {
    return null;
  }

  if (!primary) {
    return secondary;
  }

  if (!secondary || primary.id !== secondary.id) {
    return primary;
  }

  const openingCash = Number(secondary.openingCash ?? primary.openingCash ?? 0);
  const cashSalesAmount = Number(primary.cashSalesAmount ?? secondary.cashSalesAmount ?? 0);
  const cashSalesCount = Number(primary.cashSalesCount ?? secondary.cashSalesCount ?? 0);
  const expectedCash = primary.closedAt || secondary.closedAt
    ? Number(primary.expectedCash ?? secondary.expectedCash ?? openingCash + cashSalesAmount)
    : openingCash + cashSalesAmount;

  return {
    ...secondary,
    ...primary,
    openingCash,
    cashSalesAmount,
    cashSalesCount,
    expectedCash,
    variance: primary.closedAt || secondary.closedAt
      ? Number(primary.variance ?? secondary.variance ?? 0)
      : 0,
    startedAt: secondary.startedAt ?? primary.startedAt,
    createdAt: secondary.createdAt ?? primary.createdAt,
    updatedAt: secondary.updatedAt ?? primary.updatedAt,
  };
}

function CashSessionAmountModal({
  open,
  title,
  description,
  label,
  confirmLabel,
  loading = false,
  initialValue,
  onClose,
  onConfirm,
}) {
  const { t } = useInventoryApp();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
    }
  }, [open, initialValue]);

  if (!open) {
    return null;
  }

  return (
    <Modal title={title} description={description} onClose={onClose} width="max-w-lg">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading) onConfirm(value);
        }}
      >
        <label className="block">
          <span className="label">{label}</span>
          <input
            className="input"
            type="number" inputMode="decimal"
            min="0"
            step="0.0001"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
          />
        </label>
        <div className="row-actions flex items-center justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {confirmLabel}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Enter</kbd>
          </button>
        </div>
      </form>
    </Modal>
  );
}

function QuickSaleForm({ onSaved }) {
  const { t, productDirectory, promotionDirectory, retailCustomerDirectory, saveSalesInvoice, saveRetailCustomer, tenant, pushToast, language } = useInventoryApp();
  const vm = useSalesInvoiceFormViewModel({
    products: productDirectory,
    promotions: promotionDirectory,
    retailCustomers: retailCustomerDirectory,
    defaultSaleType: 'RETAIL',
    defaultCustomerType: 'WALK_IN',
    defaultTaxRate: tenant?.taxRate || 0,
    loyaltyEnabled: tenant?.loyaltyEnabled || false,
    loyaltyPointsPer100: tenant?.loyaltyPointsPer100 ?? 1,
    loyaltyPointValue: tenant?.loyaltyPointValue ?? 1,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(event) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const inInput = tag === 'input' || tag === 'textarea' || tag === 'select';

      // / — focus first product search (only when not already in an input)
      if (event.key === '/' && !inInput) {
        event.preventDefault();
        document.querySelector('[data-role="product-search"]')?.focus();
      }

      // Ctrl+Enter — submit the sale
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function submitForm(event) {
    event.preventDefault();

    if (!vm.hasValidItems || vm.hasInvalidItems) {
      setError(t('retailer.shared.itemsRequired'));
      return;
    }
    if (vm.customerType === 'WALK_IN' && vm.dueAmount > 0) {
      setError(t('retailer.shared.walkInMustBePaid'));
      return;
    }
    if (vm.customerType === 'REGISTERED' && !vm.customerId && vm.dueAmount > 0) {
      setError(t('retailer.shared.dueRequiresCustomer'));
      return;
    }

    const receiptWindow = window.open('', '_blank', 'width=840,height=1060');
    if (receiptWindow) {
      receiptWindow.document.open();
      receiptWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${t('retailer.shared.receiptTitle')}</title><style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff;color:#111827;font-size:14px;}</style></head><body>${t('retailer.shared.preparingReceipt')}</body></html>`);
      receiptWindow.document.close();
      receiptWindow.focus();
    }

    setSaving(true);
    setError('');
    const result = await saveSalesInvoice(vm.buildPayload());
    setSaving(false);

    if (!result?.ok) {
      if (receiptWindow && !receiptWindow.closed) {
        receiptWindow.close();
      }
      setError(result?.message || t('retailer.shared.saveFailed'));
      return;
    }

    if (receiptWindow) {
      const printResult = await printRetailReceipt(result.salesInvoice, {
        businessName: tenant?.name || '',
        businessAddress: tenant?.address || '',
        businessPhone: tenant?.phone || '',
        businessEmail: tenant?.email || '',
        title: t('retailer.shared.receiptTitle'),
        language,
        receiptWindow,
      });

      if (!printResult.ok) {
        pushToast('error', t('retailer.shared.printReceiptFailed'), t('alerts.requestFailed'));
      }
    } else {
      pushToast('error', t('retailer.shared.printReceiptFailed'), t('alerts.requestFailed'));
    }

    await onSaved?.(result.salesInvoice);
  }

  return (
    <form ref={formRef} className="space-y-4" onSubmit={submitForm}>
      {error ? <Alert type="error">{error}</Alert> : null}
      <SalesInvoiceFormFields vm={vm} t={t} productDirectory={productDirectory} retailCustomerDirectory={retailCustomerDirectory} saving={saving} saveRetailCustomer={saveRetailCustomer} />
      <div className="flex items-center justify-between gap-3 pt-2 max-lg:sticky max-lg:bottom-[calc(3.75rem+env(safe-area-inset-bottom))] max-lg:z-10 max-lg:-mx-5 max-lg:mt-2 max-lg:border-t max-lg:border-slate-200 max-lg:bg-[rgb(var(--white))] max-lg:px-4 max-lg:py-3">
        <p className="text-xs text-slate-400 select-none max-lg:hidden">
          <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">/</kbd> search &nbsp;
          <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">Alt+I</kbd> add item &nbsp;
          <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">Ctrl+↵</kbd> submit
        </p>
        <div className="min-w-0 lg:hidden">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t('retailer.shared.totalAmount')}</p>
          <p className="truncate text-xl font-bold tabular-nums text-slate-950">{formatCurrency(vm.totalAmount)}</p>
        </div>
        <button type="submit" className="btn-primary max-lg:h-12 max-lg:flex-1 max-lg:justify-center" disabled={saving}>
          <Save size={18} />
          {saving ? t('common.saving') : t('retailer.quickSale.save')}
          <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200 max-lg:hidden">Ctrl+↵</kbd>
        </button>
      </div>
    </form>
  );
}

export default function QuickSalePage() {
  const { t, tenant, pushToast, language, hasFeature } = useInventoryApp();
  const cashSessionEnabled = hasFeature('retailer-cash-sessions');
  const [formKey, setFormKey] = useState(0);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [session, setSession] = useState(null);
  const [lastClosedSession, setLastClosedSession] = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [startCashInput, setStartCashInput] = useState('0');
  const [stopCashInput, setStopCashInput] = useState('0');
  const sessionQuery = useTenantApiQuery({
    scope: 'current-retail-cash-session',
    queryFn: () => inventoryApi.getCurrentRetailCashSession(),
    enabled: cashSessionEnabled,
  });
  const sessionMutation = useMutation({
    mutationFn: ({ action, sessionId, payload }) => action === 'start'
      ? inventoryApi.startRetailCashSession(payload)
      : inventoryApi.stopRetailCashSession(sessionId, payload),
  });
  const savingSession = sessionMutation.isPending;
  const sessionLoading = sessionQuery.isLoading || sessionQuery.isFetching;

  useEffect(() => {
    const snapshot = readCashSessionSnapshot();
    if (snapshot) {
      setSession(snapshot);
    }
  }, []);

  useEffect(() => {
    if (sessionQuery.data) {
      setSession(mergeCashSessionSnapshots(sessionQuery.data.session || null, readCashSessionSnapshot()));
      setSessionLoaded(true);
      setSessionError('');
    } else if (sessionQuery.error) {
      setSessionError(sessionQuery.error?.message || t('alerts.requestFailed'));
    }
  }, [sessionQuery.data, sessionQuery.error, t]);

  useEffect(() => {
    if (session) {
      persistCashSessionSnapshot(session);
    } else if (sessionLoaded) {
      persistCashSessionSnapshot(null);
    }
  }, [session, sessionLoaded]);

  async function loadSession() {
    if (!cashSessionEnabled) return;
    await sessionQuery.refetch();
  }

  async function handlePrintReceipt() {
    if (!lastInvoice) {
      return;
    }

    const result = await printRetailReceipt(lastInvoice, {
      businessName: tenant?.name || '',
      businessAddress: tenant?.address || '',
      businessPhone: tenant?.phone || '',
      businessEmail: tenant?.email || '',
      title: t('retailer.shared.receiptTitle'),
      language,
    });

    if (!result.ok) {
      pushToast('error', t('retailer.shared.printReceiptFailed'), t('alerts.requestFailed'));
    }
  }

  async function handleStartSession(value) {
    const openingCash = Math.max(0, Number(value || 0));
    if (!Number.isFinite(openingCash)) {
      setSessionError(t('retailer.cashSession.openingCashInvalid'));
      return;
    }

    try {
      setSessionError('');
      const result = await sessionMutation.mutateAsync({ action: 'start', payload: { openingCash } });
      setSession(mergeCashSessionSnapshots(result.session || null, {
        ...(result.session || {}),
        openingCash,
      }));
      setSessionLoaded(true);
      setLastClosedSession(null);
      setShowStartModal(false);
      pushToast('success', t('retailer.cashSession.title'), t('retailer.cashSession.startSuccess'));
    } catch (error) {
      const message = error?.message || t('retailer.cashSession.startFailed');
      setSessionError(message);
      pushToast('error', t('retailer.cashSession.title'), message);
    }
  }

  async function handleStopSession(value) {
    if (!session?.id) {
      return;
    }

    const countedCash = Math.max(0, Number(value || 0));
    if (!Number.isFinite(countedCash)) {
      setSessionError(t('retailer.cashSession.countedCashInvalid'));
      return;
    }

    try {
      setSessionError('');
      const result = await sessionMutation.mutateAsync({ action: 'stop', sessionId: session.id, payload: { countedCash } });
      setLastClosedSession(result.session || null);
      setSession(null);
      setSessionLoaded(true);
      persistCashSessionSnapshot(null);
      setShowStopModal(false);
      pushToast('success', t('retailer.cashSession.title'), t('retailer.cashSession.stopSuccess'));
    } catch (error) {
      const message = error?.message || t('retailer.cashSession.stopFailed');
      setSessionError(message);
      pushToast('error', t('retailer.cashSession.title'), message);
    }
  }

  // Ctrl+P — reprint last receipt; Alt+S — start/stop the cash session
  useEffect(() => {
    function handleKeyDown(event) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const inInput = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (event.key === 'p' && (event.ctrlKey || event.metaKey) && lastInvoice) {
        event.preventDefault();
        handlePrintReceipt();
      } else if (
        event.key.toLowerCase() === 's' && event.altKey && cashSessionEnabled
        && !inInput && !showStartModal && !showStopModal && !savingSession
      ) {
        event.preventDefault();
        if (session) {
          setStopCashInput(String(session.expectedCash || 0));
          setShowStopModal(true);
        } else {
          setStartCashInput('0');
          setShowStartModal(true);
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lastInvoice, cashSessionEnabled, session, showStartModal, showStopModal, savingSession]);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [session?.id]);

  function formatElapsed(startedAt) {
    if (!startedAt) return '00:00:00';
    const elapsed = Math.max(0, Math.floor((now - new Date(startedAt)) / 1000));
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  }

  const activeCashSales = session?.cashSalesAmount || 0;
  const expectedCash = session?.expectedCash || 0;

  return (
    <div className="space-y-6">
      <SectionHeader title={t('retailer.quickSale.title')} compact />

      {cashSessionEnabled && <div className="surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {t('retailer.cashSession.eyebrow')}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {t('retailer.cashSession.title')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-bold tabular-nums text-slate-700">
                <Clock3 size={15} className="text-slate-400" />
                {formatElapsed(session.startedAt)}
              </div>
            ) : null}
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (session) {
                  setStopCashInput(String(session.expectedCash || 0));
                  setShowStopModal(true);
                } else {
                  setStartCashInput('0');
                  setShowStartModal(true);
                }
              }}
              disabled={savingSession}
            >
              {savingSession ? <Loader2 size={18} className="animate-spin" /> : session ? <Square size={18} /> : <Play size={18} />}
              {savingSession
                ? session
                  ? t('retailer.cashSession.stopping')
                  : t('retailer.cashSession.starting')
                : session
                  ? t('retailer.cashSession.stop')
                  : t('retailer.cashSession.start')}
              <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+S</kbd>
            </button>
          </div>
        </div>

        {sessionError ? <Alert type="error" className="mt-4">{sessionError}</Alert> : null}

        {sessionLoading && !session ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-3 h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        ) : null}

        {session ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('retailer.cashSession.openedAt')}</p>
              <p className="mt-2 text-sm font-bold text-slate-950">{formatDateTime(session.startedAt)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('retailer.cashSession.openingCash')}</p>
              <p className="mt-2 text-sm font-bold text-slate-950">{formatCurrency(session.openingCash)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('retailer.cashSession.cashSales')}</p>
              <p className="mt-2 text-sm font-bold text-slate-950">
                {formatCurrency(activeCashSales)} / {formatNumber(session.cashSalesCount)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{t('retailer.cashSession.expectedCash')}</p>
              <p className="mt-2 text-sm font-bold text-slate-950">{formatCurrency(expectedCash)}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-500">
            {t('retailer.cashSession.noSession')}
          </div>
        )}

        {lastClosedSession ? (
          <Alert type="success" className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-950">{t('retailer.cashSession.closed')}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {t('retailer.cashSession.closedAt')}: {formatDateTime(lastClosedSession.closedAt)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {t('retailer.cashSession.openingCash')}: {formatCurrency(lastClosedSession.openingCash)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-600">
                  {t('retailer.cashSession.variance')}: {formatCurrency(lastClosedSession.variance)}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {t('retailer.cashSession.expectedCash')}: {formatCurrency(lastClosedSession.expectedCash)} / {t('retailer.cashSession.countedCash')}: {formatCurrency(lastClosedSession.countedCash)}
                </p>
              </div>
            </div>
          </Alert>
        ) : null}
      </div>}

      {lastInvoice ? (
        <Alert type="success">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{t('retailer.quickSale.lastInvoice', { number: lastInvoice.invoiceNumber })}</span>
            <button type="button" className="btn-secondary" onClick={handlePrintReceipt}>
              <Printer size={18} />
              {t('retailer.shared.printReceipt')}
              <kbd className="ml-1 rounded border border-slate-300 bg-white/70 px-1 py-0.5 font-mono text-[10px] text-slate-500">Ctrl+P</kbd>
            </button>
          </div>
        </Alert>
      ) : null}

      <div className="surface p-5">
        <QuickSaleForm
          key={formKey}
          onSaved={async (invoice) => {
            setLastInvoice(invoice);
            setFormKey((value) => value + 1);
            await loadSession();
          }}
        />
      </div>

      <CashSessionAmountModal
        open={showStartModal}
        title={t('retailer.cashSession.start')}
        description={t('retailer.cashSession.startDescription')}
        label={t('retailer.cashSession.openingCash')}
        confirmLabel={t('retailer.cashSession.start')}
        loading={savingSession}
        initialValue={startCashInput}
        onClose={() => setShowStartModal(false)}
        onConfirm={handleStartSession}
      />

      <CashSessionAmountModal
        open={showStopModal}
        title={t('retailer.cashSession.stop')}
        description={t('retailer.cashSession.stopDescription')}
        label={t('retailer.cashSession.countedCash')}
        confirmLabel={t('retailer.cashSession.stop')}
        loading={savingSession}
        initialValue={stopCashInput}
        onClose={() => setShowStopModal(false)}
        onConfirm={handleStopSession}
      />
    </div>
  );
}
