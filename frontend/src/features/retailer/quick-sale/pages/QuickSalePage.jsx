import { useState } from 'react';
import { Printer, Save } from 'lucide-react';
import { Alert, SectionHeader } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { printRetailReceipt } from '../../../../services/receiptService.js';
import { useSalesInvoiceFormViewModel } from '../../sales-invoices/viewmodels/useSalesInvoiceFormViewModel';
import SalesInvoiceFormFields from '../../sales-invoices/components/SalesInvoiceFormFields';

function QuickSaleForm({ onSaved }) {
  const { t, productDirectory, retailCustomerDirectory, saveSalesInvoice, saveRetailCustomer, tenant, pushToast } = useInventoryApp();
  const vm = useSalesInvoiceFormViewModel({ products: productDirectory, defaultSaleType: 'QUICK_SALE', defaultCustomerType: 'WALK_IN' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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

    const receiptWindow = window.open('', '_blank', 'width=420,height=760');
    if (receiptWindow) {
      receiptWindow.document.open();
      receiptWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${t('retailer.shared.receiptTitle')}</title><style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff;color:#111827;font-size:14px;}</style></head><body>Preparing receipt...</body></html>`);
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
        receiptWindow,
      });

      if (!printResult.ok) {
        pushToast('error', t('retailer.shared.printReceiptFailed'), t('alerts.requestFailed'));
      }
    } else {
      pushToast('error', t('retailer.shared.printReceiptFailed'), t('alerts.requestFailed'));
    }

    onSaved(result.salesInvoice);
  }

  return (
    <form className="space-y-4" onSubmit={submitForm}>
      {error ? <Alert type="error">{error}</Alert> : null}
      <SalesInvoiceFormFields vm={vm} t={t} productDirectory={productDirectory} retailCustomerDirectory={retailCustomerDirectory} saving={saving} saveRetailCustomer={saveRetailCustomer} />
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          <Save size={18} />
          {saving ? t('common.saving') : t('retailer.quickSale.save')}
        </button>
      </div>
    </form>
  );
}

export default function QuickSalePage() {
  const { t, tenant, pushToast } = useInventoryApp();
  const [formKey, setFormKey] = useState(0);
  const [lastInvoice, setLastInvoice] = useState(null);

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
    });

    if (!result.ok) {
      pushToast('error', t('retailer.shared.printReceiptFailed'), t('alerts.requestFailed'));
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('retailer.quickSale.eyebrow')}
        description={t('retailer.quickSale.description')}
      />

      {lastInvoice ? (
        <Alert type="success">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{t('retailer.quickSale.lastInvoice', { number: lastInvoice.invoiceNumber })}</span>
            <button type="button" className="btn-secondary" onClick={handlePrintReceipt}>
              <Printer size={18} />
              {t('retailer.shared.printReceipt')}
            </button>
          </div>
        </Alert>
      ) : null}

      <div className="surface mt-4 p-5">
        <QuickSaleForm
          key={formKey}
          onSaved={(invoice) => {
            setLastInvoice(invoice);
            setFormKey((value) => value + 1);
          }}
        />
      </div>
    </div>
  );
}
