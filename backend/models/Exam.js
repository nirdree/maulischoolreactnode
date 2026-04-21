// models/Exam.js
const mongoose = require('mongoose');

// ── Exam ────────────────────────────────────────────────────
const examSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  examType:     {
    type: String,
    enum: ['UnitTest1', 'UnitTest2', 'MidTerm', 'FinalExam', 'Project', 'Other'],
    required: true,
  },
  subject:      { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classroom:    { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  teacher:      { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  totalMarks:   { type: Number, required: true, min: 1 },
  examDate:     { type: Date, required: true },
  description:  { type: String },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

// ── Marks ───────────────────────────────────────────────────
const marksSchema = new mongoose.Schema({
  exam:          { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  student:       { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject:       { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classroom:     { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  marksObtained: { type: Number, default: 0 },
  isAbsent:      { type: Boolean, default: false },
  grade:         { type: String },
  remarks:       { type: String },
  academicYear:  { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

marksSchema.index({ exam: 1, student: 1 }, { unique: true });

// Auto-calculate grade before save
marksSchema.pre('save', async function () {
  if (!this.isAbsent) {
    if (!this.grade) {
      const exam = await mongoose.model('Exam').findById(this.exam);

      const percentage =
        (this.marksObtained / exam.totalMarks) * 100;

      this.grade =
        percentage >= 90 ? 'A+' :
        percentage >= 80 ? 'A'  :
        percentage >= 70 ? 'B+' :
        percentage >= 60 ? 'B'  :
        percentage >= 50 ? 'C'  :
        percentage >= 40 ? 'D'  : 'F';
    }
  } else {
    this.grade = 'F';
    this.marksObtained = 0;
  }
});

const Exam  = mongoose.model('Exam',  examSchema);
const Marks = mongoose.model('Marks', marksSchema);

module.exports = { Exam, Marks };