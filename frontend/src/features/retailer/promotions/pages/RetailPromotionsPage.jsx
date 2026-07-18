import { useEffect, useMemo, useState } from 'react';
import { Tag, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Modal, Pagination, SectionHeader, TableSkeleton, Select } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { DatePickerField } from '../../../../components/DatePicker.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { useTenantApiQuery } from '../../../../queries/useTenantApiQuery.js';
import { formatCurrency, formatDate } from '../../../../utils/calculations.js';

const TARGET_OPTIONS = [
  { value: 'PRODUCT', labelKey: 'retailer.promotions.targets.PRODUCT' },
  { value: 'CATEGORY', labelKey: 'retailer.promotions.targets.CATEGORY' },
  { value: 'ALL', labelKey: 'retailer.promotions.targets.ALL' },
];

const DISCOUNT_OPTIONS = [
  { value: 'PERCENT', labelKey: 'retailer.promotions.discountTypes.PERCENT' },
  { value: 'FIXED', labelKey: 'retailer.promotions.discountTypes.FIXED' },
];

const SALE_TYPE_OPTIONS = [
  { value: 'ALL', labelKey: 'retailer.promotions.saleTypes.ALL' },
  { value: 'RETAIL', labelKey: 'retailer.promotions.saleTypes.RETAIL' },
  { value: 'WHOLESALE', labelKey: 'retailer.promotions.saleTypes.WHOLESALE' },
  { value: 'QUICK_SALE', labelKey: 'retailer.promotions.saleTypes.QUICK_SALE' },
];

const RETAIL_PROMOTIONS_REPORT_ID = 'retail-promotions-report';
const RETAIL_PROMOTIONS_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};
const RETAIL_PROMOTIONS_ADD_SHORTCUT = { alt: true, key: 'a', label: 'Alt+A' };

function matchesShortcut(event, shortcut) {
  return (
    event.key.toLowerCase() === shortcut.key &&
    Boolean(event.altKey) === Boolean(shortcut.alt) &&
    Boolean(event.shiftKey) === Boolean(shortcut.shift) &&
    Boolean(event.ctrlKey || event.metaKey) === Boolean(shortcut.ctrlOrMeta)
  );
}

