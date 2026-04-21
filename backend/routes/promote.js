// routes/promote.js
const express  = require('express');
const router   = express.Router();
const Student  = require('../models/Student');
const Classroom = require('../models/Classroom');
const r        = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'principal'));

/**
 * @route  GET /api/promote/preview
 * @desc   Preview students eligible for promotion in a classroom
 * @query  classId, academicYear
 */
router.get('/preview', async (req, res) => {
  try {
    const { classId, academicYear } = req.query;
    if (!classId) return r.badRequest(res, 'classId is required');

    const classroom = await Classroom.findById(classId);
    if (!classroom) return r.notFound(res, 'Classroom not found');

    // Find next classroom by order
    const nextClassroom = await Classroom.findOne({
      order: { $gt: classroom.order },
      academicYear: classroom.academicYear,
      isActive: true,
    }).sort({ order: 1 });

    const filter = { classroom: classId, status: 'Approved' };
    if (academicYear) filter.academicYear = academicYear;

    const students = await Student.find(filter)
      .populate('classroom', 'displayName className section')
      .sort({ rollNumber: 1 });

    r.ok(res, {
      currentClass: classroom,
      nextClass: nextClassroom || null,
      students,
      totalCount: students.length,
    });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/**
 * @route  POST /api/promote
 * @desc   Bulk promote / detain / mark-left students
 * @body   { promotions: [{ studentId, action, nextClassId }], academicYear }
 *         action: 'Promoted' | 'Detained' | 'Left'
 */
router.post('/', async (req, res) => {
  try {
    const { promotions } = req.body;

    if (!Array.isArray(promotions) || promotions.length === 0) {
      return r.badRequest(res, 'promotions array is required');
    }

    const results = { promoted: 0, detained: 0, left: 0, errors: [] };

    for (const item of promotions) {
      const { studentId, action, nextClassId } = item;

      try {
        const student = await Student.findById(studentId);
        if (!student) { results.errors.push(`Student ${studentId} not found`); continue; }

        if (action === 'Promoted') {
          if (!nextClassId) { results.errors.push(`nextClassId required for student ${studentId}`); continue; }
          const nextClass = await Classroom.findById(nextClassId);
          if (!nextClass) { results.errors.push(`Next classroom not found for student ${studentId}`); continue; }

          // Assign new roll number in next class
          const existingCount = await Student.countDocuments({
            classroom: nextClassId, status: 'Approved', _id: { $ne: studentId },
          });

          await Student.findByIdAndUpdate(studentId, {
            classroom: nextClassId,
            status: 'Approved',
            rollNumber: existingCount + 1,
          });
          results.promoted++;
        } else if (action === 'Detained') {
          // Student stays in same class — no classroom change
          await Student.findByIdAndUpdate(studentId, { status: 'Approved' });
          results.detained++;
        } else if (action === 'Left') {
          await Student.findByIdAndUpdate(studentId, {
            status: 'Left',
            leavingDate: new Date(),
            leavingReason: item.leavingReason || 'Left after promotion cycle',
          });
          results.left++;
        } else {
          results.errors.push(`Invalid action '${action}' for student ${studentId}`);
        }
      } catch (innerErr) {
        results.errors.push(`Error processing student ${studentId}: ${innerErr.message}`);
      }
    }

    r.ok(res, results, `Promotion complete. Promoted: ${results.promoted}, Detained: ${results.detained}, Left: ${results.left}`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;