import { activityLogsApi } from './api/activityLogsApi.js';
import { auditApi } from './api/auditApi.js';
import { authApi } from './api/authApi.js';
import { categoriesApi } from './api/categoriesApi.js';
import { brandsApi } from './api/brandsApi.js';
import { manufacturersApi } from './api/manufacturersApi.js';
import { genericMedicinesApi } from './api/genericMedicinesApi.js';
import { customersApi } from './api/customersApi.js';
import { databaseBackupApi } from './api/databaseBackupApi.js';
import { dsrFinanceApi } from './api/dsrFinanceApi.js';
import { dsrsApi } from './api/dsrsApi.js';
import { expensesApi } from './api/expensesApi.js';
import { morningIssueApi } from './api/morningIssueApi.js';
import { permissionsApi } from './api/permissionsApi.js';
import { platformApi } from './api/platformApi.js';
import { productsApi } from './api/productsApi.js';
import { productSerialsApi } from './api/productSerialsApi.js';
import { warrantyClaimsApi } from './api/warrantyClaimsApi.js';
import { repairJobsApi } from './api/repairJobsApi.js';
import { quotationsApi } from './api/quotationsApi.js';
import { tradeInsApi } from './api/tradeInsApi.js';
import { profitApi } from './api/profitApi.js';
import { journalApi } from './api/journalApi.js';
import { purchaseReceiveApi } from './api/purchaseReceiveApi.js';
import { purchaseReturnsApi } from './api/purchaseReturnsApi.js';
import { settingsApi } from './api/settingsApi.js';
import { settlementsApi } from './api/settlementsApi.js';
import { supplierDueLedgerApi } from './api/supplierDueLedgerApi.js';
import { supplierPaymentsApi } from './api/supplierPaymentsApi.js';
import { supplierDiscountsApi } from './api/supplierDiscountsApi.js';
import { suppliersApi } from './api/suppliersApi.js';
import { salesInvoicesApi } from './api/salesInvoicesApi.js';
import { customerDueLedgerApi } from './api/customerDueLedgerApi.js';
import { customerPaymentsApi } from './api/customerPaymentsApi.js';
import { salesReturnsApi } from './api/salesReturnsApi.js';
import { systemApi } from './api/systemApi.js';
import { uploadsApi } from './api/uploadsApi.js';
import { usersApi } from './api/usersApi.js';
import { financeAccountsApi } from './api/financeAccountsApi.js';
import { financeDashboardApi } from './api/financeDashboardApi.js';
import { retailCustomersApi } from './api/retailCustomersApi.js';
import { retailCashSessionsApi } from './api/retailCashSessionsApi.js';
import { retailPromotionsApi } from './api/retailPromotionsApi.js';
import { helpDeskApi } from './api/helpDeskApi.js';
import { visitorChatAdminApi } from './api/visitorChatAdminApi.js';
import { shopDueLedgerApi } from './api/shopDueLedgerApi.js';
import { srsApi } from './api/srsApi.js';
import { dsrTargetsApi } from './api/dsrTargetsApi.js';
import { departmentsApi } from './api/departmentsApi.js';
import { designationsApi } from './api/designationsApi.js';
import { employeesApi } from './api/employeesApi.js';
import { salaryPaymentsApi } from './api/salaryPaymentsApi.js';
import { stockMovementsApi } from './api/stockMovementsApi.js';
import { contactApi } from './api/contactApi.js';
import { registrationApi } from './api/registrationApi.js';
import { drugBatchApi } from './api/drugBatchApi.js';

export const inventoryApi = {
  ...authApi,
  ...usersApi,
  ...activityLogsApi,
  ...auditApi,
  ...systemApi,
  ...uploadsApi,
  ...expensesApi,
  ...profitApi,
  ...journalApi,
  ...dsrFinanceApi,
  ...databaseBackupApi,
  ...productsApi,
  ...productSerialsApi,
  ...warrantyClaimsApi,
  ...repairJobsApi,
  ...quotationsApi,
  ...tradeInsApi,
  ...categoriesApi,
  ...brandsApi,
  ...manufacturersApi,
  ...genericMedicinesApi,
  ...dsrsApi,
  ...customersApi,
  ...morningIssueApi,
  ...settlementsApi,
  ...platformApi,
  ...settingsApi,
  ...permissionsApi,
  ...suppliersApi,
  ...purchaseReceiveApi,
  ...supplierDueLedgerApi,
  ...purchaseReturnsApi,
  ...supplierPaymentsApi,
  ...supplierDiscountsApi,
  ...salesInvoicesApi,
  ...customerDueLedgerApi,
  ...customerPaymentsApi,
  ...salesReturnsApi,
  ...financeAccountsApi,
  ...financeDashboardApi,
  ...retailCustomersApi,
  ...retailCashSessionsApi,
  ...retailPromotionsApi,
  ...helpDeskApi,
  ...visitorChatAdminApi,
  ...shopDueLedgerApi,
  ...srsApi,
  ...dsrTargetsApi,
  ...departmentsApi,
  ...designationsApi,
  ...employeesApi,
  ...salaryPaymentsApi,
  ...stockMovementsApi,
  ...contactApi,
  ...registrationApi,
  ...drugBatchApi,
};

