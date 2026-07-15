export class LandingChatController {
  constructor(landingChatService) {
    this.landingChatService = landingChatService;
  }

  status = async (_req, res, next) => {
    try {
      res.json(this.landingChatService.getStatus());
    } catch (error) {
      next(error);
    }
  };

  chat = async (req, res, next) => {
    try {
      res.json(await this.landingChatService.chat(req.body));
    } catch (error) {
      next(error);
    }
  };
}
