export class SrController {
  constructor(srService) {
    this.srService = srService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.srService.listSrs(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  directory = async (req, res, next) => {
    try {
      res.json(await this.srService.getSrsDirectory(req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const sr = await this.srService.saveSr(req.body, req.currentUser);
      res.status(201).json({ sr });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const sr = await this.srService.saveSr({ ...req.body, id: req.params.id }, req.currentUser);
      res.json({ sr });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.srService.removeSr(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.srService.listTrashedSrs(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      res.json(await this.srService.restoreSr(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  permanentlyDelete = async (req, res, next) => {
    try {
      res.json(await this.srService.permanentlyDeleteSr(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
