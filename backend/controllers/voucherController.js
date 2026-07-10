export class VoucherController {
  constructor(voucherService) {
    this.voucherService = voucherService;
  }

  list = async (req, res, next) => {
    try {
      res.json({ vouchers: await this.voucherService.listVouchers(req.query, req.currentUser) });
    } catch (error) { next(error); }
  };

  get = async (req, res, next) => {
    try {
      res.json({ voucher: await this.voucherService.getVoucher(req.params.id, req.currentUser) });
    } catch (error) { next(error); }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json({ voucher: await this.voucherService.createVoucher(req.body || {}, req.currentUser) });
    } catch (error) { next(error); }
  };

  update = async (req, res, next) => {
    try {
      res.json({ voucher: await this.voucherService.updateVoucher(req.params.id, req.body || {}, req.currentUser) });
    } catch (error) { next(error); }
  };

  submit = async (req, res, next) => {
    try {
      res.json({ voucher: await this.voucherService.submitVoucher(req.params.id, req.currentUser) });
    } catch (error) { next(error); }
  };

  approve = async (req, res, next) => {
    try {
      res.json({ voucher: await this.voucherService.approveVoucher(req.params.id, req.currentUser) });
    } catch (error) { next(error); }
  };

  post = async (req, res, next) => {
    try {
      res.json({ voucher: await this.voucherService.postVoucher(req.params.id, req.currentUser) });
    } catch (error) { next(error); }
  };

  reverse = async (req, res, next) => {
    try {
      res.json({ voucher: await this.voucherService.reverseVoucher(req.params.id, req.body || {}, req.currentUser) });
    } catch (error) { next(error); }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.voucherService.deleteVoucher(req.params.id, req.body || {}, req.currentUser));
    } catch (error) { next(error); }
  };

  journalRegister = async (req, res, next) => {
    try {
      res.json({ rows: await this.voucherService.listJournalRegister(req.query, req.currentUser) });
    } catch (error) { next(error); }
  };

  listAttachments = async (req, res, next) => {
    try {
      res.json({ attachments: await this.voucherService.listAttachments(req.params.id, req.currentUser) });
    } catch (error) { next(error); }
  };

  uploadAttachment = async (req, res, next) => {
    try {
      res.status(201).json({ attachment: await this.voucherService.uploadAttachment(req.params.id, req.body || {}, req.file, req.currentUser) });
    } catch (error) { next(error); }
  };

  downloadAttachment = async (req, res, next) => {
    try {
      const attachment = await this.voucherService.getAttachmentDownload(req.params.id, req.params.attachmentId, req.currentUser);
      res.download(attachment.storagePath, attachment.originalFilename);
    } catch (error) { next(error); }
  };

  deleteAttachment = async (req, res, next) => {
    try {
      res.json(await this.voucherService.deleteAttachment(req.params.id, req.params.attachmentId, req.body || {}, req.currentUser));
    } catch (error) { next(error); }
  };
}
