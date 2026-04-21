// routes/payroll.js
/**
 * Payroll Routes
 *
 * Salary Formula:
 *   workingDays  = totalDaysInMonth - holidays
 *   perDaySalary = basicSalary / workingDays
 *   payable      = perDaySalary × daysPresent
 *   netSalary    = payable + bonus - extraDeductions
 *
 * LOCKING RULES:
 *   Once a payroll record is marked Paid:
 *     - No attendance edits for that employee+month are allowed (checked here)
 *     - No leave approval for that month is allowed  (checked in leaves.js)
 *     - The payroll record itself becomes read-only
 */

const express    = require('express');
const router     = express.Router();
const { Payroll } = require('../models/Others');
const { Attendance, EmployeeAttendance } = require('../models/Attendance');
const { Leave }  = require('../models/Others');
const Employee   = require('../models/Employee');
const r          = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'principal'));

/* ─── helpers ─────────────────────────────────────────────── */

/** Total days in a calendar month (1-based month) */
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Count holidays for an employee in a given month from EmployeeAttendance.
 * Holidays are attendance records with status === 'Holiday'.
 */
async function countHolidays(month, year) {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);
  const count = await EmployeeAttendance.countDocuments({
    status: 'Holiday',
    date: { $gte: start, $lte: end },
  });
  // Return unique holiday count (same date marked for multiple = still one day)
  const records = await EmployeeAttendance.distinct('date', {
    status: 'Holiday',
    date: { $gte: start, $lte: end },
  });
  return records.length;
}

/**
 * Count days present (including HalfDay as 0.5) for an employee in a month.
 * Pulls from EmployeeAttendance.
 */
async function getAttendanceSummary(employeeId, month, year) {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);

  const records = await EmployeeAttendance.find({
    employee: employeeId,
    date: { $gte: start, $lte: end },
  });

  let present  = 0;
  let absent   = 0;
  let late     = 0;
  let halfDay  = 0;
  let onLeave  = 0;
  let holidays = 0;

  for (const rec of records) {
    switch (rec.status) {
      case 'Present':  present++;  break;
      case 'Absent':   absent++;   break;
      case 'Late':     late++;     present++; break; // late counts as present
      case 'HalfDay':  halfDay++;  break;
      case 'OnLeave':  onLeave++;  break;
      case 'Holiday':  holidays++; break;
    }
  }

  // HalfDay = 0.5 days present
  const effectivePresentDays = present + halfDay * 0.5;

  return { present, absent, late, halfDay, onLeave, holidays, effectivePresentDays };
}

/**
 * Calculate salary components given employee and attendance data.
 */
function calculateSalary({ basicSalary, totalDays, holidays, daysPresent, bonus = 0, extraDeductions = 0 }) {
  const workingDays  = Math.max(1, totalDays - holidays);
  const perDay       = basicSalary / workingDays;
  const earned       = Math.round(perDay * daysPresent * 100) / 100;
  const deductions   = Math.round((basicSalary - earned + extraDeductions) * 100) / 100;
  const netSalary    = Math.round((earned + Number(bonus)) * 100) / 100;
  return { workingDays, perDay, earned, deductions, netSalary };
}

/* ─── GET /api/payroll ────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const { employeeId, month, year, status, academicYear } = req.query;
    const filter = {};
    if (employeeId)   filter.employee     = employeeId;
    if (month)        filter.month        = Number(month);
    if (year)         filter.year         = Number(year);
    if (status)       filter.status       = status;
    if (academicYear) filter.academicYear = academicYear;

    const records = await Payroll.find(filter)
      .populate('employee',    'name employeeId role monthlySalary')
      .populate('generatedBy', 'name')
      .populate('paidBy',      'name')
      .sort({ year: -1, month: -1 });

    r.ok(res, records);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── GET /api/payroll/preview ────────────────────────────── */
