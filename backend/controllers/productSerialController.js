export class ProductSerialController {
  constructor(productSerialService) {
    this.productSerialService = productSerialService;
  }

  listAvailable = async (req, res, next) => {
    try {
      res.json(await this.productSerialService.listAvailable(req.query.productId, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
