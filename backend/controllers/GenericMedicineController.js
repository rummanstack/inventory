export class GenericMedicineController {
  constructor(genericMedicineService) {
    this.genericMedicineService = genericMedicineService;
  }

  list = async (req, res, next) => {
    try {
      res.json({ genericMedicines: await this.genericMedicineService.listGenericMedicines(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  listActive = async (req, res, next) => {
    try {
      res.json({ genericMedicines: await this.genericMedicineService.listActiveGenericMedicines(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json({ genericMedicine: await this.genericMedicineService.createGenericMedicine(req.body, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json({ genericMedicine: await this.genericMedicineService.updateGenericMedicine(req.params.id, req.body, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.genericMedicineService.deleteGenericMedicine(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
