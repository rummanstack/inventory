export class RegistrationController {
  constructor(registrationService) {
    this.registrationService = registrationService;
    this.register = this.register.bind(this);
    this.list = this.list.bind(this);
    this.approve = this.approve.bind(this);
    this.reject = this.reject.bind(this);
  }

  async register(req, res, next) {
    try {
      const result = await this.registrationService.register(req.body || {});
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const items = await this.registrationService.listRegistrations();
      res.json({ items });
    } catch (error) {
      next(error);
    }
  }

  async approve(req, res, next) {
    try {
      const tenant = await this.registrationService.approve(req.params.id, req.currentUser);
      res.json(tenant);
    } catch (error) {
      next(error);
    }
  }

  async reject(req, res, next) {
    try {
      const tenant = await this.registrationService.reject(req.params.id, req.currentUser);
      res.json(tenant);
    } catch (error) {
      next(error);
    }
  }
}
