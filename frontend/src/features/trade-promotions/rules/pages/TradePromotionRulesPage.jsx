import { useEffect, useState } from 'react';
import { Gift, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Alert, Badge, EmptyState, MobileCardList, MobileListCard, Pagination, SectionHeader, TableSkeleton, Select } from '../../../../components/ui.jsx';
import TableReportActions from '../../../../components/TableReportActions.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../../services/inventoryApi.js';
import { formatDate, formatNumber } from '../../../../utils/calculations.js';
import TradePromotionRuleFormModal from '../components/TradePromotionRuleFormModal.jsx';
import { useTradePromotionRulesViewModel } from '../viewmodels/useTradePromotionRulesViewModel.js';
import { useTenantApiQuery } from '../../../../queries/useTenantApiQuery.js';

const TARGET_TYPES = ['ALL', 'PRODUCT', 'CATEGORY'];
const TRADE_PROMOTION_RULES_REPORT_ID = 'trade-promotion-rules-report';
const TRADE_PROMOTION_RULES_ADD_SHORTCUT = { alt: true, key: 'a', label: 'Alt+A' };
const TRADE_PROMOTION_RULES_REPORT_SHORTCUTS = {
  pdf: { alt: true, key: 'd', label: 'Alt+D' },
  excel: { alt: true, key: 'e', label: 'Alt+E' },
  csv: { alt: true, key: 'c', label: 'Alt+C' },
  print: { alt: true, key: 'p', label: 'Alt+P' },
};

function matchesShortcut(event, shortcut) {
  return (
    event.key.toLowerCase() === shortcut.key &&
    Boolean(event.altKey) === Boolean(shortcut.alt) &&
    Boolean(event.shiftKey) === Boolean(shortcut.shift) &&
    Boolean(event.ctrlKey || event.metaKey) === Boolean(shortcut.ctrlOrMeta)
  );
}

function rewardSummary(rule, t) {
  if (rule.rewardType === 'FREE_QUANTITY') {
    return `${formatNumber(rule.rewardQuantity)} ${t(`tradePromotions.rules.units.${rule.rewardUnit}`)}`;
  }
  if (rule.rewardType === 'FIXED_AMOUNT') {
    return `৳${formatNumber(rule.rewardAmount)}`;
  }
  return `${rule.rewardPercentage}%`;
}

