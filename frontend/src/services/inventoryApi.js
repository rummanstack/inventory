import { activityLogsApi } from './api/activityLogsApi.js';
import { auditApi } from './api/auditApi.js';
import { authApi } from './api/authApi.js';
import { customersApi } from './api/customersApi.js';
import { databaseBackupApi } from './api/databaseBackupApi.js';
import { dsrFinanceApi } from './api/dsrFinanceApi.js';
import { dsrsApi } from './api/dsrsApi.js';
import { expensesApi } from './api/expensesApi.js';
import { monthEndSummaryApi } from './api/monthEndSummaryApi.js';
import { morningIssueApi } from './api/morningIssueApi.js';
import { permissionsApi } from './api/permissionsApi.js';
import { platformApi } from './api/platformApi.js';
import { productsApi } from './api/productsApi.js';
import { profitApi } from './api/profitApi.js';
import { purchaseReceiveApi } from './api/purchaseReceiveApi.js';
import { settingsApi } from './api/settingsApi.js';
import { settlementsApi } from './api/settlementsApi.js';
import { supplierDueLedgerApi } from './api/supplierDueLedgerApi.js';
import { supplierPaymentsApi } from './api/supplierPaymentsApi.js';
import { suppliersApi } from './api/suppliersApi.js';
import { salesInvoicesApi } from './api/salesInvoicesApi.js';
import { customerDueLedgerApi } from './api/customerDueLedgerApi.js';
import { customerPaymentsApi } from './api/customerPaymentsApi.js';
import { salesReturnsApi } from './api/salesReturnsApi.js';
import { systemApi } from './api/systemApi.js';
import { usersApi } from './api/usersApi.js';

export const inventoryApi = {
  ...authApi,
  ...usersApi,
  ...activityLogsApi,
  ...auditApi,
  ...systemApi,
  ...expensesApi,
  ...profitApi,
  ...dsrFinanceApi,
  ...monthEndSummaryApi,
  ...databaseBackupApi,
  ...productsApi,
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
  ...supplierPaymentsApi,
  ...salesInvoicesApi,
  ...customerDueLedgerApi,
  ...customerPaymentsApi,
  ...salesReturnsApi,
};
