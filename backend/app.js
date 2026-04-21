//server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth.js'));
app.use('/api/students', require('./routes/students.js'));
app.use('/api/employees', require('./routes/employees.js'));
app.use('/api/classrooms', require('./routes/classrooms.js'));
app.use('/api/subjects', require('./routes/subjects.js'));
app.use('/api/enquiries', require('./routes/enquiries.js'));
app.use('/api/exams', require('./routes/exams.js'));
app.use('/api/marks', require('./routes/marks.js'));
app.use('/api/attendance', require('./routes/attendance.js'));
app.use('/api/fees', require('./routes/fees.js'));
app.use('/api/payroll', require('./routes/payroll.js'));
app.use('/api/homework', require('./routes/homework.js'));
app.use('/api/notices', require('./routes/notices.js'));
app.use('/api/leaves', require('./routes/leaves.js'));
app.use('/api/timetable', require('./routes/timetable.js'));
app.use('/api/academic-years', require('./routes/academicYears.js'));
app.use('/api/settings', require('./routes/settings.js'));
app.use('/api/promote', require('./routes/promote.js'));
app.use('/api/reports', require('./routes/reports.js'));

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── 404 ─────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global error handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({ success: false, message: err.message || 'Internal server error' });
});

// ── Connect to MongoDB & Start ───────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;

// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['admin', 'principal', 'teacher', 'parent'], required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],  // for parents
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);

