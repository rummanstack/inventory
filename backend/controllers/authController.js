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
  constructor(authService, env) {
    this.authService = authService;
    this.env = env;
  }

  login = async (req, res, next) => {
    try {
      const { token, user, tenant } = await this.authService.login(req.body);
      res.cookie(this.env.SESSION_COOKIE_NAME, token, createCookieOptions(this.env));
      res.json({ user, tenant, permissions: getRolePermissions(user.role, user.tenantId) });
    } catch (error) {
      next(error);
    }
  };

  me = async (req, res) => {
    res.json({
      user: req.currentUser,
      tenant: req.currentTenant,
      permissions: getRolePermissions(req.currentUser.role, req.currentUser.tenantId),
    });
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