export default function TradePromotionRulesPage() {
  const { saveTradePromotionRule, deleteTradePromotionRule, t, can, supplierDirectory } = useInventoryApp();
  const vm = useTradePromotionRulesViewModel();
  const [ruleModal, setRuleModal] = useState(null);
  const canManage = can('manage_trade_promotion_rules');

  useEffect(() => {
    function handleKeyDown(event) {
      if (matchesShortcut(event, TRADE_PROMOTION_RULES_ADD_SHORTCUT) && canManage && !ruleModal) {
        event.preventDefault();
        setRuleModal({ mode: 'add' });
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canManage, ruleModal]);

  const categoriesQuery = useTenantApiQuery({
    scope: 'trade-promotion-categories',
    queryFn: () => inventoryApi.listCategories(),
    staleTime: 60_000,
  });
  const categories = (categoriesQuery.data?.categories || []).map((category) => ({ id: category.id, name: category.name }));

  return (
    <div>
      <SectionHeader
        title={t('tradePromotions.rules.title')}
        compact
        action={canManage ? (
          <button type="button" className="btn-primary" onClick={() => setRuleModal({ mode: 'add' })}>
            <Plus size={18} />
            {t('tradePromotions.rules.add')}
            <kbd className="ml-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1 py-0.5 font-mono text-[10px] text-indigo-200">Alt+A</kbd>
          </button>
        ) : null}
      />

      <div id={TRADE_PROMOTION_RULES_REPORT_ID} className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-center justify-end gap-2 text-sm font-bold">
            <span className="muted-chip">{formatNumber(vm.total)} {t('tradePromotions.rules.count')}</span>
            <TableReportActions targetId={TRADE_PROMOTION_RULES_REPORT_ID} title={t('tradePromotions.rules.title')} fileName="trade-promotion-rules" entityType="trade_promotion_rules" t={t} shortcuts={TRADE_PROMOTION_RULES_REPORT_SHORTCUTS} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('tradePromotions.rules.searchPlaceholder')} />
            </div>
            <Select className="input" value={vm.supplierId} onChange={(event) => vm.setSupplierId(event.target.value)}>
              <option value="">{t('tradePromotions.rules.allSuppliers')}</option>
              {supplierDirectory.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </Select>
            <Select className="input" value={vm.targetType} onChange={(event) => vm.setTargetType(event.target.value)}>
              <option value="">{t('tradePromotions.rules.allTargetTypes')}</option>
              {TARGET_TYPES.map((value) => (
                <option key={value} value={value}>{t(`tradePromotions.rules.targetTypes.${value}`)}</option>
              ))}
            </Select>
            <Select className="input" value={vm.active} onChange={(event) => vm.setActive(event.target.value)}>
              <option value="">{t('tradePromotions.rules.allStatuses')}</option>
              <option value="true">{t('tradePromotions.rules.active')}</option>
              <option value="false">{t('tradePromotions.rules.inactive')}</option>
            </Select>
          </div>
        </div>

        {vm.loading ? (
          <div className="p-5">
            <TableSkeleton columns={7} showHeader={false} />
          </div>
        ) : vm.error ? (
          <div className="p-5">
            <Alert type="error">{vm.error}</Alert>
          </div>
        ) : (
          <>
          <MobileCardList>
            {vm.items.map((rule) => (
              <MobileListCard
                key={rule.id}
                onClick={canManage ? () => setRuleModal({ mode: 'edit', rule }) : undefined}
                title={rule.name}
                badge={<Badge tone={rule.active ? 'emerald' : 'slate'}>{rule.active ? t('tradePromotions.rules.active') : t('tradePromotions.rules.inactive')}</Badge>}
                subtitle={`${rule.supplierScope === 'ALL' ? t('tradePromotions.rules.supplierScopes.ALL') : (rule.supplierName || '-')} · ${rule.targetType === 'ALL' ? t('tradePromotions.rules.targetTypes.ALL') : (rule.targetName || '-')}`}
                value={rewardSummary(rule, t)}
                valueSub={`${formatNumber(rule.buyQuantity)} ${t(`tradePromotions.rules.units.${rule.buyUnit}`)}`}
              />
            ))}
          </MobileCardList>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('tradePromotions.rules.name')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.rules.supplier')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.rules.target')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.rules.buyRequirement')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.rules.reward')}</th>
                  <th className="px-4 py-3">{t('tradePromotions.rules.status')}</th>
                  <th className="px-4 py-3 text-right no-print">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vm.items.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50">
                    <td className="table-cell">
                      <p className="font-semibold text-slate-950">{rule.name}</p>
                      <p className="text-xs text-slate-500">{rule.remarks || '-'}</p>
                    </td>
                    <td className="table-cell">
                      {rule.supplierScope === 'ALL' ? t('tradePromotions.rules.supplierScopes.ALL') : (rule.supplierName || '-')}
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-slate-950">{rule.targetType === 'ALL' ? t('tradePromotions.rules.targetTypes.ALL') : (rule.targetName || '-')}</p>
                      <p className="text-xs text-slate-500">{t(`tradePromotions.rules.targetTypes.${rule.targetType}`)}</p>
                    </td>
                    <td className="table-cell text-sm text-slate-600">
                      {formatNumber(rule.buyQuantity)} {t(`tradePromotions.rules.units.${rule.buyUnit}`)}
                    </td>
                    <td className="table-cell font-semibold text-slate-950">
                      {rewardSummary(rule, t)}
                      <p className="text-xs font-medium text-slate-500">{t(`tradePromotions.rules.rewardTypes.${rule.rewardType}`)}</p>
                    </td>
                    <td className="table-cell">
                      <Badge tone={rule.active ? 'emerald' : 'slate'}>
                        {rule.active ? t('tradePromotions.rules.active') : t('tradePromotions.rules.inactive')}
                      </Badge>
                    </td>
                    <td className="table-cell no-print">
                      <div className="row-actions flex justify-end gap-2">
                        {canManage ? (
                          <>
                            <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setRuleModal({ mode: 'edit', rule })}>
                              <Pencil size={16} />
                            </button>
                            <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={async () => { const result = await deleteTradePromotionRule(rule); if (result?.ok) vm.reload(); }}>
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

        {!vm.loading && !vm.error && !vm.items.length ? (
          <div className="p-5">
            <EmptyState title={t('tradePromotions.rules.emptyTitle')} description={t('tradePromotions.rules.emptyDescription')} icon={Gift} />
          </div>
        ) : null}
        {!vm.loading && !vm.error && vm.items.length ? (
          <div className="border-t border-slate-100 px-5 py-4">
            <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
          </div>
        ) : null}
      </div>

      {ruleModal ? (
        <TradePromotionRuleFormModal
          rule={ruleModal.rule}
          categories={categories}
          onClose={() => setRuleModal(null)}
          onSave={async (value) => {
            const result = await saveTradePromotionRule(value);
            if (result.ok) {
              setRuleModal(null);
              vm.reload();
            }
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
