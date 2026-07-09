export class LeaveController {
  constructor(leaveService) {
    this.leaveService = leaveService;
  }

  listTypes = async (req, res, next) => {
    try {
      res.json(await this.leaveService.listLeaveTypes(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  listActiveTypes = async (req, res, next) => {
    try {
      res.json({ items: await this.leaveService.listActiveLeaveTypes(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  createType = async (req, res, next) => {
    try {
      const leaveType = await this.leaveService.createLeaveType(req.body || {}, req.currentUser);
      res.status(201).json({ leaveType });
    } catch (error) {
      next(error);
    }
  };

  updateType = async (req, res, next) => {
    try {
      const leaveType = await this.leaveService.updateLeaveType(req.params.id, req.body || {}, req.currentUser);
      res.json({ leaveType });
    } catch (error) {
      next(error);
    }
  };

  deleteType = async (req, res, next) => {
    try {
      res.json(await this.leaveService.deleteLeaveType(req.params.id, req.body || {}, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  listRequests = async (req, res, next) => {
    try {
      res.json(await this.leaveService.listLeaveRequests(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  getRequest = async (req, res, next) => {
    try {
      res.json({ leaveRequest: await this.leaveService.getLeaveRequest(req.params.id, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  apply = async (req, res, next) => {
    try {
      const leaveRequest = await this.leaveService.applyLeave(req.body || {}, req.currentUser);
      res.status(201).json({ leaveRequest });
    } catch (error) {
      next(error);
    }
  };

  approve = async (req, res, next) => {
    try {
      const leaveRequest = await this.leaveService.approveLeave(req.params.id, req.body || {}, req.currentUser);
      res.json({ leaveRequest });
    } catch (error) {
      next(error);
    }
  };

  reject = async (req, res, next) => {
    try {
      const leaveRequest = await this.leaveService.rejectLeave(req.params.id, req.body || {}, req.currentUser);
      res.json({ leaveRequest });
    } catch (error) {
      next(error);
    }
  };

  calendar = async (req, res, next) => {
    try {
      res.json({ items: await this.leaveService.leaveCalendar(req.query, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  report = async (req, res, next) => {
    try {
      res.json(await this.leaveService.leaveReport(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
