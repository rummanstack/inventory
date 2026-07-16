import fs from "node:fs";
import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { ACCOUNTING_ACTIONS } from "../lib/auditActions.js";
import { JOURNAL_SOURCE_TYPES } from "../lib/journalSourceTypes.js";
import { hasPermission, PERMISSIONS } from "../lib/permissions.js";
import { USER_ROLES } from "../lib/roles.js";
import { getCachedFeatures } from "../lib/tenantFeatureCache.js";
import {
  findAccountDetailedByCode,
  findCustomerReference,
  findFinanceAccountReference,
  findPostingPeriodStatus,
  findSupplierReference,
  getAccountingSettings,
} from "../repositories/accountingRepository.js";
import {
  findVoucherAttachmentById,
  findVoucherById,
  findVoucherByReference,
  insertVoucher,
  insertVoucherAttachment,
  listJournalRegister,
  listVoucherAttachments,
  listVoucherLines,
  listVouchers,
  nextVoucherCounter,
  replaceVoucherLines,
  setVoucherState,
  softDeleteVoucher,
  softDeleteVoucherAttachment,
  updateVoucherHeader,
} from "../repositories/voucherRepository.js";

const VOUCHER_TYPES = ["JOURNAL", "RECEIPT", "PAYMENT", "CONTRA"];
const VOUCHER_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "POSTED", "REVERSED"];
const LINE_SIDES = ["DEBIT", "CREDIT"];
const LINE_REFERENCE_TYPES = ["", "CUSTOMER", "SUPPLIER", "FINANCE_ACCOUNT"];
const SOURCE_TYPE_BY_VOUCHER_TYPE = {
  JOURNAL: JOURNAL_SOURCE_TYPES.JOURNAL_VOUCHER,
  RECEIPT: JOURNAL_SOURCE_TYPES.RECEIPT_VOUCHER,
  PAYMENT: JOURNAL_SOURCE_TYPES.PAYMENT_VOUCHER,
  CONTRA: JOURNAL_SOURCE_TYPES.CONTRA_VOUCHER,
};
const PREFIX_FIELD_BY_TYPE = {
  JOURNAL: "journalVoucherPrefix",
  RECEIPT: "receiptVoucherPrefix",
  PAYMENT: "paymentVoucherPrefix",
  CONTRA: "contraVoucherPrefix",
};
const ACCESS_BY_VOUCHER_TYPE = {
  JOURNAL: { feature: "journal-vouchers", permission: PERMISSIONS.JOURNAL_CREATE },
  RECEIPT: { feature: "receipt-vouchers", permission: PERMISSIONS.VOUCHER_RECEIPT },
  PAYMENT: { feature: "payment-vouchers", permission: PERMISSIONS.VOUCHER_PAYMENT },
  CONTRA: { feature: "contra-vouchers", permission: PERMISSIONS.VOUCHER_CONTRA },
};
const WORKFLOW_PERMISSION_BY_ACTION = {
  approve: PERMISSIONS.JOURNAL_APPROVE,
  post: PERMISSIONS.JOURNAL_POST,
  reverse: PERMISSIONS.JOURNAL_REVERSE,
};

function normalizeCommon(input = {}, fallbackType = "JOURNAL") {
  return {
    voucherType: String(input.voucherType || fallbackType).trim().toUpperCase(),
    voucherDate: String(input.voucherDate || "").trim(),
    referenceNumber: String(input.referenceNumber || "").trim(),
    narration: String(input.narration || "").trim(),
    notes: String(input.notes || "").trim(),
    counterpartyName: String(input.counterpartyName || "").trim(),
    cashBankAccountCode: String(input.cashBankAccountCode || "").trim() || null,
    fromAccountCode: String(input.fromAccountCode || "").trim() || null,
    toAccountCode: String(input.toAccountCode || "").trim() || null,
  };
}

