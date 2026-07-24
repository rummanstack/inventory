import { useEffect, useState } from 'react';
import {
  Award,
  Building2,
  Car,
  FileCheck2,
  Landmark,
  Lock,
  Loader2,
  MapPin,
  Palette,
  Percent,
  Pill,
  Save,
  ShoppingBasket,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { Alert, Avatar, Badge, SectionHeader, cx } from '../../../components/ui.jsx';
import PhotoUploadField from '../../../components/PhotoUploadField.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';
import { useMutation } from '@tanstack/react-query';

const BUSINESS_TYPE_ICONS = {
  ELECTRONICS: Smartphone,
  GROCERY: ShoppingBasket,
  DRUG_PHARMACY: Pill,
  VEHICLE: Car,
};

const BUSINESS_TYPE_LABEL_KEYS = {
  ELECTRONICS: 'orgSettings.businessTypeElectronics',
  GROCERY: 'orgSettings.businessTypeGrocery',
  DRUG_PHARMACY: 'orgSettings.businessTypeDrugPharmacy',
  VEHICLE: 'orgSettings.businessTypeVehicle',
};

function TextField({ label, value, onChange, disabled, placeholder, type = 'text', className = '' }) {
  return (
    <label className={cx('block', className)}>
      <span className="label">{label}</span>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
    </label>
  );
}

function DocumentField({ label, value, onChange, disabled }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mt-1.5">
        <PhotoUploadField compact value={value} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}

function PanelHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--secondary-soft)] text-[var(--secondary-strong)]">
        <Icon size={17} />
      </div>
      <div>
        <h2 className="section-title">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  address: '',
  logoUrl: '',
  taxRate: '0',
  loyaltyEnabled: false,
  loyaltyPointsPer100: '1',
  loyaltyPointValue: '1',
  businessType: 'ELECTRONICS',
  whatsappPhone: '',
  district: '',
  websiteUrl: '',
  facebookUrl: '',
  tradeLicenseNumber: '',
  binNumber: '',
  tinNumber: '',
  tradeLicenseFileUrl: '',
  binCertificateFileUrl: '',
  tinCertificateFileUrl: '',
  bankName: '',
  bankAccountName: '',
  bankAccountNumber: '',
  bankBranch: '',
  bkashNumber: '',
  nagadNumber: '',
  invoiceFooterNote: '',
  signatureImageUrl: '',
  receiptFooterMessage: '',
  drugLicenseNumber: '',
  dealerRegistrationNumber: '',
  drugLicenseFileUrl: '',
  dealerRegistrationFileUrl: '',
};

function formFromTenant(tenant) {
  return {
    name: tenant.name || '',
    email: tenant.email || '',
    phone: tenant.phone || '',
    address: tenant.address || '',
    logoUrl: tenant.logoUrl || '',
    taxRate: String(Number(tenant.taxRate || 0)),
    loyaltyEnabled: Boolean(tenant.loyaltyEnabled),
    loyaltyPointsPer100: String(Number(tenant.loyaltyPointsPer100 ?? 1)),
    loyaltyPointValue: String(Number(tenant.loyaltyPointValue ?? 1)),
    businessType: tenant.businessType || 'ELECTRONICS',
    whatsappPhone: tenant.whatsappPhone || '',
    district: tenant.district || '',
    websiteUrl: tenant.websiteUrl || '',
    facebookUrl: tenant.facebookUrl || '',
    tradeLicenseNumber: tenant.tradeLicenseNumber || '',
    binNumber: tenant.binNumber || '',
    tinNumber: tenant.tinNumber || '',
    tradeLicenseFileUrl: tenant.tradeLicenseFileUrl || '',
    binCertificateFileUrl: tenant.binCertificateFileUrl || '',
    tinCertificateFileUrl: tenant.tinCertificateFileUrl || '',
    bankName: tenant.bankName || '',
    bankAccountName: tenant.bankAccountName || '',
    bankAccountNumber: tenant.bankAccountNumber || '',
    bankBranch: tenant.bankBranch || '',
    bkashNumber: tenant.bkashNumber || '',
    nagadNumber: tenant.nagadNumber || '',
    invoiceFooterNote: tenant.invoiceFooterNote || '',
    signatureImageUrl: tenant.signatureImageUrl || '',
    receiptFooterMessage: tenant.receiptFooterMessage || '',
    drugLicenseNumber: tenant.drugLicenseNumber || '',
    dealerRegistrationNumber: tenant.dealerRegistrationNumber || '',
    drugLicenseFileUrl: tenant.drugLicenseFileUrl || '',
    dealerRegistrationFileUrl: tenant.dealerRegistrationFileUrl || '',
  };
}

