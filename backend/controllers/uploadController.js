export class UploadController {
  uploadPhoto = async (req, res, next) => {
    try {
      if (!req.file) {
        const error = new Error("No file uploaded.");
        error.status = 400;
        throw error;
      }
      res.status(201).json({ url: `/uploads/photos/${req.file.filename}` });
    } catch (error) {
      next(error);
    }
  };
}
