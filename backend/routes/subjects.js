// routes/subjects.js
const express = require('express');
const router  = express.Router();
const Subject = require('../models/Subject');
const r       = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/subjects ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { classId, teacherId, academicYear, isActive } = req.query;
    const filter = {};
    if (classId)      filter.classroom    = classId;
    if (teacherId)    filter.teacher      = teacherId;
    if (academicYear) filter.academicYear = academicYear;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const subjects = await Subject.find(filter)
      .populate('classroom', 'displayName')
      .populate('teacher',   'name employeeId')
      .populate('academicYear', 'name')
      .sort({ name: 1 });

    r.ok(res, subjects);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/subjects/:id ────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('classroom', 'displayName')
      .populate('teacher',   'name');
    if (!subject) return r.notFound(res, 'Subject not found');
    r.ok(res, subject);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/subjects  (single or bulk array) ───────────────
router.post('/', authorize('admin', 'principal'), async (req, res) => {
  try {
    // Accept both single object and array
    const payload = Array.isArray(req.body) ? req.body : [req.body];
    const created = await Subject.insertMany(payload, { ordered: false });
    r.created(res, created, `${created.length} subject(s) created`);
  } catch (err) {
    if (err.code === 11000) return r.conflict(res, 'One or more subjects already exist for this class');
    r.serverError(res, err.message);
  }
});

// ── PUT /api/subjects/:id ────────────────────────────────────
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    }).populate('classroom', 'displayName').populate('teacher', 'name');
    if (!subject) return r.notFound(res, 'Subject not found');
    r.ok(res, subject, 'Subject updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PATCH /api/subjects/:id/toggle ──────────────────────────
router.patch('/:id/toggle', authorize('admin', 'principal'), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return r.notFound(res, 'Subject not found');
    subject.isActive = !subject.isActive;
    await subject.save();
    r.ok(res, subject, `Subject ${subject.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/subjects/:id ─────────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return r.notFound(res, 'Subject not found');
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;