import { Router } from "express";

export function createPublicAuthRoutes(authController, { loginRateLimiter, authRateLimiter }) {
  const router = Router();

  router.post("/login", loginRateLimiter, authController.login);
  router.post("/forgot-password", authRateLimiter, authController.forgotPassword);
  router.post("/reset-password", authRateLimiter, authController.resetPassword);
  router.post("/logout", authController.logout);

  return router;
}

export function createAuthenticatedAuthRoutes(authController) {
  const router = Router();

  router.get("/me", authController.me);
  router.get("/sessions", authController.listSessions);
  router.delete("/sessions/:id", authController.revokeSession);
  router.post("/sessions/revoke-others", authController.revokeOtherSessions);
  router.get("/login-history", authController.loginHistory);

  return router;
}
