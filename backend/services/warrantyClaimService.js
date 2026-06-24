import { assert } from "../lib/errors.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeWarrantyClaim } from "../lib/normalizers.js";
import { WARRANTY_CLAIM_STATUS_VALUES, WARRANTY_CLAIM_STATUSES } from "../lib/warrantyClaims.js";
import { PRODUCT_SERIAL_STATUSES } from "../lib/productSerials.js";
import { WARRANTY_CLAIM_ACTIONS } from "../lib/auditActions.js";
import { nextWarrantyClaimNumber } from "../lib/warrantyClaimNumber.js";
import {
  countTrashedWarrantyClaims,
  countWarrantyClaims,
  findSoldSerialForClaim,
  findWarrantyClaimById,
  findWarrantyClaimForUpdate,
  insertWarrantyClaim,
  listTrashedWarrantyClaims,
  listWarrantyClaimsPage,
  mapWarrantyClaim,
  softDeleteWarrantyClaim,
  updateWarrantyClaim,
} from "../repositories/warrantyClaimRepository.js";
import { findProductForUpdate } from "../repositories/productRepository.js";
import { findProductSerialById, mapProductSerial } from "../repositories/productSerialRepository.js";
import { logActivity } from "./shared/inventoryHelpers.js";

const DATE_ERROR = "Received date must be in YYYY-MM-DD format.";

function isSerialRequired(product) {
  return product?.serial_required === true || product?.serial_required === "t";
}

