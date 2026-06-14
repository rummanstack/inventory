import { useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, SectionHeader } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { useSalesInvoiceFormViewModel } from '../../sales-invoices/viewmodels/useSalesInvoiceFormViewModel';
import SalesInvoiceFormFields from '../../sales-invoices/components/SalesInvoiceFormFields';

function QuickSaleForm({ onSaved }) {
  const { t, productDirectory, customerDirectory, saveSalesInvoice } = useInventoryApp();
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

    setSaving(true);
    setError('');
    const result = await saveSalesInvoice(vm.buildPayload());
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('retailer.shared.saveFailed'));
      return;
    }

    onSaved(result.salesInvoice);
  }

  return (
    <form className="space-y-4" onSubmit={submitForm}>
      {error ? <Alert type="error">{error}</Alert> : null}
      <SalesInvoiceFormFields vm={vm} t={t} productDirectory={productDirectory} customerDirectory={customerDirectory} saving={saving} />
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
  const { t } = useInventoryApp();
  const [formKey, setFormKey] = useState(0);
  const [lastInvoice, setLastInvoice] = useState(null);

  return (
    <div>
      <SectionHeader
        eyebrow={t('retailer.quickSale.eyebrow')}
        description={t('retailer.quickSale.description')}
      />

      {lastInvoice ? (
        <Alert type="success">{t('retailer.quickSale.lastInvoice', { number: lastInvoice.invoiceNumber })}</Alert>
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