export default function OrgSettingsPage() {
  const { tenant, user, t, setTenant, pushToast } = useInventoryApp();
  const [form, setForm] = useState(() => (tenant ? formFromTenant(tenant) : EMPTY_FORM));
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const settingsMutation = useMutation({
    mutationFn: (payload) => inventoryApi.updateOrgSettings(payload),
  });
  const saving = settingsMutation.isPending;

  useEffect(() => {
    if (!tenant) return;
    setForm(formFromTenant(tenant));
  }, [tenant]);

  if (!tenant) return null;

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      const result = await settingsMutation.mutateAsync(form);
      if (result?.tenant) {
        setTenant((current) => (current ? { ...current, ...result.tenant } : result.tenant));
      }
      pushToast('success', t('orgSettings.title'), t('orgSettings.saveSuccess'));
    } catch (err) {
      const message = err?.message || t('orgSettings.saveFailed');
      setError(message);
      pushToast('error', t('alerts.requestFailed'), message);
    }
  }

  const canEdit = user?.role === 'super_admin';
  const BusinessTypeIcon = BUSINESS_TYPE_ICONS[form.businessType] || Building2;
  const businessTypeLabel = t(BUSINESS_TYPE_LABEL_KEYS[form.businessType] || BUSINESS_TYPE_LABEL_KEYS.ELECTRONICS);

  const tabs = [
    { id: 'general', label: t('orgSettings.tabGeneral'), icon: Building2 },
    { id: 'contact', label: t('orgSettings.sectionContact'), icon: MapPin },
    { id: 'legal', label: t('orgSettings.sectionLegal'), icon: FileCheck2 },
    { id: 'payments', label: t('orgSettings.sectionPayments'), icon: Wallet },
    { id: 'branding', label: t('orgSettings.sectionBranding'), icon: Palette },
    { id: 'tax', label: t('orgSettings.tabTax'), icon: Percent },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={t('orgSettings.eyebrow')}
        title={t('orgSettings.title')}
        description={t('orgSettings.description', { name: tenant.name })}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? <Alert type="error">{error}</Alert> : null}

        {/* Identity summary card */}
        <div className="surface flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={tenant.name} imageUrl={form.logoUrl} size={56} />
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-950">{tenant.name}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge tone="blue">
                  <BusinessTypeIcon size={12} className="mr-1 inline -mt-0.5" />
                  {businessTypeLabel}
                </Badge>
                <span className="text-xs font-medium text-slate-400">
                  {t('orgSettings.orgCode')}: <span className="font-mono font-bold text-slate-600">{tenant.slug}</span>
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {t('orgSettings.plan')}: <span className="font-bold text-slate-600">{tenant.plan}</span>
                </span>
              </div>
            </div>
          </div>
          {canEdit ? (
            <button type="submit" className="btn-primary w-full justify-center sm:w-auto" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? t('common.saving') : t('common.save')}
            </button>
          ) : null}
        </div>

        {/* Tab nav */}
        <div className="no-print overflow-x-auto">
          <div className="inline-flex min-w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:min-w-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={cx(
                    'flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-bold transition sm:flex-none',
                    selected
                      ? 'border border-[var(--secondary-soft)] bg-[var(--secondary-soft)] text-[var(--secondary-strong)] shadow-sm ring-2 ring-[var(--secondary-soft)]'
                      : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800',
                  )}
                  aria-pressed={selected}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* General */}
        {activeTab === 'general' ? (
          <div className="surface overflow-hidden">
            <PanelHeader icon={Building2} title={t('orgSettings.tabGeneral')} description={t('orgSettings.generalDescription')} />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <TextField label={t('orgSettings.name')} value={form.name} onChange={(v) => handleChange('name', v)} disabled={!canEdit} />
              <TextField label={t('orgSettings.email')} value={form.email} onChange={(v) => handleChange('email', v)} disabled={!canEdit} type="email" />
              <TextField label={t('orgSettings.phone')} value={form.phone} onChange={(v) => handleChange('phone', v)} disabled={!canEdit} type="tel" />

              <div>
                <span className="label">{t('orgSettings.businessType')}</span>
                <div className="input flex items-center justify-between gap-2 !text-slate-600">
                  <span className="flex items-center gap-2 font-semibold text-slate-700">
                    <BusinessTypeIcon size={15} className="text-slate-400" />
                    {businessTypeLabel}
                  </span>
                  <Lock size={13} className="shrink-0 text-slate-300" />
                </div>
                <p className="mt-1 text-xs text-slate-500">{t('orgSettings.businessTypeLocked')}</p>
              </div>

              <div className="sm:col-span-2">
                <PhotoUploadField
                  label={t('orgSettings.logoUrl')}
                  value={form.logoUrl}
                  onChange={(url) => handleChange('logoUrl', url)}
                  shape="square"
                  disabled={!canEdit}
                />
              </div>

              <label className="block sm:col-span-2">
                <span className="label">{t('orgSettings.address')}</span>
                <textarea
                  className="input min-h-[80px] resize-y"
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  disabled={!canEdit}
                />
              </label>
            </div>
          </div>
        ) : null}

        {/* Contact & Location */}
        {activeTab === 'contact' ? (
          <div className="surface overflow-hidden">
            <PanelHeader icon={MapPin} title={t('orgSettings.sectionContact')} description={t('orgSettings.contactDescription')} />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <TextField label={t('orgSettings.whatsappPhone')} value={form.whatsappPhone} onChange={(v) => handleChange('whatsappPhone', v)} disabled={!canEdit} type="tel" />
              <TextField label={t('orgSettings.district')} value={form.district} onChange={(v) => handleChange('district', v)} disabled={!canEdit} />
              <TextField label={t('orgSettings.websiteUrl')} value={form.websiteUrl} onChange={(v) => handleChange('websiteUrl', v)} disabled={!canEdit} placeholder="https://" />
              <TextField label={t('orgSettings.facebookUrl')} value={form.facebookUrl} onChange={(v) => handleChange('facebookUrl', v)} disabled={!canEdit} placeholder="https://facebook.com/…" />
            </div>
          </div>
        ) : null}

        {/* Legal & Compliance */}
        {activeTab === 'legal' ? (
          <div className="surface overflow-hidden">
            <PanelHeader icon={FileCheck2} title={t('orgSettings.sectionLegal')} description={t('orgSettings.legalDescription')} />
            <div className="space-y-5 p-5">
              <div className="grid gap-5 sm:grid-cols-3">
                <TextField label={t('orgSettings.tradeLicenseNumber')} value={form.tradeLicenseNumber} onChange={(v) => handleChange('tradeLicenseNumber', v)} disabled={!canEdit} />
                <TextField label={t('orgSettings.binNumber')} value={form.binNumber} onChange={(v) => handleChange('binNumber', v)} disabled={!canEdit} />
                <TextField label={t('orgSettings.tinNumber')} value={form.tinNumber} onChange={(v) => handleChange('tinNumber', v)} disabled={!canEdit} />
              </div>
              <div className="grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-3">
                <DocumentField label={t('orgSettings.tradeLicenseFileUrl')} value={form.tradeLicenseFileUrl} onChange={(url) => handleChange('tradeLicenseFileUrl', url)} disabled={!canEdit} />
                <DocumentField label={t('orgSettings.binCertificateFileUrl')} value={form.binCertificateFileUrl} onChange={(url) => handleChange('binCertificateFileUrl', url)} disabled={!canEdit} />
                <DocumentField label={t('orgSettings.tinCertificateFileUrl')} value={form.tinCertificateFileUrl} onChange={(url) => handleChange('tinCertificateFileUrl', url)} disabled={!canEdit} />
              </div>
              <p className="text-xs text-slate-400">{t('orgSettings.documentHint')}</p>

              {form.businessType === 'DRUG_PHARMACY' ? (
                <div className="grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-3">
                  <TextField label={t('orgSettings.drugLicenseNumber')} value={form.drugLicenseNumber} onChange={(v) => handleChange('drugLicenseNumber', v)} disabled={!canEdit} />
                  <DocumentField label={t('orgSettings.drugLicenseFileUrl')} value={form.drugLicenseFileUrl} onChange={(url) => handleChange('drugLicenseFileUrl', url)} disabled={!canEdit} />
                </div>
              ) : null}
              {form.businessType === 'VEHICLE' ? (
                <div className="grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-3">
                  <TextField label={t('orgSettings.dealerRegistrationNumber')} value={form.dealerRegistrationNumber} onChange={(v) => handleChange('dealerRegistrationNumber', v)} disabled={!canEdit} />
                  <DocumentField label={t('orgSettings.dealerRegistrationFileUrl')} value={form.dealerRegistrationFileUrl} onChange={(url) => handleChange('dealerRegistrationFileUrl', url)} disabled={!canEdit} />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Payments & Invoicing */}
        {activeTab === 'payments' ? (
          <div className="surface overflow-hidden">
            <PanelHeader icon={Wallet} title={t('orgSettings.sectionPayments')} description={t('orgSettings.paymentsDescription')} />
            <div className="space-y-5 p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                <Landmark size={13} />
                {t('orgSettings.bankSectionLabel')}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label={t('orgSettings.bankName')} value={form.bankName} onChange={(v) => handleChange('bankName', v)} disabled={!canEdit} />
                <TextField label={t('orgSettings.bankAccountName')} value={form.bankAccountName} onChange={(v) => handleChange('bankAccountName', v)} disabled={!canEdit} />
                <TextField label={t('orgSettings.bankAccountNumber')} value={form.bankAccountNumber} onChange={(v) => handleChange('bankAccountNumber', v)} disabled={!canEdit} />
                <TextField label={t('orgSettings.bankBranch')} value={form.bankBranch} onChange={(v) => handleChange('bankBranch', v)} disabled={!canEdit} />
              </div>
              <div className="flex items-center gap-2 border-t border-slate-100 pt-5 text-xs font-bold uppercase tracking-wide text-slate-400">
                <Wallet size={13} />
                {t('orgSettings.mobileBankingSectionLabel')}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label={t('orgSettings.bkashNumber')} value={form.bkashNumber} onChange={(v) => handleChange('bkashNumber', v)} disabled={!canEdit} type="tel" />
                <TextField label={t('orgSettings.nagadNumber')} value={form.nagadNumber} onChange={(v) => handleChange('nagadNumber', v)} disabled={!canEdit} type="tel" />
              </div>
              <label className="block border-t border-slate-100 pt-5">
                <span className="label">{t('orgSettings.invoiceFooterNote')}</span>
                <textarea
                  className="input min-h-[60px] resize-y"
                  value={form.invoiceFooterNote}
                  onChange={(e) => handleChange('invoiceFooterNote', e.target.value)}
                  disabled={!canEdit}
                  placeholder={t('orgSettings.invoiceFooterNotePlaceholder')}
                />
              </label>
            </div>
          </div>
        ) : null}

        {/* Branding */}
        {activeTab === 'branding' ? (
          <div className="surface overflow-hidden">
            <PanelHeader icon={Palette} title={t('orgSettings.sectionBranding')} description={t('orgSettings.brandingDescription')} />
            <div className="space-y-5 p-5">
              <PhotoUploadField
                label={t('orgSettings.signatureImageUrl')}
                value={form.signatureImageUrl}
                onChange={(url) => handleChange('signatureImageUrl', url)}
                shape="square"
                disabled={!canEdit}
              />
              <label className="block">
                <span className="label">{t('orgSettings.receiptFooterMessage')}</span>
                <textarea
                  className="input min-h-[60px] resize-y"
                  value={form.receiptFooterMessage}
                  onChange={(e) => handleChange('receiptFooterMessage', e.target.value)}
                  disabled={!canEdit}
                  placeholder={t('orgSettings.receiptFooterMessagePlaceholder')}
                />
              </label>
            </div>
          </div>
        ) : null}

        {/* Tax & Loyalty */}
        {activeTab === 'tax' ? (
          <div className="surface overflow-hidden">
            <PanelHeader icon={Percent} title={t('orgSettings.tabTax')} description={t('orgSettings.taxDescription')} />
            <div className="space-y-5 p-5">
              <div className="max-w-xs">
                <TextField label={t('retailer.shared.taxRateLabel')} value={form.taxRate} onChange={(v) => handleChange('taxRate', v)} disabled={!canEdit} type="number" />
                <p className="mt-1 text-xs text-slate-500">{t('orgSettings.taxHelp')}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <label className="flex items-start gap-3">
                  <input
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                    type="checkbox"
                    checked={Boolean(form.loyaltyEnabled)}
                    onChange={(e) => handleChange('loyaltyEnabled', e.target.checked)}
                    disabled={!canEdit}
                  />
                  <span>
                    <span className="flex items-center gap-1.5 font-semibold text-slate-950">
                      <Award size={15} className="text-slate-400" />
                      {t('orgSettings.loyaltyEnabled')}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{t('orgSettings.loyaltyEnabledHelp')}</span>
                  </span>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label={t('orgSettings.loyaltyPointsPer100')}
                    value={form.loyaltyPointsPer100}
                    onChange={(v) => handleChange('loyaltyPointsPer100', v)}
                    disabled={!canEdit || !form.loyaltyEnabled}
                    type="number"
                  />
                  <TextField
                    label={t('orgSettings.loyaltyPointValue')}
                    value={form.loyaltyPointValue}
                    onChange={(v) => handleChange('loyaltyPointValue', v)}
                    disabled={!canEdit || !form.loyaltyEnabled}
                    type="number"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
