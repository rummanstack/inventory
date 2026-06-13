export class SupplierController {
  constructor(supplierService) {
    this.supplierService = supplierService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.supplierService.listSuppliers(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  listActive = async (req, res, next) => {
    try {
      res.json({ items: await this.supplierService.listActiveSuppliers(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      const supplier = await this.supplierService.getSupplier(req.params.id, req.currentUser);
      res.json({ supplier });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const supplier = await this.supplierService.saveSupplier(req.body, req.currentUser);
      res.status(201).json({ supplier });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const supplier = await this.supplierService.saveSupplier({ ...req.body, id: req.params.id }, req.currentUser);
      res.json({ supplier });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.supplierService.removeSupplier(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.supplierService.listTrashedSuppliers(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      res.json(await this.supplierService.restoreSupplier(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  permanentlyDelete = async (req, res, next) => {
    try {
      res.json(await this.supplierService.permanentlyDeleteSupplier(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
