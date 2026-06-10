export class ProductController {
  constructor(inventoryService) {
    this.inventoryService = inventoryService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.listProducts(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  directory = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.getProductsDirectory(req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const product = await this.inventoryService.saveProduct(req.body, req.currentUser);
      res.status(201).json({ product });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const product = await this.inventoryService.saveProduct({ ...req.body, id: req.params.id }, req.currentUser);
      res.json({ product });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.removeProduct(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  addStock = async (req, res, next) => {
    try {
      const product = await this.inventoryService.addStock(req.params.id, req.body.addPieces, req.currentUser);
      res.json({ product });
    } catch (error) {
      next(error);
    }
  };
}
