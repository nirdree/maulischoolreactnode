// models/Subject.js
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  classroom:    { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  teacher:      { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  totalMarks:   { type: Number, default: 100, min: 1 },
  isActive:     { type: Boolean, default: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

subjectSchema.index({ name: 1, classroom: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);