// routes/notices.js
const express = require('express');
const router  = express.Router();
const { Notice } = require('../models/Others');
const r       = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/notices ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { priority, academicYear } = req.query;
    const filter = {};
    if (priority)     filter.priority     = priority;
    if (academicYear) filter.academicYear = academicYear;

    // Filter by targetRoles for non-admins
    if (['parent', 'teacher'].includes(req.user.role)) {
      filter.targetRoles = req.user.role;
    }

    // Only show non-expired notices
    filter.$or = [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gte: new Date() } },
    ];

    const notices = await Notice.find(filter)
      .populate('createdBy', 'name')
      .sort({ publishDate: -1 });

    r.ok(res, notices);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/notices/:id ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id).populate('createdBy', 'name');
    if (!notice) return r.notFound(res, 'Notice not found');
    r.ok(res, notice);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/notices ────────────────────────────────────────
router.post('/', authorize('admin', 'principal'), async (req, res) => {
  try {
    const notice = await Notice.create({ ...req.body, createdBy: req.user._id });
    r.created(res, notice, 'Notice published');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/notices/:id ─────────────────────────────────────
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!notice) return r.notFound(res, 'Notice not found');
    r.ok(res, notice, 'Notice updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/notices/:id ──────────────────────────────────
router.delete('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;