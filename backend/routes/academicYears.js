// routes/academicYears.js
const express      = require('express');
const router       = express.Router();
const AcademicYear = require('../models/AcademicYear');
const Student      = require('../models/Student');
const Classroom    = require('../models/Classroom');
const r            = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');



// ── GET /api/academic-years ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const years = await AcademicYear.find().sort({ startDate: -1 });
    r.ok(res, years);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/academic-years/current ─────────────────────────
router.get('/current', async (req, res) => {
  try {
    const year = await AcademicYear.findOne({ isCurrent: true });
    if (!year) return r.notFound(res, 'No current academic year set');
    r.ok(res, year);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/academic-years/:id ──────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) return r.notFound(res, 'Academic year not found');
    r.ok(res, year);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/academic-years ─────────────────────────────────
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, startDate, endDate, isCurrent } = req.body;
    if (!name || !startDate || !endDate)
      return r.badRequest(res, 'name, startDate and endDate are required');

    if (new Date(startDate) >= new Date(endDate))
      return r.badRequest(res, 'startDate must be before endDate');

    const year = await AcademicYear.create({ name, startDate, endDate, isCurrent: isCurrent || false });
    r.created(res, year, 'Academic year created');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/academic-years/:id ──────────────────────────────
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const year = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!year) return r.notFound(res, 'Academic year not found');
    r.ok(res, year, 'Academic year updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PATCH /api/academic-years/:id/set-current ───────────────
router.patch('/:id/set-current', protect, authorize('admin'), async (req, res) => {
  try {
    // Clear current flag from all years first
    await AcademicYear.updateMany({}, { isCurrent: false });

    const year = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      { isCurrent: true },
      { new: true }
    );
    if (!year) return r.notFound(res, 'Academic year not found');
    r.ok(res, year, 'Current academic year updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/academic-years/:id ──────────────────────────
// Prevent deletion if students or classrooms exist under this year
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) return r.notFound(res, 'Academic year not found');

    if (year.isCurrent)
      return r.badRequest(res, 'Cannot delete the current academic year');

    const [studentCount, classCount] = await Promise.all([
      Student.countDocuments({ academicYear: req.params.id }),
      Classroom.countDocuments({ academicYear: req.params.id }),
    ]);

    if (studentCount > 0 || classCount > 0)
      return r.badRequest(res, `Cannot delete — ${studentCount} students and ${classCount} classrooms are linked to this year`);

    await AcademicYear.findByIdAndDelete(req.params.id);
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;