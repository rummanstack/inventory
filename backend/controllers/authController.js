import { readCookie } from "../lib/cookies.js";
import { getRolePermissions } from "../lib/permissions.js";

function createCookieOptions(env) {
  return {
    httpOnly: true,
    maxAge: env.SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
  };
}

export class AuthController {
  constructor(authService, env, tenantService) {
    this.authService = authService;
    this.env = env;
    this.tenantService = tenantService;
  }

  async withFeatures(tenant) {
    if (!tenant) return tenant;
    const features = await this.tenantService.getTenantFeatures(tenant.id);
    return { ...tenant, features };
  }

  login = async (req, res, next) => {
    try {
      const { token, user, tenant } = await this.authService.login(req.body);
      res.cookie(this.env.SESSION_COOKIE_NAME, token, createCookieOptions(this.env));
      res.json({ user, tenant: await this.withFeatures(tenant), permissions: getRolePermissions(user.role, user.tenantId) });
    } catch (error) {
      next(error);
    }
  };

  me = async (req, res, next) => {
    try {
      res.json({
        user: req.currentUser,
        tenant: await this.withFeatures(req.currentTenant),
        permissions: getRolePermissions(req.currentUser.role, req.currentUser.tenantId),
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req, res, next) => {
    try {
      const token = readCookie(req, this.env.SESSION_COOKIE_NAME);
      await this.authService.logout(token);
      res.clearCookie(this.env.SESSION_COOKIE_NAME, {
        path: "/",
        sameSite: "lax",
        secure: this.env.NODE_ENV === "production",
      });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };
}
