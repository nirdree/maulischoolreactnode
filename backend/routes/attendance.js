// routes/attendance.js
const express = require('express');
const router  = express.Router();
const { Attendance, EmployeeAttendance } = require('../models/Attendance');
const r       = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ===================== STUDENT ATTENDANCE =====================

// ── GET /api/attendance/students ─────────────────────────────
router.get('/students', async (req, res) => {
  try {
    const { classId, date, studentId, fromDate, toDate, academicYear } = req.query;
    const filter = {};
    if (classId)      filter.classroom    = classId;
    if (studentId)    filter.student      = studentId;
    if (academicYear) filter.academicYear = academicYear;

    if (date) {
      const d = new Date(date);
      filter.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    } else if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate)   filter.date.$lte = new Date(toDate);
    }

    // Parents can only see their children
    if (req.user.role === 'parent') {
      filter.student = { $in: req.user.studentIds || [] };
    }

    const records = await Attendance.find(filter)
      .populate('student',  'firstName lastName rollNumber admissionNo')
      .populate('classroom','displayName')
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    r.ok(res, records);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/attendance/students  (bulk save for a class+date)
router.post('/students', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const { records } = req.body;
    // records: [{ student, classroom, date, status, remark, academicYear }]
    if (!Array.isArray(records) || records.length === 0)
      return r.badRequest(res, 'records array required');

    const ops = records.map(rec => ({
      updateOne: {
        filter: { student: rec.student, date: new Date(rec.date) },
        update: { $set: { ...rec, markedBy: req.user._id, date: new Date(rec.date) } },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(ops);
    r.ok(res, null, `${records.length} attendance record(s) saved`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/attendance/students/summary  (monthly % per student) ─
router.get('/students/summary', async (req, res) => {
  try {
    const { classId, studentId, month, year, academicYear } = req.query;
    const filter = {};
    if (classId)      filter.classroom    = classId;
    if (studentId)    filter.student      = studentId;
    if (academicYear) filter.academicYear = academicYear;

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    }

    const summary = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$student',
          total:   { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absent:  { $sum: { $cond: [{ $eq: ['$status', 'Absent']  }, 1, 0] } },
          late:    { $sum: { $cond: [{ $eq: ['$status', 'Late']    }, 1, 0] } },
        },
      },
      {
        $addFields: {
          percentage: {
            $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1],
          },
        },
      },
    ]);

    r.ok(res, summary);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ===================== EMPLOYEE ATTENDANCE ====================

// ── GET /api/attendance/employees ────────────────────────────
router.get('/employees', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { date, employeeId, fromDate, toDate, academicYear } = req.query;
    const filter = {};
    if (employeeId)   filter.employee     = employeeId;
    if (academicYear) filter.academicYear = academicYear;

    if (date) {
      const d = new Date(date);
      filter.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    } else if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate)   filter.date.$lte = new Date(toDate);
    }

    const records = await EmployeeAttendance.find(filter)
      .populate('employee', 'name employeeId role')
      .sort({ date: -1 });

    r.ok(res, records);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/attendance/employees  (bulk) ───────────────────
router.post('/employees', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0)
      return r.badRequest(res, 'records array required');

    const ops = records.map(rec => ({
      updateOne: {
        filter: { employee: rec.employee, date: new Date(rec.date) },
        update: { $set: { ...rec, date: new Date(rec.date) } },
        upsert: true,
      },
    }));

    await EmployeeAttendance.bulkWrite(ops);
    r.ok(res, null, `${records.length} employee attendance record(s) saved`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;