export class VisitorChatController {
  constructor(visitorChatService) {
    this.visitorChatService = visitorChatService;
  }

  postMessage = async (req, res, next) => {
    try {
      const result = await this.visitorChatService.postVisitorMessage(req.body.visitorToken, req.body.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  listMessages = async (req, res, next) => {
    try {
      const result = await this.visitorChatService.listVisitorMessages(req.query.visitorToken, req.query.afterId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
