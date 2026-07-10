import { useEffect, useState } from 'react';
import { Alert, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';

export default function AccountingSettingsPage() {
  const { pushToast } = useInventoryApp();
  const [form, setForm] = useState({
    defaultCurrency: 'BDT',
    decimalPrecision: 2,
    voucherPrefix: 'JV',
    journalVoucherPrefix: 'JV',
    receiptVoucherPrefix: 'RV',
    paymentVoucherPrefix: 'PV',
    contraVoucherPrefix: 'CV',
    financialYearStart: '01-01',
    negativeCashPolicy: 'WARN',
    autoPostingEnabled: true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    inventoryApi.getAccountingSettings()
      .then((result) => {
        if (!cancelled && result.settings) {
          setForm((current) => ({ ...current, ...result.settings }));
        }
      })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load accounting settings.'); });
    return () => { cancelled = true; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await inventoryApi.updateAccountingSettings(form);
      setForm((current) => ({ ...current, ...(result.settings || {}) }));
      pushToast('success', 'Accounting Settings', 'Settings updated.');
    } catch (err) {
      setError(err?.message || 'Failed to save accounting settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionHeader eyebrow="Accounting" title="Accounting Settings" description="Voucher numbering, posting behavior, and accounting display settings reused across the ERP." />
      <form className="surface space-y-4 p-5" onSubmit={submit}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label><span className="label">Default Currency</span><input className="input" value={form.defaultCurrency} onChange={(e) => setForm((cur) => ({ ...cur, defaultCurrency: e.target.value }))} /></label>
          <label><span className="label">Decimal Precision</span><input type="number" min="0" max="6" className="input" value={form.decimalPrecision} onChange={(e) => setForm((cur) => ({ ...cur, decimalPrecision: Number(e.target.value) }))} /></label>
          <label><span className="label">Legacy Voucher Prefix</span><input className="input" value={form.voucherPrefix} onChange={(e) => setForm((cur) => ({ ...cur, voucherPrefix: e.target.value }))} /></label>
          <label><span className="label">Journal Voucher Prefix</span><input className="input" value={form.journalVoucherPrefix} onChange={(e) => setForm((cur) => ({ ...cur, journalVoucherPrefix: e.target.value }))} /></label>
          <label><span className="label">Receipt Voucher Prefix</span><input className="input" value={form.receiptVoucherPrefix} onChange={(e) => setForm((cur) => ({ ...cur, receiptVoucherPrefix: e.target.value }))} /></label>
          <label><span className="label">Payment Voucher Prefix</span><input className="input" value={form.paymentVoucherPrefix} onChange={(e) => setForm((cur) => ({ ...cur, paymentVoucherPrefix: e.target.value }))} /></label>
          <label><span className="label">Contra Voucher Prefix</span><input className="input" value={form.contraVoucherPrefix} onChange={(e) => setForm((cur) => ({ ...cur, contraVoucherPrefix: e.target.value }))} /></label>
          <label><span className="label">Financial Year Start (MM-DD)</span><input className="input" value={form.financialYearStart} onChange={(e) => setForm((cur) => ({ ...cur, financialYearStart: e.target.value }))} /></label>
          <label><span className="label">Negative Cash Policy</span><select className="input" value={form.negativeCashPolicy} onChange={(e) => setForm((cur) => ({ ...cur, negativeCashPolicy: e.target.value }))}><option value="ALLOW">Allow</option><option value="WARN">Warn</option><option value="BLOCK">Block</option></select></label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm xl:col-span-3"><input type="checkbox" checked={form.autoPostingEnabled} onChange={(e) => setForm((cur) => ({ ...cur, autoPostingEnabled: e.target.checked }))} /> Auto posting enabled</label>
        </div>
        <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button></div>
      </form>
    </div>
  );
}
