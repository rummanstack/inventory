export function errorHandler(errorLogService) {
  return (error, req, res, _next) => {
    console.error(error);
    const status = error.status || 500;
    res.status(status).json({ message: error.message || "Internal server error." });

    if (status >= 500) {
      errorLogService
        .record({
          tenantId: req.currentUser?.tenantId,
          userId: req.currentUser?.id,
          method: req.method,
          path: req.originalUrl,
          statusCode: status,
          message: error.message,
          stack: error.stack,
        })
        .catch((logError) => console.error("Failed to record error log", logError));
    }
  };
}