function normalizeJournalLines(lines = []) {
  return lines.map((line, index) => ({
    lineNo: index + 1,
    accountCode: String(line.accountCode || "").trim(),
    debit: Number(line.debit || 0),
    credit: Number(line.credit || 0),
    note: String(line.note || "").trim(),
    referenceType: String(line.referenceType || "").trim().toUpperCase(),
    referenceId: String(line.referenceId || "").trim() || null,
  }));
}

function normalizeAllocationLines(lines = []) {
  return lines.map((line, index) => ({
    lineNo: index + 1,
    accountCode: String(line.accountCode || "").trim(),
    amount: Number(line.amount || 0),
    note: String(line.note || "").trim(),
    referenceType: String(line.referenceType || "").trim().toUpperCase(),
    referenceId: String(line.referenceId || "").trim() || null,
  }));
}

function sumBySide(lines, side) {
  return lines.filter((line) => line.side === side).reduce((sum, line) => sum + line.amount, 0);
}

export class VoucherService {
  constructor(databaseManager, { auditService, journalService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.journalService = journalService;
  }

  assertVoucherTypeAccess(voucherType, action, actor) {
    const normalizedType = String(voucherType || "").trim().toUpperCase();
    const typeAccess = ACCESS_BY_VOUCHER_TYPE[normalizedType];
    assert(typeAccess, "Invalid voucher type.", 400);

    if (actor.role !== USER_ROLES.SYSTEM_DEVELOPER) {
      const features = getCachedFeatures(actor.tenantId);
      assert(
        features === null || features.includes(typeAccess.feature),
        "This voucher type is not enabled for your organization.",
        403,
      );
    }

    let permissions;
    if (["edit", "delete", "submit", "attachment"].includes(action)) {
      permissions = normalizedType === "JOURNAL"
        ? [PERMISSIONS.JOURNAL_EDIT]
        : [typeAccess.permission];
    } else if (WORKFLOW_PERMISSION_BY_ACTION[action]) {
      permissions = normalizedType === "JOURNAL"
        ? [WORKFLOW_PERMISSION_BY_ACTION[action]]
        : [typeAccess.permission, WORKFLOW_PERMISSION_BY_ACTION[action]];
    } else {
      permissions = [typeAccess.permission];
    }

    assert(
      permissions.every((permission) => hasPermission(actor.role, permission, actor.tenantId)),
      "Forbidden.",
      403,
    );
  }

  async authorizeVoucher(id, action, actor) {
    return this.databaseManager.withClient(async (client) => {
      const voucher = await findVoucherById(client, actor.tenantId, id);
      assert(voucher, "Voucher not found.", 404);
      this.assertVoucherTypeAccess(voucher.voucherType, action, actor);
      return voucher;
    });
  }

  async buildVoucherNumber(client, tenantId, voucherType) {
    const settings = await getAccountingSettings(client, tenantId);
    const prefixField = PREFIX_FIELD_BY_TYPE[voucherType];
    const prefix = (settings?.[prefixField] || settings?.voucherPrefix || voucherType.slice(0, 1)).trim().toUpperCase();
    const counter = await nextVoucherCounter(client, tenantId, voucherType);
    return `${prefix}-${String(counter).padStart(6, "0")}`;
  }

  async resolvePeriod(client, tenantId, voucherDate) {
    const period = await findPostingPeriodStatus(client, tenantId, voucherDate);
    if (!period) {
      return { fiscalYearId: null, accountingPeriodId: null };
    }
    return { fiscalYearId: period.fiscal_year_id, accountingPeriodId: period.period_id };
  }

  async assertPostingWindow(client, tenantId, voucherDate, actor, purpose = "use this voucher date") {
    const period = await findPostingPeriodStatus(client, tenantId, voucherDate);
    if (!period) return { fiscalYearId: null, accountingPeriodId: null };

    let blockedMessage = "";
    if (period.fiscal_year_status === "CLOSED") blockedMessage = `Fiscal year ${period.fiscal_year_name} is closed.`;
    else if (period.period_status === "CLOSED") blockedMessage = `Period ${period.period_name} is closed.`;
    else if (period.period_locked) blockedMessage = `Period ${period.period_name} is locked.`;

    if (blockedMessage) {
      const canOverride = actor && hasPermission(actor.role, PERMISSIONS.JOURNAL_OVERRIDE, actor.tenantId);
      assert(canOverride, blockedMessage, 400);

      await this.auditService?.record(client, {
        tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.JOURNAL_OVERRIDE,
        entityType: "accounting_period",
        entityId: period.period_id || period.fiscal_year_id,
        description: `${actor.name} overrode accounting controls to ${purpose}`,
        metadata: {
          voucherDate,
          fiscalYearId: period.fiscal_year_id,
          accountingPeriodId: period.period_id,
          blockedReason: blockedMessage,
        },
      });
    }

    return {
      fiscalYearId: period.fiscal_year_id,
      accountingPeriodId: period.period_id,
      overridden: Boolean(blockedMessage),
    };
  }

  async resolveAccount(client, code, { cashBankOnly = false } = {}) {
    assert(code, "Account is required.", 400);
    const account = await findAccountDetailedByCode(client, code);
    assert(account, `Account ${code} not found.`, 404);
    assert(account.isActive, `Account ${code} is inactive.`, 400);
    if (cashBankOnly) {
      assert(account.isCashAccount || account.isBankAccount, `Account ${code} must be a cash or bank account.`, 400);
    }
    return account;
  }

  async resolveReference(client, tenantId, referenceType, referenceId) {
    if (!referenceType) {
      return { referenceType: "", referenceId: null, referenceName: "" };
    }
    assert(LINE_REFERENCE_TYPES.includes(referenceType), "Invalid line reference type.", 400);
    if (referenceType === "CUSTOMER") {
      const customer = await findCustomerReference(client, referenceId, tenantId);
      assert(customer, "Customer not found.", 404);
      return { referenceType, referenceId: customer.id, referenceName: customer.name };
    }
    if (referenceType === "SUPPLIER") {
      const supplier = await findSupplierReference(client, referenceId, tenantId);
      assert(supplier, "Supplier not found.", 404);
      return { referenceType, referenceId: supplier.id, referenceName: supplier.name };
    }
    const financeAccount = await findFinanceAccountReference(client, referenceId, tenantId);
    assert(financeAccount, "Finance account not found.", 404);
    return { referenceType, referenceId: financeAccount.id, referenceName: financeAccount.name };
  }

  async buildStoredLines(client, payload, actor) {
    const common = normalizeCommon(payload, payload.voucherType);
    assert(VOUCHER_TYPES.includes(common.voucherType), "Invalid voucher type.", 400);
    assert(common.voucherDate, "Voucher date is required.", 400);
    await this.assertPostingWindow(client, actor.tenantId, common.voucherDate, actor, "create or edit a voucher");

    if (common.voucherType === "JOURNAL") {
      const lines = normalizeJournalLines(payload.lines || []);
      assert(lines.length >= 2, "Journal voucher requires at least two lines.", 400);
      const stored = [];
      for (const line of lines) {
        assert(line.accountCode, "Account is required on every line.", 400);
        const account = await this.resolveAccount(client, line.accountCode);
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        assert(debit >= 0 && credit >= 0, "Negative amounts are not allowed.", 400);
        assert((debit > 0) !== (credit > 0), "Each line must have either debit or credit amount.", 400);
        const resolvedReference = await this.resolveReference(client, actor.tenantId, line.referenceType, line.referenceId);
        stored.push({
          id: createId("vline"),
          lineNo: line.lineNo,
          accountCode: account.code,
          side: debit > 0 ? "DEBIT" : "CREDIT",
          amount: debit > 0 ? debit : credit,
          note: line.note,
          ...resolvedReference,
        });
      }
      return { common, lines: stored };
    }

    if (common.voucherType === "RECEIPT") {
      const header = await this.resolveAccount(client, common.cashBankAccountCode, { cashBankOnly: true });
      const allocations = normalizeAllocationLines(payload.lines || []);
      assert(allocations.length > 0, "Receipt voucher needs at least one allocation line.", 400);
      const stored = [{ id: createId("vline"), lineNo: 1, accountCode: header.code, side: "DEBIT", amount: 0, note: common.narration, referenceType: "", referenceId: null, referenceName: "" }];
      let total = 0;
      for (const line of allocations) {
        assert(line.amount > 0, "Allocation amount must be greater than zero.", 400);
        const account = await this.resolveAccount(client, line.accountCode);
        const ref = await this.resolveReference(client, actor.tenantId, line.referenceType, line.referenceId);
        total += line.amount;
        stored.push({ id: createId("vline"), lineNo: stored.length + 1, accountCode: account.code, side: "CREDIT", amount: line.amount, note: line.note, ...ref });
      }
      stored[0].amount = total;
      return { common, lines: stored };
    }

    if (common.voucherType === "PAYMENT") {
      const header = await this.resolveAccount(client, common.cashBankAccountCode, { cashBankOnly: true });
      const allocations = normalizeAllocationLines(payload.lines || []);
      assert(allocations.length > 0, "Payment voucher needs at least one allocation line.", 400);
      const stored = [];
      let total = 0;
      for (const line of allocations) {
        assert(line.amount > 0, "Allocation amount must be greater than zero.", 400);
        const account = await this.resolveAccount(client, line.accountCode);
        const ref = await this.resolveReference(client, actor.tenantId, line.referenceType, line.referenceId);
        total += line.amount;
        stored.push({ id: createId("vline"), lineNo: stored.length + 1, accountCode: account.code, side: "DEBIT", amount: line.amount, note: line.note, ...ref });
      }
      stored.push({ id: createId("vline"), lineNo: stored.length + 1, accountCode: header.code, side: "CREDIT", amount: total, note: common.narration, referenceType: "", referenceId: null, referenceName: "" });
      return { common, lines: stored };
    }

    const fromAccount = await this.resolveAccount(client, common.fromAccountCode, { cashBankOnly: true });
    const toAccount = await this.resolveAccount(client, common.toAccountCode, { cashBankOnly: true });
    assert(fromAccount.code !== toAccount.code, "Contra voucher accounts must be different.", 400);
    const amount = Number(payload.amount || 0);
    assert(amount > 0, "Contra voucher amount must be greater than zero.", 400);
    return {
      common,
      lines: [
        { id: createId("vline"), lineNo: 1, accountCode: toAccount.code, side: "DEBIT", amount, note: common.narration, referenceType: "", referenceId: null, referenceName: "" },
        { id: createId("vline"), lineNo: 2, accountCode: fromAccount.code, side: "CREDIT", amount, note: common.narration, referenceType: "", referenceId: null, referenceName: "" },
      ],
    };
  }

  assertBalanced(lines) {
    const totalDebit = sumBySide(lines, "DEBIT");
    const totalCredit = sumBySide(lines, "CREDIT");
    assert(totalDebit > 0 && totalCredit > 0, "Voucher must contain both debit and credit lines.", 400);
    assert(Math.abs(totalDebit - totalCredit) < 0.0001, "Total debit must equal total credit.", 400);
  }

  async getVoucherSnapshot(client, actor, id) {
    const voucher = await findVoucherById(client, actor.tenantId, id);
    assert(voucher, "Voucher not found.", 404);
    return {
      ...voucher,
      lines: await listVoucherLines(client, actor.tenantId, id),
      attachments: await listVoucherAttachments(client, actor.tenantId, id),
    };
  }

  async listVouchers(filters = {}, actor) {
    return this.databaseManager.withClient((client) => listVouchers(client, { tenantId: actor.tenantId, ...filters }));
  }

  async getVoucher(id, actor) {
    return this.databaseManager.withClient(async (client) => {
      const voucher = await findVoucherById(client, actor.tenantId, id);
      assert(voucher, "Voucher not found.", 404);
      return {
        ...voucher,
        lines: await listVoucherLines(client, actor.tenantId, id),
        attachments: await listVoucherAttachments(client, actor.tenantId, id),
      };
    });
  }

  async createVoucher(input, actor) {
    this.assertVoucherTypeAccess(input?.voucherType || "JOURNAL", "create", actor);
    return this.databaseManager.withTransaction(async (client) => {
      const { common, lines } = await this.buildStoredLines(client, input, actor);
      this.assertBalanced(lines);
      const duplicateReference = await findVoucherByReference(client, actor.tenantId, common.voucherType, common.referenceNumber);
      assert(!duplicateReference, "Reference number already exists for this voucher type.", 409);
      const { fiscalYearId, accountingPeriodId } = await this.resolvePeriod(client, actor.tenantId, common.voucherDate);
      const voucher = await insertVoucher(client, {
        id: createId("voucher"),
        tenantId: actor.tenantId,
        voucherNumber: await this.buildVoucherNumber(client, actor.tenantId, common.voucherType),
        voucherType: common.voucherType,
        status: "DRAFT",
        voucherDate: common.voucherDate,
        fiscalYearId,
        accountingPeriodId,
        referenceNumber: common.referenceNumber,
        narration: common.narration,
        notes: common.notes,
        counterpartyName: common.counterpartyName,
        cashBankAccountCode: common.cashBankAccountCode,
        fromAccountCode: common.fromAccountCode,
        toAccountCode: common.toAccountCode,
        createdBy: actor.id,
      });
      await replaceVoucherLines(client, actor.tenantId, voucher.id, lines);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.VOUCHER_CREATE,
        entityType: "voucher",
        entityId: voucher.id,
        description: `${actor.name} created ${common.voucherType.toLowerCase()} voucher ${voucher.voucherNumber}`,
        after: voucher,
      });
      return this.getVoucherSnapshot(client, actor, voucher.id);
    });
  }

  async updateVoucher(id, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findVoucherById(client, actor.tenantId, id);
      assert(existing, "Voucher not found.", 404);
      this.assertVoucherTypeAccess(existing.voucherType, "edit", actor);
      assert(existing.status === "DRAFT", "Only draft vouchers can be edited.", 400);
      const { common, lines } = await this.buildStoredLines(client, { ...input, voucherType: existing.voucherType }, actor);
      this.assertBalanced(lines);
      const duplicateReference = await findVoucherByReference(client, actor.tenantId, existing.voucherType, common.referenceNumber, id);
      assert(!duplicateReference, "Reference number already exists for this voucher type.", 409);
      const { fiscalYearId, accountingPeriodId } = await this.resolvePeriod(client, actor.tenantId, common.voucherDate);
      const updated = await updateVoucherHeader(client, {
        id,
        tenantId: actor.tenantId,
        voucherDate: common.voucherDate,
        fiscalYearId,
        accountingPeriodId,
        referenceNumber: common.referenceNumber,
        narration: common.narration,
        notes: common.notes,
        counterpartyName: common.counterpartyName,
        cashBankAccountCode: common.cashBankAccountCode,
        fromAccountCode: common.fromAccountCode,
        toAccountCode: common.toAccountCode,
      });
      await replaceVoucherLines(client, actor.tenantId, id, lines);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.VOUCHER_UPDATE,
        entityType: "voucher",
        entityId: id,
        description: `${actor.name} updated voucher ${existing.voucherNumber}`,
        before: existing,
        after: updated,
      });
      return this.getVoucherSnapshot(client, actor, id);
    });
  }

  async submitVoucher(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findVoucherById(client, actor.tenantId, id);
      assert(existing, "Voucher not found.", 404);
      this.assertVoucherTypeAccess(existing.voucherType, "submit", actor);
      assert(existing.status === "DRAFT", "Only draft vouchers can be submitted.", 400);
      const updated = await setVoucherState(client, actor.tenantId, id, { status: "SUBMITTED", submittedBy: actor.id, submittedAt: new Date().toISOString() });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.VOUCHER_SUBMIT,
        entityType: "voucher",
        entityId: id,
        description: `${actor.name} submitted voucher ${existing.voucherNumber}`,
        before: existing,
        after: updated,
      });
      return this.getVoucherSnapshot(client, actor, id);
    });
  }

  async approveVoucher(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findVoucherById(client, actor.tenantId, id);
      assert(existing, "Voucher not found.", 404);
      this.assertVoucherTypeAccess(existing.voucherType, "approve", actor);
      assert(existing.status === "SUBMITTED", "Only submitted vouchers can be approved.", 400);
      const updated = await setVoucherState(client, actor.tenantId, id, { status: "APPROVED", approvedBy: actor.id, approvedAt: new Date().toISOString() });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.VOUCHER_APPROVE,
        entityType: "voucher",
        entityId: id,
        description: `${actor.name} approved voucher ${existing.voucherNumber}`,
        before: existing,
        after: updated,
      });
      return this.getVoucherSnapshot(client, actor, id);
    });
  }

  async postVoucher(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findVoucherById(client, actor.tenantId, id);
      assert(existing, "Voucher not found.", 404);
      this.assertVoucherTypeAccess(existing.voucherType, "post", actor);
      assert(existing.status === "APPROVED", "Only approved vouchers can be posted.", 400);
      const lines = await listVoucherLines(client, actor.tenantId, id);
      this.assertBalanced(lines);
      await this.assertPostingWindow(client, actor.tenantId, existing.voucherDate, actor, `post voucher ${existing.voucherNumber}`);
      const journalEntry = await this.journalService.post(client, {
        tenantId: actor.tenantId,
        entryDate: existing.voucherDate,
        sourceType: SOURCE_TYPE_BY_VOUCHER_TYPE[existing.voucherType],
        sourceId: existing.id,
        memo: existing.narration || `${existing.voucherType} voucher ${existing.voucherNumber}`,
        createdById: actor.id,
        lines: lines.map((line) => ({ accountCode: line.accountCode, debit: line.side === "DEBIT" ? line.amount : 0, credit: line.side === "CREDIT" ? line.amount : 0 })),
      });
      const updated = await setVoucherState(client, actor.tenantId, id, {
        status: "POSTED",
        postedBy: actor.id,
        postedAt: new Date().toISOString(),
        lockedAt: new Date().toISOString(),
        journalEntryId: journalEntry.id,
      });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.VOUCHER_POST,
        entityType: "voucher",
        entityId: id,
        description: `${actor.name} posted voucher ${existing.voucherNumber}`,
        before: existing,
        after: updated,
      });
      return this.getVoucherSnapshot(client, actor, id);
    });
  }

  async reverseVoucher(id, input, actor) {
    const reason = String(input?.reason || "").trim();
    assert(reason, "Reversal reason is required.", 400);
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findVoucherById(client, actor.tenantId, id);
      assert(existing, "Voucher not found.", 404);
      this.assertVoucherTypeAccess(existing.voucherType, "reverse", actor);
      assert(existing.status === "POSTED", "Only posted vouchers can be reversed.", 400);
      const reversalJournal = await this.journalService.reverse(client, {
        tenantId: actor.tenantId,
        sourceType: SOURCE_TYPE_BY_VOUCHER_TYPE[existing.voucherType],
        sourceId: existing.id,
        reason,
        createdById: actor.id,
      });
      const updated = await setVoucherState(client, actor.tenantId, id, {
        status: "REVERSED",
        reversedBy: actor.id,
        reversedAt: new Date().toISOString(),
        reversalJournalEntryId: reversalJournal?.id || null,
      });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.VOUCHER_REVERSE,
        entityType: "voucher",
        entityId: id,
        description: `${actor.name} reversed voucher ${existing.voucherNumber}`,
        metadata: { reason },
        before: existing,
        after: updated,
      });
      return this.getVoucherSnapshot(client, actor, id);
    });
  }

  async deleteVoucher(id, input, actor) {
    const reason = String(input?.reason || "").trim();
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findVoucherById(client, actor.tenantId, id);
      assert(existing, "Voucher not found.", 404);
      this.assertVoucherTypeAccess(existing.voucherType, "delete", actor);
      assert(existing.status === "DRAFT", "Only draft vouchers can be deleted.", 400);
      await softDeleteVoucher(client, actor.tenantId, id, actor.id, reason);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.VOUCHER_DELETE,
        entityType: "voucher",
        entityId: id,
        description: `${actor.name} deleted voucher ${existing.voucherNumber}`,
        metadata: { reason },
      });
      return { ok: true };
    });
  }

  async listJournalRegister(filters, actor) {
    return this.databaseManager.withClient((client) => listJournalRegister(client, { tenantId: actor.tenantId, ...filters }));
  }

  async listAttachments(voucherId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const voucher = await findVoucherById(client, actor.tenantId, voucherId);
      assert(voucher, "Voucher not found.", 404);
      return listVoucherAttachments(client, actor.tenantId, voucherId);
    });
  }

  async uploadAttachment(voucherId, input, file, actor) {
    assert(file, "Attachment file is required.", 400);
    return this.databaseManager.withTransaction(async (client) => {
      const voucher = await findVoucherById(client, actor.tenantId, voucherId);
      assert(voucher, "Voucher not found.", 404);
      this.assertVoucherTypeAccess(voucher.voucherType, "attachment", actor);
      assert(["DRAFT", "SUBMITTED", "APPROVED"].includes(voucher.status), "Attachments can only be changed before posting.", 400);
      const attachment = await insertVoucherAttachment(client, {
        id: createId("vatt"),
        tenantId: actor.tenantId,
        voucherId,
        title: String(input?.title || "").trim() || file.originalname,
        originalFilename: file.originalname,
        storedFilename: file.filename,
        storagePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedBy: actor.id,
      });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.VOUCHER_ATTACHMENT_UPLOAD,
        entityType: "voucher",
        entityId: voucherId,
        description: `${actor.name} uploaded attachment for voucher ${voucher.voucherNumber}`,
        metadata: { attachmentId: attachment.id, originalFilename: file.originalname },
      });
      return attachment;
    });
  }

  async deleteAttachment(voucherId, attachmentId, input, actor) {
    const reason = String(input?.reason || "").trim();
    return this.databaseManager.withTransaction(async (client) => {
      const voucher = await findVoucherById(client, actor.tenantId, voucherId);
      assert(voucher, "Voucher not found.", 404);
      this.assertVoucherTypeAccess(voucher.voucherType, "attachment", actor);
      assert(["DRAFT", "SUBMITTED", "APPROVED"].includes(voucher.status), "Attachments can only be changed before posting.", 400);
      const attachment = await findVoucherAttachmentById(client, actor.tenantId, voucherId, attachmentId);
      assert(attachment && !attachment.deletedAt, "Attachment not found.", 404);
      await softDeleteVoucherAttachment(client, actor.tenantId, voucherId, attachmentId, actor.id, reason);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.VOUCHER_ATTACHMENT_DELETE,
        entityType: "voucher",
        entityId: voucherId,
        description: `${actor.name} deleted attachment from voucher ${voucher.voucherNumber}`,
        metadata: { attachmentId, reason },
      });
      return { ok: true };
    });
  }

  async getAttachmentDownload(voucherId, attachmentId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const attachment = await findVoucherAttachmentById(client, actor.tenantId, voucherId, attachmentId);
      assert(attachment && !attachment.deletedAt, "Attachment not found.", 404);
      assert(attachment.storagePath && fs.existsSync(attachment.storagePath), "Attachment file is missing.", 404);
      return attachment;
    });
  }
}

