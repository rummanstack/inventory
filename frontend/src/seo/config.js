export const SEO_CONFIG = {
  siteName: 'StockLedger',
  siteUrl: import.meta.env.VITE_SITE_URL || 'https://stockledger.pro',
  defaultLocale: 'en_US',
  defaultLanguage: 'en',
  themeColor: '#0e0c25',
  tileColor: '#0e0c25',
  titleTemplate: '%s | StockLedger',
  defaultTitle: 'StockLedger Business Management System for Shops, Dealers & DSR Teams',
  defaultDescription:
    'StockLedger is a complete business system for shops, dealers, wholesalers and DSR teams in Bangladesh. Manage sales, stock, due, settlement, purchases, accounts, reports and profit in one place.',
  defaultKeywords:
    'business management system Bangladesh, shop management system, dealer software, DSR software, wholesale software, retail POS, stock management, due collection, sales report, profit report, StockLedger',
  defaultImage: '/stockledger-og.png',
  defaultImageAlt: 'StockLedger dashboard showing sales, stock, due and profit reports',
  defaultImageWidth: '1672',
  defaultImageHeight: '941',
  twitterCard: 'summary_large_image',
};

export const PUBLIC_ROUTE_METADATA = {
  '/landing': {
    title: SEO_CONFIG.defaultTitle,
    description:
      'A complete business system for Bangladesh shops, dealers, wholesalers and DSR teams. Manage sales, stock, due, settlement, purchases, reports and profit from one dashboard.',
    canonicalPath: '/landing',
    robots: 'index,follow,max-image-preview:large',
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    description:
      'Read the StockLedger privacy policy for how account, business, contact and usage data is handled for customers and visitors.',
    canonicalPath: '/privacy-policy',
    robots: 'index,follow,max-image-preview:large',
  },
  '/terms': {
    title: 'Terms and Conditions',
    description:
      'Review the StockLedger terms and conditions for using the business management platform and related services.',
    canonicalPath: '/terms',
    robots: 'index,follow,max-image-preview:large',
  },
  '/founder': {
    title: 'Founder',
    description:
      'Learn about the founder behind StockLedger and the product vision for practical business management software in Bangladesh.',
    canonicalPath: '/founder',
    robots: 'index,follow,max-image-preview:large',
  },
};

export const AUTH_ROUTE_METADATA = {
  '/login': {
    title: 'Login',
    description: 'Sign in to your StockLedger business management workspace.',
    canonicalPath: '/login',
    robots: 'noindex,nofollow,noarchive',
  },
  '/register': {
    title: 'Register',
    description: 'Request access to StockLedger for your business.',
    canonicalPath: '/register',
    robots: 'noindex,nofollow,noarchive',
  },
};

