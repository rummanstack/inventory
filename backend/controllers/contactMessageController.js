export class ContactMessageController {
  constructor(contactMessageService) {
    this.contactMessageService = contactMessageService;
  }

  submit = async (req, res, next) => {
    try {
      const contactMessage = await this.contactMessageService.submitContactMessage(req.body, req.currentUser || null, {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "",
      });
      res.status(201).json({ contactMessage });
    } catch (error) {
      next(error);
    }
  };

  list = async (req, res, next) => {
    try {
      const items = await this.contactMessageService.listContactMessages();
      res.json({ items });
    } catch (error) {
      next(error);
    }
  };
}
