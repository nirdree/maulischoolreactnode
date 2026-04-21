// routes/students.js
const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const Student  = require('../models/Student');
const User     = require('../models/User');
const { Attendance } = require('../models/Attendance');
const { Exam, Marks } = require('../models/Exam');
const { Fee, FeePayment } = require('../models/Fee');
const r        = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ─────────────────────────────────────────────────────────────
// HELPER — safe abort (never throws if already committed)
// ─────────────────────────────────────────────────────────────
async function safeAbort(session) {
  try { await session.abortTransaction(); } catch (_) {}
}

// ─────────────────────────────────────────────────────────────
// HELPER — resolve or create a parent User account
// Priority: existingUserId → email lookup/create → null
// Always appends studentId to user.studentIds (dedup)
// ─────────────────────────────────────────────────────────────
async function resolveParentUser({ existingUserId, email, phone, name, password, studentId, session }) {
  if (existingUserId) {
    const user = await User.findById(existingUserId).session(session);
    if (!user) throw new Error(`Parent user ${existingUserId} not found`);
    const already = user.studentIds.map(String).includes(String(studentId));
    if (!already) { user.studentIds.push(studentId); await user.save({ session }); }
    return user;
  }
  if (email) {
    const existing = await User.findOne({ email: email.toLowerCase() }).session(session);
    if (existing) {
      const already = existing.studentIds.map(String).includes(String(studentId));
      if (!already) { existing.studentIds.push(studentId); await existing.save({ session }); }
      return existing;
    }
    const [created] = await User.create([{
      name, email: email.toLowerCase(), password,
      role: 'parent', studentIds: [studentId],
    }], { session });
    return created;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// HELPER — sync parent account active/inactive based on
// whether they still have any Approved / UnderReview children
// ─────────────────────────────────────────────────────────────
async function syncParentStatus(student, desiredStatus) {
  const seen = new Set();
  for (const userId of [student.fatherUser, student.motherUser]) {
    if (!userId) continue;
    const uid = String(userId);
    if (seen.has(uid)) continue;
    seen.add(uid);
    const user = await User.findById(userId).select('studentIds');
    if (!user) continue;
    if (desiredStatus === 'inactive') {
      const activeCount = await Student.countDocuments({
        _id:    { $in: user.studentIds, $ne: student._id },
        status: { $in: ['Approved', 'UnderReview'] },
      });
      if (activeCount === 0) await User.findByIdAndUpdate(userId, { status: 'inactive' });
    } else {
      await User.findByIdAndUpdate(userId, { status: 'active' });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/students/search-parents?q=
// Returns existing parent User accounts matching name / email
// Used by the admission form to link an existing parent
// ─────────────────────────────────────────────────────────────
router.get('/search-parents', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (q.trim().length < 2) return r.ok(res, []);
    const users = await User.find({
      role: 'parent',
      $or: [
        { name:  { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    })
      .select('name email status studentIds')
      .populate('studentIds', 'firstName lastName admissionNo')
      .limit(10);
    r.ok(res, users);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/students
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { classId, status, academicYear, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (classId)      filter.classroom    = classId;
    if (status)       filter.status       = status;
    if (academicYear) filter.academicYear = academicYear;
    if (req.user.role === 'parent') filter._id = { $in: req.user.studentIds || [] };
    if (search) {
      filter.$or = [
        { firstName:   { $regex: search, $options: 'i' } },
        { lastName:    { $regex: search, $options: 'i' } },
        { admissionNo: { $regex: search, $options: 'i' } },
        { fatherName:  { $regex: search, $options: 'i' } },
        { motherName:  { $regex: search, $options: 'i' } },
      ];
    }
    const total    = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .populate('classroom',    'displayName className section')
      .populate('academicYear', 'name')
      .populate('fatherUser',   'name email status')
      .populate('motherUser',   'name email status')
      .sort({ rollNumber: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    r.ok(res, students, 'Students fetched', {
      total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit),
    });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/students/:id
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('classroom',    'displayName className section monthlyFees')
      .populate('academicYear', 'name')
      .populate('fatherUser',   'name email status studentIds')
      .populate('motherUser',   'name email status studentIds');
    if (!student) return r.notFound(res, 'Student not found');
    if (req.user.role === 'parent') {
      const allowed = (req.user.studentIds || []).map(String);
      if (!allowed.includes(String(student._id))) return r.forbidden(res);
    }
    r.ok(res, student);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/students — Full admission
//
// For each parent slot (father / mother):
//   • fatherExistingUserId  → link that existing User (append studentId)
//   • fatherEmail present   → find-or-create User
//   • nothing               → no account for that slot
//
// One parent User can be linked to many students (studentIds[]).
// Both parents may share the same account (same email / existingUserId).
// ─────────────────────────────────────────────────────────────
router.post('/', authorize('admin', 'principal'), async (req, res) => {
  const session   = await mongoose.startSession();
  let   committed = false;
  try {
    session.startTransaction();

    const {
      fatherExistingUserId, fatherEmail, fatherPhone, fatherName, fatherOccupation, fatherPassword,
      motherExistingUserId, motherEmail, motherPhone, motherName, motherOccupation, motherPassword,
      ...studentData
    } = req.body;

    // Merge plain parent fields into student doc
    const merge = { fatherName, fatherPhone, fatherEmail, fatherOccupation, motherName, motherPhone, motherEmail, motherOccupation };
    for (const [k, v] of Object.entries(merge)) { if (v) studentData[k] = v; }

    const [student] = await Student.create([studentData], { session });

    // Resolve father
    const fatherUser = await resolveParentUser({
      existingUserId: fatherExistingUserId,
      email: fatherEmail, phone: fatherPhone,
      name:  fatherName || `${studentData.firstName} Father`,
      password: fatherPassword || fatherPhone || 'school@123',
      studentId: student._id, session,
    });
    if (fatherUser) student.fatherUser = fatherUser._id;

    // Resolve mother — check for shared account
    const sharedAccount =
      (fatherExistingUserId && motherExistingUserId && String(fatherExistingUserId) === String(motherExistingUserId)) ||
      (fatherEmail && motherEmail && fatherEmail.toLowerCase() === motherEmail.toLowerCase());

    const motherUser = sharedAccount
      ? fatherUser
      : await resolveParentUser({
          existingUserId: motherExistingUserId,
          email: motherEmail, phone: motherPhone,
          name:  motherName || `${studentData.firstName} Mother`,
          password: motherPassword || motherPhone || 'school@123',
          studentId: student._id, session,
        });
    if (motherUser) student.motherUser = motherUser._id;

    await student.save({ session });
    await session.commitTransaction();
    committed = true;

    const populated = await Student.findById(student._id)
      .populate('classroom',  'displayName')
      .populate('fatherUser', 'name email status')
      .populate('motherUser', 'name email status');

    r.created(res, populated, 'Student admission created');
  } catch (err) {
    if (!committed) await safeAbort(session);
    if (err.code === 11000) return r.conflict(res, 'Duplicate admission number or email');
    r.serverError(res, err.message);
  } finally {
    session.endSession();
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/students/:id — Edit profile (no user ref changes)
// ─────────────────────────────────────────────────────────────
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { fatherUser, motherUser, admissionNo, ...updateData } = req.body;
    const student = await Student.findByIdAndUpdate(req.params.id, updateData, {
      new: true, runValidators: true,
    })
      .populate('classroom',  'displayName')
      .populate('fatherUser', 'name email status')
      .populate('motherUser', 'name email status');
    if (!student) return r.notFound(res, 'Student not found');
    r.ok(res, student, 'Student updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/students/:id/link-parent
// Link or replace a parent account for one slot (father / mother)
// body: { slot, existingUserId?, email?, name?, phone?, password? }
// ─────────────────────────────────────────────────────────────
router.patch('/:id/link-parent', authorize('admin', 'principal'), async (req, res) => {
  const session   = await mongoose.startSession();
  let   committed = false;
  try {
    session.startTransaction();
    const { slot, existingUserId, email, name, phone, password } = req.body;
    if (!['father', 'mother'].includes(slot)) return r.badRequest(res, 'slot must be "father" or "mother"');

    const student = await Student.findById(req.params.id).session(session);
    if (!student) return r.notFound(res, 'Student not found');

    // Un-link from old account
    const oldId = slot === 'father' ? student.fatherUser : student.motherUser;
    if (oldId) {
      const old = await User.findById(oldId).session(session);
      if (old) {
        old.studentIds = (old.studentIds || []).filter((s) => String(s) !== String(student._id));
        await old.save({ session });
      }
    }

    const newUser = await resolveParentUser({
      existingUserId, email, phone,
      name: name || `${student.firstName} ${slot === 'father' ? 'Father' : 'Mother'}`,
      password: password || phone || 'school@123',
      studentId: student._id, session,
    });

    student[slot === 'father' ? 'fatherUser' : 'motherUser'] = newUser?._id || null;
    await student.save({ session });
    await session.commitTransaction();
    committed = true;

    const populated = await Student.findById(student._id)
      .populate('fatherUser', 'name email status')
      .populate('motherUser', 'name email status');
    r.ok(res, populated, `${slot} account linked`);
  } catch (err) {
    if (!committed) await safeAbort(session);
    if (err.code === 11000) return r.conflict(res, 'Email already registered');
    r.serverError(res, err.message);
  } finally {
    session.endSession();
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/students/:id/status
// Syncs parent account status when student goes Left / Rejected
// ─────────────────────────────────────────────────────────────
router.patch('/:id/status', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { status, rejectionRemark, holdRemark, leavingReason, leavingDate } = req.body;
    const allowed = ['UnderReview', 'Approved', 'Rejected', 'OnHold', 'Left', 'Alumni'];
    if (!allowed.includes(status)) return r.badRequest(res, 'Invalid status');

    const student = await Student.findById(req.params.id);
    if (!student) return r.notFound(res, 'Student not found');

    const update = { status };
    if (rejectionRemark) update.rejectionRemark = rejectionRemark;
    if (holdRemark)      update.holdRemark      = holdRemark;
    if (leavingReason)   update.leavingReason   = leavingReason;
    if (leavingDate)     update.leavingDate     = leavingDate;

    if (status === 'Approved') {
      const count = await Student.countDocuments({
        classroom: student.classroom, status: 'Approved', _id: { $ne: student._id },
      });
      update.rollNumber = count + 1;
    }

    const updated = await Student.findByIdAndUpdate(req.params.id, update, { new: true });

    // Sync parent accounts
    if (['Left', 'Rejected'].includes(status))     await syncParentStatus(student, 'inactive');
    else if (status === 'Approved')                await syncParentStatus(student, 'active');

    r.ok(res, updated, `Status updated to ${status}`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/students/:id/block-parent
// body: { target: 'father'|'mother'|'both', blocked: true|false }
// ─────────────────────────────────────────────────────────────
router.patch('/:id/block-parent', authorize('admin'), async (req, res) => {
  try {
    const { target = 'both', blocked } = req.body;
    if (typeof blocked !== 'boolean') return r.badRequest(res, 'blocked must be true or false');
    const student = await Student.findById(req.params.id).select('fatherUser motherUser');
    if (!student) return r.notFound(res, 'Student not found');

    const status  = blocked ? 'inactive' : 'active';
    const userIds = [];
    const seen    = new Set();
    for (const [slot, uid] of [['father', student.fatherUser], ['mother', student.motherUser]]) {
      if (!uid || (target !== 'both' && target !== slot)) continue;
      const key = String(uid);
      if (seen.has(key)) continue;
      seen.add(key);
      userIds.push(uid);
    }
    if (!userIds.length) return r.badRequest(res, 'No parent accounts linked');
    await User.updateMany({ _id: { $in: userIds } }, { status });
    r.ok(res, null, `Parent account(s) ${blocked ? 'blocked' : 'unblocked'}`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/students/:id/parent-password
// body: { target: 'father'|'mother', password }
// ─────────────────────────────────────────────────────────────
router.patch('/:id/parent-password', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { target, password } = req.body;
    if (!['father', 'mother'].includes(target)) return r.badRequest(res, 'target must be "father" or "mother"');
    if (!password || password.length < 6) return r.badRequest(res, 'Password must be at least 6 characters');

    const student = await Student.findById(req.params.id).select('fatherUser motherUser');
    if (!student) return r.notFound(res, 'Student not found');

    const userId = target === 'father' ? student.fatherUser : student.motherUser;
    if (!userId) return r.notFound(res, `No ${target} account linked`);

    const user = await User.findById(userId).select('+password');
    if (!user) return r.notFound(res, 'Parent user not found');

    user.password = password;
    await user.save();
    r.ok(res, null, 'Password updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/students/:id  — cascade orphan parent accounts
// ─────────────────────────────────────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res) => {
  const session   = await mongoose.startSession();
  let   committed = false;
  try {
    session.startTransaction();
    const student = await Student.findByIdAndDelete(req.params.id).session(session);
    if (!student) {
      await safeAbort(session);
      committed = true;
      return r.notFound(res, 'Student not found');
    }
    const seen = new Set();
    for (const userId of [student.fatherUser, student.motherUser]) {
      if (!userId) continue;
      const uid = String(userId);
      if (seen.has(uid)) continue;
      seen.add(uid);
      const user = await User.findById(userId).session(session);
      if (!user) continue;
      user.studentIds = (user.studentIds || []).filter((s) => String(s) !== String(student._id));
      if (user.studentIds.length === 0) {
        await User.findByIdAndDelete(userId).session(session);
      } else {
        await user.save({ session });
      }
    }
    await session.commitTransaction();
    committed = true;
    r.noContent(res);
  } catch (err) {
    if (!committed) await safeAbort(session);
    r.serverError(res, err.message);
  } finally {
    session.endSession();
  }
});

router.get('/:id/overview', async (req, res) => {
  try {
    const studentId = req.params.id;
 
    // Guard: parent can only view their own children
    if (req.user.role === 'parent') {
      const allowed = (req.user.studentIds || []).map(String);
      if (!allowed.includes(studentId)) return r.forbidden(res);
    }
 
    const student = await Student.findById(studentId)
      .populate('classroom',    'displayName className section monthlyFees')
      .populate('academicYear', 'name startDate endDate')
      .populate('fatherUser',   'name email status studentIds')
      .populate('motherUser',   'name email status studentIds');
 
    if (!student) return r.notFound(res, 'Student not found');
 
    // ── Attendance summary (current academic year) ──
    const attendanceRecords = await Attendance.find({
      student:      studentId,
      academicYear: student.academicYear?._id,
    });
 
    const attSummary = { Present: 0, Absent: 0, Late: 0, HalfDay: 0, Holiday: 0, total: 0 };
    for (const a of attendanceRecords) {
      attSummary[a.status] = (attSummary[a.status] || 0) + 1;
      attSummary.total += 1;
    }
    const workingDays = attSummary.total - attSummary.Holiday;
    attSummary.percentage = workingDays > 0
      ? Math.round(((attSummary.Present + attSummary.Late * 0.5 + attSummary.HalfDay * 0.5) / workingDays) * 100)
      : 0;
 
    // ── Fee summary (current academic year) ──
    const feeRecords = await Fee.find({
      student:      studentId,
      academicYear: student.academicYear?._id,
    }).sort({ year: 1, month: 1 });
 
    const feeSummary = {
      total:   feeRecords.reduce((s, f) => s + f.finalAmount, 0),
      paid:    0,
      pending: 0,
      overdue: 0,
    };
    for (const f of feeRecords) {
      if (f.status === 'Paid')   feeSummary.paid    += f.finalAmount;
      if (f.status === 'Pending') feeSummary.pending += f.finalAmount;
      if (f.status === 'Overdue') feeSummary.overdue += f.finalAmount;
    }
 
    // ── Exam summary (current academic year) ──
    const marks = await Marks.find({
      student:      studentId,
      academicYear: student.academicYear?._id,
    })
      .populate('exam',    'name examType totalMarks examDate')
      .populate('subject', 'name');
 
    // Best/Worst subject calculation
    const subjectMap = {};
    for (const m of marks) {
      if (m.isAbsent) continue;
      const name = m.subject?.name || 'Unknown';
      if (!subjectMap[name]) subjectMap[name] = { total: 0, obtained: 0, count: 0 };
      subjectMap[name].total    += m.exam?.totalMarks || 100;
      subjectMap[name].obtained += m.marksObtained;
      subjectMap[name].count    += 1;
    }
    const subjectStats = Object.entries(subjectMap).map(([name, v]) => ({
      name,
      percentage: Math.round((v.obtained / v.total) * 100),
      obtained: v.obtained,
      total: v.total,
    })).sort((a, b) => b.percentage - a.percentage);
 
    const overallObtained = marks.filter(m => !m.isAbsent).reduce((s, m) => s + m.marksObtained, 0);
    const overallTotal    = marks.filter(m => !m.isAbsent).reduce((s, m) => s + (m.exam?.totalMarks || 100), 0);
    const overallPerc     = overallTotal > 0 ? Math.round((overallObtained / overallTotal) * 100) : 0;
 
    r.ok(res, {
      student,
      attendance: { ...attSummary, records: attendanceRecords.slice(-30) },
      fees:       { ...feeSummary, records: feeRecords },
      exams:      { marks, subjectStats, overallPercentage: overallPerc, totalExams: marks.length },
    });
  } catch (err) {
    r.serverError(res, err.message);
  }
});
 
// ─────────────────────────────────────────────────────────────
// GET /api/students/:id/attendance
// Full attendance list with optional month/year filter
// ─────────────────────────────────────────────────────────────
router.get('/:id/attendance', async (req, res) => {
  try {
    const { month, year, academicYear } = req.query;
    const filter = { student: req.params.id };
    if (academicYear) filter.academicYear = academicYear;
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end   = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    }
 
    const records = await Attendance.find(filter)
      .sort({ date: 1 })
      .populate('markedBy', 'name');
 
    r.ok(res, records);
  } catch (err) {
    r.serverError(res, err.message);
  }
});
 
// ─────────────────────────────────────────────────────────────
// GET /api/students/:id/marks
// All exam marks; optionally filter by academicYear or examType
// ─────────────────────────────────────────────────────────────
router.get('/:id/marks', async (req, res) => {
  try {
    const { academicYear, examType } = req.query;
    const filter = { student: req.params.id };
    if (academicYear) filter.academicYear = academicYear;
 
    const marks = await Marks.find(filter)
      .populate({ path: 'exam', match: examType ? { examType } : {}, select: 'name examType totalMarks examDate' })
      .populate('subject', 'name')
      .sort({ createdAt: -1 });
 
    // Filter out marks where exam was null (didn't match examType)
    const filtered = examType ? marks.filter(m => m.exam) : marks;
    r.ok(res, filtered);
  } catch (err) {
    r.serverError(res, err.message);
  }
});
 
// ─────────────────────────────────────────────────────────────
// GET /api/students/:id/fees
// All fee records + payment receipts
// ─────────────────────────────────────────────────────────────
router.get('/:id/fees', async (req, res) => {
  try {
    const { academicYear } = req.query;
    const filter = { student: req.params.id };
    if (academicYear) filter.academicYear = academicYear;
 
    const fees = await Fee.find(filter).sort({ year: 1, month: 1 });
    const feeIds = fees.map(f => f._id);
    const payments = await FeePayment.find({ fee: { $in: feeIds } })
      .populate('collectedBy', 'name')
      .sort({ paymentDate: -1 });
 
    r.ok(res, { fees, payments });
  } catch (err) {
    r.serverError(res, err.message);
  }
});
 
// ─────────────────────────────────────────────────────────────
// GET /api/students/:id/academic-history
// Marks grouped by academic year for historical comparison
// ─────────────────────────────────────────────────────────────
router.get('/:id/academic-history', async (req, res) => {
  try {
    const allMarks = await Marks.find({ student: req.params.id })
      .populate('exam',         'name examType totalMarks examDate')
      .populate('subject',      'name')
      .populate('academicYear', 'name startDate')
      .sort({ createdAt: -1 });
 
    // Group by academic year
    const byYear = {};
    for (const m of allMarks) {
      const ayId   = String(m.academicYear?._id || 'unknown');
      const ayName = m.academicYear?.name || 'Unknown Year';
      if (!byYear[ayId]) byYear[ayId] = { academicYear: { _id: ayId, name: ayName, startDate: m.academicYear?.startDate }, marks: [] };
      byYear[ayId].marks.push(m);
    }
 
    // Compute summary per year
    const history = Object.values(byYear).map(entry => {
      const valid    = entry.marks.filter(m => !m.isAbsent);
      const obtained = valid.reduce((s, m) => s + m.marksObtained, 0);
      const total    = valid.reduce((s, m) => s + (m.exam?.totalMarks || 100), 0);
      return {
        ...entry,
        summary: {
          totalExams:  entry.marks.length,
          overallPerc: total > 0 ? Math.round((obtained / total) * 100) : 0,
        },
      };
    }).sort((a, b) => new Date(b.academicYear.startDate) - new Date(a.academicYear.startDate));
 
    r.ok(res, history);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;