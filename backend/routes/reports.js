// routes/reports.js
const express       = require('express');
const router        = express.Router();
const Student       = require('../models/Student');
const Employee      = require('../models/Employee');
const { Exam, Marks } = require('../models/Exam');
const { Attendance, EmployeeAttendance } = require('../models/Attendance');
const { Fee, FeePayment } = require('../models/Fee');
const { Payroll, Leave } = require('../models/Others');
const Classroom     = require('../models/Classroom');
const AcademicYear  = require('../models/AcademicYear');
const r             = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'principal'));

// ── GET /api/reports/overview ────────────────────────────────
// High-level counts for the dashboard
router.get('/overview', async (req, res) => {
  try {
    const { academicYear } = req.query;
    const ayFilter = academicYear ? { academicYear } : {};

    const [
      totalStudents, approvedStudents, underReviewStudents,
      totalEmployees, activeEmployees,
      totalClasses, totalFees, paidFees,
      pendingLeaves,
    ] = await Promise.all([
      Student.countDocuments(ayFilter),
      Student.countDocuments({ ...ayFilter, status: 'Approved' }),
      Student.countDocuments({ ...ayFilter, status: 'UnderReview' }),
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'active' }),
      Classroom.countDocuments({ isActive: true }),
      Fee.aggregate([{ $match: ayFilter }, { $group: { _id: null, total: { $sum: '$finalAmount' } } }]),
      Fee.aggregate([{ $match: { ...ayFilter, status: 'Paid' } }, { $group: { _id: null, total: { $sum: '$finalAmount' } } }]),
      Leave.countDocuments({ ...ayFilter, status: 'Pending' }),
    ]);

    const totalFeeAmount  = totalFees[0]?.total  || 0;
    const paidFeeAmount   = paidFees[0]?.total   || 0;
    const pendingFeeAmount = totalFeeAmount - paidFeeAmount;

    r.ok(res, {
      students: { total: totalStudents, approved: approvedStudents, underReview: underReviewStudents },
      employees: { total: totalEmployees, active: activeEmployees },
      classes: { total: totalClasses },
      fees: { total: totalFeeAmount, collected: paidFeeAmount, pending: pendingFeeAmount },
      leaves: { pending: pendingLeaves },
    });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/fee-collection ─────────────────────────
// Monthly fee collection summary
router.get('/fee-collection', async (req, res) => {
  try {
    const { year = new Date().getFullYear(), academicYear } = req.query;
    const match = { year: Number(year) };
    if (academicYear) match.academicYear = academicYear;

    const summary = await Fee.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$month',
          totalExpected: { $sum: '$finalAmount' },
          totalCollected: {
            $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$finalAmount', 0] },
          },
          totalPending: {
            $sum: {
              $cond: [{ $in: ['$status', ['Pending', 'Overdue', 'PartiallyPaid']] }, '$finalAmount', 0],
            },
          },
          paidCount:    { $sum: { $cond: [{ $eq: ['$status', 'Paid'] },    1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          overdueCount: { $sum: { $cond: [{ $eq: ['$status', 'Overdue'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: '$_id',
          totalExpected: 1,
          totalCollected: 1,
          totalPending: 1,
          paidCount: 1,
          pendingCount: 1,
          overdueCount: 1,
          collectionRate: {
            $cond: [
              { $gt: ['$totalExpected', 0] },
              { $round: [{ $multiply: [{ $divide: ['$totalCollected', '$totalExpected'] }, 100] }, 1] },
              0,
            ],
          },
        },
      },
    ]);

    r.ok(res, summary);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/fee-defaulters ─────────────────────────
router.get('/fee-defaulters', async (req, res) => {
  try {
    const { classId, academicYear, month, year } = req.query;
    const match = { status: { $in: ['Pending', 'Overdue', 'PartiallyPaid'] } };
    if (classId)      match.classroom    = classId;
    if (academicYear) match.academicYear = academicYear;
    if (month)        match.month        = Number(month);
    if (year)         match.year         = Number(year);

    const fees = await Fee.find(match)
      .populate('student',   'firstName lastName admissionNo fatherName fatherPhone')
      .populate('classroom', 'displayName')
      .sort({ year: -1, month: -1 });

    r.ok(res, fees);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/attendance-summary ──────────────────────
// Per-student monthly attendance percentage
router.get('/attendance-summary', async (req, res) => {
  try {
    const { classId, month, year, academicYear } = req.query;

    const matchFilter = {};
    if (classId)      matchFilter.classroom    = { $toObjectId: classId };
    if (academicYear) matchFilter.academicYear = { $toObjectId: academicYear };

    if (month && year) {
      const start = new Date(year, Number(month) - 1, 1);
      const end   = new Date(year, Number(month), 0, 23, 59, 59);
      matchFilter.date = { $gte: start, $lte: end };
    }

    const summary = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$student',
          total:   { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absent:  { $sum: { $cond: [{ $eq: ['$status', 'Absent']  }, 1, 0] } },
          late:    { $sum: { $cond: [{ $eq: ['$status', 'Late']    }, 1, 0] } },
          halfDay: { $sum: { $cond: [{ $eq: ['$status', 'HalfDay'] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          percentage: {
            $cond: [
              { $gt: ['$total', 0] },
              { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] },
              0,
            ],
          },
        },
      },
      { $sort: { percentage: 1 } },
    ]);

    // Populate student details
    await Student.populate(summary, { path: '_id', select: 'firstName lastName admissionNo rollNumber classroom' });

    r.ok(res, summary);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/low-attendance ─────────────────────────
// Students below minimum attendance threshold
router.get('/low-attendance', async (req, res) => {
  try {
    const { threshold = 75, classId, month, year, academicYear } = req.query;

    const matchFilter = {};
    if (classId)      matchFilter.classroom    = { $toObjectId: classId };
    if (academicYear) matchFilter.academicYear = { $toObjectId: academicYear };

    if (month && year) {
      const start = new Date(year, Number(month) - 1, 1);
      const end   = new Date(year, Number(month), 0, 23, 59, 59);
      matchFilter.date = { $gte: start, $lte: end };
    }

    const summary = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$student',
          total:   { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          percentage: {
            $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1],
          },
        },
      },
      { $match: { percentage: { $lt: Number(threshold) } } },
      { $sort: { percentage: 1 } },
    ]);

    await Student.populate(summary, { path: '_id', select: 'firstName lastName admissionNo rollNumber fatherPhone fatherEmail classroom' });
    await Classroom.populate(summary, { path: '_id.classroom', select: 'displayName' });

    r.ok(res, summary, `${summary.length} students below ${threshold}% attendance`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/exam-results ───────────────────────────
// Classwise / subject-wise exam results analysis
router.get('/exam-results', async (req, res) => {
  try {
    const { classId, examId, subjectId, academicYear } = req.query;
    const match = {};
    if (classId)      match.classroom    = { $toObjectId: classId };
    if (examId)       match.exam         = { $toObjectId: examId };
    if (subjectId)    match.subject      = { $toObjectId: subjectId };
    if (academicYear) match.academicYear = { $toObjectId: academicYear };

    const analysis = await Marks.aggregate([
      { $match: match },
      {
        $group: {
          _id: { exam: '$exam', subject: '$subject', classroom: '$classroom' },
          totalStudents:   { $sum: 1 },
          absentStudents:  { $sum: { $cond: ['$isAbsent', 1, 0] } },
          presentStudents: { $sum: { $cond: ['$isAbsent', 0, 1] } },
          totalMarksSum:   { $sum: { $cond: ['$isAbsent', 0, '$marksObtained'] } },
          highestMarks:    { $max: '$marksObtained' },
          lowestMarks:     { $min: { $cond: ['$isAbsent', null, '$marksObtained'] } },
          gradeAPlus:  { $sum: { $cond: [{ $eq: ['$grade', 'A+'] }, 1, 0] } },
          gradeA:      { $sum: { $cond: [{ $eq: ['$grade', 'A']  }, 1, 0] } },
          gradeBPlus:  { $sum: { $cond: [{ $eq: ['$grade', 'B+'] }, 1, 0] } },
          gradeB:      { $sum: { $cond: [{ $eq: ['$grade', 'B']  }, 1, 0] } },
          gradeC:      { $sum: { $cond: [{ $eq: ['$grade', 'C']  }, 1, 0] } },
          gradeD:      { $sum: { $cond: [{ $eq: ['$grade', 'D']  }, 1, 0] } },
          gradeF:      { $sum: { $cond: [{ $eq: ['$grade', 'F']  }, 1, 0] } },
        },
      },
      {
        $addFields: {
          averageMarks: {
            $cond: [
              { $gt: ['$presentStudents', 0] },
              { $round: [{ $divide: ['$totalMarksSum', '$presentStudents'] }, 1] },
              0,
            ],
          },
          passCount: {
            $add: ['$gradeAPlus', '$gradeA', '$gradeBPlus', '$gradeB', '$gradeC', '$gradeD'],
          },
        },
      },
    ]);

    await Exam.populate(analysis,     { path: '_id.exam',      select: 'name examType totalMarks examDate' });
    await Classroom.populate(analysis, { path: '_id.classroom', select: 'displayName' });

    r.ok(res, analysis);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/student-result-card ─────────────────────
// Full result card for a single student across all exams
router.get('/student-result-card', async (req, res) => {
  try {
    const { studentId, academicYear } = req.query;
    if (!studentId) return r.badRequest(res, 'studentId is required');

    const filter = { student: studentId };
    if (academicYear) filter.academicYear = academicYear;

    const [student, marks] = await Promise.all([
      Student.findById(studentId)
        .populate('classroom', 'displayName className section')
        .populate('academicYear', 'name'),
      Marks.find(filter)
        .populate('exam',    'name examType totalMarks examDate')
        .populate('subject', 'name totalMarks')
        .sort({ 'exam.examDate': 1 }),
    ]);

    if (!student) return r.notFound(res, 'Student not found');

    // Group marks by subject
    const bySubject = {};
    for (const m of marks) {
      const subId = m.subject?._id?.toString() || m.subject?.toString();
      if (!bySubject[subId]) {
        bySubject[subId] = { subject: m.subject, exams: [], totalObtained: 0, totalMax: 0 };
      }
      bySubject[subId].exams.push(m);
      if (!m.isAbsent) {
        bySubject[subId].totalObtained += m.marksObtained;
        bySubject[subId].totalMax      += m.exam?.totalMarks || 0;
      }
    }

    // Compute overall totals
    let grandObtained = 0, grandMax = 0;
    const subjects = Object.values(bySubject).map(s => {
      const pct   = s.totalMax > 0 ? Math.round((s.totalObtained / s.totalMax) * 100) : 0;
      const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' :
                    pct >= 60 ? 'B'  : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
      grandObtained += s.totalObtained;
      grandMax      += s.totalMax;
      return { ...s, percentage: pct, grade };
    });

    const overallPct   = grandMax > 0 ? Math.round((grandObtained / grandMax) * 100) : 0;
    const overallGrade = overallPct >= 90 ? 'A+' : overallPct >= 80 ? 'A' : overallPct >= 70 ? 'B+' :
                         overallPct >= 60 ? 'B'  : overallPct >= 50 ? 'C' : overallPct >= 40 ? 'D' : 'F';

    r.ok(res, {
      student,
      subjects,
      overall: { obtained: grandObtained, maximum: grandMax, percentage: overallPct, grade: overallGrade },
    });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/payroll-summary ────────────────────────
router.get('/payroll-summary', async (req, res) => {
  try {
    const { month, year, academicYear } = req.query;
    const match = {};
    if (month)        match.month        = Number(month);
    if (year)         match.year         = Number(year);
    if (academicYear) match.academicYear = academicYear;

    const summary = await Payroll.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          totalBasic:     { $sum: '$basicSalary' },
          totalDeductions:{ $sum: '$deductions' },
          totalBonus:     { $sum: '$bonus' },
          totalNet:       { $sum: '$netSalary' },
          paidCount:      { $sum: { $cond: [{ $eq: ['$status', 'Paid'] },    1, 0] } },
          pendingCount:   { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
        },
      },
    ]);

    const records = await Payroll.find(match)
      .populate('employee', 'name employeeId role monthlySalary')
      .sort({ employee: 1 });

    r.ok(res, { summary: summary[0] || {}, records });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/classwise-students ─────────────────────
router.get('/classwise-students', async (req, res) => {
  try {
    const { academicYear } = req.query;
    const match = {};
    if (academicYear) match.academicYear = { $toObjectId: academicYear };

    const data = await Student.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$classroom',
          total:       { $sum: 1 },
          approved:    { $sum: { $cond: [{ $eq: ['$status', 'Approved'] },     1, 0] } },
          underReview: { $sum: { $cond: [{ $eq: ['$status', 'UnderReview'] },  1, 0] } },
          left:        { $sum: { $cond: [{ $eq: ['$status', 'Left'] },         1, 0] } },
          boys:        { $sum: { $cond: [{ $eq: ['$gender', 'Male'] },         1, 0] } },
          girls:       { $sum: { $cond: [{ $eq: ['$gender', 'Female'] },       1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    await Classroom.populate(data, { path: '_id', select: 'displayName className section order' });
    data.sort((a, b) => (a._id?.order || 99) - (b._id?.order || 99));

    r.ok(res, data);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/employee-attendance-summary ─────────────
router.get('/employee-attendance-summary', async (req, res) => {
  try {
    const { month, year, academicYear } = req.query;
    const matchFilter = {};
    if (academicYear) matchFilter.academicYear = { $toObjectId: academicYear };

    if (month && year) {
      const start = new Date(year, Number(month) - 1, 1);
      const end   = new Date(year, Number(month), 0, 23, 59, 59);
      matchFilter.date = { $gte: start, $lte: end };
    }

    const summary = await EmployeeAttendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$employee',
          total:   { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] },  1, 0] } },
          absent:  { $sum: { $cond: [{ $eq: ['$status', 'Absent'] },   1, 0] } },
          onLeave: { $sum: { $cond: [{ $eq: ['$status', 'OnLeave'] },  1, 0] } },
          late:    { $sum: { $cond: [{ $eq: ['$status', 'Late'] },     1, 0] } },
        },
      },
      {
        $addFields: {
          percentage: {
            $cond: [
              { $gt: ['$total', 0] },
              { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] },
              0,
            ],
          },
        },
      },
    ]);

    await Employee.populate(summary, { path: '_id', select: 'name employeeId role' });

    r.ok(res, summary);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;