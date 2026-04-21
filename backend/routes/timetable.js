// routes/timetable.js
/**
 * Timetable Router
 *
 * Routes:
 *   GET    /api/timetable                          — list all timetables
 *   GET    /api/timetable/teacher/:teacherId        — teacher's weekly schedule
 *   GET    /api/timetable/conflicts                 — check conflicts across all classes
 *   GET    /api/timetable/:classId                  — get timetable for a class
 *   POST   /api/timetable                           — create or replace timetable
 *   POST   /api/timetable/validate                  — validate before saving (conflict check)
 *   PUT    /api/timetable/:id                       — update by timetable doc id
 *   DELETE /api/timetable/:classId                  — delete timetable for a class
 */

const express        = require('express');
const router         = express.Router();
const { Timetable }  = require('../models/Others');
const r              = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitize a schedule array before any DB operation.
 *
 * Problems this solves:
 *  1. subject / teacher sent as '' (empty string) → Mongoose cannot cast '' to
 *     ObjectId and throws a CastError. Replace with null.
 *  2. startTime / endTime sent as '' → still stored as '' (fine), but we keep
 *     them explicit so the shape is always predictable.
 */
function sanitizeSchedule(schedule) {
  if (!Array.isArray(schedule)) return [];
  return schedule.map(daySchedule => ({
    day: daySchedule.day,
    periods: (daySchedule.periods || []).map(p => ({
      periodNo:   p.periodNo,
      startTime:  p.startTime  || '',
      endTime:    p.endTime    || '',
      subject:    p.subject    || null,   // '' → null
      teacher:    p.teacher    || null,   // '' → null
      isBreak:    p.isBreak    || false,
      breakLabel: p.breakLabel || 'Break',
    })),
  }));
}

/**
 * Find teacher conflicts across all timetables for the given academicYear.
 * Optionally exclude one classroom (used when saving so we don't self-conflict).
 */
async function findTeacherConflicts(academicYear, excludeClassroomId = null) {
  const filter = { academicYear };
  if (excludeClassroomId) filter.classroom = { $ne: excludeClassroomId };

  const allTimetables = await Timetable.find(filter)
    .populate('classroom', 'displayName')
    .populate('schedule.periods.teacher', 'name');

  const map = {};

  for (const tt of allTimetables) {
    for (const daySchedule of tt.schedule) {
      for (const period of daySchedule.periods) {
        if (!period.teacher || period.isBreak) continue;
        const key = `${period.teacher._id || period.teacher}|${daySchedule.day}|${period.periodNo}`;
        if (!map[key]) {
          map[key] = {
            teacherId:   (period.teacher._id || period.teacher).toString(),
            teacherName: period.teacher.name || 'Unknown',
            day:         daySchedule.day,
            periodNo:    period.periodNo,
            startTime:   period.startTime,
            endTime:     period.endTime,
            classrooms:  [],
          };
        }
        map[key].classrooms.push({
          id:          tt.classroom._id,
          displayName: tt.classroom.displayName,
        });
      }
    }
  }

  return Object.values(map).filter(v => v.classrooms.length > 1);
}

/**
 * Check incoming schedule against all existing timetables (excluding the
 * classroom being saved) and return an array of conflict descriptions.
 */
