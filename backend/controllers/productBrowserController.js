export class ProductBrowserController {
  constructor({ productService, categoryService }) {
    this.productService = productService;
    this.categoryService = categoryService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.productService.browseProducts(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      res.json({ product: await this.productService.getBrowseProduct(req.params.id, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  listCategories = async (req, res, next) => {
    try {
      res.json({ categories: await this.categoryService.listCategories(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  listCategoryAttributes = async (req, res, next) => {
    try {
      res.json({ attributes: await this.categoryService.listAttributes(req.params.id, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };
}