export class WarrantyClaimService {
  constructor(databaseManager, { auditService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listClaims(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const dateFrom = String(query.dateFrom || "").trim()
      ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR)
      : undefined;
    const dateTo = String(query.dateTo || "").trim()
      ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR)
      : undefined;

    const filters = {
      tenantId: actor.tenantId,
      status: String(query.status || "").trim().toUpperCase() || undefined,
      supplierId: String(query.supplierId || "").trim() || undefined,
      productId: String(query.productId || "").trim() || undefined,
      search: String(query.search || "").trim() || undefined,
      dateFrom,
      dateTo,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listWarrantyClaimsPage(client, { ...filters, limit, offset }),
        countWarrantyClaims(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getClaim(claimId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findWarrantyClaimById(client, claimId, actor.tenantId);
      assert(result.rowCount > 0, "Warranty claim not found.", 404);
      return mapWarrantyClaim(result.rows[0]);
    });
  }

  // Warranty flow steps 1-3: search by serial/IMEI, surface the sale that sold it (if any)
  // and its warranty end date, so a new claim can be pre-filled.
  async searchSoldSerial(search, actor) {
    const value = String(search || "").trim();
    assert(value, "Enter a serial number or IMEI to search.");

    return this.databaseManager.withClient(async (client) => {
      const row = await findSoldSerialForClaim(client, { tenantId: actor.tenantId, search: value });
      if (!row) {
        return { serial: null };
      }

      return {
        serial: {
          ...mapProductSerial(row),
          productName: row.product_name || null,
          salesInvoiceId: row.sales_invoice_id || null,
          invoiceNumber: row.invoice_number || null,
          customerId: row.customer_id || null,
          customerName: row.customer_name || null,
        },
      };
    });
  }

  async createClaim(input, actor) {
    const claim = normalizeWarrantyClaim(input);
    assert(claim.productId, "Product is required.");
    assert(claim.receivedDate, "Received date is required.");
    claim.receivedDate = normalizeIsoDate(claim.receivedDate, claim.receivedDate, DATE_ERROR);
    claim.tenantId = actor.tenantId;
    claim.createdById = actor.id;

    return this.databaseManager.withTransaction(async (client) => {
      const productResult = await findProductForUpdate(client, claim.productId, actor.tenantId);
      assert(productResult.rowCount > 0, "Product not found.", 404);
      if (isSerialRequired(productResult.rows[0])) {
        assert(claim.productSerialId, "Select the sold serial/IMEI for this product before filing a warranty claim.", 400);
      }

      if (claim.productSerialId) {
        const serialResult = await findProductSerialById(client, claim.productSerialId, actor.tenantId);
        assert(serialResult.rowCount > 0, "Selected serial/IMEI record not found.", 404);
        const serial = serialResult.rows[0];
        assert(serial.product_id === claim.productId, "Selected serial/IMEI does not belong to this product.", 400);
        assert(
          serial.status === PRODUCT_SERIAL_STATUSES.SOLD,
          "This serial/IMEI has not been sold, so it is not eligible for a warranty claim.",
          400,
        );
        if (serial.warranty_end_date) {
          const warrantyEndDate = String(serial.warranty_end_date).slice(0, 10);
          assert(
            claim.receivedDate <= warrantyEndDate,
            `The warranty period for this serial/IMEI ended on ${warrantyEndDate}.`,
            400,
          );
        }
      }

      const year = new Date(claim.receivedDate).getUTCFullYear();
      claim.claimNumber = await nextWarrantyClaimNumber(client, actor.tenantId, year);

      const result = await insertWarrantyClaim(client, claim);
      await this.recordActivity(client, actor, {
        actionType: WARRANTY_CLAIM_ACTIONS.CREATE,
        entityType: "warranty_claim",
        entityId: claim.id,
        description: `${actor.name} created warranty claim ${claim.claimNumber}`,
        metadata: { claimNumber: claim.claimNumber, productId: claim.productId, status: claim.status },
      });

      return mapWarrantyClaim(result.rows[0]);
    });
  }

  async updateClaim(claimId, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findWarrantyClaimForUpdate(client, claimId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Warranty claim not found.", 404);
      const existing = existingResult.rows[0];

      const status = WARRANTY_CLAIM_STATUS_VALUES.includes(String(input.status || "").trim().toUpperCase())
        ? String(input.status).trim().toUpperCase()
        : existing.status;

      const today = new Date().toISOString().slice(0, 10);

      let sentToSupplierDate = input.sentToSupplierDate !== undefined
        ? (String(input.sentToSupplierDate || "").trim() || null)
        : (existing.sent_to_supplier_date || null);
      if (status === WARRANTY_CLAIM_STATUSES.SENT_TO_SUPPLIER && !sentToSupplierDate) {
        sentToSupplierDate = today;
      }

      let receivedFromSupplierDate = input.receivedFromSupplierDate !== undefined
        ? (String(input.receivedFromSupplierDate || "").trim() || null)
        : (existing.received_from_supplier_date || null);
      const supplierReturnStatuses = [WARRANTY_CLAIM_STATUSES.REPAIRED, WARRANTY_CLAIM_STATUSES.REPLACED, WARRANTY_CLAIM_STATUSES.REJECTED];
      if (supplierReturnStatuses.includes(status) && !receivedFromSupplierDate) {
        receivedFromSupplierDate = today;
      }

      const patch = {
        id: claimId,
        tenantId: actor.tenantId,
        status,
        supplierId: input.supplierId !== undefined ? (String(input.supplierId || "").trim() || null) : existing.supplier_id,
        resolutionNote: input.resolutionNote !== undefined ? String(input.resolutionNote || "").trim() : existing.resolution_note,
        problemNote: input.problemNote !== undefined ? String(input.problemNote || "").trim() : existing.problem_note,
        rmaNumber: input.rmaNumber !== undefined ? String(input.rmaNumber || "").trim() : (existing.rma_number || ""),
        sentToSupplierDate,
        receivedFromSupplierDate,
      };

      const result = await updateWarrantyClaim(client, patch);
      await this.recordActivity(client, actor, {
        actionType: WARRANTY_CLAIM_ACTIONS.UPDATE,
        entityType: "warranty_claim",
        entityId: claimId,
        description: `${actor.name} updated warranty claim ${existing.claim_number} to ${status}`,
        metadata: { claimNumber: existing.claim_number, status },
      });

      return mapWarrantyClaim(result.rows[0]);
    });
  }

  async removeClaim(claimId, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await softDeleteWarrantyClaim(client, claimId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });
      assert(result.rowCount > 0, "Warranty claim not found.", 404);

      await this.recordActivity(client, actor, {
        actionType: WARRANTY_CLAIM_ACTIONS.DELETE,
        entityType: "warranty_claim",
        entityId: claimId,
        description: `${actor.name} removed warranty claim ${claimId}${reason ? ` (${reason})` : ""}`,
      });

      return { ok: true };
    });
  }

  async listTrashed(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTrashedWarrantyClaims(client, { tenantId, limit, offset }),
        countTrashedWarrantyClaims(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }
}
