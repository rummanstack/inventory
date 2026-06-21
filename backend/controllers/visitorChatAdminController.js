export class VisitorChatAdminController {
  constructor(visitorChatService) {
    this.visitorChatService = visitorChatService;
  }

  listChats = async (req, res, next) => {
    try {
      res.json(await this.visitorChatService.listChats(req.query));
    } catch (error) {
      next(error);
    }
  };

  getChat = async (req, res, next) => {
    try {
      res.json(await this.visitorChatService.getChat(req.params.id));
    } catch (error) {
      next(error);
    }
  };

  listMessages = async (req, res, next) => {
    try {
      res.json(await this.visitorChatService.listAdminMessages(req.params.id, req.query.afterId));
    } catch (error) {
      next(error);
    }
  };

  postReply = async (req, res, next) => {
    try {
      const result = await this.visitorChatService.postAdminReply(req.params.id, req.body.body, req.currentUser);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  markRead = async (req, res, next) => {
    try {
      res.json(await this.visitorChatService.markChatRead(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  closeChat = async (req, res, next) => {
    try {
      res.json(await this.visitorChatService.closeChat(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  countUnread = async (req, res, next) => {
    try {
      res.json(await this.visitorChatService.countUnread());
    } catch (error) {
      next(error);
    }
  };
}