// models/Subject.js
const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  totalMarks: { type: Number, default: 100, min: 1 },
  isActive: { type: Boolean, default: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

subjectSchema.index({ name: 1, classroom: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);

// models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  admissionNo: { type: String, unique: true },
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true, default: '' },
  lastName: { type: String, required: true, trim: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  dateOfBirth: { type: Date, required: true },
  photo: { type: String, default: null },
  bloodGroup: { type: String },
  religion: { type: String },
  caste: { type: String },
  motherTongue: { type: String },
  placeOfBirth: { type: String },
  penNumber: { type: String },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  rollNumber: { type: Number },
  status: {
    type: String,
    enum: ['UnderReview', 'Approved', 'Rejected', 'OnHold', 'Left', 'Alumni'],
    default: 'UnderReview',
  },
  // Father's details
  fatherName: { type: String, required: true },
  fatherPhone: { type: String },
  fatherEmail: { type: String },
  fatherOccupation: { type: String },
  // Mother's details
  motherName: { type: String },
  motherPhone: { type: String },
  motherEmail: { type: String },
  motherOccupation: { type: String },
  // Previous school
  previousSchoolName: { type: String },
  previousClass: { type: String },
  // Admission handling
  rejectionRemark: { type: String },
  holdRemark: { type: String },
  leavingDate: { type: Date },
  leavingReason: { type: String },
  // Link to parent user account
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
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

// models/Others.js
const mongoose = require('mongoose');

// ── Payroll ──────────────────────────────────────────────────
const payrollSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  basicSalary: { type: Number, required: true },
  daysPresent: { type: Number, default: 0 },
  daysAbsent: { type: Number, default: 0 },
  daysLeave: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  netSalary: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
  paymentDate: { type: Date },
  paymentMode: { type: String, enum: ['Cash', 'BankTransfer', 'Cheque'], default: 'BankTransfer' },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

// ── Leave ────────────────────────────────────────────────────
const leaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  leaveType: { type: String, enum: ['Sick', 'Casual', 'Earned', 'Maternity', 'Unpaid', 'Other'], required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  totalDays: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalRemark: { type: String },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

// ── Homework ─────────────────────────────────────────────────
const homeworkSchema = new mongoose.Schema({
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  dueDate: { type: Date, required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

// ── Notice ───────────────────────────────────────────────────
const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  targetRoles: [{ type: String, enum: ['parent', 'teacher', 'admin'] }],
  priority: { type: String, enum: ['Normal', 'Important', 'Urgent'], default: 'Normal' },
  publishDate: { type: Date, required: true, default: Date.now },
  expiryDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

// ── Timetable Period ─────────────────────────────────────────
const periodSchema = new mongoose.Schema({
  periodNo: { type: Number, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
}, { _id: false });

const dayScheduleSchema = new mongoose.Schema({
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], required: true },
  periods: [periodSchema],
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  schedule: [dayScheduleSchema],
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

timetableSchema.index({ classroom: 1, academicYear: 1 }, { unique: true });

// ── School Settings ──────────────────────────────────────────
const schoolSettingsSchema = new mongoose.Schema({
  name: { type: String, default: 'School Name' },
  address: { type: String },
  phone: { type: String },
  email: { type: String },
  website: { type: String },
  logo: { type: String },
  affiliationNo: { type: String },
  board: { type: String },
  declaration: { type: String },
  lateFinePer: { type: Number, default: 10 },
  feeDueDay: { type: Number, default: 10 },
  minAttendance: { type: Number, default: 75 },
}, { timestamps: true });

module.exports = {
  Payroll: mongoose.model('Payroll', payrollSchema),
  Leave: mongoose.model('Leave', leaveSchema),
  Homework: mongoose.model('Homework', homeworkSchema),
  Notice: mongoose.model('Notice', noticeSchema),
  Timetable: mongoose.model('Timetable', timetableSchema),
  SchoolSettings: mongoose.model('SchoolSettings', schoolSettingsSchema),
};

// models/Fee.js
const mongoose = require('mongoose');

// ── Fee Record ───────────────────────────────────────────────
const feeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  tuitionFee: { type: Number, required: true, min: 0 },
  transportFee: { type: Number, default: 0 },
  activityFee: { type: Number, default: 0 },
  otherFee: { type: Number, default: 0 },
  lateFine: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  finalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Overdue', 'PartiallyPaid', 'Waived'],
    default: 'Pending',
  },
  dueDate: { type: Date, required: true },
  notes: { type: String },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

feeSchema.index({ student: 1, month: 1, year: 1 }, { unique: true });

// ── Fee Payment (receipt) ────────────────────────────────────
const feePaymentSchema = new mongoose.Schema({
  fee: { type: mongoose.Schema.Types.ObjectId, ref: 'Fee', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  receiptNo: { type: String, unique: true },
  amountPaid: { type: Number, required: true },
  paymentDate: { type: Date, required: true, default: Date.now },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Cheque', 'Online', 'UPI', 'BankTransfer'],
    required: true,
  },
  transactionId: { type: String },
  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

feePaymentSchema.pre('save', async function () {
  if (!this.receiptNo) {
    const year = new Date().getFullYear();

    const lastPayment = await this.constructor
      .findOne({ receiptNo: new RegExp(`RCP-${year}`) })
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastPayment && lastPayment.receiptNo) {
      const lastNumber = parseInt(lastPayment.receiptNo.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    this.receiptNo = `RCP-${year}-${String(nextNumber).padStart(5, '0')}`;
  }
});

const Fee = mongoose.model('Fee', feeSchema);
const FeePayment = mongoose.model('FeePayment', feePaymentSchema);

module.exports = { Fee, FeePayment };

// models/Exam.js
const mongoose = require('mongoose');

// ── Exam ────────────────────────────────────────────────────
const examSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  examType: {
    type: String,
    enum: ['UnitTest1', 'UnitTest2', 'MidTerm', 'FinalExam', 'Project', 'Other'],
    required: true,
  },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  totalMarks: { type: Number, required: true, min: 1 },
  examDate: { type: Date, required: true },
  description: { type: String },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

// ── Marks ───────────────────────────────────────────────────
const marksSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  marksObtained: { type: Number, default: 0 },
  isAbsent: { type: Boolean, default: false },
  grade: { type: String },
  remarks: { type: String },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
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


const Exam = mongoose.model('Exam', examSchema);
const Marks = mongoose.model('Marks', marksSchema);

module.exports = { Exam, Marks };

// models/Enquiry.js
const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  enquiryId: { type: String, unique: true },
  classApplying: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  childName: { type: String, required: true, trim: true },
  fatherName: { type: String, required: true, trim: true },
  residentialAddress: { type: String, required: true },
  pinCode: { type: String, required: true },
  phoneNo: { type: String, required: true },
  mobileNo: { type: String, required: true },
  email: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  age: { type: Number, required: true },
  dateOfBirth: { type: Date, required: true },
  preferredAdmissionDate: { type: Date },
  remark: { type: String },
  adminRemark: { type: String },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'AdmissionDone', 'Cancelled', 'PlanningFuture', 'Other'],
    default: 'New',
  },
  convertedToAdmission: { type: Boolean, default: false },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

enquirySchema.pre('save', async function () {
  if (!this.enquiryId) {
    const year = new Date().getFullYear();

    const lastEnquiry = await this.constructor
      .findOne({ enquiryId: new RegExp(`ENQ-${year}`) })
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastEnquiry && lastEnquiry.enquiryId) {
      const lastNumber = parseInt(lastEnquiry.enquiryId.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    this.enquiryId = `ENQ-${year}-${String(nextNumber).padStart(4, '0')}`;
  }
});


module.exports = mongoose.model('Enquiry', enquirySchema);

// models/Employee.js
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  photo: { type: String, default: null },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobileNo: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  dateOfBirth: { type: Date },
  dateOfJoining: { type: Date, required: true },
  monthlySalary: { type: Number, required: true },
  role: { type: String, enum: ['teacher', 'principal', 'admin', 'accountant', 'support'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'resigned'], default: 'active' },
  bloodGroup: { type: String },
  homeAddress: { type: String },
  education: { type: String },
  experience: { type: String },
  religion: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

// models/Classroom.js
const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  className: { type: String, required: true, trim: true },
  section: { type: String, trim: true, default: '' },
  displayName: { type: String, required: true, trim: true },
  monthlyFees: { type: Number, required: true, min: 0 },
  classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  order: { type: Number, default: 99 },
  capacity: { type: Number, default: 40 },
  isActive: { type: Boolean, default: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

classroomSchema.index({ className: 1, section: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Classroom', classroomSchema);

// models/Attendance.js
const mongoose = require('mongoose');

// ── Student Attendance ───────────────────────────────────────
const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', required: true },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'HalfDay', 'Holiday'],
    required: true,
  },
  remark: { type: String },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

// ── Employee Attendance ──────────────────────────────────────
const employeeAttendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'HalfDay', 'OnLeave', 'Holiday'],
    required: true,
  },
  remark: { type: String },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { timestamps: true });

employeeAttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
const EmployeeAttendance = mongoose.model('EmployeeAttendance', employeeAttendanceSchema);

module.exports = { Attendance, EmployeeAttendance };

// models/Academicyear.js
const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },   // e.g. "2024-2025"
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isCurrent: { type: Boolean, default: false },
}, { timestamps: true });

// Only one academic year can be current
academicYearSchema.pre('save', async function () {
  if (this.isCurrent) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isCurrent: false }
    );
  }
});

module.exports = mongoose.model('AcademicYear', academicYearSchema);

// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Protect: verify JWT ──────────────────────────────────────
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized – no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || req.user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'User inactive or not found' });
    }
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// ── Authorize: role-based access ────────────────────────────
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Role '${req.user.role}' is not allowed to access this resource`,
    });
  }
  next();
};


// utils/response.js
const respond = (res, statusCode, success, message, data = null, meta = null) => {
  const body = { success, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(statusCode).json(body);
};

module.exports = {
  ok: (res, data, message = 'Success', meta) => respond(res, 200, true, message, data, meta),
  created: (res, data, message = 'Created', meta) => respond(res, 201, true, message, data, meta),
  noContent: (res, message = 'Deleted') => res.status(204).end(),
  badRequest: (res, message = 'Bad request') => respond(res, 400, false, message),
  unauthorized: (res, message = 'Unauthorized') => respond(res, 401, false, message),
  forbidden: (res, message = 'Forbidden') => respond(res, 403, false, message),
  notFound: (res, message = 'Not found') => respond(res, 404, false, message),
  conflict: (res, message = 'Conflict') => respond(res, 409, false, message),
  serverError: (res, message = 'Internal server error') => respond(res, 500, false, message),
};


// routes/academicYears.js
const express = require('express');
const router = express.Router();
const AcademicYear = require('../models/AcademicYear');
const Student = require('../models/Student');
const Classroom = require('../models/Classroom');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/academic-years ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const years = await AcademicYear.find().sort({ startDate: -1 });
    r.ok(res, years);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/academic-years/current ─────────────────────────
router.get('/current', async (req, res) => {
  try {
    const year = await AcademicYear.findOne({ isCurrent: true });
    if (!year) return r.notFound(res, 'No current academic year set');
    r.ok(res, year);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/academic-years/:id ──────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) return r.notFound(res, 'Academic year not found');
    r.ok(res, year);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/academic-years ─────────────────────────────────
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { name, startDate, endDate, isCurrent } = req.body;
    if (!name || !startDate || !endDate)
      return r.badRequest(res, 'name, startDate and endDate are required');

    if (new Date(startDate) >= new Date(endDate))
      return r.badRequest(res, 'startDate must be before endDate');

    const year = await AcademicYear.create({ name, startDate, endDate, isCurrent: isCurrent || false });
    r.created(res, year, 'Academic year created');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/academic-years/:id ──────────────────────────────
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const year = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!year) return r.notFound(res, 'Academic year not found');
    r.ok(res, year, 'Academic year updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PATCH /api/academic-years/:id/set-current ───────────────
router.patch('/:id/set-current', authorize('admin'), async (req, res) => {
  try {
    // Clear current flag from all years first
    await AcademicYear.updateMany({}, { isCurrent: false });

    const year = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      { isCurrent: true },
      { new: true }
    );
    if (!year) return r.notFound(res, 'Academic year not found');
    r.ok(res, year, 'Current academic year updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/academic-years/:id ──────────────────────────
// Prevent deletion if students or classrooms exist under this year
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) return r.notFound(res, 'Academic year not found');

    if (year.isCurrent)
      return r.badRequest(res, 'Cannot delete the current academic year');

    const [studentCount, classCount] = await Promise.all([
      Student.countDocuments({ academicYear: req.params.id }),
      Classroom.countDocuments({ academicYear: req.params.id }),
    ]);

    if (studentCount > 0 || classCount > 0)
      return r.badRequest(res, `Cannot delete — ${studentCount} students and ${classCount} classrooms are linked to this year`);

    await AcademicYear.findByIdAndDelete(req.params.id);
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/attendance.js
const express = require('express');
const router = express.Router();
const { Attendance, EmployeeAttendance } = require('../models/Attendance');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ===================== STUDENT ATTENDANCE =====================

// ── GET /api/attendance/students ─────────────────────────────
router.get('/students', async (req, res) => {
  try {
    const { classId, date, studentId, fromDate, toDate, academicYear } = req.query;
    const filter = {};
    if (classId) filter.classroom = classId;
    if (studentId) filter.student = studentId;
    if (academicYear) filter.academicYear = academicYear;

    if (date) {
      const d = new Date(date);
      filter.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    } else if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) filter.date.$lte = new Date(toDate);
    }

    // Parents can only see their children
    if (req.user.role === 'parent') {
      filter.student = { $in: req.user.studentIds || [] };
    }

    const records = await Attendance.find(filter)
      .populate('student', 'firstName lastName rollNumber admissionNo')
      .populate('classroom', 'displayName')
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    r.ok(res, records);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/attendance/students  (bulk save for a class+date)
router.post('/students', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const { records } = req.body;
    // records: [{ student, classroom, date, status, remark, academicYear }]
    if (!Array.isArray(records) || records.length === 0)
      return r.badRequest(res, 'records array required');

    const ops = records.map(rec => ({
      updateOne: {
        filter: { student: rec.student, date: new Date(rec.date) },
        update: { $set: { ...rec, markedBy: req.user._id, date: new Date(rec.date) } },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(ops);
    r.ok(res, null, `${records.length} attendance record(s) saved`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/attendance/students/summary  (monthly % per student) ─
router.get('/students/summary', async (req, res) => {
  try {
    const { classId, studentId, month, year, academicYear } = req.query;
    const filter = {};
    if (classId) filter.classroom = classId;
    if (studentId) filter.student = studentId;
    if (academicYear) filter.academicYear = academicYear;

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    }

    const summary = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$student',
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          percentage: {
            $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1],
          },
        },
      },
    ]);

    r.ok(res, summary);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ===================== EMPLOYEE ATTENDANCE ====================

// ── GET /api/attendance/employees ────────────────────────────
router.get('/employees', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { date, employeeId, fromDate, toDate, academicYear } = req.query;
    const filter = {};
    if (employeeId) filter.employee = employeeId;
    if (academicYear) filter.academicYear = academicYear;

    if (date) {
      const d = new Date(date);
      filter.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    } else if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) filter.date.$lte = new Date(toDate);
    }

    const records = await EmployeeAttendance.find(filter)
      .populate('employee', 'name employeeId role')
      .sort({ date: -1 });

    r.ok(res, records);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/attendance/employees  (bulk) ───────────────────
router.post('/employees', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0)
      return r.badRequest(res, 'records array required');

    const ops = records.map(rec => ({
      updateOne: {
        filter: { employee: rec.employee, date: new Date(rec.date) },
        update: { $set: { ...rec, date: new Date(rec.date) } },
        upsert: true,
      },
    }));

    await EmployeeAttendance.bulkWrite(ops);
    r.ok(res, null, `${records.length} employee attendance record(s) saved`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const r = require('../utils/response.js');
const { protect } = require('../middleware/auth.js');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

/**
 * @route  POST /api/auth/register
 * @desc   Register a new user
 * @access Public (admin can also call this)
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return r.badRequest(res, 'name, email, password and role are required');

    const exists = await User.findOne({ email });
    if (exists) return r.conflict(res, 'Email already registered');

    const user = await User.create({ name, email, password, role });
    const token = signToken(user._id);

    r.created(res, {
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    }, 'Registered successfully');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/**
 * @route  POST /api/auth/login
 * @desc   Login and get JWT
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return r.badRequest(res, 'Email and password required');

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return r.unauthorized(res, 'Invalid credentials');

    if (user.status !== 'active')
      return r.unauthorized(res, 'Account is inactive');

    const token = signToken(user._id);
    r.ok(res, {
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    }, 'Login successful');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/**
 * @route  GET /api/auth/me
 * @desc   Get current logged-in user
 * @access Private
 */
router.get('/me', protect, async (req, res) => {
  r.ok(res, req.user);
});

/**
 * @route  PUT /api/auth/change-password
 * @desc   Change password
 * @access Private
 */
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.matchPassword(currentPassword)))
      return r.badRequest(res, 'Current password is incorrect');

    user.password = newPassword;
    await user.save();
    r.ok(res, null, 'Password changed successfully');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/classrooms.js
const express = require('express');
const router = express.Router();
const Classroom = require('../models/Classroom');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/classrooms ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { academicYear, isActive } = req.query;
    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const classrooms = await Classroom.find(filter)
      .populate('classTeacher', 'name employeeId')
      .populate('academicYear', 'name')
      .sort({ order: 1 });

    r.ok(res, classrooms);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/classrooms/:id ──────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id)
      .populate('classTeacher', 'name employeeId email mobileNo')
      .populate('academicYear', 'name');
    if (!classroom) return r.notFound(res, 'Classroom not found');
    r.ok(res, classroom);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/classrooms ─────────────────────────────────────
router.post('/', authorize('admin', 'principal'), async (req, res) => {
  try {
    const classroom = await Classroom.create(req.body);
    r.created(res, classroom, 'Classroom created');
  } catch (err) {
    if (err.code === 11000) return r.conflict(res, 'Classroom with this name/section already exists');
    r.serverError(res, err.message);
  }
});

// ── PUT /api/classrooms/:id ──────────────────────────────────
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const classroom = await Classroom.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    }).populate('classTeacher', 'name');
    if (!classroom) return r.notFound(res, 'Classroom not found');
    r.ok(res, classroom, 'Classroom updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PATCH /api/classrooms/:id/toggle ────────────────────────
router.patch('/:id/toggle', authorize('admin'), async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) return r.notFound(res, 'Classroom not found');
    classroom.isActive = !classroom.isActive;
    await classroom.save();
    r.ok(res, classroom, `Classroom ${classroom.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/classrooms/:id ───────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const classroom = await Classroom.findByIdAndDelete(req.params.id);
    if (!classroom) return r.notFound(res, 'Classroom not found');
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/employees.js
const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/employees ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { role, status, academicYear, search } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (status) filter.status = status;
    if (academicYear) filter.academicYear = academicYear;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await Employee.find(filter)
      .populate('academicYear', 'name')
      .sort({ name: 1 });

    r.ok(res, employees);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/employees/:id ───────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('academicYear', 'name')
      .populate('user', 'email status');
    if (!employee) return r.notFound(res, 'Employee not found');
    r.ok(res, employee);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/employees ──────────────────────────────────────
router.post('/', authorize('admin', 'principal'), async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    r.created(res, employee, 'Employee created');
  } catch (err) {
    if (err.code === 11000) return r.conflict(res, 'Email or employee ID already exists');
    r.serverError(res, err.message);
  }
});