async function checkIncomingConflicts(classroom, academicYear, incomingSchedule) {
  const otherTimetables = await Timetable.find({
    academicYear,
    classroom: { $ne: classroom },
  })
    .populate('classroom', 'displayName')
    .populate('schedule.periods.teacher', 'name');

  const conflicts = [];

  for (const daySchedule of incomingSchedule) {
    for (const period of daySchedule.periods) {
      if (!period.teacher || period.isBreak || !period.subject) continue;

      for (const tt of otherTimetables) {
        const existingDay = tt.schedule.find(s => s.day === daySchedule.day);
        if (!existingDay) continue;

        const existingPeriod = existingDay.periods.find(
          p =>
            p.periodNo === period.periodNo &&
            !p.isBreak &&
            p.teacher &&
            (p.teacher._id || p.teacher).toString() === period.teacher.toString()
        );

        if (existingPeriod) {
          conflicts.push({
            day:              daySchedule.day,
            periodNo:         period.periodNo,
            startTime:        period.startTime,
            endTime:          period.endTime,
            teacherId:        period.teacher.toString(),
            teacherName:      existingPeriod.teacher?.name || 'Unknown',
            conflictingClass: tt.classroom.displayName,
          });
        }
      }
    }
  }

  return conflicts;
}


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/timetable
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { classId, academicYear } = req.query;
    const filter = {};
    if (classId)      filter.classroom    = classId;
    if (academicYear) filter.academicYear = academicYear;

    const timetables = await Timetable.find(filter)
      .populate('classroom', 'displayName className section')
      .populate('schedule.periods.subject', 'name')
      .populate('schedule.periods.teacher', 'name employeeId')
      .sort({ 'classroom.order': 1 });

    r.ok(res, timetables);
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/timetable/teacher/:teacherId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const { academicYear } = req.query;
    const filter = { 'schedule.periods.teacher': req.params.teacherId };
    if (academicYear) filter.academicYear = academicYear;

    const timetables = await Timetable.find(filter)
      .populate('classroom', 'displayName className section')
      .populate('schedule.periods.subject', 'name')
      .populate('schedule.periods.teacher', 'name employeeId');

    const result = timetables.map(tt => ({
      classroom:    tt.classroom,
      academicYear: tt.academicYear,
      schedule: tt.schedule.map(daySchedule => ({
        day: daySchedule.day,
        periods: daySchedule.periods.filter(
          p => p.teacher && (p.teacher._id || p.teacher).toString() === req.params.teacherId
        ),
      })).filter(ds => ds.periods.length > 0),
    }));

    r.ok(res, result);
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/timetable/conflicts
// ─────────────────────────────────────────────────────────────────────────────
router.get('/conflicts', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { academicYear } = req.query;
    if (!academicYear) return r.badRequest(res, 'academicYear is required');

    const conflicts = await findTeacherConflicts(academicYear);
    r.ok(res, { count: conflicts.length, conflicts });
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/timetable/:classId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:classId', async (req, res) => {
  try {
    const { academicYear } = req.query;
    const filter = { classroom: req.params.classId };
    if (academicYear) filter.academicYear = academicYear;

    const timetable = await Timetable.findOne(filter)
      .populate('classroom', 'displayName className section')
      .populate('schedule.periods.subject', 'name')
      .populate('schedule.periods.teacher', 'name employeeId');

    if (!timetable) return r.notFound(res, 'Timetable not found for this class');
    r.ok(res, timetable);
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/timetable/validate
// Dry-run conflict check — does NOT save anything
// Body: { classroom, academicYear, schedule }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/validate', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { classroom, academicYear } = req.body;
    const schedule = sanitizeSchedule(req.body.schedule);

    if (!classroom || !academicYear || !schedule.length) {
      return r.badRequest(res, 'classroom, academicYear and schedule are required');
    }

    const conflicts = await checkIncomingConflicts(classroom, academicYear, schedule);
    r.ok(res, { valid: conflicts.length === 0, conflicts });
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/timetable  — create or replace (upsert)
// Body: { classroom, academicYear, schedule, totalPeriods, workingDays }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { classroom, academicYear, totalPeriods, workingDays } = req.body;

    // Sanitize FIRST — converts '' subject/teacher to null, normalises shape
    const schedule = sanitizeSchedule(req.body.schedule);

    if (!classroom || !academicYear || !schedule.length) {
      return r.badRequest(res, 'classroom, academicYear and schedule are required');
    }

    // Check conflicts against other classes
    const conflicts = await checkIncomingConflicts(classroom, academicYear, schedule);
    if (conflicts.length > 0) {
      return res.status(409).json({
        success:   false,
        message:   `${conflicts.length} teacher conflict(s) detected. A teacher cannot be assigned to two classes at the same time.`,
        conflicts,
      });
    }

    // NOTE: runValidators is intentionally omitted — period times are optional
    //       and runValidators would re-run the old required checks on subdocs.
    const timetable = await Timetable.findOneAndUpdate(
      { classroom, academicYear },
      { classroom, academicYear, schedule, totalPeriods, workingDays },
      { new: true, upsert: true }
    ).populate('classroom', 'displayName');

    r.ok(res, timetable, 'Timetable saved successfully');
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/timetable/:id  — update by document id
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const existing = await Timetable.findById(req.params.id);
    if (!existing) return r.notFound(res, 'Timetable not found');

    const schedule = sanitizeSchedule(req.body.schedule || existing.schedule);

    const conflicts = await checkIncomingConflicts(
      existing.classroom.toString(),
      existing.academicYear.toString(),
      schedule
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        success:   false,
        message:   `${conflicts.length} teacher conflict(s) detected.`,
        conflicts,
      });
    }

    // runValidators omitted for same reason as POST
    const timetable = await Timetable.findByIdAndUpdate(
      req.params.id,
      { ...req.body, schedule },
      { new: true }
    ).populate('classroom', 'displayName');

    r.ok(res, timetable, 'Timetable updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/timetable/:classId
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:classId', authorize('admin'), async (req, res) => {
  try {
    const { academicYear } = req.query;
    const filter = { classroom: req.params.classId };
    if (academicYear) filter.academicYear = academicYear;

    const result = await Timetable.findOneAndDelete(filter);
    if (!result) return r.notFound(res, 'Timetable not found');
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});


module.exports = router;