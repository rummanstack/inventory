import { contactEmail, contactPhone, socialLinks } from '../features/landing/constants.js';
import { SEO_CONFIG } from './config';

export const SCHEMA_SITE_CONFIG = {
  siteUrl: SEO_CONFIG.siteUrl,
  siteName: SEO_CONFIG.siteName,
  logoUrl: `${SEO_CONFIG.siteUrl}/stockledger-icon-512x512.png`,
  priceCurrency: 'BDT',
  contactEmail,
  contactPhone,
  sameAs: Object.values(socialLinks).filter((url) => url && url !== '#'),
};

export const STATIC_PAGE_FAQS = {
  '/landing': [
    ['What can businesses manage with StockLedger?', 'StockLedger connects sales, inventory, purchasing, accounting, HR and payroll, field operations, customer dues, service, reporting, permissions, and administration in one system.'],
    ['Do I need every module on day one?', 'No. Businesses can start with the workflows that create immediate daily value and expand later.'],
  ],
  '/pricing': [
    ['How is StockLedger pricing usually decided?', 'Pricing usually depends on business model, modules, users, branches, onboarding scope, and rollout needs rather than one flat checklist.'],
    ['Can I start with fewer modules first?', 'Yes. Businesses can begin with priority modules and expand after the team is stable on the first workflow set.'],
  ],
  '/contact': [
    ['When should I use the Contact page?', 'Use Contact when you want a demo, pricing discussion, commercial answers, or advice on whether StockLedger fits your business.'],
    ['What happens after I contact StockLedger?', 'The team reviews your business type, workflows, module priorities, onboarding scope, and pricing direction before recommending the right next step.'],
  ],
  '/get-started': [
    ['What is the best way to start with StockLedger?', 'Start with the workflow that removes the biggest daily bottleneck first, then expand after the team is confident.'],
    ['Do I need perfect data before onboarding?', 'No. You need enough structure for the first workflows to succeed cleanly, not a perfect data environment.'],
  ],
};
