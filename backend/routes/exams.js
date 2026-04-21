// routes/exams.js
const express = require('express');
const router  = express.Router();
const { Exam, Marks } = require('../models/Exam');
const Subject = require('../models/Subject');
const r       = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ===================== EXAMS =====================

// ── GET /api/exams ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { classId, subjectId, examType, academicYear } = req.query;
    const filter = {};
    if (classId)      filter.classroom    = classId;
    if (subjectId)    filter.subject      = subjectId;
    if (examType)     filter.examType     = examType;
    if (academicYear) filter.academicYear = academicYear;

    const exams = await Exam.find(filter)
      .populate('classroom', 'displayName')
      .populate('subject',   'name totalMarks')
      .populate('teacher',   'name')
      .sort({ examDate: -1 });

    r.ok(res, exams);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/exams/:id ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('classroom', 'displayName')
      .populate('subject',   'name totalMarks')
      .populate('teacher',   'name');
    if (!exam) return r.notFound(res, 'Exam not found');
    r.ok(res, exam);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/exams ──────────────────────────────────────────
router.post('/', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const { classroom, subject, totalMarks } = req.body;

    // Validate available marks
    const sub = await Subject.findById(subject);
    if (!sub) return r.notFound(res, 'Subject not found');

    const existing = await Exam.find({ classroom, subject });
    const usedMarks = existing.reduce((sum, e) => sum + e.totalMarks, 0);

    if (usedMarks + Number(totalMarks) > sub.totalMarks) {
      return r.badRequest(res, `Only ${sub.totalMarks - usedMarks} marks available for this subject`);
    }

    const exam = await Exam.create(req.body);
    await exam.populate([
      { path: 'classroom', select: 'displayName' },
      { path: 'subject',   select: 'name' },
    ]);
    r.created(res, exam, 'Exam created');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/exams/:id ───────────────────────────────────────
router.put('/:id', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!exam) return r.notFound(res, 'Exam not found');
    r.ok(res, exam, 'Exam updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/exams/:id ────────────────────────────────────
router.delete('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    await Exam.findByIdAndDelete(req.params.id);
    // Cascade delete marks
    await Marks.deleteMany({ exam: req.params.id });
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ===================== MARKS =====================

// ── GET /api/exams/:examId/marks ─────────────────────────────
router.get('/:examId/marks', async (req, res) => {
  try {
    const marks = await Marks.find({ exam: req.params.examId })
      .populate('student', 'firstName lastName rollNumber admissionNo')
      .populate('subject', 'name')
      .sort({ 'student.rollNumber': 1 });
    r.ok(res, marks);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/exams/:examId/marks  (bulk save / upsert) ──────
router.post('/:examId/marks', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const { marks } = req.body;  // array of { student, marksObtained, isAbsent, remarks }
    if (!Array.isArray(marks) || marks.length === 0)
      return r.badRequest(res, 'marks array is required');

    const exam = await Exam.findById(req.params.examId);
    if (!exam) return r.notFound(res, 'Exam not found');

    const calcGrade = (obtained, total) => {
      const pct = (obtained / total) * 100;
      if (pct >= 90) return 'A+'; if (pct >= 80) return 'A';
      if (pct >= 70) return 'B+'; if (pct >= 60) return 'B';
      if (pct >= 50) return 'C';  if (pct >= 40) return 'D';
      return 'F';
    };

    const ops = marks.map(m => ({
      updateOne: {
        filter: { exam: exam._id, student: m.student },
        update: {
          $set: {
            exam:          exam._id,
            student:       m.student,
            subject:       exam.subject,
            classroom:     exam.classroom,
            marksObtained: m.isAbsent ? 0 : Number(m.marksObtained),
            isAbsent:      m.isAbsent || false,
            grade:         m.isAbsent ? 'F' : calcGrade(Number(m.marksObtained), exam.totalMarks),
            remarks:       m.remarks || '',
            academicYear:  exam.academicYear,
          },
        },
        upsert: true,
      },
    }));

    await Marks.bulkWrite(ops);
    r.ok(res, null, `${marks.length} mark(s) saved`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;