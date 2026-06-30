import { SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import StockLedgerPanel from '../../products/components/StockLedgerPanel';

export default function StockMovementPage() {
  const { productDirectory, t } = useInventoryApp();

  return (
    <div>
      <SectionHeader eyebrow={t('nav.stockMovement')} title={t('nav.stockMovement')} description={t('stockMovement.description')} />
      <StockLedgerPanel products={productDirectory} t={t} printTarget />
    </div>
  );
}
