import { UPLOAD_ACTIONS } from "../lib/auditActions.js";

export class UploadController {
  constructor(auditService) {
    this.auditService = auditService;
  }

  uploadPhoto = async (req, res, next) => {
    try {
      if (!req.file) {
        const error = new Error("No file uploaded.");
        error.status = 400;
        throw error;
      }
      const url = `/uploads/photos/${req.file.filename}`;
      if (this.auditService && req.currentUser) {
        await this.auditService.databaseManager.withClient((client) =>
          this.auditService.record(client, {
            tenantId: req.currentUser.tenantId || null,
            userId: req.currentUser.id,
            actionType: UPLOAD_ACTIONS.PHOTO_UPLOAD,
            entityType: "upload",
            entityId: req.file.filename,
            description: `${req.currentUser.name} uploaded photo ${req.file.originalname}`,
            metadata: {
              actorName: req.currentUser.name,
              actorRole: req.currentUser.role,
              originalName: req.file.originalname,
              storedName: req.file.filename,
              mimeType: req.file.mimetype,
              size: req.file.size,
              url,
            },
          }),
        );
      }
      res.status(201).json({ url });
    } catch (error) {
      next(error);
    }
  };
}
