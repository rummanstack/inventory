import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { uploadVoucherDocumentMiddleware } from "../middleware/upload.js";
import { PERMISSIONS } from "../lib/permissions.js";

const VOUCHER_FEATURES = ["journal-vouchers", "receipt-vouchers", "payment-vouchers", "contra-vouchers", "voucher-register", "journal-register"];

function authorizeVoucherCreate(voucherController) {
  return (req, _res, next) => {
    try {
      voucherController.voucherService.assertVoucherTypeAccess(
        req.body?.voucherType || "JOURNAL",
        "create",
        req.currentUser,
      );
      next();
    } catch (error) {
      next(error);
    }
  };
}

function authorizeVoucherAction(voucherController, action) {
  return async (req, _res, next) => {
    try {
      await voucherController.voucherService.authorizeVoucher(req.params.id, action, req.currentUser);
      next();
    } catch (error) {
      next(error);
    }
  };
}

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
    authorizeVoucherCreate(voucherController),
    voucherController.create,
  );
  router.put(
    "/:id",
    authorizeVoucherAction(voucherController, "edit"),
    voucherController.update,
  );
  router.delete(
    "/:id",
    authorizeVoucherAction(voucherController, "delete"),
    voucherController.remove,
  );
  router.post(
    "/:id/submit",
    authorizeVoucherAction(voucherController, "submit"),
    voucherController.submit,
  );
  router.post(
    "/:id/approve",
    authorizeVoucherAction(voucherController, "approve"),
    voucherController.approve,
  );
  router.post(
    "/:id/post",
    authorizeVoucherAction(voucherController, "post"),
    voucherController.post,
  );
  router.post(
    "/:id/reverse",
    authorizeVoucherAction(voucherController, "reverse"),
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
    authorizeVoucherAction(voucherController, "attachment"),
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
    authorizeVoucherAction(voucherController, "attachment"),
    voucherController.deleteAttachment,
  );

  return router;
}
