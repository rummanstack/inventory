import { useState } from 'react';
import { Save } from 'lucide-react';
import { Alert, Modal } from '../../../../components/ui.jsx';
import { useInventoryApp } from '../../../../app/useInventoryApp.jsx';
import { useSalesInvoiceFormViewModel } from '../viewmodels/useSalesInvoiceFormViewModel';
import SalesInvoiceFormFields from './SalesInvoiceFormFields';

export default function SalesInvoiceFormModal({ onClose, onSave }) {
  const { t, productDirectory, retailCustomerDirectory, promotionDirectory, saveRetailCustomer, tenant } = useInventoryApp();
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
    const result = await onSave(vm.buildPayload());
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || t('retailer.shared.saveFailed'));
    }
  }

  return (
    <Modal title={t('retailer.salesInvoices.addTitle')} description={t('retailer.salesInvoices.modalDescription')} onClose={onClose} width="max-w-4xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <SalesInvoiceFormFields vm={vm} t={t} productDirectory={productDirectory} retailCustomerDirectory={retailCustomerDirectory} saving={saving} saveRetailCustomer={saveRetailCustomer} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? t('common.saving') : t('retailer.salesInvoices.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
