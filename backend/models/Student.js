// models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  admissionNo:        { type: String, unique: true },
  firstName:          { type: String, required: true, trim: true },
  middleName:         { type: String, trim: true, default: '' },
  lastName:           { type: String, required: true, trim: true },
  gender:             { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  dateOfBirth:        { type: Date, required: true },
  photo:              { type: String, default: null },
  bloodGroup:         { type: String },
  religion:           { type: String },
  caste:              { type: String },
  motherTongue:       { type: String },
  placeOfBirth:       { type: String },
  penNumber:          { type: String },
  classroom:          { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  rollNumber:         { type: Number },
  status:             {
    type: String,
    enum: ['UnderReview', 'Approved', 'Rejected', 'OnHold', 'Left', 'Alumni'],
    default: 'UnderReview',
  },
  // Father's details
  fatherName:         { type: String, required: true },
  fatherPhone:        { type: String },
  fatherEmail:        { type: String },
  fatherOccupation:   { type: String },
  // Mother's details
  motherName:         { type: String },
  motherPhone:        { type: String },
  motherEmail:        { type: String },
  motherOccupation:   { type: String },
  // Previous school
  previousSchoolName: { type: String },
  previousClass:      { type: String },
  // Admission handling
  rejectionRemark:    { type: String },
  holdRemark:         { type: String },
  leavingDate:        { type: Date },
  leavingReason:      { type: String },
  // Link to parent user account
fatherUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
motherUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  academicYear:       { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

studentSchema.virtual('fullName').get(function () {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});

studentSchema.pre('save', async function () {
  if (!this.admissionNo) {
    const year = new Date().getFullYear();

    const lastStudent = await this.constructor
      .findOne({ admissionNo: new RegExp(`ADM-${year}`) })
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastStudent && lastStudent.admissionNo) {
      const lastNumber = parseInt(lastStudent.admissionNo.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    this.admissionNo = `ADM-${year}-${String(nextNumber).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Student', studentSchema);