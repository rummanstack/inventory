import businessOwnerImage from '../../assets/landing/business-owner.png';
import contactSupportImage from '../../assets/landing/contact-support.png';
import dashboardSummaryImage from '../../assets/landing/dashboard-summary.png';
import dealerImage from '../../assets/landing/dealer.png';
import deliveryTruckImage from '../../assets/landing/delivery-truck.png';
import dsrRouteImage from '../../assets/landing/dsr-route.png';
import dueCollectionImage from '../../assets/landing/due-collection.png';
import eveningSettlementImage from '../../assets/landing/evening-settlement.png';
import groceryImage from '../../assets/landing/grocery.png';
import heroDashboardImageFile from '../../assets/landing/hero-dashboard.png';
import mobileDashboardImage from '../../assets/landing/mobile-dashboard.png';
import ownerLaptopImage from '../../assets/landing/owner-laptop.png';
import pharmacyImage from '../../assets/landing/pharmacy.png';
import profitReportImage from '../../assets/landing/profit-report.png';
import purchaseReceiveImage from '../../assets/landing/purchase-receive.png';
import retailCounterImage from '../../assets/landing/retail-counter.png';
import retailCounter2Image from '../../assets/landing/retail-counter-2.png';
import shopCounter2Image from '../../assets/landing/shop-counter-2.png';
import showingImage from '../../assets/landing/showing.png';
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

export const navLinks = [
  { key: 'features', href: '#features' },
  { key: 'solutions', href: '#solutions' },
  { key: 'workflow', href: '#workflow' },
  { key: 'getStarted', href: '#get-started' },
  { key: 'pricing', href: '#pricing' },
  { key: 'contact', href: '#contact-form' },
];

export const heroDashboardImage = dashboardSummaryImage;
export const heroMobileImage = mobileDashboardImage;
export const contactUsImage = supportCallImage;

export const featureStoryImages = [
  businessOwnerImage,
  eveningSettlementImage,
  warehouseStockImage,
];

export const featureHighlightImages = [
  tradersImage,
  groceryImage,
  pharmacyImage,
];

export const featureShowcaseImage = showingImage;

export const landingImageAssets = {
  businessOwner: businessOwnerImage,
  contactSupport: contactSupportImage,
  dashboardSummary: dashboardSummaryImage,
  dealer: dealerImage,
  deliveryTruck: deliveryTruckImage,
  dsrRoute: dsrRouteImage,
  dueCollection: dueCollectionImage,
  eveningSettlement: eveningSettlementImage,
  grocery: groceryImage,
  heroDashboard: heroDashboardImageFile,
  mobileDashboard: mobileDashboardImage,
  ownerLaptop: ownerLaptopImage,
  pharmacy: pharmacyImage,
  profitReport: profitReportImage,
  purchaseReceive: purchaseReceiveImage,
  retailCounter: retailCounterImage,
  retailCounter2: retailCounter2Image,
  shopCounter2: shopCounter2Image,
  showing: showingImage,
  supplierPurchase: supplierPurchaseImage,
  supportCall: supportCallImage,
  traders: tradersImage,
  warehouseStock: warehouseStockImage,
};

export const featureCardIcons = [ShoppingBag, ReceiptText, WalletCards, Warehouse, Boxes, BarChart3, RefreshCw, Printer];

export const solutionIcons = [Store, PackageCheck, Truck, Route];
export const solutionShowcaseImage = showingImage;
export const solutionHighlightImages = [
  { src: tradersImage },
  { src: groceryImage },
  { src: pharmacyImage },
  { src: dealerImage },
];

export const workflowIcons = [Warehouse, Boxes, ReceiptText, WalletCards, BarChart3];

export const showcaseImages = [
  { src: ownerLaptopImage, key: 'ownerLaptop', fit: 'cover' },
  { src: heroDashboardImageFile, key: 'heroDashboard', fit: 'cover' },
  { src: warehouseStockImage, key: 'warehouseStock', fit: 'cover' },
  { src: profitReportImage, key: 'profitReport', fit: 'cover' },
  { src: contactSupportImage, key: 'contactUs', fit: 'cover' },
  { src: retailCounter2Image, key: 'retailCounter', fit: 'cover', position: 'top' },
  { src: dueCollectionImage, key: 'dueCollection', fit: 'cover' },
];
