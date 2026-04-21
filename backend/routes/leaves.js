// routes/leaves.js
/**
 * Leave Routes
 *
 * Key rules:
 *  - Once an employee's payroll for a month is marked Paid, no leave for
 *    that month can be approved or created (payroll is locked).
 *  - Only pending leaves can be edited or deleted.
 *  - Admins/principals approve/reject; teachers manage their own.
 */

const express    = require('express');
const router     = express.Router();
const { Leave, Payroll } = require('../models/Others');
const r          = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/* ─── helpers ─────────────────────────────────────────────── */

/**
 * Check if payroll is locked for an employee in the month(s) overlapping
 * the leave date range. Returns true if ANY overlapping month is paid.
 */
async function isPayrollLocked(employeeId, fromDate, toDate) {
  const from = new Date(fromDate);
  const to   = new Date(toDate);

  // Collect all year-month pairs that the leave spans
  const months = new Set();
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    months.add(`${cursor.getFullYear()}-${cursor.getMonth() + 1}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const ym of months) {
    const [year, month] = ym.split('-').map(Number);
    const paid = await Payroll.findOne({
      employee: employeeId,
      month,
      year,
      status: 'Paid',
    });
    if (paid) return { locked: true, month, year };
  }
  return { locked: false };
}

/* ─── GET /api/leaves ─────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const { employeeId, status, academicYear, leaveType, fromDate, toDate } = req.query;
    const filter = {};
    if (status)       filter.status       = status;
    if (academicYear) filter.academicYear = academicYear;
    if (leaveType)    filter.leaveType    = leaveType;

    if (fromDate || toDate) {
      filter.fromDate = {};
      if (fromDate) filter.fromDate.$gte = new Date(fromDate);
      if (toDate)   filter.fromDate.$lte = new Date(toDate);
    }

    // Teachers see only their own leaves
    if (req.user.role === 'teacher') {
      filter.employee = req.user.employeeId;
    } else if (employeeId) {
      filter.employee = employeeId;
    }

    const leaves = await Leave.find(filter)
      .populate('employee',   'name employeeId role')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    r.ok(res, leaves);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── GET /api/leaves/summary  (leave balance per employee) ─ */
router.get('/summary', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { employeeId, academicYear } = req.query;
    const filter = { status: 'Approved' };
    if (academicYear) filter.academicYear = academicYear;
    if (employeeId)   filter.employee     = employeeId;

    const summary = await Leave.aggregate([
      { $match: filter },
      {
        $group: {
          _id:       { employee: '$employee', leaveType: '$leaveType' },
          totalDays: { $sum: '$totalDays' },
          count:     { $sum: 1 },
        },
      },
      {
        $group: {
          _id:   '$_id.employee',
          types: {
            $push: {
              leaveType: '$_id.leaveType',
              totalDays: '$totalDays',
              count:     '$count',
            },
          },
          totalLeaves: { $sum: '$totalDays' },
        },
      },
    ]);

    r.ok(res, summary);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── GET /api/leaves/:id ─────────────────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee',   'name employeeId role')
      .populate('approvedBy', 'name');
    if (!leave) return r.notFound(res, 'Leave not found');
    r.ok(res, leave);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── POST /api/leaves  (apply for leave) ────────────────── */
/* ─── POST /api/leaves  (apply for leave) ────────────────── */
router.post('/', async (req, res) => {
  try {
    let { employee: employeeId, fromDate, toDate, leaveType, reason, academicYear } = req.body;

    // If employeeId not provided in body, resolve it from the logged-in user
    if (!employeeId) {
      const Employee = require('../models/Employee');
      const emp = await Employee.findOne({ user: req.user._id }).select('_id');
      if (!emp) return r.notFound(res, 'Employee profile not found for this user');
      employeeId = emp._id;
    }

    if (!fromDate || !toDate || !leaveType || !reason || !academicYear) {
      return r.badRequest(res, 'fromDate, toDate, leaveType, reason, academicYear are required');
    }

    // Payroll lock check
    const lockCheck = await isPayrollLocked(employeeId, fromDate, toDate);
    if (lockCheck.locked) {
      return r.badRequest(
        res,
        `Cannot apply leave: payroll for ${lockCheck.month}/${lockCheck.year} is already paid and locked.`,
      );
    }

    const days = Math.ceil(
      (new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24),
    ) + 1;

    const leave = await Leave.create({ ...req.body, employee: employeeId, totalDays: days });
    await leave.populate('employee', 'name employeeId');
    r.created(res, leave, 'Leave application submitted');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── PUT /api/leaves/:id  (edit — only Pending) ─────────── */
router.put('/:id', async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return r.notFound(res, 'Leave not found');
    if (leave.status !== 'Pending') {
      return r.badRequest(res, 'Cannot edit a leave that has already been processed');
    }

    // Re-check payroll lock if dates are changing
    const fromDate = req.body.fromDate || leave.fromDate;
    const toDate   = req.body.toDate   || leave.toDate;
    const lockCheck = await isPayrollLocked(leave.employee, fromDate, toDate);
    if (lockCheck.locked) {
      return r.badRequest(
        res,
        `Cannot modify leave: payroll for ${lockCheck.month}/${lockCheck.year} is already paid and locked.`,
      );
    }

    if (req.body.fromDate || req.body.toDate) {
      req.body.totalDays = Math.ceil(
        (new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24),
      ) + 1;
    }

    Object.assign(leave, req.body);
    await leave.save();
    await leave.populate('employee', 'name employeeId');
    r.ok(res, leave, 'Leave updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── PATCH /api/leaves/:id/action  (approve / reject) ───── */
router.patch('/:id/action', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { status, approvalRemark } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return r.badRequest(res, "status must be 'Approved' or 'Rejected'");
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) return r.notFound(res, 'Leave record not found');
    if (leave.status !== 'Pending') {
      return r.badRequest(res, 'Leave has already been processed');
    }

    // Payroll lock check — cannot approve leave for a paid month
    if (status === 'Approved') {
      const lockCheck = await isPayrollLocked(leave.employee, leave.fromDate, leave.toDate);
      if (lockCheck.locked) {
        return r.badRequest(
          res,
          `Cannot approve leave: payroll for ${lockCheck.month}/${lockCheck.year} is already paid and locked. No changes allowed after salary disbursement.`,
        );
      }
    }

    leave.status          = status;
    leave.approvalRemark  = approvalRemark;
    leave.approvedBy      = req.user._id;
    await leave.save();
    await leave.populate('employee', 'name');

    r.ok(res, leave, `Leave ${status.toLowerCase()}`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── DELETE /api/leaves/:id  (only Pending) ─────────────── */
router.delete('/:id', async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return r.notFound(res, 'Leave not found');
    if (leave.status !== 'Pending') {
      return r.badRequest(res, 'Cannot delete a processed leave application');
    }

    // Payroll lock check
    const lockCheck = await isPayrollLocked(leave.employee, leave.fromDate, leave.toDate);
    if (lockCheck.locked) {
      return r.badRequest(res, `Cannot delete: payroll for ${lockCheck.month}/${lockCheck.year} is locked.`);
    }

    await leave.deleteOne();
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;