import accountingStatementImage from '../../assets/landing/accounting-statement.png';
import dashboardSummaryImage from '../../assets/landing/dashboard-summary.png';
import dealerImage from '../../assets/landing/dealer.png';
import dsrRouteImage from '../../assets/landing/dsr-route.png';
import dueCollectionImage from '../../assets/landing/due-collection.png';
import groceryImage from '../../assets/landing/grocery.png';
import heroDashboardImage from '../../assets/landing/hero-dashboard.png';
import pharmacyImage from '../../assets/landing/pharmacy.png';
import profitReportImage from '../../assets/landing/profit-report.png';
import purchaseReceiveImage from '../../assets/landing/purchase-receive.png';
import reportsVisibilityImage from '../../assets/landing/reports-visibility.png';
import retailCounterImage from '../../assets/landing/retail-counter.png';
import supportCallImage from '../../assets/landing/support-call.png';
import tradersImage from '../../assets/landing/traders.png';
import warehouseStockImage from '../../assets/landing/warehouse-stock.png';
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
export const contactEmail = 'info@stockledger.pro';
export const supportEmail = 'support@stockledger.pro';

// TODO: replace '#' with your real profile URLs for each platform.
export const socialLinks = {
  facebook: '#',
  instagram: '#',
  linkedin: '#',
  twitter: '#',
  telegram: '#',
};

export const navLinks = [
  { key: 'features', href: '/features' },
  { key: 'solutions', href: '/solutions' },
  { key: 'software', href: '/software' },
  { key: 'workflow', href: '/landing#workflow' },
  { key: 'getStarted', href: '/get-started' },
  { key: 'pricing', href: '/pricing' },
  { key: 'contact', href: '/contact' },
];

export const megaMenuSections = [
  {
    title: 'Features',
    href: '/features',
    description: 'Explore StockLedger by workflow and module.',
    links: [
      { label: 'Inventory Management', href: '/features/inventory-management' },
      { label: 'Retail POS', href: '/features/retail-pos' },
      { label: 'Accounting', href: '/features/accounting' },
      { label: 'HR & Payroll', href: '/features/hr-payroll' },
      { label: 'DSR Dealer Management', href: '/features/dsr-dealer-management' },
      { label: 'Reporting', href: '/features/reporting' },
    ],
  },
  {
    title: 'Solutions',
    href: '/solutions',
    description: 'See the best-fit setup by business type.',
    links: [
      { label: 'Retail Shop', href: '/solutions/retail-shop' },
      { label: 'Wholesale Business', href: '/solutions/wholesale-business' },
      { label: 'Dealer Distributor', href: '/solutions/dealer-distributor' },
      { label: 'DSR Sales Team', href: '/solutions/dsr-sales-team' },
      { label: 'Pharmacy', href: '/solutions/pharmacy' },
      { label: 'Grocery Store', href: '/solutions/grocery-store' },
    ],
  },
  {
    title: 'Software Guides',
    href: '/software',
    description: 'Jump into high-intent software comparison pages.',
    links: [
      { label: 'Inventory Software Bangladesh', href: '/software/inventory-software-bangladesh' },
      { label: 'Retail POS Software Bangladesh', href: '/software/retail-pos-software-bangladesh' },
      { label: 'Accounting Software Bangladesh', href: '/software/accounting-software-bangladesh' },
      { label: 'HR Payroll Software Bangladesh', href: '/software/hr-payroll-software-bangladesh' },
      { label: 'DSR Management Software Bangladesh', href: '/software/dsr-management-software-bangladesh' },
      { label: 'Shop Management Software Bangladesh', href: '/software/shop-management-software-bangladesh' },
    ],
  },
];

export const heroPortraitImage = heroDashboardImage;
export const contactUsImage = supportCallImage;

export const featureStoryImages = [
  retailCounterImage,
  dsrRouteImage,
  purchaseReceiveImage,
  dueCollectionImage,
  profitReportImage,
  reportsVisibilityImage,
];

export const featureHighlightImages = [
  tradersImage,
  groceryImage,
  pharmacyImage,
];

export const featureCardIcons = [ShoppingBag, ReceiptText, WalletCards, Warehouse, Boxes, BarChart3, RefreshCw, Printer];

export const solutionIcons = [Store, PackageCheck, Truck, Route];
export const solutionShowcaseImage = dashboardSummaryImage;
export const solutionHighlightImages = [
  { src: tradersImage },
  { src: groceryImage },
  { src: pharmacyImage },
  { src: dealerImage },
];

export const workflowIcons = [Warehouse, Boxes, ReceiptText, WalletCards, BarChart3];

export const roleStoryImages = [
  retailCounterImage,
  groceryImage,
  pharmacyImage,
  dueCollectionImage,
  dealerImage,
  supportCallImage,
];

export const financeSpotlightImages = [
  { src: profitReportImage, key: 'profitReport', fit: 'fill', position: 'center' },
  { src: dashboardSummaryImage, key: 'dashboardSummary', fit: 'fill', position: 'center' },
  { src: purchaseReceiveImage, key: 'purchaseReceive', fit: 'fill', position: 'center' },
  { src: dsrRouteImage, key: 'dsrRoute', fit: 'fill', position: 'center' },
  { src: reportsVisibilityImage, key: 'reportsVisibility', fit: 'fill', position: 'center' },
];

export const showcaseImages = [
  { src: heroDashboardImage, key: 'heroDashboard', fit: 'fill', position: 'center' },
  { src: groceryImage, key: 'grocery', fit: 'cover', position: 'center' },
  { src: pharmacyImage, key: 'pharmacy', fit: 'cover', position: 'center' },
  { src: tradersImage, key: 'traders', fit: 'cover', position: 'center' },
  { src: dealerImage, key: 'dealer', fit: 'cover', position: 'center' },
  { src: warehouseStockImage, key: 'warehouseStock', fit: 'cover', position: 'center' },
  { src: profitReportImage, key: 'profitReport', fit: 'fill', position: 'center' },
  { src: reportsVisibilityImage, key: 'reportsVisibility', fit: 'fill', position: 'center' },
  { src: accountingStatementImage, key: 'accountingStatement', fit: 'fill', position: 'center' },
];














