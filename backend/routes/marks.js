// routes/marks.js
const express     = require('express');
const router      = express.Router();
const { Marks }   = require('../models/Exam');
const r           = require('../utils/response');
const { protect } = require('../middleware/auth');

router.use(protect);

/**
 * @route  GET /api/marks
 * @desc   Query marks with filters. Parents are restricted to their children.
 * @query  studentId, classId, subjectId, examId, academicYear
 */
router.get('/', async (req, res) => {
  try {
    const { studentId, classId, subjectId, examId, academicYear } = req.query;
    const filter = {};

    if (studentId)    filter.student      = studentId;
    if (classId)      filter.classroom    = classId;
    if (subjectId)    filter.subject      = subjectId;
    if (examId)       filter.exam         = examId;
    if (academicYear) filter.academicYear = academicYear;

    // Parents can only see their children's marks
    if (req.user.role === 'parent') {
      filter.student = { $in: req.user.studentIds || [] };
    }

    const marks = await Marks.find(filter)
      .populate('student',   'firstName lastName rollNumber admissionNo')
      .populate('subject',   'name totalMarks')
      .populate('exam',      'name examType totalMarks examDate')
      .populate('classroom', 'displayName')
      .sort({ createdAt: -1 });

    r.ok(res, marks);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/**
 * @route  GET /api/marks/:id
 * @desc   Get a single mark entry
 */
router.get('/:id', async (req, res) => {
  try {
    const mark = await Marks.findById(req.params.id)
      .populate('student', 'firstName lastName rollNumber admissionNo')
      .populate('subject', 'name totalMarks')
      .populate('exam',    'name examType totalMarks examDate')
      .populate('classroom', 'displayName');

    if (!mark) return r.notFound(res, 'Mark entry not found');

    // Parent guard
    if (req.user.role === 'parent') {
      const ids = (req.user.studentIds || []).map(id => id.toString());
      if (!ids.includes(mark.student?._id?.toString())) return r.forbidden(res);
    }

    r.ok(res, mark);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/**
 * @route  DELETE /api/marks/:id
 * @desc   Delete a single mark entry (admin / principal only)
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!['admin', 'principal'].includes(req.user.role))
      return r.forbidden(res);

    const mark = await Marks.findByIdAndDelete(req.params.id);
    if (!mark) return r.notFound(res, 'Mark entry not found');
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;