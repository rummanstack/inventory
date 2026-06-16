import heroDashboardImage from '../../assets/landing/hero-dashboard.png';
import ownerLaptopImage from '../../assets/landing/business-owner-dashboard.png';
import retailCounterImage from '../../assets/landing/retail-quick-sale.png';
import warehouseStockImage from '../../assets/landing/warehouse-stock-control.png';
import dsrSettlementImage from '../../assets/landing/dsr-evening-settlement.png';
import purchaseReceiveImage from '../../assets/landing/purchase-receive.png';
import dueCollectionImage from '../../assets/landing/customer-due-ledger.png';
import profitReportImage from '../../assets/landing/profit-report-dashboard.png';
import mobileViewImage from '../../assets/landing/mobile-dashboard.png';
import contactUsImage from '../../assets/landing/contact-us.png';
import {
  BarChart3,
  Boxes,
  PackageCheck,
  Printer,
  ReceiptText,
  RefreshCw,
  Route,
  ShoppingBag,
  Store,
  Truck,
  Warehouse,
  WalletCards,
} from 'lucide-react';

export const contactPhone = '01678560660';
export const whatsappUrl = 'https://wa.me/8801678560660';

export const navLinks = [
  { key: 'features', href: '#features' },
  { key: 'solutions', href: '#solutions' },
  { key: 'workflow', href: '#workflow' },
  { key: 'getStarted', href: '#get-started' },
  { key: 'pricing', href: '#pricing' },
  { key: 'contact', href: '#contact-form' },
];

export { heroDashboardImage, contactUsImage };

export const featureStoryImages = [retailCounterImage, dsrSettlementImage, purchaseReceiveImage];

export const featureCardIcons = [ShoppingBag, ReceiptText, WalletCards, Warehouse, Boxes, BarChart3, RefreshCw, Printer];

export const solutionIcons = [Store, PackageCheck, Truck, Route];
export const solutionImages = [retailCounterImage, warehouseStockImage, ownerLaptopImage, dsrSettlementImage];

export const workflowIcons = [Warehouse, Boxes, ReceiptText, WalletCards, BarChart3];

export const showcaseImages = [
  { src: dueCollectionImage, key: 'dueCollection', fit: 'cover' },
  { src: profitReportImage, key: 'profitReport', fit: 'cover' },
  { src: mobileViewImage, key: 'mobileView', fit: 'cover' },
  { src: ownerLaptopImage, key: 'ownerLaptop', fit: 'cover' },
];
