import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { Alert, Pagination } from '../../../components/ui.jsx';
import { DatePickerField } from '../../../components/DatePicker.jsx';
import { formatDate, formatCurrency } from '../../../utils/calculations.js';
import { useBatchSalesReportViewModel } from '../viewmodels/useBatchSalesReportViewModel.js';

export default function BatchSalesReportPage() {
  const { t, language, productDirectory } = useInventoryApp();
  const vm = useBatchSalesReportViewModel({ products: productDirectory });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-900">{t('pharmacy.batchSalesReport')}</h1>
        <p className="text-sm font-semibold text-slate-500">
          {vm.total} {t('common.results')}
        </p>
      </div>

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
            <select className="input" value={vm.productId} onChange={(e) => vm.setProductId(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {vm.products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
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
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-600">
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
          <tbody>
            {vm.loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">{t('common.loading')}</td>
              </tr>
            ) : vm.rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">{t('common.noResults')}</td>
              </tr>
            ) : vm.rows.map((row, i) => (
              <tr key={row.id} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50' : ''}`}>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{row.invoiceNumber}</td>
                <td className="px-4 py-2.5 text-slate-600">{formatDate(row.invoiceDate, language)}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{row.productName}</td>
                <td className="px-4 py-2.5">
                  {row.batchNumber
                    ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">{row.batchNumber}</span>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{row.lotNumber || '—'}</td>
                <td className="px-4 py-2.5">
                  {row.expiryDate ? (
                    <span className={`text-xs font-semibold ${new Date(row.expiryDate) < new Date() ? 'text-rose-600' : 'text-slate-700'}`}>
                      {formatDate(row.expiryDate, language)}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{row.quantityFromBatch}</td>
                <td className="px-4 py-2.5 text-right text-slate-700">{formatCurrency(row.actualSalePrice)}</td>
                <td className="px-4 py-2.5 text-slate-600">{row.customerName || '—'}</td>
                <td className="px-4 py-2.5 text-slate-600">{row.prescriptionNumber || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {vm.totalPages > 1 && (
        <Pagination currentPage={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
      )}
    </div>
  );
}
