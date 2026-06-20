export class RetailCustomerController {
  constructor(retailCustomerService) {
    this.retailCustomerService = retailCustomerService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.retailCustomerService.listRetailCustomers(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  listActive = async (req, res, next) => {
    try {
      res.json({ items: await this.retailCustomerService.listActiveRetailCustomers(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  retention = async (req, res, next) => {
    try {
      res.json(await this.retailCustomerService.getRetentionInsights(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      res.json({ retailCustomer: await this.retailCustomerService.getRetailCustomer(req.params.id, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const retailCustomer = await this.retailCustomerService.saveRetailCustomer(req.body, req.currentUser);
      res.status(201).json({ retailCustomer });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const retailCustomer = await this.retailCustomerService.saveRetailCustomer({ ...req.body, id: req.params.id }, req.currentUser);
      res.json({ retailCustomer });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.retailCustomerService.removeRetailCustomer(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.retailCustomerService.listTrashedRetailCustomers(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      res.json(await this.retailCustomerService.restoreRetailCustomer(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  permanentlyDelete = async (req, res, next) => {
    try {
      res.json(await this.retailCustomerService.permanentlyDeleteRetailCustomer(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
