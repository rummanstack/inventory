export class ProductController {
  constructor(productService) {
    this.productService = productService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.productService.listProducts(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  directory = async (req, res, next) => {
    try {
      const supplierId = String(req.query.supplierId || '').trim() || null;
      res.json(await this.productService.getProductsDirectory(req.currentUser, { supplierId }));
    } catch (error) {
      next(error);
    }
  };

  lowStock = async (req, res, next) => {
    try {
      res.json(await this.productService.getLowStockProducts(req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const product = await this.productService.saveProduct(req.body, req.currentUser);
      res.status(201).json({ product });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const product = await this.productService.saveProduct({ ...req.body, id: req.params.id }, req.currentUser);
      res.json({ product });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.productService.removeProduct(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  addStock = async (req, res, next) => {
    try {
      const product = await this.productService.addStock(req.params.id, req.body.addPieces, req.currentUser, req.body.reason);
      res.json({ product });
    } catch (error) {
      next(error);
    }
  };

  setOpeningStock = async (req, res, next) => {
    try {
      const product = await this.productService.setOpeningStock(req.params.id, req.body.quantity, req.currentUser, req.body.note);
      res.json({ product });
    } catch (error) {
      next(error);
    }
  };

  clearDamage = async (req, res, next) => {
    try {
      const product = await this.productService.clearDamagedStock(req.params.id, req.body.quantity, req.currentUser, req.body.note);
      res.json({ product });
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.productService.listTrashedProducts(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  restore = async (req, res, next) => {
    try {
      res.json(await this.productService.restoreProduct(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  permanentlyDelete = async (req, res, next) => {
    try {
      res.json(await this.productService.permanentlyDeleteProduct(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
