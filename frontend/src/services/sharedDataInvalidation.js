export const SHARED_DATA_DOMAINS = Object.freeze({
  PRODUCTS: 'products',
  DSRS: 'dsrs',
  SRS: 'srs',
  SUPPLIERS: 'suppliers',
  SHOPS: 'shops',
  RETAIL_CUSTOMERS: 'retailCustomers',
  PROMOTIONS: 'promotions',
});

const D = SHARED_DATA_DOMAINS;
const mutationListeners = new Set();

const MUTATION_RULES = [
  { pattern: /^\/products(?:\/|$)/, domains: [D.PRODUCTS] },
  { pattern: /^\/(?:categories|brands|manufacturers|generic-medicines)(?:\/|$)/, domains: [D.PRODUCTS] },
  { pattern: /^\/product-serials(?:\/|$)/, domains: [D.PRODUCTS] },
  { pattern: /^\/purchase-receive(?:\/|$)/, domains: [D.PRODUCTS, D.SUPPLIERS] },
  { pattern: /^\/purchase-returns(?:\/|$)/, domains: [D.PRODUCTS, D.SUPPLIERS] },
  { pattern: /^\/suppliers(?:\/|$)/, domains: [D.SUPPLIERS] },
  { pattern: /^\/supplier-(?:payments|discounts)(?:\/|$)/, domains: [D.SUPPLIERS] },
  { pattern: /^\/sales-invoices(?:\/|$)/, domains: [D.PRODUCTS, D.RETAIL_CUSTOMERS] },
  { pattern: /^\/sales-returns(?:\/|$)/, domains: [D.PRODUCTS, D.RETAIL_CUSTOMERS] },
  { pattern: /^\/customer-payments(?:\/|$)/, domains: [D.RETAIL_CUSTOMERS] },
  { pattern: /^\/retail-customers(?:\/|$)/, domains: [D.RETAIL_CUSTOMERS] },
  { pattern: /^\/installments(?:\/|$)/, domains: [D.PRODUCTS, D.RETAIL_CUSTOMERS] },
  { pattern: /^\/trade-ins(?:\/|$)/, domains: [D.PRODUCTS, D.RETAIL_CUSTOMERS] },
  { pattern: /^\/dsrs(?:\/|$)/, domains: [D.DSRS] },
  { pattern: /^\/srs(?:\/|$)/, domains: [D.SRS] },
  { pattern: /^\/customers(?:\/|$)/, domains: [D.SHOPS] },
  { pattern: /^\/(?:issues|settlements)(?:\/|$)/, domains: [D.PRODUCTS, D.DSRS, D.SHOPS] },
  { pattern: /^\/retail-promotions(?:\/|$)/, domains: [D.PROMOTIONS] },
];

const ROUTE_RULES = [
  { pattern: /^\/dashboard(?:\/|$)/, domains: [D.PRODUCTS, D.DSRS, D.SHOPS] },
  { pattern: /^\/products(?:\/|$)/, domains: [D.PRODUCTS, D.SUPPLIERS] },
  { pattern: /^\/(?:stock-movement|low-stock-alerts|product-serials|damaged-stock)(?:\/|$)/, domains: [D.PRODUCTS] },
  { pattern: /^\/purchase-(?:receive|returns)(?:\/|$)/, domains: [D.PRODUCTS, D.SUPPLIERS] },
  { pattern: /^\/supplier(?:s|-payments|-discounts|-statement|-ledger)(?:\/|$)/, domains: [D.SUPPLIERS] },
  { pattern: /^\/retailer\/(?:quick-sale|sales-invoices|sales-return)(?:\/|$)/, domains: [D.PRODUCTS, D.RETAIL_CUSTOMERS, D.PROMOTIONS] },
  { pattern: /^\/retailer\/(?:customer-due|due-collection)(?:\/|$)/, domains: [D.RETAIL_CUSTOMERS] },
  { pattern: /^\/retailer\/promotions(?:\/|$)/, domains: [D.PROMOTIONS] },
  { pattern: /^\/retail-customers(?:\/|$)/, domains: [D.RETAIL_CUSTOMERS] },
  { pattern: /^\/installment-sales(?:\/|$)/, domains: [D.PRODUCTS, D.RETAIL_CUSTOMERS] },
  { pattern: /^\/(?:quotations|trade-ins)(?:\/|$)/, domains: [D.PRODUCTS, D.RETAIL_CUSTOMERS] },
  { pattern: /^\/dsrs(?:\/|$)/, domains: [D.DSRS] },
  { pattern: /^\/(?:morning-issue|settlements|dsr-finance)(?:\/|$)/, domains: [D.PRODUCTS, D.DSRS, D.SHOPS] },
  { pattern: /^\/customers(?:\/|$)/, domains: [D.SHOPS, D.SRS] },
  { pattern: /^\/shop-due-ledger(?:\/|$)/, domains: [D.SHOPS] },
  { pattern: /^\/srs(?:\/|$)/, domains: [D.SRS, D.SHOPS] },
  { pattern: /^\/sr-due-ledger(?:\/|$)/, domains: [D.SRS] },
  { pattern: /^\/(?:warranty-claims|repair-jobs)(?:\/|$)/, domains: [D.PRODUCTS, D.SUPPLIERS] },
  { pattern: /^\/finance-accounts(?:\/|$)/, domains: [D.PRODUCTS] },
  { pattern: /^\/accounting\/(?:opening-balances|journal-vouchers|receipt-vouchers|payment-vouchers)(?:\/|$)/, domains: [D.RETAIL_CUSTOMERS, D.SUPPLIERS] },
  { pattern: /^\/issue-center(?:\/|$)/, domains: [D.PRODUCTS, D.DSRS, D.SHOPS] },
  { pattern: /^\/reports\/batch-sales(?:\/|$)/, domains: [D.PRODUCTS] },
];

function matchingDomains(value, rules) {
  const domains = new Set();
  for (const rule of rules) {
    if (rule.pattern.test(value)) {
      rule.domains.forEach((domain) => domains.add(domain));
    }
  }
  return [...domains];
}

export function getSharedDataDomainsForMutation(path) {
  return matchingDomains(path, MUTATION_RULES);
}

export function getSharedDataDependencies(pathname) {
  return matchingDomains(pathname, ROUTE_RULES);
}

export function notifySharedDataMutation(path, method = 'GET') {
  const normalizedMethod = String(method).toUpperCase();
  if (normalizedMethod === 'GET' || normalizedMethod === 'HEAD' || normalizedMethod === 'OPTIONS') return;

  const domains = getSharedDataDomainsForMutation(path);
  if (!domains.length) return;
  mutationListeners.forEach((listener) => listener(domains));
}

export function subscribeToSharedDataInvalidation(listener) {
  mutationListeners.add(listener);
  return () => mutationListeners.delete(listener);
}
