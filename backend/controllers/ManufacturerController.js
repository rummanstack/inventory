export class ManufacturerController {
  constructor(manufacturerService) {
    this.manufacturerService = manufacturerService;
  }

  list = async (req, res, next) => {
    try {
      res.json({ manufacturers: await this.manufacturerService.listManufacturers(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  listActive = async (req, res, next) => {
    try {
      res.json({ manufacturers: await this.manufacturerService.listActiveManufacturers(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json({ manufacturer: await this.manufacturerService.createManufacturer(req.body, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json({ manufacturer: await this.manufacturerService.updateManufacturer(req.params.id, req.body, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.manufacturerService.deleteManufacturer(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
