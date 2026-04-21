// routes/auth.js
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const r       = require('../utils/response.js');
const { protect } = require('../middleware/auth.js');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

/**
 * @route  POST /api/auth/register
 * @desc   Register a new user
 * @access Public (admin can also call this)
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return r.badRequest(res, 'name, email, password and role are required');

    const exists = await User.findOne({ email });
    if (exists) return r.conflict(res, 'Email already registered');

    const user  = await User.create({ name, email, password, role });
    const token = signToken(user._id);

    r.created(res, {
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    }, 'Registered successfully');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/**
 * @route  POST /api/auth/login
 * @desc   Login and get JWT
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return r.badRequest(res, 'Email and password required');

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return r.unauthorized(res, 'Invalid credentials');

    if (user.status !== 'active')
      return r.unauthorized(res, 'Account is inactive');

    const token = signToken(user._id);
    r.ok(res, {
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    }, 'Login successful');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/**
 * @route  GET /api/auth/me
 * @desc   Get current logged-in user
 * @access Private
 */
router.get('/me', protect, async (req, res) => {
  r.ok(res, req.user);
});

/**
 * @route  PUT /api/auth/change-password
 * @desc   Change password
 * @access Private
 */
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(currentPassword)))
      return r.badRequest(res, 'Current password is incorrect');

    user.password = newPassword;
    await user.save();
    r.ok(res, null, 'Password changed successfully');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;