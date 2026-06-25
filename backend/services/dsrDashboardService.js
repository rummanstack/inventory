import { startOfMonth, startOfNextMonth } from "../lib/dateRanges.js";
import { countIssues } from "../repositories/issueRepository.js";
import { sumSettlementsInRange, listRecentSettlements } from "../repositories/settlementRepository.js";
import { sumLatestDueBalances, listDsrDueBalances } from "../repositories/dsrDueLedgerRepository.js";
import { countActiveShops } from "../repositories/customerRepository.js";

export class DsrDashboardService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async getDashboard(actor) {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const monthStart = startOfMonth(month);
    const nextMonthStart = startOfNextMonth(month);

    return this.databaseManager.withClient(async (client) => {
      const [issueCount, settlements, outstandingDue, activeShops, dsrBalances, recentSettlements] = await Promise.all([
        countIssues(client, { tenantId: actor.tenantId, dateFrom: monthStart, dateTo: today }),
        sumSettlementsInRange(client, actor.tenantId, monthStart, nextMonthStart),
        sumLatestDueBalances(client, actor.tenantId),
        countActiveShops(client, actor.tenantId),
        listDsrDueBalances(client, actor.tenantId),
        listRecentSettlements(client, actor.tenantId, 10),
      ]);

      return {
        month,
        monthlyIssueCount: issueCount,
        monthlyCollections: settlements.amountPaid,
        monthlyTotalPayable: settlements.totalPayable,
        monthlySettlementCount: settlements.count,
        outstandingDue,
        activeShopCount: activeShops,
        dsrBalances,
        recentSettlements,
      };
    });
  }
}
