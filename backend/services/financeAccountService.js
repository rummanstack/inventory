import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { cleanMoney } from "../lib/normalizers.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { FINANCE_ACCOUNT_ACTIONS } from "../lib/auditActions.js";
import { JOURNAL_SOURCE_TYPES } from "../lib/journalSourceTypes.js";
import {
  listAccounts as listAccountsRepo,
  findAccountByType,
  findAccountForUpdate,
  insertAccount,
  updateAccountBalance,
  listTransactionsPage,
  countTransactions,
  findTransactionForUpdate,
  findTransactionByTransferId,
  softDeleteTransaction,
  mapTransaction,
} from "../repositories/financeAccountRepository.js";
import { logActivity, recordFinanceAccountTransaction } from "./shared/inventoryHelpers.js";

export const ACCOUNT_TYPES = ["CASH", "BANK"];
const TRANSACTION_TYPES = ["DEPOSIT", "WITHDRAWAL"];
const DATE_ERROR = "Date must be in YYYY-MM-DD format.";

const DEFAULT_ACCOUNTS = [
  { type: "CASH", name: "Cash in Hand" },
  { type: "BANK", name: "Bank" },
];

function computeAmounts(type, amount, currentBalance) {
  const debit = type === "DEPOSIT" ? amount : 0;
  const credit = type === "WITHDRAWAL" ? amount : 0;
  return { debit, credit, balanceAfter: currentBalance + debit - credit };
}

export class FinanceAccountService {
  constructor(databaseManager, { auditService, journalService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.journalService = journalService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async ensureDefaultAccounts(client, tenantId) {
    for (const account of DEFAULT_ACCOUNTS) {
      await insertAccount(client, {
        id: createId("finance-account"),
        tenantId,
        type: account.type,
        name: account.name,
        balance: 0,
      });
    }
  }

  async listAccounts(actor) {
    return this.databaseManager.withClient(async (client) => {
      await this.ensureDefaultAccounts(client, actor.tenantId);
      return listAccountsRepo(client, actor.tenantId);
    });
  }

  async recordTransactionInClient(client, { accountType, type, amount, date, note }, actor) {
    const normalizedAccountType = ACCOUNT_TYPES.includes(String(accountType || "").toUpperCase())
      ? String(accountType).toUpperCase()
      : "CASH";
    await this.ensureDefaultAccounts(client, actor.tenantId);
    const accountSummary = await findAccountByType(client, actor.tenantId, normalizedAccountType);
    const account = await findAccountForUpdate(client, accountSummary.id, actor.tenantId);

    if (type === "WITHDRAWAL") {
      assert(amount <= account.balance, `Insufficient cash balance. Available: ${account.balance}, required: ${amount}.`, 400);
    }

    const { debit, credit, balanceAfter } = computeAmounts(type, amount, account.balance);

    await recordFinanceAccountTransaction(client, {
      tenantId: actor.tenantId,
      accountId: account.id,
      transactionDate: date,
      type,
      debit,
      credit,
      balanceAfter,
      note,
      createdById: actor.id,
    });

    await updateAccountBalance(client, account.id, actor.tenantId, balanceAfter);
  }

  async recordTransaction(input, actor) {
    const accountType = String(input.accountType || "").trim().toUpperCase();
    const type = String(input.type || "").trim().toUpperCase();
    const amount = cleanMoney(input.amount);
    const date = normalizeIsoDate(input.date, new Date().toISOString().slice(0, 10), DATE_ERROR);
    const note = String(input.note || "").trim();

    assert(ACCOUNT_TYPES.includes(accountType), "Invalid account type.");
    assert(TRANSACTION_TYPES.includes(type), "Invalid transaction type.");
    assert(amount > 0, "Amount must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      await this.ensureDefaultAccounts(client, actor.tenantId);

      const accountSummary = await findAccountByType(client, actor.tenantId, accountType);
      const account = await findAccountForUpdate(client, accountSummary.id, actor.tenantId);

      if (type === "WITHDRAWAL") {
        assert(amount <= account.balance, `Insufficient cash balance. Available: ${account.balance}, required: ${amount}.`, 400);
      }

      const { debit, credit, balanceAfter } = computeAmounts(type, amount, account.balance);

      const row = await recordFinanceAccountTransaction(client, {
        tenantId: actor.tenantId,
        accountId: account.id,
        transactionDate: date,
        type,
        debit,
        credit,
        balanceAfter,
        note,
        createdById: actor.id,
      });

      await updateAccountBalance(client, account.id, actor.tenantId, balanceAfter);

      if (this.journalService) {
        await this.journalService.postFinanceManualTransaction(client, actor, {
          transactionId: row.id,
          date,
          accountType,
          type,
          amount,
          note,
        });
      }

      await this.recordActivity(client, actor, {
        actionType: type === "DEPOSIT" ? FINANCE_ACCOUNT_ACTIONS.DEPOSIT : FINANCE_ACCOUNT_ACTIONS.WITHDRAWAL,
        entityType: "finance_account_transaction",
        entityId: row.id,
        description: `${actor.name} recorded a ${type.toLowerCase()} of ${amount} for ${account.name}`,
        metadata: { accountType, amount, type },
      });

      return mapTransaction(row);
    });
  }

  async recordTransfer(input, actor) {
    const fromType = String(input.fromAccountType || "").trim().toUpperCase();
    const toType = String(input.toAccountType || "").trim().toUpperCase();
    const amount = cleanMoney(input.amount);
    const date = normalizeIsoDate(input.date, new Date().toISOString().slice(0, 10), DATE_ERROR);
    const note = String(input.note || "").trim();

    assert(ACCOUNT_TYPES.includes(fromType), "Invalid source account type.");
    assert(ACCOUNT_TYPES.includes(toType), "Invalid destination account type.");
    assert(fromType !== toType, "Source and destination accounts must be different.");
    assert(amount > 0, "Amount must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      await this.ensureDefaultAccounts(client, actor.tenantId);

      const fromSummary = await findAccountByType(client, actor.tenantId, fromType);
      const toSummary = await findAccountByType(client, actor.tenantId, toType);

      const [firstId, secondId] = [fromSummary.id, toSummary.id].sort();
      const firstAccount = await findAccountForUpdate(client, firstId, actor.tenantId);
      const secondAccount = await findAccountForUpdate(client, secondId, actor.tenantId);

      const fromAccount = fromSummary.id === firstAccount.id ? firstAccount : secondAccount;
      const toAccount = toSummary.id === firstAccount.id ? firstAccount : secondAccount;

      assert(amount <= fromAccount.balance, `Insufficient balance in ${fromAccount.name}. Available: ${fromAccount.balance}, required: ${amount}.`, 400);

      const transferId = createId("finance-transfer");
      const fromBalanceAfter = fromAccount.balance - amount;
      const toBalanceAfter = toAccount.balance + amount;

      const outRow = await recordFinanceAccountTransaction(client, {
        tenantId: actor.tenantId,
        accountId: fromAccount.id,
        transactionDate: date,
        type: "TRANSFER_OUT",
        debit: 0,
        credit: amount,
        balanceAfter: fromBalanceAfter,
        transferId,
        note,
        createdById: actor.id,
      });

      await recordFinanceAccountTransaction(client, {
        tenantId: actor.tenantId,
        accountId: toAccount.id,
        transactionDate: date,
        type: "TRANSFER_IN",
        debit: amount,
        credit: 0,
        balanceAfter: toBalanceAfter,
        transferId,
        note,
        createdById: actor.id,
      });

      await updateAccountBalance(client, fromAccount.id, actor.tenantId, fromBalanceAfter);
      await updateAccountBalance(client, toAccount.id, actor.tenantId, toBalanceAfter);

      if (this.journalService) {
        await this.journalService.postFinanceTransfer(client, actor, {
          transferId,
          date,
          fromAccountType: fromType,
          toAccountType: toType,
          amount,
          note,
        });
      }

      await this.recordActivity(client, actor, {
        actionType: FINANCE_ACCOUNT_ACTIONS.TRANSFER,
        entityType: "finance_account_transaction",
        entityId: outRow.id,
        description: `${actor.name} transferred ${amount} from ${fromAccount.name} to ${toAccount.name}`,
        metadata: { fromAccountType: fromType, toAccountType: toType, amount },
      });

      return { ok: true };
    });
  }

