import {
  C01Image,
  F02Image,
  F03Image,
  F04Image,
  F05Image,
  F06Image,
  F07Image,
  F09Image,
  L01Image,
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
  Landmark,
  PackageCheck,
  Printer,
  ReceiptText,
  RefreshCw,
  Route,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Users,
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
  F04Image,
];

export const featureHighlightImages = [
  S02Image,
  S06Image,
  S05Image,
];

export const featureCardIcons = [ShoppingBag, ReceiptText, WalletCards, Warehouse, Boxes, BarChart3, RefreshCw, Printer];

export const solutionIcons = [Store, PackageCheck, Truck, Route];
export const workflowIcons = [ShoppingBag, Landmark, Users, ShieldCheck, BarChart3];

export const roleStoryImages = [
  SW11Image,
  S06Image,
  S05Image,
  S01Image,
  S04Image,
  C01Image,
];

export const platformPillarImages = [F03Image, F04Image, F09Image];