export const SEO_PAGE_METADATA = {
  '/features': {
    title: 'StockLedger Features',
    description: 'Explore StockLedger features for inventory, retail POS, accounting, HR and payroll, purchases, due collection, DSR management, installments, reporting, and repair workflows.',
    canonicalPath: '/features',
    robots: 'index,follow,max-image-preview:large',
  },
  '/features/inventory-management': {
    title: 'Inventory Management Software',
    description: 'Control product stock, purchases, returns, damaged goods, low-stock alerts, serials, and supplier records from one connected StockLedger workspace.',
    canonicalPath: '/features/inventory-management',
    robots: 'index,follow,max-image-preview:large',
  },
  '/features/retail-pos': {
    title: 'Retail POS Software',
    description: 'Run quick sales, print receipts, manage cash sessions, record returns, and keep stock and customer dues updated from the sales counter.',
    canonicalPath: '/features/retail-pos',
    robots: 'index,follow,max-image-preview:large',
  },
  '/features/accounting': {
    title: 'Accounting Software',
    description: 'Connect daily operations with accounting reports: cash, bank, expenses, journals, general ledger, trial balance, profit and loss, and balance sheet.',
    canonicalPath: '/features/accounting',
    robots: 'index,follow,max-image-preview:large',
  },
  '/features/hr-payroll': {
    title: 'HR and Payroll Software',
    description: 'Manage departments, designations, employees, attendance, leave, payroll, salary payments, loans, advances, and HR reports inside StockLedger.',
    canonicalPath: '/features/hr-payroll',
    robots: 'index,follow,max-image-preview:large',
  },
  '/features/purchase-management': {
    title: 'Purchase and Supplier Management Software',
    description: 'Record purchase receive, purchase returns, supplier payments, supplier discounts, supplier statements, and supplier due balances.',
    canonicalPath: '/features/purchase-management',
    robots: 'index,follow,max-image-preview:large',
  },
  '/features/due-collection': {
    title: 'Due Collection and Customer Ledger Software',
    description: 'Track retail customer dues, shop dues, customer payments, due collection, and account statements without losing payment history.',
    canonicalPath: '/features/due-collection',
    robots: 'index,follow,max-image-preview:large',
  },
  '/features/dsr-dealer-management': {
    title: 'DSR, Dealer, and Distributor Management Software',
    description: 'Manage morning issue, route sales, shops, SR and DSR records, evening settlement, returns, cash, and due ledgers for field sales teams.',
    canonicalPath: '/features/dsr-dealer-management',
    robots: 'index,follow,max-image-preview:large',
  },
  '/features/installment-sales': {
    title: 'Installment Sales Management Software',
    description: 'Manage installment plans, guarantors, schedules, due reports, collections, late fee rules, reschedules, and customer statements.',
    canonicalPath: '/features/installment-sales',
    robots: 'index,follow,max-image-preview:large',
  },
  '/features/reporting': {
    title: 'Business Reporting Software',
    description: 'Use dashboards, daily sales reports, profit reports, stock movement, activity logs, financial statements, and operational reports to understand the business.',
    canonicalPath: '/features/reporting',
    robots: 'index,follow,max-image-preview:large',
  },
  '/features/repair-warranty': {
    title: 'Repair Job and Warranty Claim Management Software',
    description: 'Track repair jobs, warranty claims, product serial history, customer service status, and after-sales records in one system.',
    canonicalPath: '/features/repair-warranty',
    robots: 'index,follow,max-image-preview:large',
  },
  '/solutions': {
    title: 'StockLedger Solutions by Business Type',
    description: 'See how StockLedger fits retail shops, wholesalers, dealers, distributors, DSR sales teams, pharmacies, and grocery stores in Bangladesh.',
    canonicalPath: '/solutions',
    robots: 'index,follow,max-image-preview:large',
  },
  '/solutions/retail-shop': {
    title: 'Business Software for Retail Shops in Bangladesh',
    description: 'Run sales, receipts, stock, customer dues, purchases, expenses, reports, and profit from one system built for everyday shop operations.',
    canonicalPath: '/solutions/retail-shop',
    robots: 'index,follow,max-image-preview:large',
  },
  '/solutions/wholesale-business': {
    title: 'Wholesale Business Management Software',
    description: 'Manage bulk sales, supplier purchases, customer balances, stock, due collection, finance, and reports for wholesale trading businesses.',
    canonicalPath: '/solutions/wholesale-business',
    robots: 'index,follow,max-image-preview:large',
  },
  '/solutions/dealer-distributor': {
    title: 'Dealer and Distributor Management Software',
    description: 'Control route teams, DSR issue and settlement, shop dues, supplier purchases, stock, collections, and accounting from one platform.',
    canonicalPath: '/solutions/dealer-distributor',
    robots: 'index,follow,max-image-preview:large',
  },
  '/solutions/dsr-sales-team': {
    title: 'DSR Sales Team Management Software',
    description: 'Track sales reps, morning issue, route activity, cash collection, returns, evening settlement, and due ledgers with clear accountability.',
    canonicalPath: '/solutions/dsr-sales-team',
    robots: 'index,follow,max-image-preview:large',
  },
  '/solutions/pharmacy': {
    title: 'Pharmacy Management Software',
    description: 'Manage medicine stock, purchases, customer sales, supplier records, dues, expenses, and reports for pharmacy and medical retail businesses.',
    canonicalPath: '/solutions/pharmacy',
    robots: 'index,follow,max-image-preview:large',
  },
  '/solutions/grocery-store': {
    title: 'Grocery Store Management Software',
    description: 'Run fast billing, product stock, customer dues, supplier purchases, cash sessions, expenses, and daily profit reports for grocery stores.',
    canonicalPath: '/solutions/grocery-store',
    robots: 'index,follow,max-image-preview:large',
  },
  '/pricing': {
    title: 'Pricing',
    description: 'Compare StockLedger plans for sales, inventory, accounting, HR, DSR, installments, reports, setup, training, and support.',
    canonicalPath: '/pricing',
    robots: 'index,follow,max-image-preview:large',
  },
  '/get-started': {
    title: 'Get Started',
    description: 'Start StockLedger with the right setup for your business workflows, modules, users, opening data, training, and onboarding path.',
    canonicalPath: '/get-started',
    robots: 'index,follow,max-image-preview:large',
  },  '/contact': {
    title: 'Contact StockLedger',
    description: 'Book a StockLedger demo or ask about setup, pricing, modules, users, branches, training, and the right configuration for your business.',
    canonicalPath: '/contact',
    robots: 'index,follow,max-image-preview:large',
  },
};
export const PRIVATE_APP_METADATA = {
  title: 'Workspace',
  description: 'StockLedger secure business management workspace.',
  canonicalPath: '/landing',
  robots: 'noindex,nofollow,noarchive',
};
