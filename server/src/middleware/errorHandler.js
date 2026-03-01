/**
 * ============================================
 * Error Handler Middleware
 * ============================================
 * Centralized error handling for the API
 */

// Custom API Error class
class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factory methods
ApiError.badRequest = (message = 'Bad Request', errors = null) => {
  return new ApiError(400, message, errors);
};

ApiError.unauthorized = (message = 'Unauthorized') => {
  return new ApiError(401, message);
};

ApiError.forbidden = (message = 'Forbidden') => {
  return new ApiError(403, message);
};

ApiError.notFound = (message = 'Not Found') => {
  return new ApiError(404, message);
};

ApiError.conflict = (message = 'Conflict') => {
  return new ApiError(409, message);
};

ApiError.validation = (errors) => {
  return new ApiError(422, 'Validation Error', errors);
};

ApiError.internal = (message = 'Internal Server Error') => {
  return new ApiError(500, message);
};

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;
  
  // Handle Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    statusCode = 422;
    message = 'Validation Error: ' + err.errors.map(e => `${e.path}: ${e.message}`).join(', ');
    errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
  }
  
  if (err.name === 'SequelizeDatabaseError') {
    statusCode = 400;
    message = 'Database Error: ' + err.message;
    console.error('Database error details:', err.parent?.detail || err.message);
  }
  
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Duplicate Entry';
    errors = err.errors.map(e => ({
      field: e.path,
      message: `${e.path} already exists`
    }));
  }
  
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Invalid Reference';
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }
  
  // Send response
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  });
};

// Async handler wrapper to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = errorHandler;
module.exports.ApiError = ApiError;
module.exports.asyncHandler = asyncHandler;
