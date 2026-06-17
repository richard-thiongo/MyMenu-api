const jwt = require('jsonwebtoken');
const AppError = require('./AppError');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.restaurantId = decoded.restaurantId;
    next();
  } catch {
    next(new AppError('Unauthorized', 401));
  }
}

module.exports = authMiddleware;
