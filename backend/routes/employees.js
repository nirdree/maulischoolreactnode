// routes/employees.js
const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');           // ← was missing
const Employee = require('../models/Employee');
const User     = require('../models/User');
const r        = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/employees ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { role, status, academicYear, search } = req.query;
    const filter = {};

    if (role)         filter.role         = role;
    if (status)       filter.status       = status;
    if (academicYear) filter.academicYear = academicYear;

    if (search) {
      filter.$or = [
        { name:       { $regex: search, $options: 'i' } },
        { email:      { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await Employee.find(filter)
      .populate('academicYear', 'name')
      .sort({ name: 1 });

    r.ok(res, employees);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/employees/:id ───────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('academicYear', 'name')
      .populate('user', 'email status');
    if (!employee) return r.notFound(res, 'Employee not found');
    r.ok(res, employee);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/employees ──────────────────────────────────────
router.post('/', authorize('admin', 'principal'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      await session.abortTransaction();
      return r.badRequest(res, 'name, email, password and role are required');
    }

    // Check both collections for duplicate email
    const existingUser     = await User.findOne({ email }).session(session);
    const existingEmployee = await Employee.findOne({ email }).session(session);

    if (existingUser || existingEmployee) {
      await session.abortTransaction();
      return r.conflict(res, 'Email already registered');
    }

    // Create employee first
    const employee = await Employee.create([req.body], { session });

    // Create linked user account
    const user = await User.create([{
      name,
      email,
      password,
      role,
      employeeId: employee[0]._id,
    }], { session });

    // Back-link employee → user
    employee[0].user = user[0]._id;
    await employee[0].save({ session });

    await session.commitTransaction();
    r.created(res, employee[0], 'Employee created');

  } catch (err) {
    await session.abortTransaction();
    if (err.code === 11000) return r.conflict(res, 'Email or employee ID already exists');
    r.serverError(res, err.message);
  } finally {
    session.endSession();
  }
});

// ── PUT /api/employees/:id ───────────────────────────────────
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    // Never allow password changes through this route
    const { password, ...updateData } = req.body;

    const employee = await Employee.findByIdAndUpdate(req.params.id, updateData, {
      new: true, runValidators: true,
    }).populate('user', 'email status');

    if (!employee) return r.notFound(res, 'Employee not found');

    // Sync name/email changes to the linked User doc
    if (employee.user) {
      const userUpdate = {};
      if (updateData.name)  userUpdate.name  = updateData.name;
      if (updateData.email) userUpdate.email = updateData.email;
      if (Object.keys(userUpdate).length) {
        await User.findByIdAndUpdate(employee.user._id || employee.user, userUpdate);
      }
    }

    r.ok(res, employee, 'Employee updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PATCH /api/employees/:id/status ─────────────────────────
// Changes employee status AND syncs the linked User account status
router.patch('/:id/status', authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'inactive', 'resigned'];
    if (!allowed.includes(status)) return r.badRequest(res, 'Invalid status');

    const employee = await Employee.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!employee) return r.notFound(res, 'Employee not found');

    // Sync to User: resigned → inactive (User schema only has active/inactive)
    if (employee.user) {
      const userStatus = status === 'active' ? 'active' : 'inactive';
      await User.findByIdAndUpdate(employee.user, { status: userStatus });
    }

    r.ok(res, employee, 'Status updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PATCH /api/employees/:id/password ───────────────────────
// Resets the password on the linked User account (bcrypt pre-save hook fires)
router.patch('/:id/password', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return r.badRequest(res, 'Password must be at least 6 characters');
    }

    const employee = await Employee.findById(req.params.id).select('user');
    if (!employee) return r.notFound(res, 'Employee not found');
    if (!employee.user) return r.notFound(res, 'No linked user account found');

    // Load user with password field (select: false in schema)
    const user = await User.findById(employee.user).select('+password');
    if (!user) return r.notFound(res, 'Linked user not found');

    user.password = password;   // pre-save hook will bcrypt this
    await user.save();

    r.ok(res, null, 'Password updated successfully');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/employees/:id ────────────────────────────────
// Cascades — deletes both the Employee doc and the linked User account
router.delete('/:id', authorize('admin'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const employee = await Employee.findByIdAndDelete(req.params.id).session(session);
    if (!employee) {
      await session.abortTransaction();
      return r.notFound(res, 'Employee not found');
    }

    // Also wipe the linked User account
    if (employee.user) {
      await User.findByIdAndDelete(employee.user).session(session);
    }

    await session.commitTransaction();
    r.noContent(res);
  } catch (err) {
    await session.abortTransaction();
    r.serverError(res, err.message);
  } finally {
    session.endSession();
  }
});

module.exports = router;