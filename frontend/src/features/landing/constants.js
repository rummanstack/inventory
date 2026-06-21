const land = (name) => encodeURI(`/land/${name}`);
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

export const heroDashboardImage = land('dashboard-summary.png');
export const heroMobileImage = land('mobile-dashboard.png');
export const contactUsImage = land('support-call.png');

export const featureStoryImages = [
  land('business-owner.png'),
  land('evening-settlement.png'),
  land('warehouse-stock.png'),
];

export const featureHighlightImages = [
  land('traders.png'),
  land('grocery.png'),
  land('pharmacy.png'),
];

export const featureShowcaseImage = land('showing.png');

export const featureCardIcons = [ShoppingBag, ReceiptText, WalletCards, Warehouse, Boxes, BarChart3, RefreshCw, Printer];

export const solutionIcons = [Store, PackageCheck, Truck, Route];
export const solutionShowcaseImage = land('showing.png');
export const solutionHighlightImages = [
  { src: land('traders.png') },
  { src: land('grocery.png') },
  { src: land('pharmacy.png') },
];

export const workflowIcons = [Warehouse, Boxes, ReceiptText, WalletCards, BarChart3];

export const showcaseImages = [
  { src: land('owner-laptop.png'), key: 'ownerLaptop', fit: 'cover' },
  { src: land('hero-dashboard.png'), key: 'heroDashboard', fit: 'cover' },
  { src: land('warehouse-stock.png'), key: 'warehouseStock', fit: 'cover' },
  { src: land('profit-report.png'), key: 'profitReport', fit: 'cover' },
  { src: land('contact-support.png'), key: 'contactUs', fit: 'cover' },
  { src: land('retail-counter-2.png'), key: 'retailCounter', fit: 'cover', position: 'top' },
  { src: land('due-collection.png'), key: 'dueCollection', fit: 'cover' },
];
