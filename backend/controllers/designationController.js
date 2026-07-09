export class DesignationController {
  constructor(designationService) {
    this.designationService = designationService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.designationService.listDesignations(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  listActive = async (req, res, next) => {
    try {
      res.json({ items: await this.designationService.listActiveDesignations(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      res.json(await this.designationService.getDesignation(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const designation = await this.designationService.createDesignation(req.body || {}, req.currentUser);
      res.status(201).json({ designation });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const designation = await this.designationService.updateDesignation(req.params.id, req.body || {}, req.currentUser);
      res.json({ designation });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.designationService.deleteDesignation(req.params.id, req.body || {}, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
