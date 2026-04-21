// routes/classrooms.js
/**
 * Classrooms Router
 * Routes:
 *   GET    /api/classrooms                    — list all (filter by academicYear, isActive)
 *   GET    /api/classrooms/available-teachers — teachers not yet assigned as class teacher
 *   GET    /api/classrooms/:id                — single classroom
 *   GET    /api/classrooms/:id/students       — students in this classroom
 *   POST   /api/classrooms                    — create
 *   PUT    /api/classrooms/:id                — update
 *   PATCH  /api/classrooms/:id/toggle         — activate / deactivate
 *   DELETE /api/classrooms/:id                — delete (blocked if students exist)
 *
 *   Subjects (nested under classroom):
 *   GET    /api/classrooms/:id/subjects       — list subjects for a classroom
 *   POST   /api/classrooms/:id/subjects       — add subject to classroom
 *   PUT    /api/classrooms/:id/subjects/:sid  — update subject
 *   DELETE /api/classrooms/:id/subjects/:sid  — remove subject
 */

const express   = require('express');
const router    = express.Router();
const mongoose  = require('mongoose');
const Classroom = require('../models/Classroom');
const Subject   = require('../models/Subject');
const Student   = require('../models/Student');
const Employee  = require('../models/Employee');
const r         = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a set of Employee _id strings that are already assigned as
 * classTeacher in any classroom for the given academicYear, optionally
 * excluding one classroom (used during edit so the current room's teacher
 * still appears as available).
 */
