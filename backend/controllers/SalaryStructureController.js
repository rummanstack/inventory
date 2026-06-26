export class SalaryStructureController {
  constructor(salaryStructureService) {
    this.salaryStructureService = salaryStructureService;
  }

  getByEmployee = async (req, res, next) => {
    try {
      const result = await this.salaryStructureService.getByEmployee(req.params.employeeId, req.currentUser);
      res.json(result);
    } catch (err) { next(err); }
  };

  save = async (req, res, next) => {
    try {
      const result = await this.salaryStructureService.save(req.params.employeeId, req.body, req.currentUser);
      res.json(result);
    } catch (err) { next(err); }
  };

  listAll = async (req, res, next) => {
    try {
      const result = await this.salaryStructureService.listAll(req.currentUser);
      res.json(result);
    } catch (err) { next(err); }
  };
}
