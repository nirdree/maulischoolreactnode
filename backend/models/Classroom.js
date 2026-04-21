// models/Classroom.js
const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  className:      { type: String, required: true, trim: true },
  section:        { type: String, trim: true, default: '' },
  displayName:    { type: String, required: true, trim: true },
  monthlyFees:    { type: Number, required: true, min: 0 },
  classTeacher:   { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  order:          { type: Number, default: 99 },
  capacity:       { type: Number, default: 40 },
  isActive:       { type: Boolean, default: true },
  academicYear:   { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

classroomSchema.index({ className: 1, section: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Classroom', classroomSchema);