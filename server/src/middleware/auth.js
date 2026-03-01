/**
 * ============================================
 * Authentication Middleware
 * ============================================
 * JWT-based authentication and authorization
 */

const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const { ApiError, asyncHandler } = require('./errorHandler');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = asyncHandler(async (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token required');
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user with role
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }],
      attributes: { exclude: ['password', 'refresh_token'] }
    });
    
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }
    
    if (!user.is_active) {
      throw ApiError.unauthorized('Account is deactivated');
    }
    
    // Check if password was changed after token was issued
    if (user.password_changed_at) {
      const changedTimestamp = parseInt(user.password_changed_at.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        throw ApiError.unauthorized('Password recently changed. Please log in again.');
      }
    }
    
    // Attach user to request
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expired');
    }
    throw error;
  }
});

/**
 * Check if user has required role
 * @param {...string} roles - Allowed role names
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(ApiError.forbidden('Access denied'));
    }
    
    if (!roles.includes(req.user.role.name)) {
      return next(ApiError.forbidden(`Access denied. Required roles: ${roles.join(', ')}`));
    }
    
    next();
  };
};

/**
 * Check if user has required permission
 * @param {string} module - Module name
 * @param {string} action - Action name
 */
const hasPermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(ApiError.forbidden('Access denied'));
    }
    
    const permissions = req.user.role.permissions || {};
    
    if (!permissions[module] || !permissions[module].includes(action)) {
      return next(ApiError.forbidden(`Permission denied: ${module}.${action}`));
    }
    
    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }],
      attributes: { exclude: ['password', 'refresh_token'] }
    });
    
    if (user && user.is_active) {
      req.user = user;
      req.userId = user.id;
    }
  } catch (error) {
    // Silently continue without user
  }
  
  next();
});

module.exports = {
  authenticate,
  authorize,
  hasPermission,
  optionalAuth
};
