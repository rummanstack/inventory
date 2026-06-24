import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createTradeInsRoutes(tradeInController) {
  const router = Router();
  router.use(requireFeature("trade-ins"));

  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_TRADE_INS), tradeInController.listTrash);
  router.get("/", requirePermission(PERMISSIONS.VIEW_TRADE_INS), tradeInController.list);
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_TRADE_INS), tradeInController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_TRADE_INS), tradeInController.create);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_TRADE_INS), tradeInController.remove);

  return router;
}
