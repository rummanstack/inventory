export class RepairJobController {
  constructor(repairJobService) {
    this.repairJobService = repairJobService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.repairJobService.listJobs(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      res.json(await this.repairJobService.getJob(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json(await this.repairJobService.createJob(req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json(await this.repairJobService.updateJob(req.params.id, req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.repairJobService.removeJob(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.repairJobService.listTrashed(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
