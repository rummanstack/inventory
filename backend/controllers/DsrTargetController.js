export class DsrTargetController {
  constructor(dsrTargetService) {
    this.dsrTargetService = dsrTargetService;
    this.getSummary = this.getSummary.bind(this);
    this.getTargets = this.getTargets.bind(this);
    this.setTargets = this.setTargets.bind(this);
  }

  async getSummary(req, res, next) {
    try {
      const month = req.query.month || new Date().toISOString().slice(0, 7);
      const data = await this.dsrTargetService.getMonthlySummary(month, req.currentUser);
      res.json({ month, summary: data });
    } catch (err) { next(err); }
  }

  async getTargets(req, res, next) {
    try {
      const month = req.query.month || new Date().toISOString().slice(0, 7);
      const data = await this.dsrTargetService.getTargets(month, req.currentUser);
      res.json({ month, targets: data });
    } catch (err) { next(err); }
  }

  async setTargets(req, res, next) {
    try {
      const { targets } = req.body;
      const result = await this.dsrTargetService.setTargets(targets, req.currentUser);
      res.json({ targets: result });
    } catch (err) { next(err); }
  }
}
