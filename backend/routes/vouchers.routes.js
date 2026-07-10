import { Router } from "express";
import { requireAnyPermission, requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { uploadVoucherDocumentMiddleware } from "../middleware/upload.js";
import { PERMISSIONS } from "../lib/permissions.js";

const VOUCHER_FEATURES = ["journal-vouchers", "receipt-vouchers", "payment-vouchers", "contra-vouchers", "voucher-register", "journal-register"];

export function createVoucherRoutes(voucherController) {
  const router = Router();

  router.get(
    "/journal-register",
    requireFeature("journal-register"),
    requirePermission(PERMISSIONS.VOUCHER_VIEW),
    voucherController.journalRegister,
  );

  router.get(
    "/",
    requireFeature(VOUCHER_FEATURES),
    requirePermission(PERMISSIONS.VOUCHER_VIEW),
    voucherController.list,
  );
  router.get(
    "/:id",
    requireFeature(VOUCHER_FEATURES),
    requirePermission(PERMISSIONS.VOUCHER_VIEW),
    voucherController.get,
  );
  router.post(
    "/",
    requireFeature(VOUCHER_FEATURES),
    requireAnyPermission(PERMISSIONS.JOURNAL_CREATE, PERMISSIONS.VOUCHER_RECEIPT, PERMISSIONS.VOUCHER_PAYMENT, PERMISSIONS.VOUCHER_CONTRA),
    voucherController.create,
  );
  router.put(
    "/:id",
    requireFeature(VOUCHER_FEATURES),
    requirePermission(PERMISSIONS.JOURNAL_EDIT),
    voucherController.update,
  );
  router.delete(
    "/:id",
    requireFeature(VOUCHER_FEATURES),
    requirePermission(PERMISSIONS.JOURNAL_EDIT),
    voucherController.remove,
  );
  router.post(
    "/:id/submit",
    requireFeature(VOUCHER_FEATURES),
    requirePermission(PERMISSIONS.JOURNAL_EDIT),
    voucherController.submit,
  );
  router.post(
    "/:id/approve",
    requireFeature(VOUCHER_FEATURES),
    requirePermission(PERMISSIONS.JOURNAL_APPROVE),
    voucherController.approve,
  );
  router.post(
    "/:id/post",
    requireFeature(VOUCHER_FEATURES),
    requirePermission(PERMISSIONS.JOURNAL_POST),
    voucherController.post,
  );
  router.post(
    "/:id/reverse",
    requireFeature(VOUCHER_FEATURES),
    requirePermission(PERMISSIONS.JOURNAL_REVERSE),
    voucherController.reverse,
  );

  router.get(
    "/:id/attachments",
    requireFeature(VOUCHER_FEATURES),
    requirePermission(PERMISSIONS.VOUCHER_VIEW),
    voucherController.listAttachments,
  );
  router.post(
    "/:id/attachments",
    requireFeature(VOUCHER_FEATURES),
    requirePermission(PERMISSIONS.JOURNAL_EDIT),
    uploadVoucherDocumentMiddleware,
    voucherController.uploadAttachment,
  );
  router.get(
    "/:id/attachments/:attachmentId/download",
    requireFeature(VOUCHER_FEATURES),
    requirePermission(PERMISSIONS.VOUCHER_VIEW),
    voucherController.downloadAttachment,
  );
  router.delete(
    "/:id/attachments/:attachmentId",
    requireFeature(VOUCHER_FEATURES),
    requirePermission(PERMISSIONS.JOURNAL_EDIT),
    voucherController.deleteAttachment,
  );

  return router;
}
