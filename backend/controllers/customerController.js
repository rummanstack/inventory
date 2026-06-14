export class CustomerController {
  constructor(customerService) {
    this.customerService = customerService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.customerService.listCustomers(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  listActive = async (req, res, next) => {
    try {
      res.json({ items: await this.customerService.listActiveCustomers(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      const customer = await this.customerService.getCustomer(req.params.id, req.currentUser);
      res.json({ customer });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const customer = await this.customerService.saveCustomer(req.body, req.currentUser);
      res.status(201).json({ customer });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const customer = await this.customerService.saveCustomer({ ...req.body, id: req.params.id }, req.currentUser);
      res.json({ customer });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.customerService.removeCustomer(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.customerService.listTrashedCustomers(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      res.json(await this.customerService.restoreCustomer(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  permanentlyDelete = async (req, res, next) => {
    try {
      res.json(await this.customerService.permanentlyDeleteCustomer(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
