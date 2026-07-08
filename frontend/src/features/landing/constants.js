import businessOwnerImage from '../../assets/landing/business-owner.png';
import dealerImage from '../../assets/landing/dealer.png';
import dsrRouteImage from '../../assets/landing/dsr-route.png';
import dueCollectionImage from '../../assets/landing/due-collection.png';
import eveningSettlementImage from '../../assets/landing/evening-settlement.png';
import groceryImage from '../../assets/landing/grocery.png';
import ownerLaptopImage from '../../assets/landing/owner-laptop.png';
import pharmacyImage from '../../assets/landing/pharmacy.png';
import profitReportImage from '../../assets/landing/profit-report.png';
import purchaseReceiveImage from '../../assets/landing/purchase-receive.png';
import retailCounterImage from '../../assets/landing/retail-counter.png';
import supplierPurchaseImage from '../../assets/landing/supplier-purchase.png';
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

// TODO: replace '#' with your real profile URLs for each platform.
export const socialLinks = {
  facebook: '#',
  instagram: '#',
  linkedin: '#',
  twitter: '#',
  telegram: '#',
};

export const navLinks = [
  { key: 'features', href: '#features' },
  { key: 'solutions', href: '#solutions' },
  { key: 'workflow', href: '#workflow' },
  { key: 'getStarted', href: '#get-started' },
  { key: 'pricing', href: '#pricing' },
  { key: 'contact', href: '#contact-form' },
];

export const heroPortraitImage = businessOwnerImage;
export const contactUsImage = supportCallImage;

export const featureStoryImages = [
  retailCounterImage,
  eveningSettlementImage,
  warehouseStockImage,
  supplierPurchaseImage,
  ownerLaptopImage,
  dueCollectionImage,
];

export const featureHighlightImages = [
  tradersImage,
  groceryImage,
  pharmacyImage,
];

export const featureCardIcons = [ShoppingBag, ReceiptText, WalletCards, Warehouse, Boxes, BarChart3, RefreshCw, Printer];

export const solutionIcons = [Store, PackageCheck, Truck, Route];
export const solutionShowcaseImage = businessOwnerImage;
export const solutionHighlightImages = [
  { src: tradersImage },
  { src: groceryImage },
  { src: pharmacyImage },
  { src: dealerImage },
];

export const workflowIcons = [Warehouse, Boxes, ReceiptText, WalletCards, BarChart3];

export const roleStoryImages = [
  businessOwnerImage,
  retailCounterImage,
  ownerLaptopImage,
  dueCollectionImage,
  dealerImage,
  supportCallImage,
];

export const financeSpotlightImages = [
  { src: profitReportImage, key: 'profitReport', position: 'top' },
  { src: ownerLaptopImage, key: 'ownerLaptop' },
  { src: purchaseReceiveImage, key: 'purchaseReceive' },
  { src: dsrRouteImage, key: 'dsrRoute' },
];

export const showcaseImages = [
  { src: ownerLaptopImage, key: 'ownerLaptop', fit: 'cover' },
  { src: warehouseStockImage, key: 'warehouseStock', fit: 'cover' },
  { src: profitReportImage, key: 'profitReport', fit: 'cover' },
  { src: retailCounterImage, key: 'retailCounter', fit: 'cover', position: 'top' },
  { src: dsrRouteImage, key: 'dsrRoute', fit: 'cover' },
  { src: purchaseReceiveImage, key: 'purchaseReceive', fit: 'cover' },
];
