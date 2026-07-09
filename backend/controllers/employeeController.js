export class EmployeeController {
  constructor(employeeService) {
    this.employeeService = employeeService;
  }

  list = async (req, res, next) => {
    try {
      const result = await this.employeeService.listEmployees(req.query, req.currentUser);
      res.json(result);
    } catch (err) { next(err); }
  };

  listActive = async (req, res, next) => {
    try {
      const result = await this.employeeService.listActiveEmployees(req.currentUser);
      res.json(result);
    } catch (err) { next(err); }
  };

  get = async (req, res, next) => {
    try {
      const result = await this.employeeService.getEmployee(req.params.id, req.currentUser);
      res.json(result);
    } catch (err) { next(err); }
  };

  create = async (req, res, next) => {
    try {
      const result = await this.employeeService.createEmployee(req.body, req.currentUser);
      res.status(201).json(result);
    } catch (err) { next(err); }
  };

  update = async (req, res, next) => {
    try {
      const result = await this.employeeService.updateEmployee(req.params.id, req.body, req.currentUser);
      res.json(result);
    } catch (err) { next(err); }
  };

  remove = async (req, res, next) => {
    try {
      await this.employeeService.deleteEmployee(req.params.id, req.body, req.currentUser);
      res.json({ success: true });
    } catch (err) { next(err); }
  };

  restore = async (req, res, next) => {
    try {
      await this.employeeService.restoreEmployee(req.params.id, req.currentUser);
      res.json({ success: true });
    } catch (err) { next(err); }
  };

  listDocuments = async (req, res, next) => {
    try {
      res.json({ items: await this.employeeService.listDocuments(req.params.id, req.currentUser) });
    } catch (err) { next(err); }
  };

  uploadDocument = async (req, res, next) => {
    try {
      const document = await this.employeeService.uploadDocument(req.params.id, req.body || {}, req.file, req.currentUser);
      res.status(201).json({ document });
    } catch (err) { next(err); }
  };

  deleteDocument = async (req, res, next) => {
    try {
      res.json(await this.employeeService.deleteDocument(req.params.id, req.params.documentId, req.body || {}, req.currentUser));
    } catch (err) { next(err); }
  };

  downloadDocument = async (req, res, next) => {
    try {
      const file = await this.employeeService.getDocumentDownload(req.params.id, req.params.documentId, req.currentUser);
      res.download(file.path, file.filename);
    } catch (err) { next(err); }
  };
}
