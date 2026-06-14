export class ContactMessageController {
  constructor(contactMessageService) {
    this.contactMessageService = contactMessageService;
  }

  submit = async (req, res, next) => {
    try {
      const contactMessage = await this.contactMessageService.submitContactMessage(req.body);
      res.status(201).json({ contactMessage });
    } catch (error) {
      next(error);
    }
  };
}