  async listTransactions(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const accountType = String(query.accountType || "").trim().toUpperCase();
    const dateFrom = String(query.dateFrom || "").trim()
      ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR)
      : undefined;
    const dateTo = String(query.dateTo || "").trim()
      ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR)
      : undefined;

    const filters = {
      tenantId: actor.tenantId,
      accountType: ACCOUNT_TYPES.includes(accountType) ? accountType : undefined,
      dateFrom,
      dateTo,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTransactionsPage(client, { ...filters, limit, offset }),
        countTransactions(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async removeTransaction(transactionId, actor, reason) {
    assert(String(reason || "").trim(), "Delete reason is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const transaction = await findTransactionForUpdate(client, transactionId, actor.tenantId);
      assert(transaction, "Transaction not found.", 404);

      const related = transaction.transferId
        ? await findTransactionByTransferId(client, transaction.transferId, transaction.id, actor.tenantId)
        : null;

      await this.reverseTransaction(client, transaction, actor, reason);
      if (related) {
        await this.reverseTransaction(client, related, actor, reason);
      }

      if (this.journalService) {
        // A transfer posted ONE journal entry for the pair — reverse it once,
        // keyed by transferId, regardless of which leg's id was passed in.
        await this.journalService.reverse(client, {
          tenantId: actor.tenantId,
          sourceType: transaction.transferId
            ? JOURNAL_SOURCE_TYPES.FINANCE_TRANSFER
            : JOURNAL_SOURCE_TYPES.FINANCE_MANUAL_TRANSACTION,
          sourceId: transaction.transferId || transaction.id,
          reason,
          createdById: actor.id,
        });
      }

      await this.recordActivity(client, actor, {
        actionType: FINANCE_ACCOUNT_ACTIONS.DELETE,
        entityType: "finance_account_transaction",
        entityId: transaction.id,
        reason,
        description: `${actor.name} deleted finance account transaction (${reason})`,
        metadata: { type: transaction.type, debit: transaction.debit, credit: transaction.credit },
      });

      return { ok: true };
    });
  }

  async reverseTransaction(client, transaction, actor, reason) {
    await softDeleteTransaction(client, transaction.id, actor.tenantId, {
      deletedById: actor.id,
      deleteReason: reason,
    });

    const account = await findAccountForUpdate(client, transaction.accountId, actor.tenantId);
    const balanceAfter = account.balance - transaction.debit + transaction.credit;

    await recordFinanceAccountTransaction(client, {
      tenantId: actor.tenantId,
      accountId: account.id,
      transactionDate: new Date().toISOString().slice(0, 10),
      type: transaction.type,
      debit: transaction.credit,
      credit: transaction.debit,
      balanceAfter,
      transferId: transaction.transferId,
      note: `Reversal of transaction ${transaction.id}${reason ? ` (${reason})` : ""}`,
      createdById: actor.id,
    });

    await updateAccountBalance(client, account.id, actor.tenantId, balanceAfter);
  }
}
