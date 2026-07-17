import { SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import StockLedgerPanel from '../../products/components/StockLedgerPanel';

export default function StockMovementPage() {
  const { productDirectory, t } = useInventoryApp();

  return (
    <div>
      <SectionHeader title={t('nav.stockMovement')} compact />
      <StockLedgerPanel products={productDirectory} t={t} printTarget hideHeader shortcuts shortcutKeys={{ downloadPdf: 'd', exportExcel: 'e', print: 'p', refresh: 'r' }} />
    </div>
  );
}



