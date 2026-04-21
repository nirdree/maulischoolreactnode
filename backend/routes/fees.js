// routes/fees.js
const express         = require('express');
const router          = express.Router();
const { Fee, FeePayment } = require('../models/Fee');
const Student         = require('../models/Student');
const Classroom       = require('../models/Classroom');
const r               = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/fees ────────────────────────────────────────────────────────────
// Supports: studentId, classId, month, year, status, academicYear, search (name/admissionNo)
router.get('/', async (req, res) => {
  try {
    const { studentId, classId, month, year, status, academicYear, search } = req.query;
    const filter = {};

    if (classId)      filter.classroom    = classId;
    if (month)        filter.month        = Number(month);
    if (year)         filter.year         = Number(year);
    if (status)       filter.status       = status;
    if (academicYear) filter.academicYear = academicYear;

    // Parent role: restrict to own children
    if (req.user.role === 'parent') {
      filter.student = { $in: req.user.studentIds || [] };
    } else if (studentId) {
      filter.student = studentId;
    }

    // If search query, find matching student IDs first
    if (search && req.user.role !== 'parent') {
      const regex = new RegExp(search, 'i');
      const matchingStudents = await Student.find({
        $or: [
          { firstName: regex },
          { lastName: regex },
          { admissionNo: regex },
          // concatenated name search — handled by $expr below if needed
        ],
      }).select('_id');
      const ids = matchingStudents.map(s => s._id);
      filter.student = filter.student
        ? { $in: ids.filter(id => String(id) === String(filter.student)) }
        : { $in: ids };
    }

    const fees = await Fee.find(filter)
      .populate('student',   'firstName lastName admissionNo')
      .populate('classroom', 'displayName')
      .sort({ year: -1, month: -1 });

    r.ok(res, fees);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/fees/receipts/all ───────────────────────────────────────────────
// Must be before /:id routes
router.get('/receipts/all', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { studentId, academicYear, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (studentId)    filter.student      = studentId;
    if (academicYear) filter.academicYear = academicYear;

    const total    = await FeePayment.countDocuments(filter);
    const receipts = await FeePayment.find(filter)
      .populate('student',     'firstName lastName admissionNo')
      .populate('fee',         'month year')
      .populate('collectedBy', 'name')
      .sort({ paymentDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    r.ok(res, receipts, 'Receipts fetched', { total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/fees/generate-auto ─────────────────────────────────────────────
// Auto-generate fee records for all active students in a given month/year
// Supports preview mode (preview: true) which returns counts without creating
router.post('/generate-auto', authorize('admin', 'principal'), async (req, res) => {
  try {
    const {
      month, year, dueDate, classId,
      academicYear, onlyUnpaid = true, preview = false,
    } = req.body;

    if (!month || !year || !academicYear) {
      return r.badRequest(res, 'month, year and academicYear are required');
    }
    if (!preview && !dueDate) {
      return r.badRequest(res, 'dueDate is required');
    }

    // Build student query
    const studentFilter = { status: 'Approved', academicYear };
    if (classId) studentFilter.classroom = classId;

    const students = await Student.find(studentFilter).populate('classroom');

    let toCreate   = 0;
    let toSkip     = 0;
    let created    = 0;
    let skipped    = 0;
    const errors   = [];

    for (const student of students) {
      // Check if fee already exists
      const exists = await Fee.findOne({
        student: student._id,
        month:   Number(month),
        year:    Number(year),
        academicYear,
      });

      if (exists && onlyUnpaid) {
        toSkip++;
        skipped++;
        continue;
      }

      toCreate++;

      if (!preview) {
        try {
          const classroom = student.classroom;
          if (!classroom) { skipped++; toCreate--; toSkip++; continue; }

          const tuitionFee  = classroom.monthlyFees || 0;
          const totalAmount = tuitionFee;
          const finalAmount = tuitionFee;

          await Fee.create({
            student:      student._id,
            classroom:    classroom._id,
            month:        Number(month),
            year:         Number(year),
            tuitionFee,
            transportFee: 0,
            activityFee:  0,
            otherFee:     0,
            discount:     0,
            totalAmount,
            finalAmount,
            dueDate,
            academicYear,
            status:       'Pending',
          });
          created++;
        } catch (err) {
          if (err.code === 11000) { skipped++; toCreate--; toSkip++; }
          else errors.push(`${student.firstName}: ${err.message}`);
        }
      }
    }

    if (preview) {
      return r.ok(res, { toCreate, toSkip }, 'Preview calculated');
    }

    r.ok(res, { created, skipped, errors }, `Generated ${created} fee records. Skipped ${skipped}.`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/fees/:id ────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id)
      .populate('student',   'firstName lastName admissionNo fatherName fatherPhone')
      .populate('classroom', 'displayName');
    if (!fee) return r.notFound(res, 'Fee record not found');
    r.ok(res, fee);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/fees ───────────────────────────────────────────────────────────
// Manually generate a single fee record
router.post('/', authorize('admin', 'principal'), async (req, res) => {
  try {
    const {
      tuitionFee, transportFee = 0, activityFee = 0,
      otherFee = 0, discount = 0,
    } = req.body;

    const total    = Number(tuitionFee) + Number(transportFee) + Number(activityFee) + Number(otherFee);
    const finalAmt = total - Number(discount);

    const fee = await Fee.create({
      ...req.body,
      totalAmount: total,
      finalAmount: finalAmt,
    });

    await fee.populate('student', 'firstName lastName');
    r.created(res, fee, 'Fee record created');
  } catch (err) {
    if (err.code === 11000) return r.conflict(res, 'Fee record already exists for this student/month/year');
    r.serverError(res, err.message);
  }
});

// ── PUT /api/fees/:id ────────────────────────────────────────────────────────
// Edit any field on a fee record — amounts, status, discount, late fine, notes, dueDate
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const {
      tuitionFee, transportFee, activityFee, otherFee, lateFine = 0, discount = 0,
    } = req.body;

    // Recalculate totals if amount fields are present
    let updateData = { ...req.body };
    if (tuitionFee !== undefined) {
      const total = Number(tuitionFee || 0)
        + Number(transportFee || 0)
        + Number(activityFee  || 0)
        + Number(otherFee     || 0)
        + Number(lateFine     || 0);
      const finalAmount = total - Number(discount || 0);
      updateData.totalAmount = total;
      updateData.finalAmount = finalAmount;
    }

    const fee = await Fee.findByIdAndUpdate(req.params.id, updateData, {
      new: true, runValidators: true,
    }).populate('student', 'firstName lastName').populate('classroom', 'displayName');

    if (!fee) return r.notFound(res, 'Fee record not found');
    r.ok(res, fee, 'Fee updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/fees/:id ─────────────────────────────────────────────────────
// Delete a fee record — also cascades to delete associated payments
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);
    if (!fee) return r.notFound(res, 'Fee record not found');

    // Delete associated payments first
    await FeePayment.deleteMany({ fee: fee._id });

    await Fee.findByIdAndDelete(req.params.id);
    r.ok(res, { id: req.params.id }, 'Fee record and associated payments deleted');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/fees/:id/pay ───────────────────────────────────────────────────
// Collect a payment for a single fee record and generate a receipt
router.post('/:id/pay', authorize('admin', 'principal'), async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);
    if (!fee)               return r.notFound(res, 'Fee record not found');
    if (fee.status === 'Paid') return r.badRequest(res, 'Fee is already fully paid');

    const { amountPaid, paymentMode, transactionId, notes } = req.body;
    if (!amountPaid) return r.badRequest(res, 'amountPaid is required');
    if (!paymentMode) return r.badRequest(res, 'paymentMode is required');

    const payment = await FeePayment.create({
      fee:          fee._id,
      student:      fee.student,
      amountPaid:   Number(amountPaid),
      paymentDate:  new Date(),
      paymentMode,
      transactionId,
      notes,
      collectedBy:  req.user._id,
      academicYear: fee.academicYear,
    });

    // Determine new status
    // Sum all payments for this fee to handle partial scenarios correctly
    const allPayments = await FeePayment.find({ fee: fee._id });
    const totalPaid   = allPayments.reduce((s, p) => s + (p.amountPaid || 0), 0);
    const newStatus   = totalPaid >= fee.finalAmount ? 'Paid' : 'PartiallyPaid';
    fee.status = newStatus;
    await fee.save();

    r.ok(
      res,
      { payment, receiptNo: payment.receiptNo, newStatus, totalPaid },
      `Payment recorded. Receipt: ${payment.receiptNo}`,
    );
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/fees/:id/payments ───────────────────────────────────────────────
router.get('/:id/payments', async (req, res) => {
  try {
    const payments = await FeePayment.find({ fee: req.params.id })
      .populate('collectedBy', 'name')
      .sort({ paymentDate: -1 });
    r.ok(res, payments);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;