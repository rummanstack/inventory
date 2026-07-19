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

  listAttributes = async (req, res, next) => {
    try {
      res.json({ attributes: await this.categoryService.listAttributes(req.params.id, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  createAttribute = async (req, res, next) => {
    try {
      const attribute = await this.categoryService.createAttribute(req.params.id, req.body, req.currentUser);
      res.status(201).json({ attribute });
    } catch (error) {
      next(error);
    }
  };

  updateAttribute = async (req, res, next) => {
    try {
      const attribute = await this.categoryService.updateAttribute(
        req.params.id,
        req.params.attributeId,
        req.body,
        req.currentUser,
      );
      res.json({ attribute });
    } catch (error) {
      next(error);
    }
  };

  removeAttribute = async (req, res, next) => {
    try {
      res.json(await this.categoryService.deleteAttribute(req.params.id, req.params.attributeId, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
