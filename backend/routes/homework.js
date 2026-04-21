// routes/homework.js
const express  = require('express');
const router   = express.Router();
const { Homework } = require('../models/Others');
const r        = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/homework ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { classId, subjectId, teacherId, academicYear } = req.query;
    const filter = {};
    if (classId)      filter.classroom    = classId;
    if (subjectId)    filter.subject      = subjectId;
    if (teacherId)    filter.teacher      = teacherId;
    if (academicYear) filter.academicYear = academicYear;

    const homework = await Homework.find(filter)
      .populate('classroom', 'displayName')
      .populate('subject',   'name')
      .populate('teacher',   'name')
      .sort({ createdAt: -1 });

    r.ok(res, homework);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/homework ───────────────────────────────────────
router.post('/', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const hw = await Homework.create({ ...req.body, teacher: req.body.teacher || req.user.employeeId });
    await hw.populate([
      { path: 'classroom', select: 'displayName' },
      { path: 'subject',   select: 'name' },
    ]);
    r.created(res, hw, 'Homework assigned');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/homework/:id ────────────────────────────────────
router.put('/:id', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const hw = await Homework.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!hw) return r.notFound(res, 'Homework not found');
    r.ok(res, hw, 'Homework updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/homework/:id ─────────────────────────────────
router.delete('/:id', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    await Homework.findByIdAndDelete(req.params.id);
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;