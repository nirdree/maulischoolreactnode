// models/Employee.js
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId:   { type: String, unique: true },
  name:         { type: String, required: true, trim: true },
  photo:        { type: String, default: null },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobileNo:     { type: String, required: true },
  gender:       { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  dateOfBirth:  { type: Date },
  dateOfJoining:{ type: Date, required: true },
  monthlySalary:{ type: Number, required: true },
  role:         { type: String, enum: ['teacher', 'principal', 'admin', 'accountant', 'support'], required: true },
  status:       { type: String, enum: ['active', 'inactive', 'resigned'], default: 'active' },
  bloodGroup:   { type: String },
  homeAddress:  { type: String },
  education:    { type: String },
  experience:   { type: String },
  religion:     { type: String },
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
}, { timestamps: true });

// Auto-generate employeeId before saving
employeeSchema.pre('save', async function () {
  if (!this.employeeId) {
    const year = new Date().getFullYear();

    const lastEmployee = await this.constructor
      .findOne({ employeeId: new RegExp(`EMP-${year}`) })
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastEmployee && lastEmployee.employeeId) {
      const lastNumber = parseInt(lastEmployee.employeeId.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    this.employeeId = `EMP-${year}-${String(nextNumber).padStart(3, '0')}`;
  }
});

module.exports = mongoose.model('Employee', employeeSchema);