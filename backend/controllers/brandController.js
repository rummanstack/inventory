export class BrandController {
  constructor(brandService) {
    this.brandService = brandService;
  }

  list = async (req, res, next) => {
    try {
      res.json({ brands: await this.brandService.listBrands(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json({ brand: await this.brandService.createBrand(req.body, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json({ brand: await this.brandService.updateBrand(req.params.id, req.body, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.brandService.deleteBrand(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
