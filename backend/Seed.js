/**
 * seed.js — Full seed script for School Management System
 * Usage: node seed.js
 * Make sure your .env has MONGODB_URI set.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Models ───────────────────────────────────────────────────
const AcademicYear  = require('./models/AcademicYear');
const User          = require('./models/User');
const Employee      = require('./models/Employee');
const Classroom     = require('./models/Classroom');
const Subject       = require('./models/Subject');
const Student       = require('./models/Student');
const Enquiry       = require('./models/Enquiry');
const { Attendance, EmployeeAttendance } = require('./models/Attendance');
const { Exam, Marks }                    = require('./models/Exam');
const { Fee, FeePayment }                = require('./models/Fee');
const { Payroll, Leave, Homework, Notice, Timetable, SchoolSettings } = require('./models/Others');

// ── Helpers ──────────────────────────────────────────────────
const hash = (pwd) => bcrypt.hash(pwd, 12);
const d    = (str) => new Date(str);

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // ── Wipe existing data ─────────────────────────────────────
  const collections = [
    AcademicYear, User, Employee, Classroom, Subject, Student,
    Enquiry, Attendance, EmployeeAttendance, Exam, Marks,
    Fee, FeePayment, Payroll, Leave, Homework, Notice, Timetable, SchoolSettings,
  ];
  for (const Model of collections) await Model.deleteMany({});
  console.log('🗑  Cleared all collections');

  // ══════════════════════════════════════════════════════════
  // 1. SCHOOL SETTINGS
  // ══════════════════════════════════════════════════════════
  await SchoolSettings.create({
    name:          'Sunrise Public School',
    address:       '42, Knowledge Park, Pune - 411001',
    phone:         '020-12345678',
    email:         'admin@sunriseschool.edu.in',
    website:       'https://sunriseschool.edu.in',
    affiliationNo: 'CBSE-1234567',
    board:         'CBSE',
    declaration:   'Certified that the information is correct to the best of my knowledge.',
    lateFinePer:   10,
    feeDueDay:     10,
    minAttendance: 75,
  });
  console.log('✅ School Settings');

  // ══════════════════════════════════════════════════════════
  // 2. ACADEMIC YEARS
  // ══════════════════════════════════════════════════════════
  const ay2324 = await AcademicYear.create({
    name: '2023-2024', startDate: d('2023-04-01'), endDate: d('2024-03-31'), isCurrent: false,
  });
  const ay2425 = await AcademicYear.create({
    name: '2024-2025', startDate: d('2024-04-01'), endDate: d('2025-03-31'), isCurrent: true,
  });
  console.log('✅ Academic Years');

  // ══════════════════════════════════════════════════════════
  // 3. USERS (plain-text passwords hashed by pre-save hook)
  // ══════════════════════════════════════════════════════════
  const adminUser = await User.create({
    name: 'Admin Kumar', email: 'admin@school.com', password: 'Admin@123', role: 'admin',
  });
  const principalUser = await User.create({
    name: 'Principal Sharma', email: 'principal@school.com', password: 'Principal@123', role: 'principal',
  });
  const teacher1User = await User.create({
    name: 'Priya Patel', email: 'priya.patel@school.com', password: 'Teacher@123', role: 'teacher',
  });
  const teacher2User = await User.create({
    name: 'Rahul Mehta', email: 'rahul.mehta@school.com', password: 'Teacher@123', role: 'teacher',
  });
  const teacher3User = await User.create({
    name: 'Sunita Joshi', email: 'sunita.joshi@school.com', password: 'Teacher@123', role: 'teacher',
  });
  const parentUser1 = await User.create({
    name: 'Anil Gupta', email: 'anil.gupta@gmail.com', password: 'Parent@123', role: 'parent',
  });
  const parentUser2 = await User.create({
    name: 'Meena Verma', email: 'meena.verma@gmail.com', password: 'Parent@123', role: 'parent',
  });
  console.log('✅ Users');

  // ══════════════════════════════════════════════════════════
  // 4. EMPLOYEES
  // ══════════════════════════════════════════════════════════
  const principal = await Employee.create({
    name: 'Principal Sharma', email: 'principal@school.com', mobileNo: '9000000001',
    gender: 'Male', dateOfBirth: d('1970-05-15'), dateOfJoining: d('2010-06-01'),
    monthlySalary: 80000, role: 'principal', status: 'active',
    bloodGroup: 'O+', homeAddress: 'Pune', education: 'M.Ed', experience: '20 years',
    user: principalUser._id, academicYear: ay2425._id,
  });
  const teacher1 = await Employee.create({
    name: 'Priya Patel', email: 'priya.patel@school.com', mobileNo: '9000000002',
    gender: 'Female', dateOfBirth: d('1988-03-22'), dateOfJoining: d('2015-07-01'),
    monthlySalary: 45000, role: 'teacher', status: 'active',
    bloodGroup: 'A+', homeAddress: 'Pune', education: 'B.Ed', experience: '9 years',
    user: teacher1User._id, academicYear: ay2425._id,
  });
  const teacher2 = await Employee.create({
    name: 'Rahul Mehta', email: 'rahul.mehta@school.com', mobileNo: '9000000003',
    gender: 'Male', dateOfBirth: d('1985-11-10'), dateOfJoining: d('2013-07-01'),
    monthlySalary: 50000, role: 'teacher', status: 'active',
    bloodGroup: 'B+', homeAddress: 'Pune', education: 'M.Sc, B.Ed', experience: '11 years',
    user: teacher2User._id, academicYear: ay2425._id,
  });
  const teacher3 = await Employee.create({
    name: 'Sunita Joshi', email: 'sunita.joshi@school.com', mobileNo: '9000000004',
    gender: 'Female', dateOfBirth: d('1990-07-18'), dateOfJoining: d('2018-06-15'),
    monthlySalary: 40000, role: 'teacher', status: 'active',
    bloodGroup: 'AB+', homeAddress: 'Pune', education: 'B.Ed', experience: '6 years',
    user: teacher3User._id, academicYear: ay2425._id,
  });
  const accountant = await Employee.create({
    name: 'Vikram Shah', email: 'vikram.shah@school.com', mobileNo: '9000000005',
    gender: 'Male', dateOfBirth: d('1980-01-25'), dateOfJoining: d('2012-04-01'),
    monthlySalary: 35000, role: 'accountant', status: 'active',
    bloodGroup: 'O-', homeAddress: 'Pune', education: 'B.Com', experience: '12 years',
    academicYear: ay2425._id,
  });
  console.log('✅ Employees');

  // Link user ↔ employee
  await User.findByIdAndUpdate(teacher1User._id, { employeeId: teacher1._id });
  await User.findByIdAndUpdate(teacher2User._id, { employeeId: teacher2._id });
  await User.findByIdAndUpdate(teacher3User._id, { employeeId: teacher3._id });

  // ══════════════════════════════════════════════════════════
  // 5. CLASSROOMS
  // ══════════════════════════════════════════════════════════
  const class1A = await Classroom.create({
    className: '1', section: 'A', displayName: 'Class 1-A',
    monthlyFees: 3000, classTeacher: teacher1._id, order: 1,
    capacity: 40, isActive: true, academicYear: ay2425._id,
  });
  const class2A = await Classroom.create({
    className: '2', section: 'A', displayName: 'Class 2-A',
    monthlyFees: 3500, classTeacher: teacher2._id, order: 2,
    capacity: 40, isActive: true, academicYear: ay2425._id,
  });
  const class3A = await Classroom.create({
    className: '3', section: 'A', displayName: 'Class 3-A',
    monthlyFees: 4000, classTeacher: teacher3._id, order: 3,
    capacity: 40, isActive: true, academicYear: ay2425._id,
  });
  const class3B = await Classroom.create({
    className: '3', section: 'B', displayName: 'Class 3-B',
    monthlyFees: 4000, classTeacher: teacher1._id, order: 4,
    capacity: 40, isActive: true, academicYear: ay2425._id,
  });
  console.log('✅ Classrooms');

  // ══════════════════════════════════════════════════════════
  // 6. SUBJECTS
  // ══════════════════════════════════════════════════════════
  const [mathC1, engC1, evsC1] = await Subject.insertMany([
    { name: 'Mathematics', classroom: class1A._id, teacher: teacher1._id, totalMarks: 100, academicYear: ay2425._id },
    { name: 'English',     classroom: class1A._id, teacher: teacher1._id, totalMarks: 100, academicYear: ay2425._id },
    { name: 'EVS',         classroom: class1A._id, teacher: teacher3._id, totalMarks: 100, academicYear: ay2425._id },
  ]);
  const [mathC2, sciC2, engC2] = await Subject.insertMany([
    { name: 'Mathematics', classroom: class2A._id, teacher: teacher2._id, totalMarks: 100, academicYear: ay2425._id },
    { name: 'Science',     classroom: class2A._id, teacher: teacher2._id, totalMarks: 100, academicYear: ay2425._id },
    { name: 'English',     classroom: class2A._id, teacher: teacher1._id, totalMarks: 100, academicYear: ay2425._id },
  ]);
  const [mathC3, sciC3, ssC3] = await Subject.insertMany([
    { name: 'Mathematics', classroom: class3A._id, teacher: teacher2._id, totalMarks: 100, academicYear: ay2425._id },
    { name: 'Science',     classroom: class3A._id, teacher: teacher3._id, totalMarks: 100, academicYear: ay2425._id },
    { name: 'Social Studies', classroom: class3A._id, teacher: teacher3._id, totalMarks: 100, academicYear: ay2425._id },
  ]);
  console.log('✅ Subjects');

  // ══════════════════════════════════════════════════════════
  // 7. STUDENTS
  // ══════════════════════════════════════════════════════════
  const student1 = await Student.create({
    firstName: 'Arjun', middleName: 'Anil', lastName: 'Gupta',
    gender: 'Male', dateOfBirth: d('2016-08-10'),
    classroom: class1A._id, rollNumber: 1, status: 'Approved',
    fatherName: 'Anil Gupta', fatherPhone: '9111111111', fatherEmail: 'anil.gupta@gmail.com',
    motherName: 'Seema Gupta', motherPhone: '9111111112',
    bloodGroup: 'B+', academicYear: ay2425._id, user: parentUser1._id,
  });
  const student2 = await Student.create({
    firstName: 'Sneha', lastName: 'Verma',
    gender: 'Female', dateOfBirth: d('2016-03-22'),
    classroom: class1A._id, rollNumber: 2, status: 'Approved',
    fatherName: 'Ramesh Verma', fatherPhone: '9222222221',
    motherName: 'Meena Verma', motherPhone: '9222222222', motherEmail: 'meena.verma@gmail.com',
    bloodGroup: 'A+', academicYear: ay2425._id, user: parentUser2._id,
  });
  const student3 = await Student.create({
    firstName: 'Rohan', lastName: 'Sharma',
    gender: 'Male', dateOfBirth: d('2015-11-05'),
    classroom: class2A._id, rollNumber: 1, status: 'Approved',
    fatherName: 'Suresh Sharma', fatherPhone: '9333333331',
    motherName: 'Kavita Sharma',
    bloodGroup: 'O+', academicYear: ay2425._id,
  });
  const student4 = await Student.create({
    firstName: 'Pooja', lastName: 'Singh',
    gender: 'Female', dateOfBirth: d('2015-07-19'),
    classroom: class2A._id, rollNumber: 2, status: 'Approved',
    fatherName: 'Mahesh Singh', fatherPhone: '9444444441',
    motherName: 'Anita Singh',
    bloodGroup: 'AB+', academicYear: ay2425._id,
  });
  const student5 = await Student.create({
    firstName: 'Kiran', lastName: 'Desai',
    gender: 'Male', dateOfBirth: d('2014-05-30'),
    classroom: class3A._id, rollNumber: 1, status: 'Approved',
    fatherName: 'Dinesh Desai', fatherPhone: '9555555551',
    motherName: 'Rupa Desai',
    bloodGroup: 'B-', academicYear: ay2425._id,
  });
  const student6 = await Student.create({
    firstName: 'Aarav', lastName: 'Joshi',
    gender: 'Male', dateOfBirth: d('2016-12-01'),
    classroom: class1A._id, rollNumber: 3, status: 'UnderReview',
    fatherName: 'Deepak Joshi', fatherPhone: '9666666661',
    motherName: 'Priti Joshi',
    bloodGroup: 'A-', academicYear: ay2425._id,
  });
  console.log('✅ Students');

  // Link parents ↔ students
  await User.findByIdAndUpdate(parentUser1._id, { studentIds: [student1._id] });
  await User.findByIdAndUpdate(parentUser2._id, { studentIds: [student2._id] });

  // ══════════════════════════════════════════════════════════
  // 8. ENQUIRIES
  // ══════════════════════════════════════════════════════════
await Enquiry.create({
    classApplying: class1A._id, childName: 'Riya Shah', fatherName: 'Nilesh Shah',
    residentialAddress: '12, MG Road, Pune', pinCode: '411001',
    phoneNo: '020-9988776655', mobileNo: '9988776655', email: 'nilesh.shah@gmail.com',
    gender: 'Female', age: 5, dateOfBirth: d('2019-04-10'),
    preferredAdmissionDate: d('2025-06-01'), status: 'New', academicYear: ay2425._id,
  });
  await Enquiry.create({
    classApplying: class2A._id, childName: 'Dev Patil', fatherName: 'Santosh Patil',
    residentialAddress: '55, FC Road, Pune', pinCode: '411004',
    phoneNo: '020-8877665544', mobileNo: '8877665544', email: 'santosh.patil@gmail.com',
    gender: 'Male', age: 7, dateOfBirth: d('2017-09-15'),
    status: 'Contacted', adminRemark: 'Called on 10 Apr', academicYear: ay2425._id,
  });
  console.log('✅ Enquiries');

  // ══════════════════════════════════════════════════════════
  // 9. ATTENDANCE — Students (last 5 days)
  // ══════════════════════════════════════════════════════════
  const today = new Date();
  const stdAttRecords = [];
  for (let i = 4; i >= 0; i--) {
    const dt = new Date(today); dt.setDate(dt.getDate() - i);
    const dateOnly = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const studentsForDay = [
      { student: student1._id, classroom: class1A._id },
      { student: student2._id, classroom: class1A._id },
      { student: student3._id, classroom: class2A._id },
      { student: student4._id, classroom: class2A._id },
      { student: student5._id, classroom: class3A._id },
    ];
    const statuses = ['Present', 'Present', 'Present', 'Absent', 'Late'];
    studentsForDay.forEach((s, idx) => {
      stdAttRecords.push({
        student: s.student, classroom: s.classroom,
        date: dateOnly,
        status: statuses[idx % statuses.length],
        markedBy: teacher1._id,
        academicYear: ay2425._id,
      });
    });
  }
  await Attendance.insertMany(stdAttRecords, { ordered: false }).catch(() => {});
  console.log('✅ Student Attendance');

  // Employee attendance (last 3 days)
  const empAttRecords = [];
  for (let i = 2; i >= 0; i--) {
    const dt = new Date(today); dt.setDate(dt.getDate() - i);
    const dateOnly = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    [principal, teacher1, teacher2, teacher3, accountant].forEach((emp, idx) => {
      empAttRecords.push({
        employee: emp._id, date: dateOnly,
        status: idx === 4 && i === 1 ? 'Absent' : 'Present',
        academicYear: ay2425._id,
      });
    });
  }
  await EmployeeAttendance.insertMany(empAttRecords, { ordered: false }).catch(() => {});
  console.log('✅ Employee Attendance');

  // ══════════════════════════════════════════════════════════
  // 10. EXAMS & MARKS
  // ══════════════════════════════════════════════════════════
  const exam1 = await Exam.create({
    name: 'Unit Test 1 - Mathematics', examType: 'UnitTest1',
    subject: mathC1._id, classroom: class1A._id, teacher: teacher1._id,
    totalMarks: 25, examDate: d('2024-08-15'), academicYear: ay2425._id,
  });
  const exam2 = await Exam.create({
    name: 'Unit Test 1 - English', examType: 'UnitTest1',
    subject: engC1._id, classroom: class1A._id, teacher: teacher1._id,
    totalMarks: 25, examDate: d('2024-08-16'), academicYear: ay2425._id,
  });
  const exam3 = await Exam.create({
    name: 'Mid Term - Mathematics', examType: 'MidTerm',
    subject: mathC2._id, classroom: class2A._id, teacher: teacher2._id,
    totalMarks: 50, examDate: d('2024-09-20'), academicYear: ay2425._id,
  });

  // Marks
  const calcGrade = (obtained, total) => {
    const pct = (obtained / total) * 100;
    if (pct >= 90) return 'A+'; if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+'; if (pct >= 60) return 'B';
    if (pct >= 50) return 'C'; if (pct >= 40) return 'D';
    return 'F';
  };

  await Marks.insertMany([
    {
      exam: exam1._id, student: student1._id, subject: mathC1._id,
      classroom: class1A._id, marksObtained: 22, isAbsent: false,
      grade: calcGrade(22, 25), academicYear: ay2425._id,
    },
    {
      exam: exam1._id, student: student2._id, subject: mathC1._id,
      classroom: class1A._id, marksObtained: 18, isAbsent: false,
      grade: calcGrade(18, 25), academicYear: ay2425._id,
    },
    {
      exam: exam2._id, student: student1._id, subject: engC1._id,
      classroom: class1A._id, marksObtained: 20, isAbsent: false,
      grade: calcGrade(20, 25), academicYear: ay2425._id,
    },
    {
      exam: exam2._id, student: student2._id, subject: engC1._id,
      classroom: class1A._id, marksObtained: 0, isAbsent: true,
      grade: 'F', academicYear: ay2425._id,
    },
    {
      exam: exam3._id, student: student3._id, subject: mathC2._id,
      classroom: class2A._id, marksObtained: 42, isAbsent: false,
      grade: calcGrade(42, 50), academicYear: ay2425._id,
    },
    {
      exam: exam3._id, student: student4._id, subject: mathC2._id,
      classroom: class2A._id, marksObtained: 38, isAbsent: false,
      grade: calcGrade(38, 50), academicYear: ay2425._id,
    },
  ]);
  console.log('✅ Exams & Marks');

  // ══════════════════════════════════════════════════════════
  // 11. FEES
  // ══════════════════════════════════════════════════════════
  const dueDate = (m, y) => new Date(y, m - 1, 10);

  const fee1 = await Fee.create({
    student: student1._id, classroom: class1A._id,
    month: 4, year: 2024, tuitionFee: 3000, transportFee: 500,
    totalAmount: 3500, finalAmount: 3500, status: 'Paid',
    dueDate: dueDate(4, 2024), academicYear: ay2425._id,
  });
  const fee2 = await Fee.create({
    student: student1._id, classroom: class1A._id,
    month: 5, year: 2024, tuitionFee: 3000, transportFee: 500,
    totalAmount: 3500, finalAmount: 3500, status: 'Pending',
    dueDate: dueDate(5, 2024), academicYear: ay2425._id,
  });
  const fee3 = await Fee.create({
    student: student2._id, classroom: class1A._id,
    month: 4, year: 2024, tuitionFee: 3000,
    totalAmount: 3000, finalAmount: 3000, status: 'Paid',
    dueDate: dueDate(4, 2024), academicYear: ay2425._id,
  });
  const fee4 = await Fee.create({
    student: student3._id, classroom: class2A._id,
    month: 4, year: 2024, tuitionFee: 3500, transportFee: 600,
    totalAmount: 4100, finalAmount: 4100, status: 'Overdue',
    dueDate: dueDate(4, 2024), academicYear: ay2425._id,
  });

  // Payments for paid fees
  await FeePayment.create({
    fee: fee1._id, student: student1._id, amountPaid: 3500,
    paymentDate: d('2024-04-05'), paymentMode: 'UPI',
    transactionId: 'UPI20240405001', collectedBy: adminUser._id,
    academicYear: ay2425._id,
  });
  await FeePayment.create({
    fee: fee3._id, student: student2._id, amountPaid: 3000,
    paymentDate: d('2024-04-08'), paymentMode: 'Cash',
    collectedBy: adminUser._id, academicYear: ay2425._id,
  });
  console.log('✅ Fees & Payments');

  // ══════════════════════════════════════════════════════════
  // 12. PAYROLL
  // ══════════════════════════════════════════════════════════
  await Payroll.insertMany([
    {
      employee: teacher1._id, month: 4, year: 2024, basicSalary: 45000,
      daysPresent: 25, daysAbsent: 1, daysLeave: 0,
      deductions: Math.round(45000 / 26), bonus: 0,
      netSalary: 45000 - Math.round(45000 / 26),
      status: 'Paid', paymentDate: d('2024-04-30'), paymentMode: 'BankTransfer',
      academicYear: ay2425._id,
    },
    {
      employee: teacher2._id, month: 4, year: 2024, basicSalary: 50000,
      daysPresent: 26, daysAbsent: 0, daysLeave: 0,
      deductions: 0, bonus: 2000, netSalary: 52000,
      status: 'Paid', paymentDate: d('2024-04-30'), paymentMode: 'BankTransfer',
      academicYear: ay2425._id,
    },
    {
      employee: teacher3._id, month: 4, year: 2024, basicSalary: 40000,
      daysPresent: 24, daysAbsent: 2, daysLeave: 0,
      deductions: Math.round((40000 / 26) * 2), bonus: 0,
      netSalary: 40000 - Math.round((40000 / 26) * 2),
      status: 'Pending', academicYear: ay2425._id,
    },
  ]);
  console.log('✅ Payroll');

  // ══════════════════════════════════════════════════════════
  // 13. LEAVES
  // ══════════════════════════════════════════════════════════
  await Leave.insertMany([
    {
      employee: teacher1._id, leaveType: 'Sick',
      fromDate: d('2024-08-05'), toDate: d('2024-08-06'), totalDays: 2,
      reason: 'Fever and flu', status: 'Approved',
      approvedBy: principalUser._id, approvalRemark: 'Approved. Get well soon.',
      academicYear: ay2425._id,
    },
    {
      employee: teacher3._id, leaveType: 'Casual',
      fromDate: d('2024-09-10'), toDate: d('2024-09-10'), totalDays: 1,
      reason: 'Personal work', status: 'Pending',
      academicYear: ay2425._id,
    },
    {
      employee: teacher2._id, leaveType: 'Earned',
      fromDate: d('2024-10-15'), toDate: d('2024-10-18'), totalDays: 4,
      reason: 'Family function', status: 'Rejected',
      approvedBy: principalUser._id, approvalRemark: 'Exams scheduled during this period.',
      academicYear: ay2425._id,
    },
  ]);
  console.log('✅ Leaves');

  // ══════════════════════════════════════════════════════════
  // 14. HOMEWORK
  // ══════════════════════════════════════════════════════════
  await Homework.insertMany([
    {
      classroom: class1A._id, subject: mathC1._id, teacher: teacher1._id,
      title: 'Addition & Subtraction Practice', description: 'Complete exercises 3.1 to 3.5 from textbook.',
      dueDate: new Date(Date.now() + 3 * 86400000), academicYear: ay2425._id,
    },
    {
      classroom: class1A._id, subject: engC1._id, teacher: teacher1._id,
      title: 'Write 5 sentences about your pet',
      description: 'Use adjectives and descriptive language.',
      dueDate: new Date(Date.now() + 2 * 86400000), academicYear: ay2425._id,
    },
    {
      classroom: class2A._id, subject: mathC2._id, teacher: teacher2._id,
      title: 'Multiplication Tables 6-10',
      description: 'Learn and write tables 6 through 10.',
      dueDate: new Date(Date.now() + 1 * 86400000), academicYear: ay2425._id,
    },
  ]);
  console.log('✅ Homework');

  // ══════════════════════════════════════════════════════════
  // 15. NOTICES
  // ══════════════════════════════════════════════════════════
  await Notice.insertMany([
    {
      title: 'Annual Sports Day — 25th September',
      content: 'All students must report in sports uniform by 8:00 AM on 25th September for the Annual Sports Day. Parents are cordially invited.',
      targetRoles: ['parent', 'teacher'],
      priority: 'Important', publishDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 86400000),
      createdBy: principalUser._id, academicYear: ay2425._id,
    },
    {
      title: 'Fee Payment Reminder — May 2024',
      content: 'Parents are reminded that May 2024 fees are due by 10th May. A late fine of ₹10/day will be levied after the due date.',
      targetRoles: ['parent'],
      priority: 'Urgent', publishDate: new Date(),
      createdBy: adminUser._id, academicYear: ay2425._id,
    },
    {
      title: 'Staff Meeting — Friday 3 PM',
      content: 'All teaching staff are required to attend a mandatory staff meeting in the conference room on Friday at 3:00 PM.',
      targetRoles: ['teacher'],
      priority: 'Normal', publishDate: new Date(),
      expiryDate: new Date(Date.now() + 7 * 86400000),
      createdBy: principalUser._id, academicYear: ay2425._id,
    },
  ]);
  console.log('✅ Notices');

  // ══════════════════════════════════════════════════════════
  // 16. TIMETABLE (Class 1-A)
  // ══════════════════════════════════════════════════════════
  await Timetable.create({
    classroom: class1A._id,
    academicYear: ay2425._id,
    schedule: [
      {
        day: 'Monday',
        periods: [
          { periodNo: 1, startTime: '08:00', endTime: '08:45', subject: mathC1._id, teacher: teacher1._id },
          { periodNo: 2, startTime: '08:45', endTime: '09:30', subject: engC1._id,  teacher: teacher1._id },
          { periodNo: 3, startTime: '09:45', endTime: '10:30', subject: evsC1._id,  teacher: teacher3._id },
        ],
      },
      {
        day: 'Tuesday',
        periods: [
          { periodNo: 1, startTime: '08:00', endTime: '08:45', subject: engC1._id,  teacher: teacher1._id },
          { periodNo: 2, startTime: '08:45', endTime: '09:30', subject: mathC1._id, teacher: teacher1._id },
          { periodNo: 3, startTime: '09:45', endTime: '10:30', subject: evsC1._id,  teacher: teacher3._id },
        ],
      },
      {
        day: 'Wednesday',
        periods: [
          { periodNo: 1, startTime: '08:00', endTime: '08:45', subject: mathC1._id, teacher: teacher1._id },
          { periodNo: 2, startTime: '08:45', endTime: '09:30', subject: evsC1._id,  teacher: teacher3._id },
          { periodNo: 3, startTime: '09:45', endTime: '10:30', subject: engC1._id,  teacher: teacher1._id },
        ],
      },
    ],
  });
  console.log('✅ Timetable');

  // ══════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════
  console.log('\n🎉 Seeding complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('LOGIN CREDENTIALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin      : admin@school.com       / Admin@123');
  console.log('Principal  : principal@school.com   / Principal@123');
  console.log('Teacher 1  : priya.patel@school.com / Teacher@123');
  console.log('Teacher 2  : rahul.mehta@school.com / Teacher@123');
  console.log('Teacher 3  : sunita.joshi@school.com/ Teacher@123');
  console.log('Parent 1   : anil.gupta@gmail.com   / Parent@123');
  console.log('Parent 2   : meena.verma@gmail.com  / Parent@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nIMPORTANT: After login, copy the JWT token and set it as');
  console.log('the {{token}} variable in your Postman environment.\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});