// ── PUT /api/employees/:id ───────────────────────────────────
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!employee) return r.notFound(res, 'Employee not found');
    r.ok(res, employee, 'Employee updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PATCH /api/employees/:id/status ─────────────────────────
router.patch('/:id/status', authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'inactive', 'resigned'];
    if (!allowed.includes(status)) return r.badRequest(res, 'Invalid status');
    const employee = await Employee.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!employee) return r.notFound(res, 'Employee not found');
    r.ok(res, employee, 'Status updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/employees/:id ────────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return r.notFound(res, 'Employee not found');
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/enquiries.js
const express = require('express');
const router = express.Router();
const Enquiry = require('../models/Enquiry');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

// ── POST /api/enquiries  (public – no auth required) ─────────
router.post('/', async (req, res) => {
  try {
    const enquiry = await Enquiry.create(req.body);
    r.created(res, { enquiryId: enquiry.enquiryId, _id: enquiry._id }, 'Enquiry submitted successfully');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// All routes below require auth
router.use(protect);

// ── GET /api/enquiries ───────────────────────────────────────
router.get('/', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { status, classId, academicYear, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (classId) filter.classApplying = classId;
    if (academicYear) filter.academicYear = academicYear;

    if (search) {
      filter.$or = [
        { childName: { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } },
        { mobileNo: { $regex: search, $options: 'i' } },
        { enquiryId: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Enquiry.countDocuments(filter);
    const enquiries = await Enquiry.find(filter)
      .populate('classApplying', 'displayName')
      .populate('academicYear', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    r.ok(res, enquiries, 'Enquiries fetched', { total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/enquiries/:id ───────────────────────────────────
router.get('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate('classApplying', 'displayName')
      .populate('academicYear', 'name');
    if (!enquiry) return r.notFound(res, 'Enquiry not found');
    r.ok(res, enquiry);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/enquiries/:id ───────────────────────────────────
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    }).populate('classApplying', 'displayName');
    if (!enquiry) return r.notFound(res, 'Enquiry not found');
    r.ok(res, enquiry, 'Enquiry updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/enquiries/:id ────────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) return r.notFound(res, 'Enquiry not found');
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/exams.js
const express = require('express');
const router = express.Router();
const { Exam, Marks } = require('../models/Exam');
const Subject = require('../models/Subject');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ===================== EXAMS =====================

// ── GET /api/exams ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { classId, subjectId, examType, academicYear } = req.query;
    const filter = {};
    if (classId) filter.classroom = classId;
    if (subjectId) filter.subject = subjectId;
    if (examType) filter.examType = examType;
    if (academicYear) filter.academicYear = academicYear;

    const exams = await Exam.find(filter)
      .populate('classroom', 'displayName')
      .populate('subject', 'name totalMarks')
      .populate('teacher', 'name')
      .sort({ examDate: -1 });

    r.ok(res, exams);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/exams/:id ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('classroom', 'displayName')
      .populate('subject', 'name totalMarks')
      .populate('teacher', 'name');
    if (!exam) return r.notFound(res, 'Exam not found');
    r.ok(res, exam);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/exams ──────────────────────────────────────────
router.post('/', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const { classroom, subject, totalMarks } = req.body;

    // Validate available marks
    const sub = await Subject.findById(subject);
    if (!sub) return r.notFound(res, 'Subject not found');

    const existing = await Exam.find({ classroom, subject });
    const usedMarks = existing.reduce((sum, e) => sum + e.totalMarks, 0);

    if (usedMarks + Number(totalMarks) > sub.totalMarks) {
      return r.badRequest(res, `Only ${sub.totalMarks - usedMarks} marks available for this subject`);
    }

    const exam = await Exam.create(req.body);
    await exam.populate([
      { path: 'classroom', select: 'displayName' },
      { path: 'subject', select: 'name' },
    ]);
    r.created(res, exam, 'Exam created');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/exams/:id ───────────────────────────────────────
router.put('/:id', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!exam) return r.notFound(res, 'Exam not found');
    r.ok(res, exam, 'Exam updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/exams/:id ────────────────────────────────────
router.delete('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    await Exam.findByIdAndDelete(req.params.id);
    // Cascade delete marks
    await Marks.deleteMany({ exam: req.params.id });
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ===================== MARKS =====================

// ── GET /api/exams/:examId/marks ─────────────────────────────
router.get('/:examId/marks', async (req, res) => {
  try {
    const marks = await Marks.find({ exam: req.params.examId })
      .populate('student', 'firstName lastName rollNumber admissionNo')
      .populate('subject', 'name')
      .sort({ 'student.rollNumber': 1 });
    r.ok(res, marks);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/exams/:examId/marks  (bulk save / upsert) ──────
router.post('/:examId/marks', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const { marks } = req.body;  // array of { student, marksObtained, isAbsent, remarks }
    if (!Array.isArray(marks) || marks.length === 0)
      return r.badRequest(res, 'marks array is required');

    const exam = await Exam.findById(req.params.examId);
    if (!exam) return r.notFound(res, 'Exam not found');

    const calcGrade = (obtained, total) => {
      const pct = (obtained / total) * 100;
      if (pct >= 90) return 'A+'; if (pct >= 80) return 'A';
      if (pct >= 70) return 'B+'; if (pct >= 60) return 'B';
      if (pct >= 50) return 'C'; if (pct >= 40) return 'D';
      return 'F';
    };

    const ops = marks.map(m => ({
      updateOne: {
        filter: { exam: exam._id, student: m.student },
        update: {
          $set: {
            exam: exam._id,
            student: m.student,
            subject: exam.subject,
            classroom: exam.classroom,
            marksObtained: m.isAbsent ? 0 : Number(m.marksObtained),
            isAbsent: m.isAbsent || false,
            grade: m.isAbsent ? 'F' : calcGrade(Number(m.marksObtained), exam.totalMarks),
            remarks: m.remarks || '',
            academicYear: exam.academicYear,
          },
        },
        upsert: true,
      },
    }));

    await Marks.bulkWrite(ops);
    r.ok(res, null, `${marks.length} mark(s) saved`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/fees.js
const express = require('express');
const router = express.Router();
const { Fee, FeePayment } = require('../models/Fee');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/fees ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { studentId, classId, month, year, status, academicYear } = req.query;
    const filter = {};
    if (studentId) filter.student = studentId;
    if (classId) filter.classroom = classId;
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (status) filter.status = status;
    if (academicYear) filter.academicYear = academicYear;

    if (req.user.role === 'parent') {
      filter.student = { $in: req.user.studentIds || [] };
    }

    const fees = await Fee.find(filter)
      .populate('student', 'firstName lastName admissionNo')
      .populate('classroom', 'displayName')
      .sort({ year: -1, month: -1 });

    r.ok(res, fees);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/fees/:id ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id)
      .populate('student', 'firstName lastName admissionNo fatherName fatherPhone')
      .populate('classroom', 'displayName');
    if (!fee) return r.notFound(res, 'Fee record not found');
    r.ok(res, fee);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/fees  (generate fee record) ───────────────────
router.post('/', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { tuitionFee, transportFee = 0, activityFee = 0, otherFee = 0, discount = 0 } = req.body;
    const total = Number(tuitionFee) + Number(transportFee) + Number(activityFee) + Number(otherFee);
    const finalAmt = total - Number(discount);

    const fee = await Fee.create({
      ...req.body,
      totalAmount: total,
      finalAmount: finalAmt,
    });

    await fee.populate('student', 'firstName lastName');
    r.created(res, fee, 'Fee record created');
  } catch (err) {
    if (err.code === 11000) return r.conflict(res, 'Fee record already exists for this student/month');
    r.serverError(res, err.message);
  }
});

// ── PUT /api/fees/:id ────────────────────────────────────────
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const fee = await Fee.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!fee) return r.notFound(res, 'Fee record not found');
    r.ok(res, fee, 'Fee updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/fees/:id/pay  (collect payment & generate receipt) ─
router.post('/:id/pay', authorize('admin', 'principal'), async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);
    if (!fee) return r.notFound(res, 'Fee record not found');
    if (fee.status === 'Paid') return r.badRequest(res, 'Fee is already paid');

    const { amountPaid, paymentMode, transactionId, notes } = req.body;
    if (!amountPaid) return r.badRequest(res, 'amountPaid is required');

    const payment = await FeePayment.create({
      fee: fee._id,
      student: fee.student,
      amountPaid: Number(amountPaid),
      paymentDate: new Date(),
      paymentMode,
      transactionId,
      notes,
      collectedBy: req.user._id,
      academicYear: fee.academicYear,
    });

    // Update fee status
    const newStatus = Number(amountPaid) >= fee.finalAmount ? 'Paid' : 'PartiallyPaid';
    fee.status = newStatus;
    await fee.save();

    r.ok(res, { payment, receiptNo: payment.receiptNo }, `Payment recorded. Receipt: ${payment.receiptNo}`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/fees/:id/payments ───────────────────────────────
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

// ── GET /api/fees/receipts/all ───────────────────────────────
router.get('/receipts/all', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { studentId, academicYear, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (studentId) filter.student = studentId;
    if (academicYear) filter.academicYear = academicYear;

    const total = await FeePayment.countDocuments(filter);
    const receipts = await FeePayment.find(filter)
      .populate('student', 'firstName lastName admissionNo')
      .populate('fee', 'month year')
      .populate('collectedBy', 'name')
      .sort({ paymentDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    r.ok(res, receipts, 'Receipts fetched', { total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/homework.js
const express = require('express');
const router = express.Router();
const { Homework } = require('../models/Others');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/homework ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { classId, subjectId, teacherId, academicYear } = req.query;
    const filter = {};
    if (classId) filter.classroom = classId;
    if (subjectId) filter.subject = subjectId;
    if (teacherId) filter.teacher = teacherId;
    if (academicYear) filter.academicYear = academicYear;

    const homework = await Homework.find(filter)
      .populate('classroom', 'displayName')
      .populate('subject', 'name')
      .populate('teacher', 'name')
      .sort({ createdAt: -1 });

    r.ok(res, homework);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/homework ───────────────────────────────────────
router.post('/', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const hw = await Homework.create({ ...req.body, teacher: req.body.teacher || req.user.employeeId });
    await hw.populate([
      { path: 'classroom', select: 'displayName' },
      { path: 'subject', select: 'name' },
    ]);
    r.created(res, hw, 'Homework assigned');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/homework/:id ────────────────────────────────────
router.put('/:id', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    const hw = await Homework.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!hw) return r.notFound(res, 'Homework not found');
    r.ok(res, hw, 'Homework updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/homework/:id ─────────────────────────────────
router.delete('/:id', authorize('admin', 'principal', 'teacher'), async (req, res) => {
  try {
    await Homework.findByIdAndDelete(req.params.id);
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/leaves.js
const express = require('express');
const router = express.Router();
const { Leave } = require('../models/Others');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/leaves ──────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { employeeId, status, academicYear } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (academicYear) filter.academicYear = academicYear;

    // Teachers can only see their own leaves
    if (req.user.role === 'teacher') {
      filter.employee = req.user.employeeId;
    } else if (employeeId) {
      filter.employee = employeeId;
    }

    const leaves = await Leave.find(filter)
      .populate('employee', 'name employeeId role')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 });

    r.ok(res, leaves);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/leaves  (apply for leave) ─────────────────────
router.post('/', async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    const days = Math.ceil(
      (new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)
    ) + 1;

    const leave = await Leave.create({ ...req.body, totalDays: days });
    await leave.populate('employee', 'name employeeId');
    r.created(res, leave, 'Leave application submitted');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PATCH /api/leaves/:id/action  (approve / reject) ────────
router.patch('/:id/action', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { status, approvalRemark } = req.body;
    if (!['Approved', 'Rejected'].includes(status))
      return r.badRequest(res, "status must be 'Approved' or 'Rejected'");

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status, approvalRemark, approvedBy: req.user._id },
      { new: true }
    ).populate('employee', 'name');

    if (!leave) return r.notFound(res, 'Leave record not found');
    r.ok(res, leave, `Leave ${status.toLowerCase()}`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/leaves/:id ──────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return r.notFound(res, 'Leave not found');
    if (leave.status !== 'Pending') return r.badRequest(res, 'Cannot edit a processed leave');

    Object.assign(leave, req.body);
    await leave.save();
    r.ok(res, leave, 'Leave updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/leaves/:id ───────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return r.notFound(res, 'Leave not found');
    if (leave.status !== 'Pending') return r.badRequest(res, 'Cannot delete a processed leave');
    await leave.deleteOne();
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/marks.js
const express = require('express');
const router = express.Router();
const { Marks } = require('../models/Exam');
const r = require('../utils/response');
const { protect } = require('../middleware/auth');

router.use(protect);

/**
 * @route  GET /api/marks
 * @desc   Query marks with filters. Parents are restricted to their children.
 * @query  studentId, classId, subjectId, examId, academicYear
 */
router.get('/', async (req, res) => {
  try {
    const { studentId, classId, subjectId, examId, academicYear } = req.query;
    const filter = {};

    if (studentId) filter.student = studentId;
    if (classId) filter.classroom = classId;
    if (subjectId) filter.subject = subjectId;
    if (examId) filter.exam = examId;
    if (academicYear) filter.academicYear = academicYear;

    // Parents can only see their children's marks
    if (req.user.role === 'parent') {
      filter.student = { $in: req.user.studentIds || [] };
    }

    const marks = await Marks.find(filter)
      .populate('student', 'firstName lastName rollNumber admissionNo')
      .populate('subject', 'name totalMarks')
      .populate('exam', 'name examType totalMarks examDate')
      .populate('classroom', 'displayName')
      .sort({ createdAt: -1 });

    r.ok(res, marks);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/**
 * @route  GET /api/marks/:id
 * @desc   Get a single mark entry
 */
router.get('/:id', async (req, res) => {
  try {
    const mark = await Marks.findById(req.params.id)
      .populate('student', 'firstName lastName rollNumber admissionNo')
      .populate('subject', 'name totalMarks')
      .populate('exam', 'name examType totalMarks examDate')
      .populate('classroom', 'displayName');

    if (!mark) return r.notFound(res, 'Mark entry not found');

    // Parent guard
    if (req.user.role === 'parent') {
      const ids = (req.user.studentIds || []).map(id => id.toString());
      if (!ids.includes(mark.student?._id?.toString())) return r.forbidden(res);
    }

    r.ok(res, mark);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

/**
 * @route  DELETE /api/marks/:id
 * @desc   Delete a single mark entry (admin / principal only)
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!['admin', 'principal'].includes(req.user.role))
      return r.forbidden(res);

    const mark = await Marks.findByIdAndDelete(req.params.id);
    if (!mark) return r.notFound(res, 'Mark entry not found');
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/notices.js
const express = require('express');
const router = express.Router();
const { Notice } = require('../models/Others');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/notices ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { priority, academicYear } = req.query;
    const filter = {};
    if (priority) filter.priority = priority;
    if (academicYear) filter.academicYear = academicYear;

    // Filter by targetRoles for non-admins
    if (['parent', 'teacher'].includes(req.user.role)) {
      filter.targetRoles = req.user.role;
    }

    // Only show non-expired notices
    filter.$or = [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gte: new Date() } },
    ];

    const notices = await Notice.find(filter)
      .populate('createdBy', 'name')
      .sort({ publishDate: -1 });

    r.ok(res, notices);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/notices/:id ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id).populate('createdBy', 'name');
    if (!notice) return r.notFound(res, 'Notice not found');
    r.ok(res, notice);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/notices ────────────────────────────────────────
router.post('/', authorize('admin', 'principal'), async (req, res) => {
  try {
    const notice = await Notice.create({ ...req.body, createdBy: req.user._id });
    r.created(res, notice, 'Notice published');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/notices/:id ─────────────────────────────────────
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!notice) return r.notFound(res, 'Notice not found');
    r.ok(res, notice, 'Notice updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/notices/:id ──────────────────────────────────
router.delete('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/payroll.js
const express = require('express');
const router = express.Router();
const { Payroll } = require('../models/Others');
const Employee = require('../models/Employee');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'principal'));

// ── GET /api/payroll ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { employeeId, month, year, status, academicYear } = req.query;
    const filter = {};
    if (employeeId) filter.employee = employeeId;
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (status) filter.status = status;
    if (academicYear) filter.academicYear = academicYear;

    const records = await Payroll.find(filter)
      .populate('employee', 'name employeeId role monthlySalary')
      .sort({ year: -1, month: -1 });

    r.ok(res, records);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/payroll/:id ─────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const record = await Payroll.findById(req.params.id)
      .populate('employee', 'name employeeId role monthlySalary email mobileNo');
    if (!record) return r.notFound(res, 'Payroll record not found');
    r.ok(res, record);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/payroll  (generate) ───────────────────────────
router.post('/', async (req, res) => {
  try {
    const { employee: employeeId, month, year, bonus = 0, paymentMode = 'BankTransfer', academicYear } = req.body;

    const existing = await Payroll.findOne({ employee: employeeId, month, year });
    if (existing) return r.conflict(res, 'Payroll already generated for this month');

    const emp = await Employee.findById(employeeId);
    if (!emp) return r.notFound(res, 'Employee not found');

    const workingDays = 26;
    const daysPresent = req.body.daysPresent ?? 24;
    const daysAbsent = workingDays - daysPresent;
    const perDay = emp.monthlySalary / workingDays;
    const deductions = Math.round(daysAbsent * perDay);
    const netSalary = emp.monthlySalary - deductions + Number(bonus);

    const record = await Payroll.create({
      employee: employeeId,
      month,
      year,
      basicSalary: emp.monthlySalary,
      daysPresent,
      daysAbsent,
      daysLeave: req.body.daysLeave || 0,
      deductions,
      bonus: Number(bonus),
      netSalary,
      paymentMode,
      academicYear,
    });

    await record.populate('employee', 'name employeeId');
    r.created(res, record, 'Payroll generated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PATCH /api/payroll/:id/pay ───────────────────────────────
router.patch('/:id/pay', async (req, res) => {
  try {
    const record = await Payroll.findByIdAndUpdate(
      req.params.id,
      { status: 'Paid', paymentDate: new Date() },
      { new: true }
    ).populate('employee', 'name employeeId');
    if (!record) return r.notFound(res, 'Payroll record not found');
    r.ok(res, record, 'Marked as paid');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/payroll/:id ─────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const record = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!record) return r.notFound(res, 'Payroll record not found');
    r.ok(res, record, 'Payroll updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/promote.js
const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Classroom = require('../models/Classroom');
const r = require('../utils/response');
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

// routes/reports.js
const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Employee = require('../models/Employee');
const { Exam, Marks } = require('../models/Exam');
const { Attendance, EmployeeAttendance } = require('../models/Attendance');
const { Fee, FeePayment } = require('../models/Fee');
const { Payroll, Leave } = require('../models/Others');
const Classroom = require('../models/Classroom');
const AcademicYear = require('../models/AcademicYear');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'principal'));

// ── GET /api/reports/overview ────────────────────────────────
// High-level counts for the dashboard
router.get('/overview', async (req, res) => {
  try {
    const { academicYear } = req.query;
    const ayFilter = academicYear ? { academicYear } : {};

    const [
      totalStudents, approvedStudents, underReviewStudents,
      totalEmployees, activeEmployees,
      totalClasses, totalFees, paidFees,
      pendingLeaves,
    ] = await Promise.all([
      Student.countDocuments(ayFilter),
      Student.countDocuments({ ...ayFilter, status: 'Approved' }),
      Student.countDocuments({ ...ayFilter, status: 'UnderReview' }),
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'active' }),
      Classroom.countDocuments({ isActive: true }),
      Fee.aggregate([{ $match: ayFilter }, { $group: { _id: null, total: { $sum: '$finalAmount' } } }]),
      Fee.aggregate([{ $match: { ...ayFilter, status: 'Paid' } }, { $group: { _id: null, total: { $sum: '$finalAmount' } } }]),
      Leave.countDocuments({ ...ayFilter, status: 'Pending' }),
    ]);

    const totalFeeAmount = totalFees[0]?.total || 0;
    const paidFeeAmount = paidFees[0]?.total || 0;
    const pendingFeeAmount = totalFeeAmount - paidFeeAmount;

    r.ok(res, {
      students: { total: totalStudents, approved: approvedStudents, underReview: underReviewStudents },
      employees: { total: totalEmployees, active: activeEmployees },
      classes: { total: totalClasses },
      fees: { total: totalFeeAmount, collected: paidFeeAmount, pending: pendingFeeAmount },
      leaves: { pending: pendingLeaves },
    });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/fee-collection ─────────────────────────
// Monthly fee collection summary
router.get('/fee-collection', async (req, res) => {
  try {
    const { year = new Date().getFullYear(), academicYear } = req.query;
    const match = { year: Number(year) };
    if (academicYear) match.academicYear = academicYear;

    const summary = await Fee.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$month',
          totalExpected: { $sum: '$finalAmount' },
          totalCollected: {
            $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$finalAmount', 0] },
          },
          totalPending: {
            $sum: {
              $cond: [{ $in: ['$status', ['Pending', 'Overdue', 'PartiallyPaid']] }, '$finalAmount', 0],
            },
          },
          paidCount: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          overdueCount: { $sum: { $cond: [{ $eq: ['$status', 'Overdue'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month: '$_id',
          totalExpected: 1,
          totalCollected: 1,
          totalPending: 1,
          paidCount: 1,
          pendingCount: 1,
          overdueCount: 1,
          collectionRate: {
            $cond: [
              { $gt: ['$totalExpected', 0] },
              { $round: [{ $multiply: [{ $divide: ['$totalCollected', '$totalExpected'] }, 100] }, 1] },
              0,
            ],
          },
        },
      },
    ]);

    r.ok(res, summary);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/fee-defaulters ─────────────────────────
router.get('/fee-defaulters', async (req, res) => {
  try {
    const { classId, academicYear, month, year } = req.query;
    const match = { status: { $in: ['Pending', 'Overdue', 'PartiallyPaid'] } };
    if (classId) match.classroom = classId;
    if (academicYear) match.academicYear = academicYear;
    if (month) match.month = Number(month);
    if (year) match.year = Number(year);

    const fees = await Fee.find(match)
      .populate('student', 'firstName lastName admissionNo fatherName fatherPhone')
      .populate('classroom', 'displayName')
      .sort({ year: -1, month: -1 });

    r.ok(res, fees);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/attendance-summary ──────────────────────
// Per-student monthly attendance percentage
router.get('/attendance-summary', async (req, res) => {
  try {
    const { classId, month, year, academicYear } = req.query;

    const matchFilter = {};
    if (classId) matchFilter.classroom = { $toObjectId: classId };
    if (academicYear) matchFilter.academicYear = { $toObjectId: academicYear };

    if (month && year) {
      const start = new Date(year, Number(month) - 1, 1);
      const end = new Date(year, Number(month), 0, 23, 59, 59);
      matchFilter.date = { $gte: start, $lte: end };
    }

    const summary = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$student',
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          halfDay: { $sum: { $cond: [{ $eq: ['$status', 'HalfDay'] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          percentage: {
            $cond: [
              { $gt: ['$total', 0] },
              { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] },
              0,
            ],
          },
        },
      },
      { $sort: { percentage: 1 } },
    ]);

    // Populate student details
    await Student.populate(summary, { path: '_id', select: 'firstName lastName admissionNo rollNumber classroom' });

    r.ok(res, summary);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/low-attendance ─────────────────────────
// Students below minimum attendance threshold
router.get('/low-attendance', async (req, res) => {
  try {
    const { threshold = 75, classId, month, year, academicYear } = req.query;

    const matchFilter = {};
    if (classId) matchFilter.classroom = { $toObjectId: classId };
    if (academicYear) matchFilter.academicYear = { $toObjectId: academicYear };

    if (month && year) {
      const start = new Date(year, Number(month) - 1, 1);
      const end = new Date(year, Number(month), 0, 23, 59, 59);
      matchFilter.date = { $gte: start, $lte: end };
    }

    const summary = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$student',
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          percentage: {
            $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1],
          },
        },
      },
      { $match: { percentage: { $lt: Number(threshold) } } },
      { $sort: { percentage: 1 } },
    ]);

    await Student.populate(summary, { path: '_id', select: 'firstName lastName admissionNo rollNumber fatherPhone fatherEmail classroom' });
    await Classroom.populate(summary, { path: '_id.classroom', select: 'displayName' });

    r.ok(res, summary, `${summary.length} students below ${threshold}% attendance`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/exam-results ───────────────────────────
// Classwise / subject-wise exam results analysis
router.get('/exam-results', async (req, res) => {
  try {
    const { classId, examId, subjectId, academicYear } = req.query;
    const match = {};
    if (classId) match.classroom = { $toObjectId: classId };
    if (examId) match.exam = { $toObjectId: examId };
    if (subjectId) match.subject = { $toObjectId: subjectId };
    if (academicYear) match.academicYear = { $toObjectId: academicYear };

    const analysis = await Marks.aggregate([
      { $match: match },
      {
        $group: {
          _id: { exam: '$exam', subject: '$subject', classroom: '$classroom' },
          totalStudents: { $sum: 1 },
          absentStudents: { $sum: { $cond: ['$isAbsent', 1, 0] } },
          presentStudents: { $sum: { $cond: ['$isAbsent', 0, 1] } },
          totalMarksSum: { $sum: { $cond: ['$isAbsent', 0, '$marksObtained'] } },
          highestMarks: { $max: '$marksObtained' },
          lowestMarks: { $min: { $cond: ['$isAbsent', null, '$marksObtained'] } },
          gradeAPlus: { $sum: { $cond: [{ $eq: ['$grade', 'A+'] }, 1, 0] } },
          gradeA: { $sum: { $cond: [{ $eq: ['$grade', 'A'] }, 1, 0] } },
          gradeBPlus: { $sum: { $cond: [{ $eq: ['$grade', 'B+'] }, 1, 0] } },
          gradeB: { $sum: { $cond: [{ $eq: ['$grade', 'B'] }, 1, 0] } },
          gradeC: { $sum: { $cond: [{ $eq: ['$grade', 'C'] }, 1, 0] } },
          gradeD: { $sum: { $cond: [{ $eq: ['$grade', 'D'] }, 1, 0] } },
          gradeF: { $sum: { $cond: [{ $eq: ['$grade', 'F'] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          averageMarks: {
            $cond: [
              { $gt: ['$presentStudents', 0] },
              { $round: [{ $divide: ['$totalMarksSum', '$presentStudents'] }, 1] },
              0,
            ],
          },
          passCount: {
            $add: ['$gradeAPlus', '$gradeA', '$gradeBPlus', '$gradeB', '$gradeC', '$gradeD'],
          },
        },
      },
    ]);

    await Exam.populate(analysis, { path: '_id.exam', select: 'name examType totalMarks examDate' });
    await Classroom.populate(analysis, { path: '_id.classroom', select: 'displayName' });

    r.ok(res, analysis);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/student-result-card ─────────────────────
// Full result card for a single student across all exams
router.get('/student-result-card', async (req, res) => {
  try {
    const { studentId, academicYear } = req.query;
    if (!studentId) return r.badRequest(res, 'studentId is required');

    const filter = { student: studentId };
    if (academicYear) filter.academicYear = academicYear;

    const [student, marks] = await Promise.all([
      Student.findById(studentId)
        .populate('classroom', 'displayName className section')
        .populate('academicYear', 'name'),
      Marks.find(filter)
        .populate('exam', 'name examType totalMarks examDate')
        .populate('subject', 'name totalMarks')
        .sort({ 'exam.examDate': 1 }),
    ]);

    if (!student) return r.notFound(res, 'Student not found');

    // Group marks by subject
    const bySubject = {};
    for (const m of marks) {
      const subId = m.subject?._id?.toString() || m.subject?.toString();
      if (!bySubject[subId]) {
        bySubject[subId] = { subject: m.subject, exams: [], totalObtained: 0, totalMax: 0 };
      }
      bySubject[subId].exams.push(m);
      if (!m.isAbsent) {
        bySubject[subId].totalObtained += m.marksObtained;
        bySubject[subId].totalMax += m.exam?.totalMarks || 0;
      }
    }

    // Compute overall totals
    let grandObtained = 0, grandMax = 0;
    const subjects = Object.values(bySubject).map(s => {
      const pct = s.totalMax > 0 ? Math.round((s.totalObtained / s.totalMax) * 100) : 0;
      const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' :
        pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
      grandObtained += s.totalObtained;
      grandMax += s.totalMax;
      return { ...s, percentage: pct, grade };
    });

    const overallPct = grandMax > 0 ? Math.round((grandObtained / grandMax) * 100) : 0;
    const overallGrade = overallPct >= 90 ? 'A+' : overallPct >= 80 ? 'A' : overallPct >= 70 ? 'B+' :
      overallPct >= 60 ? 'B' : overallPct >= 50 ? 'C' : overallPct >= 40 ? 'D' : 'F';

    r.ok(res, {
      student,
      subjects,
      overall: { obtained: grandObtained, maximum: grandMax, percentage: overallPct, grade: overallGrade },
    });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/payroll-summary ────────────────────────
router.get('/payroll-summary', async (req, res) => {
  try {
    const { month, year, academicYear } = req.query;
    const match = {};
    if (month) match.month = Number(month);
    if (year) match.year = Number(year);
    if (academicYear) match.academicYear = academicYear;

    const summary = await Payroll.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          totalBasic: { $sum: '$basicSalary' },
          totalDeductions: { $sum: '$deductions' },
          totalBonus: { $sum: '$bonus' },
          totalNet: { $sum: '$netSalary' },
          paidCount: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
        },
      },
    ]);

    const records = await Payroll.find(match)
      .populate('employee', 'name employeeId role monthlySalary')
      .sort({ employee: 1 });

    r.ok(res, { summary: summary[0] || {}, records });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/classwise-students ─────────────────────
router.get('/classwise-students', async (req, res) => {
  try {
    const { academicYear } = req.query;
    const match = {};
    if (academicYear) match.academicYear = { $toObjectId: academicYear };

    const data = await Student.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$classroom',
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
          underReview: { $sum: { $cond: [{ $eq: ['$status', 'UnderReview'] }, 1, 0] } },
          left: { $sum: { $cond: [{ $eq: ['$status', 'Left'] }, 1, 0] } },
          boys: { $sum: { $cond: [{ $eq: ['$gender', 'Male'] }, 1, 0] } },
          girls: { $sum: { $cond: [{ $eq: ['$gender', 'Female'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    await Classroom.populate(data, { path: '_id', select: 'displayName className section order' });
    data.sort((a, b) => (a._id?.order || 99) - (b._id?.order || 99));

    r.ok(res, data);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/reports/employee-attendance-summary ─────────────
router.get('/employee-attendance-summary', async (req, res) => {
  try {
    const { month, year, academicYear } = req.query;
    const matchFilter = {};
    if (academicYear) matchFilter.academicYear = { $toObjectId: academicYear };

    if (month && year) {
      const start = new Date(year, Number(month) - 1, 1);
      const end = new Date(year, Number(month), 0, 23, 59, 59);
      matchFilter.date = { $gte: start, $lte: end };
    }

    const summary = await EmployeeAttendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$employee',
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          onLeave: { $sum: { $cond: [{ $eq: ['$status', 'OnLeave'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          percentage: {
            $cond: [
              { $gt: ['$total', 0] },
              { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] },
              0,
            ],
          },
        },
      },
    ]);

    await Employee.populate(summary, { path: '_id', select: 'name employeeId role' });

    r.ok(res, summary);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/settings.js
const express = require('express');
const router = express.Router();
const { SchoolSettings } = require('../models/Others');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/settings ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let settings = await SchoolSettings.findOne();
    if (!settings) settings = await SchoolSettings.create({});
    r.ok(res, settings);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/settings ────────────────────────────────────────
router.put('/', authorize('admin'), async (req, res) => {
  try {
    let settings = await SchoolSettings.findOne();
    if (!settings) {
      settings = await SchoolSettings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    r.ok(res, settings, 'Settings saved');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/students.js
const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ── GET /api/students  (list with filters) ───────────────────
router.get('/', async (req, res) => {
  try {
    const { classId, status, academicYear, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (classId) filter.classroom = classId;
    if (status) filter.status = status;
    if (academicYear) filter.academicYear = academicYear;

    // Parents can only see their own children
    if (req.user.role === 'parent') {
      filter._id = { $in: req.user.studentIds || [] };
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { admissionNo: { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .populate('classroom', 'displayName className section')
      .populate('academicYear', 'name')
      .sort({ rollNumber: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    r.ok(res, students, 'Students fetched', { total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/students/:id ────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('classroom', 'displayName className section monthlyFees')
      .populate('academicYear', 'name')
      .populate('user', 'name email');

    if (!student) return r.notFound(res, 'Student not found');

    // Parents can only view their linked children
    if (req.user.role === 'parent' && !req.user.studentIds?.includes(student._id)) {
      return r.forbidden(res);
    }

    r.ok(res, student);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/students  (create / admission) ─────────────────
router.post('/', authorize('admin', 'principal'), async (req, res) => {
  try {
    const student = await Student.create(req.body);
    await student.populate('classroom', 'displayName');
    r.created(res, student, 'Student admission created');
  } catch (err) {
    if (err.code === 11000) return r.conflict(res, 'Duplicate admission number');
    r.serverError(res, err.message);
  }
});

// ── PUT /api/students/:id ────────────────────────────────────
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    }).populate('classroom', 'displayName');

    if (!student) return r.notFound(res, 'Student not found');
    r.ok(res, student, 'Student updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PATCH /api/students/:id/status  (approve / reject / hold) 
router.patch('/:id/status', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { status, rejectionRemark, holdRemark } = req.body;
    const allowed = ['UnderReview', 'Approved', 'Rejected', 'OnHold', 'Left', 'Alumni'];
    if (!allowed.includes(status)) return r.badRequest(res, 'Invalid status');

    const update = { status };
    if (rejectionRemark) update.rejectionRemark = rejectionRemark;
    if (holdRemark) update.holdRemark = holdRemark;

    // Auto-assign roll number when approving
    if (status === 'Approved') {
      const student = await Student.findById(req.params.id);
      const count = await Student.countDocuments({
        classroom: student.classroom, status: 'Approved', _id: { $ne: student._id },
      });
      update.rollNumber = count + 1;
    }

    const student = await Student.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!student) return r.notFound(res, 'Student not found');
    r.ok(res, student, `Status updated to ${status}`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/students/:id ─────────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return r.notFound(res, 'Student not found');
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/subjects.js
const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/subjects ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { classId, teacherId, academicYear, isActive } = req.query;
    const filter = {};
    if (classId) filter.classroom = classId;
    if (teacherId) filter.teacher = teacherId;
    if (academicYear) filter.academicYear = academicYear;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const subjects = await Subject.find(filter)
      .populate('classroom', 'displayName')
      .populate('teacher', 'name employeeId')
      .populate('academicYear', 'name')
      .sort({ name: 1 });

    r.ok(res, subjects);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/subjects/:id ────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('classroom', 'displayName')
      .populate('teacher', 'name');
    if (!subject) return r.notFound(res, 'Subject not found');
    r.ok(res, subject);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/subjects  (single or bulk array) ───────────────
router.post('/', authorize('admin', 'principal'), async (req, res) => {
  try {
    // Accept both single object and array
    const payload = Array.isArray(req.body) ? req.body : [req.body];
    const created = await Subject.insertMany(payload, { ordered: false });
    r.created(res, created, `${created.length} subject(s) created`);
  } catch (err) {
    if (err.code === 11000) return r.conflict(res, 'One or more subjects already exist for this class');
    r.serverError(res, err.message);
  }
});

// ── PUT /api/subjects/:id ────────────────────────────────────
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    }).populate('classroom', 'displayName').populate('teacher', 'name');
    if (!subject) return r.notFound(res, 'Subject not found');
    r.ok(res, subject, 'Subject updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PATCH /api/subjects/:id/toggle ──────────────────────────
router.patch('/:id/toggle', authorize('admin', 'principal'), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return r.notFound(res, 'Subject not found');
    subject.isActive = !subject.isActive;
    await subject.save();
    r.ok(res, subject, `Subject ${subject.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/subjects/:id ─────────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return r.notFound(res, 'Subject not found');
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;

// routes/timetable.js
const express = require('express');
const router = express.Router();
const { Timetable } = require('../models/Others');
const r = require('../utils/response');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// ── GET /api/timetable ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { classId, academicYear } = req.query;
    const filter = {};
    if (classId) filter.classroom = classId;
    if (academicYear) filter.academicYear = academicYear;

    const timetables = await Timetable.find(filter)
      .populate('classroom', 'displayName')
      .populate('schedule.periods.subject', 'name')
      .populate('schedule.periods.teacher', 'name');

    r.ok(res, timetables);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── GET /api/timetable/:classId ──────────────────────────────
router.get('/:classId', async (req, res) => {
  try {
    const { academicYear } = req.query;
    const filter = { classroom: req.params.classId };
    if (academicYear) filter.academicYear = academicYear;

    const timetable = await Timetable.findOne(filter)
      .populate('classroom', 'displayName')
      .populate('schedule.periods.subject', 'name')
      .populate('schedule.periods.teacher', 'name');

    if (!timetable) return r.notFound(res, 'Timetable not found for this class');
    r.ok(res, timetable);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── POST /api/timetable  (create or replace) ────────────────
router.post('/', authorize('admin', 'principal'), async (req, res) => {
  try {
    const { classroom, academicYear, schedule } = req.body;

    const timetable = await Timetable.findOneAndUpdate(
      { classroom, academicYear },
      { classroom, academicYear, schedule },
      { new: true, upsert: true, runValidators: true }
    ).populate('classroom', 'displayName');

    r.ok(res, timetable, 'Timetable saved');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── PUT /api/timetable/:id ───────────────────────────────────
router.put('/:id', authorize('admin', 'principal'), async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!timetable) return r.notFound(res, 'Timetable not found');
    r.ok(res, timetable, 'Timetable updated');
  } catch (err) {
    r.serverError(res, err.message);
  }
});

// ── DELETE /api/timetable/:id ────────────────────────────────
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    await Timetable.findByIdAndDelete(req.params.id);
    r.noContent(res);
  } catch (err) {
    r.serverError(res, err.message);
  }
});

module.exports = router;