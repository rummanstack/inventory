import { readCookie } from "../lib/cookies.js";
import { getRolePermissions } from "../lib/permissions.js";
import { hashSessionToken } from "../lib/sessionTokens.js";

function createCookieOptions(env) {
  return {
    httpOnly: true,
    maxAge: env.SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
  };
}

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : "";
}

function getCurrentToken(req, env) {
  return readCookie(req, env.SESSION_COOKIE_NAME) || readBearerToken(req);
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
      const { token, user, tenant } = await this.authService.login(req.body, {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "",
      });
      res.cookie(this.env.SESSION_COOKIE_NAME, token, createCookieOptions(this.env));
      res.json({ user, tenant: await this.withFeatures(tenant), permissions: getRolePermissions(user.role, user.tenantId) });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req, res, next) => {
    try {
      const result = await this.authService.forgotPassword(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const result = await this.authService.resetPassword({
        token: req.body.token,
        newPassword: req.body.password,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  listSessions = async (req, res, next) => {
    try {
      const currentTokenHash = hashSessionToken(getCurrentToken(req, this.env));
      const sessions = await this.authService.listSessions(req.currentUser.id, currentTokenHash);
      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  };

  revokeSession = async (req, res, next) => {
    try {
      await this.authService.revokeSession(req.currentUser.id, req.params.id);
      const currentTokenHash = hashSessionToken(getCurrentToken(req, this.env));
      const sessions = await this.authService.listSessions(req.currentUser.id, currentTokenHash);
      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  };

  revokeOtherSessions = async (req, res, next) => {
    try {
      const currentTokenHash = hashSessionToken(getCurrentToken(req, this.env));
      await this.authService.revokeOtherSessions(req.currentUser.id, currentTokenHash);
      const sessions = await this.authService.listSessions(req.currentUser.id, currentTokenHash);
      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  };

  loginHistory = async (req, res, next) => {
    try {
      const history = await this.authService.getLoginHistory(req.currentUser.id);
      res.json({ history });
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