async function getAssignedTeacherIds(academicYear, excludeClassroomId = null) {
  const filter = { classTeacher: { $exists: true, $ne: null } };
  if (academicYear) filter.academicYear = academicYear;
  if (excludeClassroomId) filter._id = { $ne: excludeClassroomId };

  const rooms = await Classroom.find(filter).select('classTeacher');
  return new Set(rooms.map(r => r.classTeacher.toString()));
}


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/classrooms
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { academicYear, isActive } = req.query;
    const filter = {};
    if (academicYear)            filter.academicYear = academicYear;
    if (isActive !== undefined)  filter.isActive     = isActive === 'true';

    const classrooms = await Classroom.find(filter)
      .populate('classTeacher', 'name employeeId')
      .populate('academicYear', 'name')
      .sort({ order: 1, className: 1, section: 1 });

    // Attach student counts in one aggregation query
    const counts = await Student.aggregate([
      {
        $match: {
          classroom: { $in: classrooms.map(c => c._id) },
          status: { $nin: ['Left', 'Alumni'] },
        },
      },
      { $group: { _id: '$classroom', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map(c => [c._id.toString(), c.count]));

    const data = classrooms.map(c => ({
      ...c.toObject(),
      studentCount: countMap[c._id.toString()] || 0,
    }));

    r.ok(res, data);
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/classrooms/available-teachers
// Query params: academicYear, excludeClassroom (optional, for edit mode)
// Returns active teachers who are NOT yet assigned as class teacher
// ─────────────────────────────────────────────────────────────────────────────
router.get('/available-teachers', protect, async (req, res) => {
  try {
    const { academicYear, excludeClassroom } = req.query;

    const assignedIds = await getAssignedTeacherIds(academicYear, excludeClassroom);

    const teachers = await Employee.find({
      role:   'teacher',
      status: 'active',
      ...(assignedIds.size > 0 && {
        _id: { $nin: Array.from(assignedIds).map(id => new mongoose.Types.ObjectId(id)) },
      }),
    }).select('name employeeId').sort({ name: 1 });

    r.ok(res, teachers);
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/classrooms/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id)
      .populate('classTeacher', 'name employeeId email mobileNo')
      .populate('academicYear', 'name');

    if (!classroom) return r.notFound(res, 'Classroom not found');

    const studentCount = await Student.countDocuments({
      classroom: classroom._id,
      status:    { $nin: ['Left', 'Alumni'] },
    });

    r.ok(res, { ...classroom.toObject(), studentCount });
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/classrooms/:id/students
// Lists students enrolled in this classroom (active only by default)
// Query param: status — comma-separated statuses, e.g. "Approved" or "Approved,UnderReview"
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/students', protect, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) return r.notFound(res, 'Classroom not found');

    const statuses = req.query.status
      ? req.query.status.split(',').map(s => s.trim())
      : ['UnderReview', 'Approved', 'OnHold'];

    const students = await Student.find({
      classroom: req.params.id,
      status:    { $in: statuses },
    })
      .select('firstName middleName lastName admissionNo rollNumber gender status photo')
      .sort({ rollNumber: 1, firstName: 1 });

    r.ok(res, students);
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/classrooms
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', protect, authorize('admin', 'principal'), async (req, res) => {
  try {
    const body = { ...req.body };

    // Remove blank classTeacher so Mongoose doesn't try to cast ""
    if (!body.classTeacher) delete body.classTeacher;

    // Guard: teacher must not already be a classTeacher elsewhere in same year
    if (body.classTeacher && body.academicYear) {
      const conflict = await Classroom.findOne({
        classTeacher: body.classTeacher,
        academicYear: body.academicYear,
      });
      if (conflict) {
        return r.conflict(
          res,
          `This teacher is already the class teacher of ${conflict.displayName}`
        );
      }
    }

    const classroom = await Classroom.create(body);
    const populated  = await classroom.populate('classTeacher', 'name employeeId');

    r.created(res, populated, 'Classroom created');
  } catch (err) {
    if (err.code === 11000) {
      return r.conflict(res, 'A classroom with this name and section already exists for this academic year');
    }
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/classrooms/:id
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', protect, authorize('admin', 'principal'), async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.classTeacher) delete body.classTeacher;

    // Guard: teacher must not already be classTeacher of a DIFFERENT classroom
    if (body.classTeacher && body.academicYear) {
      const conflict = await Classroom.findOne({
        classTeacher: body.classTeacher,
        academicYear: body.academicYear,
        _id:          { $ne: req.params.id },
      });
      if (conflict) {
        return r.conflict(
          res,
          `This teacher is already the class teacher of ${conflict.displayName}`
        );
      }
    }

    const classroom = await Classroom.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    ).populate('classTeacher', 'name employeeId');

    if (!classroom) return r.notFound(res, 'Classroom not found');

    r.ok(res, classroom, 'Classroom updated');
  } catch (err) {
    if (err.code === 11000) {
      return r.conflict(res, 'A classroom with this name and section already exists for this academic year');
    }
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/classrooms/:id/toggle  — activate / deactivate
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/toggle', protect, authorize('admin'), async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) return r.notFound(res, 'Classroom not found');

    classroom.isActive = !classroom.isActive;
    await classroom.save();

    r.ok(
      res,
      classroom,
      `Classroom ${classroom.isActive ? 'activated' : 'deactivated'}`
    );
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/classrooms/:id
// Blocked if any non-Left/Alumni students are enrolled
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) return r.notFound(res, 'Classroom not found');

    const activeStudentCount = await Student.countDocuments({
      classroom: req.params.id,
      status:    { $nin: ['Left', 'Alumni'] },
    });

    if (activeStudentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${activeStudentCount} student(s) are still enrolled in this classroom. Please transfer or remove them first.`,
        studentCount: activeStudentCount,
      });
    }

    // Also delete all subjects belonging to this classroom
    await Subject.deleteMany({ classroom: req.params.id });

    await Classroom.findByIdAndDelete(req.params.id);

    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// ── SUBJECTS ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/classrooms/:id/subjects
router.get('/:id/subjects', protect, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) return r.notFound(res, 'Classroom not found');

    const subjects = await Subject.find({ classroom: req.params.id })
      .populate('teacher', 'name employeeId')
      .sort({ name: 1 });

    r.ok(res, subjects);
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// POST /api/classrooms/:id/subjects
router.post('/:id/subjects', protect, authorize('admin', 'principal'), async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) return r.notFound(res, 'Classroom not found');

    const body = { ...req.body };
    if (!body.teacher) delete body.teacher;

    const subject = await Subject.create({
      ...body,
      classroom:    req.params.id,
      academicYear: classroom.academicYear,
    });

    const populated = await subject.populate('teacher', 'name employeeId');
    r.created(res, populated, 'Subject added');
  } catch (err) {
    if (err.code === 11000) {
      return r.conflict(res, 'A subject with this name already exists in this classroom');
    }
    r.serverError(res, err.message);
  }
});


// PUT /api/classrooms/:id/subjects/:sid
router.put('/:id/subjects/:sid', protect, authorize('admin', 'principal'), async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.teacher) delete body.teacher;

    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.sid, classroom: req.params.id },
      body,
      { new: true, runValidators: true }
    ).populate('teacher', 'name employeeId');

    if (!subject) return r.notFound(res, 'Subject not found');
    r.ok(res, subject, 'Subject updated');
  } catch (err) {
    if (err.code === 11000) {
      return r.conflict(res, 'A subject with this name already exists in this classroom');
    }
    r.serverError(res, err.message);
  }
});


// DELETE /api/classrooms/:id/subjects/:sid
router.delete('/:id/subjects/:sid', protect, authorize('admin', 'principal'), async (req, res) => {
  try {
    const subject = await Subject.findOneAndDelete({
      _id:       req.params.sid,
      classroom: req.params.id,
    });
    if (!subject) return r.notFound(res, 'Subject not found');
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});


module.exports = router;