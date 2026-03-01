/**
 * ============================================
 * Rate Limiter Middleware
 * ============================================
 * Prevents abuse by limiting request rates
 */

const rateLimit = require('express-rate-limit');

// Check if rate limiting should be skipped
const shouldSkipRateLimit = () => {
  return process.env.SKIP_RATE_LIMIT === 'true';
};

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting if disabled or for health checks
    return shouldSkipRateLimit() || req.path === '/api/health';
  }
});

// Stricter limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 5, // Very lenient in dev
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => shouldSkipRateLimit()
});

// Limiter for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after 1 hour'
  },
  skip: () => shouldSkipRateLimit()
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter
};