function PromotionFormModal({ promotion, products, categories, onClose, onSave }) {
  const { t } = useInventoryApp();
  const [form, setForm] = useState({
    name: promotion?.name || '',
    description: promotion?.description || '',
    active: promotion?.active !== false,
    targetType: promotion?.targetType || 'PRODUCT',
    targetId: promotion?.targetId || '',
    saleType: promotion?.saleType || 'ALL',
    discountType: promotion?.discountType || 'PERCENT',
    discountValue: promotion?.discountValue != null ? promotion.discountValue : '',
    minQuantity: promotion?.minQuantity != null ? promotion.minQuantity : '',
    minSubtotal: promotion?.minSubtotal != null ? promotion.minSubtotal : '',
    startDate: promotion?.startDate || '',
    endDate: promotion?.endDate || '',
    priority: promotion?.priority != null ? promotion.priority : 100,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: promotion?.name || '',
      description: promotion?.description || '',
      active: promotion?.active !== false,
      targetType: promotion?.targetType || 'PRODUCT',
      targetId: promotion?.targetId || '',
      saleType: promotion?.saleType || 'ALL',
      discountType: promotion?.discountType || 'PERCENT',
      discountValue: promotion?.discountValue != null ? promotion.discountValue : '',
      minQuantity: promotion?.minQuantity != null ? promotion.minQuantity : '',
      minSubtotal: promotion?.minSubtotal != null ? promotion.minSubtotal : '',
      startDate: promotion?.startDate || '',
      endDate: promotion?.endDate || '',
      priority: promotion?.priority != null ? promotion.priority : 100,
    });
  }, [promotion]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function availableTargets() {
    if (form.targetType === 'PRODUCT') {
      return products.map((product) => ({ id: product.id, name: product.name }));
    }
    if (form.targetType === 'CATEGORY') {
      return categories;
    }
    return [];
  }

  async function submitForm(event) {
    event.preventDefault();

    const discountValue = form.discountValue === '' ? 0 : Number(form.discountValue);
    if (!form.name.trim()) {
      setError(t('retailer.promotions.validation.nameRequired'));
      return;
    }
    if (discountValue <= 0) {
      setError(t('retailer.promotions.validation.discountRequired'));
      return;
    }
    if ((form.targetType === 'PRODUCT' || form.targetType === 'CATEGORY') && !form.targetId) {
      setError(t('retailer.promotions.validation.targetRequired'));
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      id: promotion?.id,
      name: form.name.trim(),
      description: form.description.trim(),
      active: Boolean(form.active),
      level: 'LINE',
      targetType: form.targetType,
      targetId: form.targetType === 'ALL' ? null : form.targetId,
      saleType: form.saleType,
      discountType: form.discountType,
      discountValue,
      minQuantity: form.minQuantity === '' ? 0 : Number(form.minQuantity),
      minSubtotal: form.minSubtotal === '' ? 0 : Number(form.minSubtotal),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      priority: Number(form.priority || 100),
    };

    const result = await onSave(payload);
    setSaving(false);
    if (!result?.ok) {
      setError(result?.message || t('retailer.promotions.saveFailed'));
    }
  }

  return (
    <Modal title={promotion ? t('retailer.promotions.editTitle') : t('retailer.promotions.addTitle')} description={t('retailer.promotions.modalDescription')} onClose={onClose} width="max-w-4xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t('retailer.promotions.name')}</label>
            <input className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('retailer.promotions.priority')}</label>
            <input className="input" type="number" inputMode="decimal" min="1" step="1" value={form.priority} onChange={(event) => updateField('priority', event.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">{t('retailer.promotions.descriptionLabel')}</label>
            <textarea className="input min-h-24" value={form.description} onChange={(event) => updateField('description', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('retailer.promotions.targetType')}</label>
            <Select className="input" value={form.targetType} onChange={(event) => updateField('targetType', event.target.value)}>
              {TARGET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('retailer.promotions.target')}</label>
            <Select className="input" value={form.targetId} onChange={(event) => updateField('targetId', event.target.value)} disabled={form.targetType === 'ALL'}>
              <option value="">{t('retailer.promotions.selectTarget')}</option>
              {availableTargets().map((target) => (
                <option key={target.id} value={target.id}>{target.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('retailer.promotions.saleType')}</label>
            <Select className="input" value={form.saleType} onChange={(event) => updateField('saleType', event.target.value)}>
              {SALE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('retailer.promotions.discountType')}</label>
            <Select className="input" value={form.discountType} onChange={(event) => updateField('discountType', event.target.value)}>
              {DISCOUNT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t('retailer.promotions.discountValue')}</label>
            <input className="input" type="number" inputMode="decimal" min="0" step="0.0001" value={form.discountValue} onChange={(event) => updateField('discountValue', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('retailer.promotions.minQuantity')}</label>
            <input className="input" type="number" inputMode="decimal" min="0" step="1" value={form.minQuantity} onChange={(event) => updateField('minQuantity', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('retailer.promotions.minSubtotal')}</label>
            <input className="input" type="number" inputMode="decimal" min="0" step="0.0001" value={form.minSubtotal} onChange={(event) => updateField('minSubtotal', event.target.value)} />
          </div>
          <div>
            <label className="label">{t('retailer.promotions.startDate')}</label>
            <DatePickerField value={form.startDate} onChange={(value) => updateField('startDate', value)} />
          </div>
          <div>
            <label className="label">{t('retailer.promotions.endDate')}</label>
            <DatePickerField value={form.endDate} onChange={(value) => updateField('endDate', value)} min={form.startDate} />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                type="checkbox"
                checked={Boolean(form.active)}
                onChange={(event) => updateField('active', event.target.checked)}
              />
              <span>
                <span className="block font-semibold text-slate-950">{t('retailer.promotions.active')}</span>
                <span className="mt-0.5 block text-xs font-medium text-slate-500">{t('retailer.promotions.activeHint')}</span>
              </span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function RetailPromotionsPage() {
  const { promotionDirectory, productDirectory, saveRetailPromotion, deleteRetailPromotion, t, can } = useInventoryApp();
  const [search, setSearch] = useState('');
  const [promotionModal, setPromotionModal] = useState(null);
  const canManageRetailers = can('manage_retail_promotions');

  const categoriesQuery = useTenantApiQuery({
    scope: 'retail-promotion-categories',
    queryFn: () => inventoryApi.listCategories(),
    staleTime: 60_000,
  });
  const categories = (categoriesQuery.data?.categories || []).map((category) => ({ id: category.id, name: category.name }));
  const loading = categoriesQuery.isLoading;
  const error = categoriesQuery.error?.message || '';

  const filteredPromotions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return promotionDirectory;
    return promotionDirectory.filter((promotion) => {
      const targetName =
        promotion.targetType === 'PRODUCT'
          ? productDirectory.find((product) => product.id === promotion.targetId)?.name || ''
          : promotion.targetType === 'CATEGORY'
            ? categories.find((category) => category.id === promotion.targetId)?.name || ''
            : t('retailer.promotions.targets.ALL');
      return [promotion.name, promotion.description, targetName, promotion.saleType].join(' ').toLowerCase().includes(needle);
    });
  }, [promotionDirectory, search, productDirectory, categories, t]);

  async function handleDelete(promotion) {
    const result = await deleteRetailPromotion(promotion);
    return result;
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (matchesShortcut(event, RETAIL_PROMOTIONS_ADD_SHORTCUT) && canManageRetailers && !promotionModal) {
        event.preventDefault();
        setPromotionModal({ mode: 'add' });
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canManageRetailers, promotionModal]);

  function promotionTargetName(promotion) {
    if (promotion.targetType === 'PRODUCT') {
      return productDirectory.find((product) => product.id === promotion.targetId)?.name || promotion.targetId || '-';
    }
    if (promotion.targetType === 'CATEGORY') {
      return categories.find((category) => category.id === promotion.targetId)?.name || promotion.targetId || '-';
    }
    return t('retailer.promotions.targets.ALL');
  }

  return (
    <div>
      <SectionHeader
        title={t('retailer.promotions.title')}
        compact
        action={canManageRetailers ? (
          <button type="button" className="btn-primary" onClick={() => setPromotionModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('retailer.promotions.add')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={RETAIL_PROMOTIONS_REPORT_ID} className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('retailer.promotions.searchPlaceholder')} />
            </div>
            <TableReportActions targetId={RETAIL_PROMOTIONS_REPORT_ID} title={t('retailer.promotions.title')} fileName="retail-promotions" entityType="retail_promotions" t={t} shortcuts={RETAIL_PROMOTIONS_REPORT_SHORTCUTS} />
          </div>
        </div>

        {loading ? (
          <div className="p-5">
            <TableSkeleton columns={7} showHeader={false} />
          </div>
        ) : error ? (
          <div className="p-5">
            <Alert type="error">{error}</Alert>
          </div>
        ) : (
          <>
          <MobileCardList>
            {filteredPromotions.map((promotion) => (
              <MobileListCard
                key={promotion.id}
                title={promotion.name}
                badge={<Badge tone={promotion.active ? 'emerald' : 'slate'}>{promotion.active ? t('retailer.promotions.active') : t('retailer.promotions.inactive')}</Badge>}
                subtitle={`${promotionTargetName(promotion)} · ${t(`retailer.promotions.saleTypes.${promotion.saleType}`)}`}
                value={promotion.discountType === 'PERCENT' ? `${promotion.discountValue}%` : formatCurrency(promotion.discountValue)}
                action={canManageRetailers ? (
                  <>
                    <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setPromotionModal({ mode: 'edit', promotion })}>
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const result = await handleDelete(promotion); if (result?.ok === false) return; }}>
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : null}
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('retailer.promotions.name')}</th>
                  <th className="px-4 py-3">{t('retailer.promotions.target')}</th>
                  <th className="px-4 py-3">{t('retailer.promotions.discount')}</th>
                  <th className="px-4 py-3">{t('retailer.promotions.dateRange')}</th>
                  <th className="px-4 py-3">{t('retailer.promotions.status')}</th>
                  <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPromotions.map((promotion) => (
                  <tr key={promotion.id} className="hover:bg-slate-50">
                    <td className="table-cell no-print">
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="font-semibold text-slate-950">{promotion.name}</p>
                          <p className="text-xs text-slate-500">{promotion.description || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-slate-950">{promotionTargetName(promotion)}</p>
                      <p className="text-xs text-slate-500">{t(`retailer.promotions.targets.${promotion.targetType}`)} / {t(`retailer.promotions.saleTypes.${promotion.saleType}`)}</p>
                    </td>
                    <td className="table-cell font-semibold text-slate-950">
                      {promotion.discountType === 'PERCENT' ? `${promotion.discountValue}%` : formatCurrency(promotion.discountValue)}
                    </td>
                    <td className="table-cell text-sm text-slate-600">
                      <p>{promotion.startDate ? formatDate(promotion.startDate) : t('common.optional')}</p>
                      <p>{promotion.endDate ? formatDate(promotion.endDate) : t('common.optional')}</p>
                    </td>
                    <td className="table-cell">
                      <Badge tone={promotion.active ? 'emerald' : 'slate'}>
                        {promotion.active ? t('retailer.promotions.active') : t('retailer.promotions.inactive')}
                      </Badge>
                    </td>
                    <td className="table-cell">
                      <div className="row-actions flex justify-end gap-2">
                        {canManageRetailers ? (
                          <>
                            <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setPromotionModal({ mode: 'edit', promotion })}>
                              <Pencil size={16} />
                            </button>
                            <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const result = await handleDelete(promotion); if (result?.ok === false) return; }}>
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {!loading && !error && !filteredPromotions.length ? (
          <div className="p-5">
            <EmptyState title={t('retailer.promotions.emptyTitle')} description={t('retailer.promotions.emptyDescription')} icon={Tag} />
          </div>
        ) : null}
      </div>

      {promotionModal ? (
        <PromotionFormModal
          promotion={promotionModal.promotion}
          products={productDirectory}
          categories={categories}
          onClose={() => setPromotionModal(null)}
          onSave={async (value) => {
            const result = await saveRetailPromotion(value);
            if (result.ok) {
              setPromotionModal(null);
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
