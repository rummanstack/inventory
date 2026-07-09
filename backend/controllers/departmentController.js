export class DepartmentController {
  constructor(departmentService) {
    this.departmentService = departmentService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.departmentService.listDepartments(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  listActive = async (req, res, next) => {
    try {
      res.json({ items: await this.departmentService.listActiveDepartments(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      res.json(await this.departmentService.getDepartment(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const department = await this.departmentService.createDepartment(req.body || {}, req.currentUser);
      res.status(201).json({ department });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const department = await this.departmentService.updateDepartment(req.params.id, req.body || {}, req.currentUser);
      res.json({ department });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.departmentService.deleteDepartment(req.params.id, req.body || {}, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
