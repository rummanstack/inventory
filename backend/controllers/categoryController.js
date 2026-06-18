export class CategoryController {
  constructor(categoryService) {
    this.categoryService = categoryService;
  }

  list = async (req, res, next) => {
    try {
      res.json({ categories: await this.categoryService.listCategories(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json({ category: await this.categoryService.createCategory(req.body, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json({ category: await this.categoryService.updateCategory(req.params.id, req.body, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.categoryService.deleteCategory(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
