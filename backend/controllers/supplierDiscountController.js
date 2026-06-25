export class SupplierDiscountController {
  constructor(supplierDiscountService) {
    this.supplierDiscountService = supplierDiscountService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.supplierDiscountService.listSupplierDiscounts(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.supplierDiscountService.removeSupplierDiscount(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
