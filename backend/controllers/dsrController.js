export class DsrController {
  constructor(inventoryService) {
    this.inventoryService = inventoryService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.listDsrs(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  directory = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.getDsrsDirectory(req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const dsr = await this.inventoryService.saveDsr(req.body, req.currentUser);
      res.status(201).json({ dsr });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const dsr = await this.inventoryService.saveDsr({ ...req.body, id: req.params.id }, req.currentUser);
      res.json({ dsr });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.removeDsr(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.listTrashedDsrs(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.restoreDsr(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  permanentlyDelete = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.permanentlyDeleteDsr(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
