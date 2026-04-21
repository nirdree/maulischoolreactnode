// src/api/constants.js - Centralized API endpoint definitions and role permissions for the school management system
// ─────────────────────────────────────────────────────────────
//  API CONSTANTS — School Management System
//  Base URL: update BASE_URL for production
// ─────────────────────────────────────────────────────────────

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API = {

  // ── 🔐 Auth ──────────────────────────────────────────────
  AUTH: {
    REGISTER: `${BASE_URL}/api/auth/register`,
    LOGIN: `${BASE_URL}/api/auth/login`,
    ME: `${BASE_URL}/api/auth/me`,
    CHANGE_PASSWORD: `${BASE_URL}/api/auth/change-password`,
  },

  // ── 📅 Academic Years ─────────────────────────────────────
  ACADEMIC_YEARS: {
    BASE: `${BASE_URL}/api/academic-years`,
    CURRENT: `${BASE_URL}/api/academic-years/current`,
    BY_ID: (id) => `${BASE_URL}/api/academic-years/${id}`,
    SET_CURRENT: (id) => `${BASE_URL}/api/academic-years/${id}/set-current`,
  },

  // ── 🏫 Classrooms ─────────────────────────────────────────
  CLASSROOMS: {
    BASE: `${BASE_URL}/api/classrooms`,
    BY_ID: (id) => `${BASE_URL}/api/classrooms/${id}`,
    TOGGLE: (id) => `${BASE_URL}/api/classrooms/${id}/toggle`,
  },

  // ── 👨‍🏫 Employees ─────────────────────────────────────────
  EMPLOYEES: {
    BASE: `${BASE_URL}/api/employees`,
    BY_ID: (id) => `${BASE_URL}/api/employees/${id}`,
    STATUS: (id) => `${BASE_URL}/api/employees/${id}/status`,
    PASSWORD: (id) => `/api/employees/${id}/password`,
  },

  // ── 🎓 Students ───────────────────────────────────────────
  STUDENTS: {
    BASE: `${BASE_URL}/api/students`,
    BY_ID: (id) => `${BASE_URL}/api/students/${id}`,
    LINK_PARENT: (id) => `/api/students/${id}/link-parent`,
    STATUS: (id) => `${BASE_URL}/api/students/${id}/status`,
    BLOCK_PARENT: (id) => `/api/students/${id}/block-parent`,
    PARENT_PASSWORD: (id) => `/api/students/${id}/parent-password`,
      OVERVIEW:          (id) => `/api/students/${id}/overview`,
  ATTENDANCE:        (id) => `/api/students/${id}/attendance`,
  MARKS:             (id) => `/api/students/${id}/marks`,
  FEES:              (id) => `/api/students/${id}/fees`,
  ACADEMIC_HISTORY:  (id) => `/api/students/${id}/academic-history`,
  },

  // ── 📚 Subjects ───────────────────────────────────────────
  SUBJECTS: {
    BASE: `${BASE_URL}/api/subjects`,
    BY_ID: (id) => `${BASE_URL}/api/subjects/${id}`,
    TOGGLE: (id) => `${BASE_URL}/api/subjects/${id}/toggle`,
  },

  // ── 📝 Enquiries ──────────────────────────────────────────
  ENQUIRIES: {
    BASE: `${BASE_URL}/api/enquiries`,         // POST is public (no auth)
    BY_ID: (id) => `${BASE_URL}/api/enquiries/${id}`,
  },

  // ── ✅ Attendance ─────────────────────────────────────────
  ATTENDANCE: {
    STUDENTS: `${BASE_URL}/api/attendance/students`,
    STUDENTS_SUMMARY: `${BASE_URL}/api/attendance/students/summary`,
    EMPLOYEES: `${BASE_URL}/api/attendance/employees`,
  },

  // ── 📊 Exams & Marks ──────────────────────────────────────
  EXAMS: {
    BASE: `${BASE_URL}/api/exams`,
    BY_ID: (id) => `${BASE_URL}/api/exams/${id}`,
    MARKS: (examId) => `${BASE_URL}/api/exams/${examId}/marks`,
  },
  MARKS: {
    BASE: `${BASE_URL}/api/marks`,
    BY_ID: (id) => `${BASE_URL}/api/marks/${id}`,
  },

  // ── 💰 Fees ───────────────────────────────────────────────
  FEES: {
    BASE: `${BASE_URL}/api/fees`,
    BY_ID: (id) => `${BASE_URL}/api/fees/${id}`,
    PAY: (id) => `${BASE_URL}/api/fees/${id}/pay`,
    PAYMENTS: (id) => `${BASE_URL}/api/fees/${id}/payments`,
    RECEIPTS: `${BASE_URL}/api/fees/receipts/all`,
  },

  // ── 💼 Payroll ────────────────────────────────────────────
  PAYROLL: {
    BASE: `${BASE_URL}/api/payroll`,
    BY_ID: (id) => `${BASE_URL}/api/payroll/${id}`,
    PAY: (id) => `${BASE_URL}/api/payroll/${id}/pay`,
  },

  // ── 🏖 Leaves ─────────────────────────────────────────────
  LEAVES: {
    BASE: `${BASE_URL}/api/leaves`,
    BY_ID: (id) => `${BASE_URL}/api/leaves/${id}`,
    ACTION: (id) => `${BASE_URL}/api/leaves/${id}/action`,
  },

  // ── 📓 Homework ───────────────────────────────────────────
  HOMEWORK: {
    BASE: `${BASE_URL}/api/homework`,
    BY_ID: (id) => `${BASE_URL}/api/homework/${id}`,
  },

  // ── 📢 Notices ────────────────────────────────────────────
  NOTICES: {
    BASE: `${BASE_URL}/api/notices`,
    BY_ID: (id) => `${BASE_URL}/api/notices/${id}`,
  },

  // ── 🗓 Timetable ──────────────────────────────────────────
  TIMETABLE: {
    BASE: `${BASE_URL}/api/timetable`,
    BY_CLASS: (classId) => `${BASE_URL}/api/timetable/${classId}`,
    BY_ID: (id) => `${BASE_URL}/api/timetable/${id}`,
  },

  // ── 📈 Promote ────────────────────────────────────────────
  PROMOTE: {
    PREVIEW: `${BASE_URL}/api/promote/preview`,
    EXECUTE: `${BASE_URL}/api/promote`,
  },

  // ── ⚙️ Settings ───────────────────────────────────────────
  SETTINGS: {
    BASE: `${BASE_URL}/api/settings`,
  },

  // ── 📊 Reports ────────────────────────────────────────────
  REPORTS: {
    OVERVIEW: `${BASE_URL}/api/reports/overview`,
    FEE_COLLECTION: `${BASE_URL}/api/reports/fee-collection`,
    FEE_DEFAULTERS: `${BASE_URL}/api/reports/fee-defaulters`,
    ATTENDANCE_SUMMARY: `${BASE_URL}/api/reports/attendance-summary`,
    LOW_ATTENDANCE: `${BASE_URL}/api/reports/low-attendance`,
    EXAM_RESULTS: `${BASE_URL}/api/reports/exam-results`,
    STUDENT_RESULT_CARD: `${BASE_URL}/api/reports/student-result-card`,
    PAYROLL_SUMMARY: `${BASE_URL}/api/reports/payroll-summary`,
    CLASSWISE_STUDENTS: `${BASE_URL}/api/reports/classwise-students`,
    EMPLOYEE_ATTENDANCE_SUMMARY: `${BASE_URL}/api/reports/employee-attendance-summary`,
  },

  // ── ❤️ Health ─────────────────────────────────────────────
  HEALTH: `${BASE_URL}/api/health`,
};

// ─────────────────────────────────────────────────────────────
//  ROLE DEFINITIONS
// ─────────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  TEACHER: 'teacher',
  PARENT: 'parent',
};

// Which pages/features each role can access
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    'dashboard', 'students', 'employees', 'classrooms', 'subjects',
    'enquiries', 'attendance', 'exams', 'marks', 'fees', 'payroll',
    'leaves', 'homework', 'notices', 'timetable', 'promote',
    'settings', 'reports', 'academic-years',
  ],
  [ROLES.PRINCIPAL]: [
    'dashboard', 'students', 'employees', 'classrooms', 'subjects',
    'enquiries', 'attendance', 'exams', 'marks', 'fees', 'payroll',
    'leaves', 'homework', 'notices', 'timetable', 'promote', 'reports',
  ],
  [ROLES.TEACHER]: [
    'dashboard', 'students', 'attendance', 'exams', 'marks',
    'homework', 'notices', 'timetable', 'leaves',
  ],
  [ROLES.PARENT]: [
    'dashboard', 'my-children', 'attendance', 'marks', 'fees',
    'homework', 'notices', 'timetable',
  ],
};