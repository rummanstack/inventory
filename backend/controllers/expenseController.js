export class ExpenseController {
  constructor(expenseService) {
    this.expenseService = expenseService;
  }

  range = async (req, res, next) => {
    try {
      res.json(await this.expenseService.getExpenseRangeReport(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  report = async (req, res, next) => {
    try {
      const report = await this.expenseService.getExpenseReport(req.query, req.currentUser);
      res.json(report);
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const expense = await this.expenseService.saveExpense(req.body, req.currentUser);
      res.status(201).json({ expense });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const expense = await this.expenseService.saveExpense({ ...req.body, id: req.params.id }, req.currentUser);
      res.json({ expense });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.expenseService.removeExpense(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.expenseService.listTrashedExpenses(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      res.json(await this.expenseService.restoreExpense(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  permanentlyDelete = async (req, res, next) => {
    try {
      res.json(await this.expenseService.permanentlyDeleteExpense(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
