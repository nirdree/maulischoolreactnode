// models/Attendance.js
const mongoose = require('mongoose');

// ── Student Attendance ───────────────────────────────────────
const attendanceSchema = new mongoose.Schema({
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classroom:    { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  date:         { type: Date, required: true },
  status:       {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'HalfDay', 'Holiday'],
    required: true,
  },
  remark:       { type: String },
  markedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

// ── Employee Attendance ──────────────────────────────────────
const employeeAttendanceSchema = new mongoose.Schema({
  employee:     { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date:         { type: Date, required: true },
  status:       {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'HalfDay', 'OnLeave', 'Holiday'],
    required: true,
  },
  remark:       { type: String },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

employeeAttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance         = mongoose.model('Attendance',         attendanceSchema);
const EmployeeAttendance = mongoose.model('EmployeeAttendance', employeeAttendanceSchema);

module.exports = { Attendance, EmployeeAttendance };