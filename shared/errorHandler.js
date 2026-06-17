function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  const message =
    error.statusCode ? error.message : 'Request could not be processed';

  if (!error.statusCode) {
    console.error(error);
  }

  res.status(statusCode).json({ message });
}

module.exports = errorHandler;
