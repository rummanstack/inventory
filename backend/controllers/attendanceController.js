export class AttendanceController {
  constructor(attendanceService) {
    this.attendanceService = attendanceService;
  }

  daily = async (req, res, next) => {
    try {
      res.json({ items: await this.attendanceService.listDaily(req.query, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  monthly = async (req, res, next) => {
    try {
      res.json(await this.attendanceService.monthlyReport(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const attendance = await this.attendanceService.createAttendance(req.body || {}, req.currentUser);
      res.status(201).json({ attendance });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const attendance = await this.attendanceService.updateAttendance(req.params.id, req.body || {}, req.currentUser);
      res.json({ attendance });
    } catch (error) {
      next(error);
    }
  };
}
