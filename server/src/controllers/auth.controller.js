/**
 * ============================================
 * Authentication Controller
 * ============================================
 * Handles user authentication operations
 */

const jwt = require('jsonwebtoken');
const { User, Role, AuditLog } = require('../models');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

/**
 * Generate JWT tokens
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  
  return { accessToken, refreshToken };
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Validate input
  if (!email || !password) {
    throw ApiError.badRequest('Email and password are required');
  }
  
  // Find user
  const user = await User.findOne({
    where: { email: email.toLowerCase() },
    include: [{ model: Role, as: 'role' }]
  });
  
  if (!user) {
    // Log failed attempt
    await AuditLog.log({
      action: 'login_failed',
      module: 'auth',
      description: `Failed login attempt for ${email}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'failure',
      metadata: { email }
    });
    
    throw ApiError.unauthorized('Invalid email or password');
  }
  
  // Check if active
  if (!user.is_active) {
    throw ApiError.unauthorized('Account is deactivated. Contact administrator.');
  }
  
  // Verify password
  const isValid = await user.validatePassword(password);
  
  if (!isValid) {
    await AuditLog.log({
      userId: user.id,
      userEmail: user.email,
      action: 'login_failed',
      module: 'auth',
      description: 'Invalid password',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'failure'
    });
    
    throw ApiError.unauthorized('Invalid email or password');
  }
  
  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);
  
  // Save refresh token
  await user.update({
    refresh_token: refreshToken,
    last_login: new Date()
  });
  
  // Log successful login
  await AuditLog.log({
    userId: user.id,
    userEmail: user.email,
    userName: user.getFullName(),
    action: 'login',
    module: 'auth',
    description: 'User logged in',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    status: 'success'
  });
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toJSON(),
      accessToken,
      refreshToken
    }
  });
});

/**
 * Register new user
 * POST /api/v1/auth/register
 */
exports.register = asyncHandler(async (req, res) => {
  const { email, password, first_name, last_name, phone } = req.body;
  
  // Check if email exists
  const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    throw ApiError.conflict('Email already registered');
  }
  
  // Get default role (usually 'user' or 'staff')
  let role = await Role.findOne({ where: { name: 'staff' } });
  if (!role) {
    role = await Role.findOne({ where: { name: 'user' } });
  }
  
  if (!role) {
    throw ApiError.internal('Default role not configured');
  }
  
  // Create user
  const user = await User.create({
    email: email.toLowerCase(),
    password,
    first_name,
    last_name,
    phone,
    role_id: role.id
  });
  
  // Reload with role
  await user.reload({ include: [{ model: Role, as: 'role' }] });
  
  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);
  
  // Save refresh token
  await user.update({ refresh_token: refreshToken });
  
  // Log registration
  await AuditLog.log({
    userId: user.id,
    userEmail: user.email,
    userName: user.getFullName(),
    action: 'register',
    module: 'auth',
    entityType: 'user',
    entityId: user.id,
    description: 'New user registered',
    ipAddress: req.ip,
    status: 'success'
  });
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: user.toJSON(),
      accessToken,
      refreshToken
    }
  });
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw ApiError.badRequest('Refresh token required');
  }
  
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Find user with matching refresh token
    const user = await User.findOne({
      where: {
        id: decoded.id,
        refresh_token: refreshToken
      },
      include: [{ model: Role, as: 'role' }]
    });
    
    if (!user) {
      throw ApiError.unauthorized('Invalid refresh token');
    }
    
    if (!user.is_active) {
      throw ApiError.unauthorized('Account is deactivated');
    }
    
    // Generate new tokens
    const tokens = generateTokens(user);
    
    // Save new refresh token
    await user.update({ refresh_token: tokens.refreshToken });
    
    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Refresh token expired. Please log in again.');
    }
    throw error;
  }
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
exports.logout = asyncHandler(async (req, res) => {
  // Clear refresh token
  if (req.user) {
    await req.user.update({ refresh_token: null });
    
    // Log logout
    await AuditLog.log({
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.getFullName(),
      action: 'logout',
      module: 'auth',
      description: 'User logged out',
      ipAddress: req.ip,
      status: 'success'
    });
  }
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId, {
    include: [{ model: Role, as: 'role' }],
    attributes: { exclude: ['password', 'refresh_token'] }
  });
  
  res.json({
    success: true,
    data: user
  });
});

/**
 * Update current user profile
 * PUT /api/v1/auth/me
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { first_name, last_name, phone } = req.body;
  
  const user = await User.findByPk(req.userId);
  
  await user.update({
    first_name: first_name || user.first_name,
    last_name: last_name || user.last_name,
    phone: phone !== undefined ? phone : user.phone
  });
  
  await user.reload({ include: [{ model: Role, as: 'role' }] });
  
  res.json({
    success: true,
    message: 'Profile updated',
    data: user.toJSON()
  });
});

/**
 * Change password
 * POST /api/v1/auth/change-password
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('Current and new passwords are required');
  }
  
  if (newPassword.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }
  
  const user = await User.findByPk(req.userId);
  
  // Verify current password
  const isValid = await user.validatePassword(currentPassword);
  if (!isValid) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  
  // Update password
  await user.update({ password: newPassword });
  
  // Log password change
  await AuditLog.log({
    userId: user.id,
    userEmail: user.email,
    action: 'password_change',
    module: 'auth',
    description: 'Password changed',
    ipAddress: req.ip,
    status: 'success'
  });
  
  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});
