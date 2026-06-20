export class HelpDeskController {
  constructor(helpDeskService) {
    this.helpDeskService = helpDeskService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.helpDeskService.listTickets(req.query, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      res.json({ ticket: await this.helpDeskService.getTicket(req.params.id, req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const result = await this.helpDeskService.saveTicket(req.body, req.currentUser);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const result = await this.helpDeskService.saveTicket({ ...req.body, id: req.params.id }, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  addNote = async (req, res, next) => {
    try {
      const result = await this.helpDeskService.addNote(req.params.id, req.body, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  transition = async (req, res, next) => {
    try {
      const result = await this.helpDeskService.transitionTicket(req.params.id, req.body, req.currentUser);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
