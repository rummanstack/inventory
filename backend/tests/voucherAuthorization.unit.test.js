import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSIONS } from "../lib/permissions.js";
import { setCachedPermissions } from "../lib/permissionCache.js";
import { setCachedFeatures } from "../lib/tenantFeatureCache.js";
import { VoucherService } from "../services/voucherService.js";

const service = new VoucherService({}, { auditService: {}, journalService: {} });
const actor = {
  id: "voucher-auth-user",
  name: "Voucher Auth User",
  role: "super_admin",
  tenantId: "voucher-auth-tenant",
};

function assertForbidden(callback) {
  assert.throws(callback, (error) => error?.status === 403);
}

test("voucher creation requires the permission and feature for the requested voucher type", () => {
  setCachedFeatures(actor.tenantId, ["receipt-vouchers", "payment-vouchers"]);
  setCachedPermissions(actor.role, actor.tenantId, [PERMISSIONS.VOUCHER_RECEIPT]);

  assert.doesNotThrow(() => service.assertVoucherTypeAccess("RECEIPT", "create", actor));
  assertForbidden(() => service.assertVoucherTypeAccess("PAYMENT", "create", actor));

  setCachedPermissions(actor.role, actor.tenantId, [PERMISSIONS.VOUCHER_RECEIPT, PERMISSIONS.VOUCHER_PAYMENT]);
  setCachedFeatures(actor.tenantId, ["receipt-vouchers"]);
  assertForbidden(() => service.assertVoucherTypeAccess("PAYMENT", "create", actor));
});

test("voucher mutation and workflow access remains bound to the stored voucher type", () => {
  setCachedFeatures(actor.tenantId, ["journal-vouchers", "receipt-vouchers"]);
  setCachedPermissions(actor.role, actor.tenantId, [
    PERMISSIONS.JOURNAL_CREATE,
    PERMISSIONS.VOUCHER_RECEIPT,
  ]);

  assert.doesNotThrow(() => service.assertVoucherTypeAccess("RECEIPT", "edit", actor));
  assertForbidden(() => service.assertVoucherTypeAccess("JOURNAL", "edit", actor));
  assertForbidden(() => service.assertVoucherTypeAccess("RECEIPT", "approve", actor));

  setCachedPermissions(actor.role, actor.tenantId, [
    PERMISSIONS.VOUCHER_RECEIPT,
    PERMISSIONS.JOURNAL_APPROVE,
  ]);
  assert.doesNotThrow(() => service.assertVoucherTypeAccess("RECEIPT", "approve", actor));
  assert.doesNotThrow(() => service.assertVoucherTypeAccess("JOURNAL", "approve", actor));
});
