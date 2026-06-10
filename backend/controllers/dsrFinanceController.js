export class DsrFinanceController {
  constructor(dsrFinanceService) {
    this.dsrFinanceService = dsrFinanceService;
  }

  cashReport = async (req, res, next) => {
    try {
      res.json(await this.dsrFinanceService.getReport("cash", req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  cashCreate = async (req, res, next) => {
    try {
      const record = await this.dsrFinanceService.saveRecord("cash", req.body, req.currentUser);
      res.status(201).json({ record });
    } catch (error) {
      next(error);
    }
  };

  cashUpdate = async (req, res, next) => {
    try {
      const record = await this.dsrFinanceService.saveRecord(
        "cash",
        { ...req.body, id: req.params.id },
        req.currentUser,
      );
      res.json({ record });
    } catch (error) {
      next(error);
    }
  };

  cashDelete = async (req, res, next) => {
    try {
      res.json(await this.dsrFinanceService.removeRecord("cash", req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  advanceReport = async (req, res, next) => {
    try {
      res.json(await this.dsrFinanceService.getReport("advance", req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  advanceCreate = async (req, res, next) => {
    try {
      const record = await this.dsrFinanceService.saveRecord("advance", req.body, req.currentUser);
      res.status(201).json({ record });
    } catch (error) {
      next(error);
    }
  };

  advanceUpdate = async (req, res, next) => {
    try {
      const record = await this.dsrFinanceService.saveRecord(
        "advance",
        { ...req.body, id: req.params.id },
        req.currentUser,
      );
      res.json({ record });
    } catch (error) {
      next(error);
    }
  };

  advanceDelete = async (req, res, next) => {
    try {
      res.json(await this.dsrFinanceService.removeRecord("advance", req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
