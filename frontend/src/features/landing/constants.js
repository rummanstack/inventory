import dealerImage from '../../assets/landing/dealer.png';
import {
  C01Image,
  F01Image,
  F02Image,
  F03Image,
  F05Image,
  F06Image,
  F07Image,
  F09Image,
  L01Image,
  L02Image,
  S01Image,
  S02Image,
  S04Image,
  S05Image,
  S06Image,
  SW11Image,
} from './data/marketingImages.js';
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
    description: 'Explore StockLedger by workflow.',
    links: [
      { label: 'Inventory Management', href: '/features/inventory-management', hint: 'Stock levels, movement and alerts' },
      { label: 'Retail POS', href: '/features/retail-pos', hint: 'Fast billing, receipts and cash' },
      { label: 'Accounting', href: '/features/accounting', hint: 'Ledgers, statements and profit' },
      { label: 'HR & Payroll', href: '/features/hr-payroll', hint: 'Attendance, leave and salary' },
      { label: 'DSR Dealer Management', href: '/features/dsr-dealer-management', hint: 'Issue, collection and settlement' },
      { label: 'Reporting', href: '/features/reporting', hint: 'Sales, finance and operations' },
    ],
  },
  {
    title: 'Solutions',
    href: '/solutions',
    description: 'See the best-fit setup by business type.',
    links: [
      { label: 'Retail Shop', href: '/solutions/retail-shop', hint: 'POS, stock, dues and closing' },
      { label: 'Wholesale Business', href: '/solutions/wholesale-business', hint: 'Bulk sales, purchases and balances' },
      { label: 'Dealer Distributor', href: '/solutions/dealer-distributor', hint: 'Routes, stock issue and collection' },
      { label: 'DSR Sales Team', href: '/solutions/dsr-sales-team', hint: 'Field sales and daily settlement' },
      { label: 'Pharmacy', href: '/solutions/pharmacy', hint: 'Medicine stock, sales and suppliers' },
      { label: 'Grocery Store', href: '/solutions/grocery-store', hint: 'Billing, purchases and daily profit' },
    ],
  },
  {
    title: 'Software Guides',
    href: '/software',
    description: 'Jump into high-intent softwares',
    links: [
      { label: 'Inventory Software Bangladesh', href: '/software/inventory-software-bangladesh', hint: 'Stock control buyer guide' },
      { label: 'Retail POS Software Bangladesh', href: '/software/retail-pos-software-bangladesh', hint: 'POS buyer guide' },
      { label: 'Accounting Software Bangladesh', href: '/software/accounting-software-bangladesh', hint: 'Accounting buyer guide' },
      { label: 'HR Payroll Software Bangladesh', href: '/software/hr-payroll-software-bangladesh', hint: 'HR and payroll buyer guide' },
      { label: 'DSR Management Software Bangladesh', href: '/software/dsr-management-software-bangladesh', hint: 'Field sales buyer guide' },
      { label: 'Shop Management Software Bangladesh', href: '/software/shop-management-software-bangladesh', hint: 'Shop operations buyer guide' },
    ],
  },
];

export const heroPortraitImage = L01Image;
export const contactUsImage = C01Image;

export const featureStoryImages = [
  F02Image,
  F07Image,
  F05Image,
  F06Image,
  F03Image,
  L02Image,
];

export const featureHighlightImages = [
  S02Image,
  S06Image,
  S05Image,
];

export const featureCardIcons = [ShoppingBag, ReceiptText, WalletCards, Warehouse, Boxes, BarChart3, RefreshCw, Printer];

export const solutionIcons = [Store, PackageCheck, Truck, Route];
export const solutionShowcaseImage = S01Image;
export const solutionHighlightImages = [
  { src: S02Image },
  { src: S06Image },
  { src: S05Image },
  { src: dealerImage },
];

export const workflowIcons = [Warehouse, Boxes, ReceiptText, WalletCards, BarChart3];

export const roleStoryImages = [
  SW11Image,
  S06Image,
  S05Image,
  F06Image,
  S04Image,
  C01Image,
];

export const financeSpotlightImages = [
  { src: F03Image, key: 'profitReport', fit: 'fill', position: 'center' },
  { src: L01Image, key: 'dashboardSummary', fit: 'fill', position: 'center' },
  { src: F05Image, key: 'purchaseReceive', fit: 'fill', position: 'center' },
  { src: F07Image, key: 'dsrRoute', fit: 'fill', position: 'center' },
  { src: F09Image, key: 'reportsVisibility', fit: 'fill', position: 'center' },
];

export const showcaseImages = [
  { src: L01Image, key: 'heroDashboard', fit: 'fill', position: 'center' },
  { src: S06Image, key: 'grocery', fit: 'cover', position: 'center' },
  { src: S05Image, key: 'pharmacy', fit: 'cover', position: 'center' },
  { src: S02Image, key: 'traders', fit: 'cover', position: 'center' },
  { src: dealerImage, key: 'dealer', fit: 'cover', position: 'center' },
  { src: F01Image, key: 'warehouseStock', fit: 'cover', position: 'center' },
  { src: F03Image, key: 'profitReport', fit: 'fill', position: 'center' },
  { src: F09Image, key: 'reportsVisibility', fit: 'fill', position: 'center' },
  { src: F02Image, key: 'accountingStatement', fit: 'fill', position: 'center' },
];