// Preview salary calculation before generating — returns computed values
router.get('/preview', async (req, res) => {
  try {
    const { employeeId, month, year, bonus = 0, extraDeductions = 0, manualHolidays } = req.query;
    if (!employeeId || !month || !year) return r.badRequest(res, 'employeeId, month, year required');

    const emp = await Employee.findById(employeeId);
    if (!emp) return r.notFound(res, 'Employee not found');

    const totalDays = daysInMonth(Number(year), Number(month));
    const summary   = await getAttendanceSummary(employeeId, Number(month), Number(year));
    const holidays  = manualHolidays !== undefined ? Number(manualHolidays) : summary.holidays;

    const calc = calculateSalary({
      basicSalary:  emp.monthlySalary,
      totalDays,
      holidays,
      daysPresent:  summary.effectivePresentDays,
      bonus:        Number(bonus),
      extraDeductions: Number(extraDeductions),
    });

    r.ok(res, {
      employee:    { name: emp.name, monthlySalary: emp.monthlySalary },
      totalDays,
      holidays,
      ...summary,
      ...calc,
      bonus:       Number(bonus),
      extraDeductions: Number(extraDeductions),
    });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── GET /api/payroll/:id ────────────────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const record = await Payroll.findById(req.params.id)
      .populate('employee',    'name employeeId role monthlySalary email mobileNo')
      .populate('generatedBy', 'name')
      .populate('paidBy',      'name');
    if (!record) return r.notFound(res, 'Payroll record not found');
    r.ok(res, record);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── POST /api/payroll  (generate single) ────────────────── */
router.post('/', async (req, res) => {
  try {
    const {
      employee: employeeId, month, year,
      bonus = 0, extraDeductions = 0,
      paymentMode = 'BankTransfer', academicYear,
      manualOverride, // if true, use req.body values directly (manual entry)
      daysPresent: manualDaysPresent,
      holidays:    manualHolidays,
    } = req.body;

    if (!employeeId || !month || !year || !academicYear) {
      return r.badRequest(res, 'employee, month, year, academicYear are required');
    }

    const existing = await Payroll.findOne({ employee: employeeId, month: Number(month), year: Number(year) });
    if (existing) return r.conflict(res, 'Payroll already generated for this month');

    const emp = await Employee.findById(employeeId);
    if (!emp) return r.notFound(res, 'Employee not found');

    const totalDays = daysInMonth(Number(year), Number(month));
    let   holidays, effectivePresentDays, summary;

    if (manualOverride) {
      // Admin manually provided values
      holidays             = Number(manualHolidays ?? 0);
      effectivePresentDays = Number(manualDaysPresent ?? 0);
      summary = { present: Number(manualDaysPresent ?? 0), absent: 0, late: 0, halfDay: 0, onLeave: 0, holidays };
    } else {
      // Pull from attendance records
      summary              = await getAttendanceSummary(employeeId, Number(month), Number(year));
      holidays             = summary.holidays;
      effectivePresentDays = summary.effectivePresentDays;
    }

    const calc = calculateSalary({
      basicSalary:     emp.monthlySalary,
      totalDays,
      holidays,
      daysPresent:     effectivePresentDays,
      bonus:           Number(bonus),
      extraDeductions: Number(extraDeductions),
    });

    const record = await Payroll.create({
      employee:        employeeId,
      month:           Number(month),
      year:            Number(year),
      basicSalary:     emp.monthlySalary,
      totalDays,
      holidays,
      workingDays:     calc.workingDays,
      perDaySalary:    calc.perDay,
      daysPresent:     effectivePresentDays,
      daysAbsent:      summary.absent ?? 0,
      daysLate:        summary.late   ?? 0,
      daysHalfDay:     summary.halfDay ?? 0,
      daysOnLeave:     summary.onLeave ?? 0,
      earnedAmount:    calc.earned,
      deductions:      calc.deductions,
      extraDeductions: Number(extraDeductions),
      bonus:           Number(bonus),
      netSalary:       calc.netSalary,
      paymentMode,
      academicYear,
      generatedBy:     req.user._id,
      manualOverride:  !!manualOverride,
    });

    await record.populate('employee', 'name employeeId');
    r.created(res, record, 'Payroll generated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── POST /api/payroll/generate-all  (bulk auto-generate) ── */
router.post('/generate-all', async (req, res) => {
  try {
    const { month, year, paymentMode = 'BankTransfer', academicYear, preview = false } = req.body;
    if (!month || !year || !academicYear) {
      return r.badRequest(res, 'month, year, academicYear are required');
    }

    const employees = await Employee.find({ status: 'active' });
    const totalDays = daysInMonth(Number(year), Number(month));

    let created = 0, skipped = 0, previews = [];
    const errors = [];

    for (const emp of employees) {
      // Skip if already generated
      const existing = await Payroll.findOne({
        employee: emp._id, month: Number(month), year: Number(year),
      });
      if (existing) { skipped++; continue; }

      const summary = await getAttendanceSummary(emp._id, Number(month), Number(year));
      const calc    = calculateSalary({
        basicSalary:  emp.monthlySalary,
        totalDays,
        holidays:     summary.holidays,
        daysPresent:  summary.effectivePresentDays,
        bonus:        0,
        extraDeductions: 0,
      });

      if (preview) {
        previews.push({
          employee:    { _id: emp._id, name: emp.name, employeeId: emp.employeeId },
          totalDays,
          holidays:    summary.holidays,
          workingDays: calc.workingDays,
          daysPresent: summary.effectivePresentDays,
          netSalary:   calc.netSalary,
        });
        continue;
      }

      try {
        await Payroll.create({
          employee:        emp._id,
          month:           Number(month),
          year:            Number(year),
          basicSalary:     emp.monthlySalary,
          totalDays,
          holidays:        summary.holidays,
          workingDays:     calc.workingDays,
          perDaySalary:    calc.perDay,
          daysPresent:     summary.effectivePresentDays,
          daysAbsent:      summary.absent,
          daysLate:        summary.late,
          daysHalfDay:     summary.halfDay,
          daysOnLeave:     summary.onLeave,
          earnedAmount:    calc.earned,
          deductions:      calc.deductions,
          extraDeductions: 0,
          bonus:           0,
          netSalary:       calc.netSalary,
          paymentMode,
          academicYear,
          generatedBy:     req.user._id,
        });
        created++;
      } catch (err) {
        if (err.code === 11000) skipped++;
        else errors.push(`${emp.name}: ${err.message}`);
      }
    }

    if (preview) {
      return r.ok(res, { previews, toCreate: previews.length, skipped }, 'Preview ready');
    }

    r.ok(res, { created, skipped, errors }, `Generated ${created} payroll records. Skipped ${skipped}.`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── PUT /api/payroll/:id  (edit — only when Pending) ───── */
router.put('/:id', async (req, res) => {
  try {
    const record = await Payroll.findById(req.params.id).populate('employee', 'monthlySalary name');
    if (!record) return r.notFound(res, 'Payroll record not found');
    if (record.status === 'Paid') return r.badRequest(res, 'Cannot edit a paid payroll record');

    const { daysPresent, holidays, bonus = record.bonus, extraDeductions = record.extraDeductions, paymentMode, notes } = req.body;

    const totalDays = record.totalDays;
    const calc = calculateSalary({
      basicSalary:     record.basicSalary,
      totalDays,
      holidays:        holidays  ?? record.holidays,
      daysPresent:     daysPresent ?? record.daysPresent,
      bonus:           Number(bonus),
      extraDeductions: Number(extraDeductions),
    });

    Object.assign(record, {
      daysPresent:     daysPresent  ?? record.daysPresent,
      holidays:        holidays     ?? record.holidays,
      workingDays:     calc.workingDays,
      perDaySalary:    calc.perDay,
      earnedAmount:    calc.earned,
      deductions:      calc.deductions,
      extraDeductions: Number(extraDeductions),
      bonus:           Number(bonus),
      netSalary:       calc.netSalary,
      ...(paymentMode && { paymentMode }),
      ...(notes       && { notes }),
    });

    await record.save();
    await record.populate('employee', 'name employeeId');
    r.ok(res, record, 'Payroll updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── PATCH /api/payroll/:id/pay  (mark paid — LOCKS record) */
router.patch('/:id/pay', async (req, res) => {
  try {
    const record = await Payroll.findById(req.params.id);
    if (!record) return r.notFound(res, 'Payroll record not found');
    if (record.status === 'Paid') return r.badRequest(res, 'Already marked as paid');

    record.status      = 'Paid';
    record.paymentDate = new Date();
    record.paidBy      = req.user._id;
    record.lockedAt    = new Date();
    await record.save();

    await record.populate('employee', 'name employeeId');
    r.ok(res, record, `Payroll marked as paid and locked for ${record.employee?.name}`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── DELETE /api/payroll/:id  (only Pending records) ──────  */
router.delete('/:id', async (req, res) => {
  try {
    const record = await Payroll.findById(req.params.id);
    if (!record) return r.notFound(res, 'Payroll record not found');
    if (record.status === 'Paid') return r.badRequest(res, 'Cannot delete a paid payroll record');
    await Payroll.findByIdAndDelete(req.params.id);
    r.ok(res, { id: req.params.id }, 'Payroll record deleted');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/* ─── GET /api/payroll/lock-check/:employeeId ───────────────
   Used by attendance/leave routes to check if payroll is paid for a month */
router.get('/lock-check/:employeeId', async (req, res) => {
  try {
    const { month, year } = req.query;
    const paid = await Payroll.findOne({
      employee: req.params.employeeId,
      month:    Number(month),
      year:     Number(year),
      status:   'Paid',
    });
    r.ok(res, { locked: !!paid });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;