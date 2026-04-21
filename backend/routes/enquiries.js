// routes/enquiries.js
const express  = require('express');
const router   = express.Router();
const Enquiry  = require('../models/Enquiry');
const r        = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

// ── POST /api/enquiries  (public – no auth required) ─────────
router.post('/', async (req, res) => {
  try {
    const enquiry = await Enquiry.create(req.body);
    r.created(res, { enquiryId: enquiry.enquiryId, _id: enquiry._id }, 'Enquiry submitted successfully');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// All routes below require auth
router.use(protect);

// ── GET /api/enquiries ───────────────────────────────────────
router.get('/', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { status, classId, academicYear, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status)       filter.status        = status;
    if (classId)      filter.classApplying = classId;
    if (academicYear) filter.academicYear  = academicYear;

    if (search) {
      filter.$or = [
        { childName:  { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } },
        { mobileNo:   { $regex: search, $options: 'i' } },
        { enquiryId:  { $regex: search, $options: 'i' } },
      ];
    }

    const total    = await Enquiry.countDocuments(filter);
    const enquiries = await Enquiry.find(filter)
      .populate('classApplying', 'displayName')
      .populate('academicYear',  'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    r.ok(res, enquiries, 'Enquiries fetched', { total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/enquiries/:id ───────────────────────────────────
router.get('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate('classApplying', 'displayName')
      .populate('academicYear',  'name');
    if (!enquiry) return r.notFound(res, 'Enquiry not found');
    r.ok(res, enquiry);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/enquiries/:id ───────────────────────────────────
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    }).populate('classApplying', 'displayName');
    if (!enquiry) return r.notFound(res, 'Enquiry not found');
    r.ok(res, enquiry, 'Enquiry updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/enquiries/:id ────────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) return r.notFound(res, 'Enquiry not found');
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;