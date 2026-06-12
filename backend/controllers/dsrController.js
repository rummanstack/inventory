export class DsrController {
  constructor(dsrService) {
    this.dsrService = dsrService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.dsrService.listDsrs(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  directory = async (req, res, next) => {
    try {
      res.json(await this.dsrService.getDsrsDirectory(req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const dsr = await this.dsrService.saveDsr(req.body, req.currentUser);
      res.status(201).json({ dsr });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const dsr = await this.dsrService.saveDsr({ ...req.body, id: req.params.id }, req.currentUser);
      res.json({ dsr });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.dsrService.removeDsr(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.dsrService.listTrashedDsrs(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      res.json(await this.dsrService.restoreDsr(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  permanentlyDelete = async (req, res, next) => {
    try {
      res.json(await this.dsrService.permanentlyDeleteDsr(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
