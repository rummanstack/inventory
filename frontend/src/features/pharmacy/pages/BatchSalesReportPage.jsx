import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { Alert, Badge, MobileCardList, MobileListCard, Pagination, SectionHeader, Select } from '../../../components/ui.jsx';
import TableReportActions from '../../../components/TableReportActions.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { formatDate, formatCurrency } from '../../../utils/calculations.js';
import { useBatchSalesReportViewModel } from '../viewmodels/useBatchSalesReportViewModel.js';

const BATCH_SALES_REPORT_ID = 'batch-sales-report-table';

export default function BatchSalesReportPage() {
  const { t, language, productDirectory } = useInventoryApp();
  const vm = useBatchSalesReportViewModel({ products: productDirectory });

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={t('nav.reports')}
        title={t('pharmacy.batchSalesReport')}
        action={<span className="text-sm font-semibold text-slate-500">{vm.total} {t('common.results')}</span>}
      />

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">{t('pharmacy.dateFrom')}</label>
            <DatePickerField value={vm.dateFrom} onChange={vm.setDateFrom} />
          </div>
          <div>
            <label className="label">{t('pharmacy.dateTo')}</label>
            <DatePickerField value={vm.dateTo} onChange={vm.setDateTo} />
          </div>
          <div>
            <label className="label">{t('pharmacy.batchNumber')}</label>
            <input
              className="input"
              type="text"
              value={vm.batchNumber}
              onChange={(e) => vm.setBatchNumber(e.target.value)}
              placeholder={t('pharmacy.batchNumberPlaceholder')}
            />
          </div>
          <div>
            <label className="label">{t('products.product')}</label>
            <Select className="input" value={vm.productId} onChange={(e) => vm.setProductId(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {vm.products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button type="button" className="btn-primary" onClick={vm.applyFilters} disabled={vm.loading}>
            {t('common.filter')}
          </button>
        </div>
      </div>

      {vm.error && <Alert type="error">{vm.error}</Alert>}

      {/* Table */}
      <div id={BATCH_SALES_REPORT_ID} className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 no-print">
          <span className="text-sm font-bold text-slate-700">{t('pharmacy.batchSalesReport')}</span>
          <TableReportActions targetId={BATCH_SALES_REPORT_ID} title={t('pharmacy.batchSalesReport')} fileName="batch-sales-report" entityType="batch_sales_report" t={t} />
        </div>
        <MobileCardList>
          {vm.loading ? (
            <p className="px-4 py-8 text-center text-slate-500">{t('common.loading')}</p>
          ) : vm.rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-slate-500">{t('common.noResults')}</p>
          ) : vm.rows.map((row) => (
            <MobileListCard
              key={row.id}
              title={row.productName}
              badge={row.batchNumber ? <Badge tone="blue">{row.batchNumber}</Badge> : null}
              subtitle={`${row.invoiceNumber} · ${formatDate(row.invoiceDate, language)}`}
              value={formatCurrency(row.actualSalePrice)}
              valueSub={row.quantityFromBatch != null ? String(row.quantityFromBatch) : null}
            />
          ))}
        </MobileCardList>
        <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">{t('retailer.salesInvoices.invoiceNumberLabel')}</th>
              <th className="px-4 py-3">{t('common.date')}</th>
              <th className="px-4 py-3">{t('products.product')}</th>
              <th className="px-4 py-3">{t('pharmacy.batchNumber')}</th>
              <th className="px-4 py-3">{t('pharmacy.lotNumber')}</th>
              <th className="px-4 py-3">{t('pharmacy.expiryDate')}</th>
              <th className="px-4 py-3 text-right">{t('retailer.shared.quantityLabel')}</th>
              <th className="px-4 py-3 text-right">{t('retailer.shared.priceLabel')}</th>
              <th className="px-4 py-3">{t('retailer.shared.customerLabel')}</th>
              <th className="px-4 py-3">{t('pharmacy.prescriptionNumber')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vm.loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">{t('common.loading')}</td>
              </tr>
            ) : vm.rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">{t('common.noResults')}</td>
              </tr>
            ) : vm.rows.map((row) => (
              <tr key={row.id}>
                <td className="table-cell font-semibold text-slate-800">{row.invoiceNumber}</td>
                <td className="table-cell text-slate-600">{formatDate(row.invoiceDate, language)}</td>
                <td className="table-cell font-medium text-slate-900">{row.productName}</td>
                <td className="table-cell">
                  {row.batchNumber
                    ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">{row.batchNumber}</span>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="table-cell text-slate-600">{row.lotNumber || '—'}</td>
                <td className="table-cell">
                  {row.expiryDate ? (
                    <span className={`text-xs font-semibold ${new Date(row.expiryDate) < new Date() ? 'text-rose-600' : 'text-slate-700'}`}>
                      {formatDate(row.expiryDate, language)}
                    </span>
                  ) : '—'}
                </td>
                <td className="table-cell text-right font-semibold text-slate-800">{row.quantityFromBatch}</td>
                <td className="table-cell text-right text-slate-700">{formatCurrency(row.actualSalePrice)}</td>
                <td className="table-cell text-slate-600">{row.customerName || '—'}</td>
                <td className="table-cell text-slate-600">{row.prescriptionNumber || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {vm.totalPages > 1 && (
        <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
      )}
    </div>
  );
}
