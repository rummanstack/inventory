export class WarrantyClaimController {
  constructor(warrantyClaimService) {
    this.warrantyClaimService = warrantyClaimService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.warrantyClaimService.listClaims(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      res.json(await this.warrantyClaimService.getClaim(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  searchSerial = async (req, res, next) => {
    try {
      res.json(await this.warrantyClaimService.searchSoldSerial(req.query.q, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json(await this.warrantyClaimService.createClaim(req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json(await this.warrantyClaimService.updateClaim(req.params.id, req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.warrantyClaimService.removeClaim(req.params.id, req.currentUser, req.body?.reason));
    } catch (error) {
      next(error);
    }
  };

  listTrash = async (req, res, next) => {
    try {
      res.json(await this.warrantyClaimService.listTrashed(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
