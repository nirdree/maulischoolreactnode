// App.jsx -
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute, RoleRoute, RoleRedirect } from './guards.jsx';
import { ROLES } from './api/constants.js';

// Layouts
import AdminLayout from './components/layout/AdminLayout.jsx';
import TeacherLayout from './components/layout/TeacherLayout.jsx';
import ParentLayout from './components/layout/ParentLayout.jsx';

// Auth Pages
import LoginPage from './pages/shared/LoginPage.jsx';
import Unauthorized from './pages/shared/Unauthorized.jsx';

// ── Admin / Principal Pages ──────────────────────────────────
import AdminDashboard from './pages/admin/Dashboard.jsx';
import StudentsPage from './pages/admin/Students.jsx';
import EmployeesPage from './pages/admin/Employees.jsx';
import ClassroomsPage from './pages/admin/Classrooms.jsx';
import SubjectsPage from './pages/admin/Subjects.jsx';
import EnquiriesPage from './pages/admin/Enquiries.jsx';
import FeesPage from './pages/admin/Fees.jsx';
import PayrollPage from './pages/admin/Payroll.jsx';
import LeavesAdminPage from './pages/admin/Leaves.jsx';
import NoticesAdminPage from './pages/admin/Notices.jsx';
import TimetableAdminPage from './pages/admin/Timetable.jsx';
import PromotePage from './pages/admin/Promote.jsx';
import SettingsPage from './pages/admin/Settings.jsx';
import ReportsPage from './pages/admin/Reports.jsx';
import AcademicYearsPage from './pages/admin/AcademicYears.jsx';
import AttendanceAdminPage from './pages/admin/Attendance.jsx';
import ExamsAdminPage from './pages/admin/Exams.jsx';

// ── Teacher Pages ─────────────────────────────────────────────
import TeacherDashboard from './pages/teacher/Dashboard.jsx';
import AttendancePage from './pages/teacher/Attendance.jsx';
import ExamsPage from './pages/teacher/Exams.jsx';
import HomeworkPage from './pages/teacher/Homework.jsx';
import TeacherLeaves from './pages/teacher/Leaves.jsx';
import TeacherNotices from './pages/teacher/Notices.jsx';
import TeacherTimetable from './pages/teacher/Timetable.jsx';

// ── Parent Pages ──────────────────────────────────────────────
import ParentDashboard from './pages/parent/Dashboard.jsx';
import MyChildren from './pages/parent/MyChildren.jsx';
import ParentAttendance from './pages/parent/Attendance.jsx';
import ParentMarks from './pages/parent/Marks.jsx';
import ParentFees from './pages/parent/Fees.jsx';
import ParentHomework from './pages/parent/Homework.jsx';
import ParentNotices from './pages/parent/Notices.jsx';
import ParentTimetable from './pages/parent/Timetable.jsx';

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.PRINCIPAL];

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* ── Admin & Principal ── */}
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={ADMIN_ROLES}>
                <AdminLayout />
              </RoleRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="classrooms" element={<ClassroomsPage />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="enquiries" element={<EnquiriesPage />} />
            <Route path="attendance" element={<AttendanceAdminPage />} />
            <Route path="exams" element={<ExamsAdminPage />} />
            <Route path="fees" element={<FeesPage />} />
            <Route path="payroll" element={<PayrollPage allowedRoles={[ROLES.ADMIN]} />} />
            <Route path="leaves" element={<LeavesAdminPage />} />
            <Route path="notices" element={<NoticesAdminPage />} />
            <Route path="timetable" element={<TimetableAdminPage />} />
            <Route path="promote" element={<PromotePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="academic-years" element={<AcademicYearsPage allowedRoles={[ROLES.ADMIN]} />} />
            <Route path="settings" element={<SettingsPage allowedRoles={[ROLES.ADMIN]} />} />
          </Route>

          {/* Principal also uses /principal prefix → same pages */}
          <Route path="/principal" element={<Navigate to="/admin" replace />} />

          {/* ── Teacher ── */}
          <Route
            path="/teacher"
            element={
              <RoleRoute allowedRoles={[ROLES.TEACHER]}>
                <TeacherLayout />
              </RoleRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="exams" element={<ExamsPage />} />
            <Route path="homework" element={<HomeworkPage />} />
            <Route path="leaves" element={<TeacherLeaves />} />
            <Route path="notices" element={<TeacherNotices />} />
            <Route path="timetable" element={<TeacherTimetable />} />
          </Route>

          {/* ── Parent ── */}
          <Route
            path="/parent"
            element={
              <RoleRoute allowedRoles={[ROLES.PARENT]}>
                <ParentLayout />
              </RoleRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ParentDashboard />} />
            <Route path="my-children" element={<MyChildren />} />
            <Route path="attendance" element={<ParentAttendance />} />
            <Route path="marks" element={<ParentMarks />} />
            <Route path="fees" element={<ParentFees />} />
            <Route path="homework" element={<ParentHomework />} />
            <Route path="notices" element={<ParentNotices />} />
            <Route path="timetable" element={<ParentTimetable />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}



// context/AuthContext.jsx - Authentication state management and API integration
import { createContext, useContext, useState } from 'react';
import api from '../api/client.js';
import { API } from '../api/constants.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('sms_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post(API.AUTH.LOGIN, { email, password });
      const { token, user: userData } = res;
      localStorage.setItem('sms_token', token);
      localStorage.setItem('sms_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, role: userData.role };
    } catch (err) {
      return { success: false, message: err.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('sms_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};


// guards.jsx - Route protection and role-based access control
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ROLE_PERMISSIONS } from './api/constants';

// Protect any route — redirect to login if not authenticated
export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// Restrict route to specific roles
export function RoleRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

// Role-based dashboard redirect after login
export function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  const dashboards = {
    admin: '/admin/dashboard',
    principal: '/principal/dashboard',
    teacher: '/teacher/dashboard',
    parent: '/parent/dashboard',
  };

  return <Navigate to={dashboards[user.role] || '/login'} replace />;
}

// Utility: check if user has access to a feature
export function hasPermission(userRole, feature) {
  return ROLE_PERMISSIONS[userRole]?.includes(feature) ?? false;
}

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
  },

  // ── 🎓 Students ───────────────────────────────────────────
  STUDENTS: {
    BASE: `${BASE_URL}/api/students`,
    BY_ID: (id) => `${BASE_URL}/api/students/${id}`,
    STATUS: (id) => `${BASE_URL}/api/students/${id}/status`,
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

// src/api/client.js - Axios instance with interceptors for JWT handling and error management
import axios from 'axios';
import { BASE_URL } from './constants';

// ── Axios instance ───────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor: attach JWT token ────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sms_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 ────────────────────────
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sms_token');
      localStorage.removeItem('sms_user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;

// components/layout/AdminLayout.jsx - Main layout for admin and principal with sidebar navigation
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../api/constants';
import {
  GraduationCap, LayoutDashboard, Users, UserCheck, School,
  BookOpen, ClipboardList, CheckSquare, FileText, DollarSign,
  Banknote, CalendarDays, Bell, Clock, ArrowUpCircle, Settings,
  BarChart3, CalendarRange, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';

const ALL_NAV = [
  { label: 'Dashboard', path: 'dashboard', icon: LayoutDashboard, roles: ['admin', 'principal'] },
  { label: 'Students', path: 'students', icon: Users, roles: ['admin', 'principal'] },
  { label: 'Employees', path: 'employees', icon: UserCheck, roles: ['admin', 'principal'] },
  { label: 'Classrooms', path: 'classrooms', icon: School, roles: ['admin', 'principal'] },
  { label: 'Subjects', path: 'subjects', icon: BookOpen, roles: ['admin', 'principal'] },
  { label: 'Enquiries', path: 'enquiries', icon: ClipboardList, roles: ['admin', 'principal'] },
  { label: 'Attendance', path: 'attendance', icon: CheckSquare, roles: ['admin', 'principal'] },
  { label: 'Exams & Marks', path: 'exams', icon: FileText, roles: ['admin', 'principal'] },
  { label: 'Fees', path: 'fees', icon: DollarSign, roles: ['admin', 'principal'] },
  { label: 'Payroll', path: 'payroll', icon: Banknote, roles: ['admin'] },
  { label: 'Leaves', path: 'leaves', icon: CalendarDays, roles: ['admin', 'principal'] },
  { label: 'Homework', path: 'homework', icon: ClipboardList, roles: ['admin', 'principal'] },
  { label: 'Notices', path: 'notices', icon: Bell, roles: ['admin', 'principal'] },
  { label: 'Timetable', path: 'timetable', icon: Clock, roles: ['admin', 'principal'] },
  { label: 'Promote', path: 'promote', icon: ArrowUpCircle, roles: ['admin', 'principal'] },
  { label: 'Reports', path: 'reports', icon: BarChart3, roles: ['admin', 'principal'] },
  { label: 'Academic Years', path: 'academic-years', icon: CalendarRange, roles: ['admin'] },
  { label: 'Settings', path: 'settings', icon: Settings, roles: ['admin'] },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = ALL_NAV.filter(n => n.roles.includes(user?.role));

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
          {sidebarOpen && (
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
          )}
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">Sunrise School</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-slate-400 hover:text-white flex-shrink-0"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/admin/${path}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition group ${isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
              {sidebarOpen && <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            )}
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 flex-shrink-0" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-slate-950">
        <Outlet />
      </main>
    </div>
  );
}

// components/layout/TeacherLayout.jsx - Main layout for teachers with sidebar navigation
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap, LayoutDashboard, CheckSquare, FileText,
  ClipboardList, CalendarDays, Bell, Clock, LogOut, Menu, X,
} from 'lucide-react';

const TEACHER_NAV = [
  { label: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
  { label: 'Attendance', path: 'attendance', icon: CheckSquare },
  { label: 'Exams', path: 'exams', icon: FileText },
  { label: 'Homework', path: 'homework', icon: ClipboardList },
  { label: 'Leaves', path: 'leaves', icon: CalendarDays },
  { label: 'Notices', path: 'notices', icon: Bell },
  { label: 'Timetable', path: 'timetable', icon: Clock },
];

function SidebarLayout({ navItems, prefix, accentColor = 'indigo' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <aside className={`${open ? 'w-60' : 'w-16'} flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300`}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
          <div className={`w-8 h-8 rounded-lg bg-${accentColor}-600 flex items-center justify-center flex-shrink-0`}>
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          {open && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white">Sunrise School</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          )}
          <button onClick={() => setOpen(!open)} className="ml-auto text-slate-400 hover:text-white">
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/${prefix}/${path}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${isActive ? `bg-${accentColor}-600 text-white` : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
              title={!open ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {open && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full bg-${accentColor}-500 flex items-center justify-center text-xs font-bold flex-shrink-0`}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            {open && (
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
              </div>
            )}
            <button onClick={() => { logout(); navigate('/login'); }} className="text-slate-400 hover:text-red-400" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-950">
        <Outlet />
      </main>
    </div>
  );
}

export function TeacherLayout() {
  return <SidebarLayout navItems={TEACHER_NAV} prefix="teacher" accentColor="emerald" />;
}

const PARENT_NAV = [
  { label: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
  { label: 'My Children', path: 'my-children', icon: GraduationCap },
  { label: 'Attendance', path: 'attendance', icon: CheckSquare },
  { label: 'Marks', path: 'marks', icon: FileText },
  { label: 'Fees', path: 'fees', icon: ClipboardList },
  { label: 'Homework', path: 'homework', icon: ClipboardList },
  { label: 'Notices', path: 'notices', icon: Bell },
  { label: 'Timetable', path: 'timetable', icon: Clock },
];

export function ParentLayout() {
  return <SidebarLayout navItems={PARENT_NAV} prefix="parent" accentColor="violet" />;
}

export default TeacherLayout;

// components/layout/ParentLayout.jsx - Main layout for parents with sidebar navigation
export { ParentLayout as default } from './TeacherLayout';

// /pages/shared/LoginPages.jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, GraduationCap, Loader2 } from 'lucide-react';

const ROLE_HOME = {
  admin: '/admin/dashboard',
  principal: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  parent: '/parent/dashboard',
};

// Quick-fill demo credentials
const DEMO_CREDS = [
  { label: 'Admin', email: 'admin@school.com', password: 'Admin@123' },
  { label: 'Principal', email: 'principal@school.com', password: 'Principal@123' },
  { label: 'Teacher', email: 'priya.patel@school.com', password: 'Teacher@123' },
  { label: 'Parent', email: 'anil.gupta@gmail.com', password: 'Parent@123' },
];

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form.email, form.password);
    if (result.success) {
      navigate(from || ROLE_HOME[result.role] || '/', { replace: true });
    } else {
      setError(result.message || 'Invalid credentials');
    }
  };

  const fillDemo = (cred) => {
    setForm({ email: cred.email, password: cred.password });
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-500/30">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sunrise School</h1>
          <p className="text-slate-400 text-sm mt-1">Management System</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@school.com"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 text-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-500 mb-3 text-center">Quick demo login</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_CREDS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => fillDemo(c)}
                  className="text-xs py-1.5 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react'

const Unauthorized = () => {
  return (
    <div>Unauthorized</div>
  )
}

export default Unauthorized

// components/ui.jsx - Reusable UI components for the school management system
import { Loader2 } from 'lucide-react';

// ── Page wrapper ─────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageContent({ children, className = '' }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

// ── Cards ────────────────────────────────────────────────────
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, color = 'indigo', trend }) {
  const colors = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
    violet: 'bg-violet-500/10 text-violet-400',
    sky: 'bg-sky-500/10 text-sky-400',
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value ?? '—'}</p>
          {trend && <p className="text-xs text-slate-500 mt-1">{trend}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color] || colors.indigo}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Table ────────────────────────────────────────────────────
export function Table({ columns, data, loading, emptyMessage = 'No data found' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </td>
            </tr>
          ) : data?.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-slate-500 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data?.map((row, i) => (
              <tr key={row._id || i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4 text-slate-300">
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────
export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, className = '', type = 'button' }) {
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm font-semibold',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Badge ────────────────────────────────────────────────────
export function Badge({ label, color = 'slate' }) {
  const colors = {
    slate: 'bg-slate-700 text-slate-300',
    green: 'bg-emerald-500/15 text-emerald-400',
    red: 'bg-rose-500/15 text-rose-400',
    yellow: 'bg-amber-500/15 text-amber-400',
    blue: 'bg-sky-500/15 text-sky-400',
    purple: 'bg-violet-500/15 text-violet-400',
    indigo: 'bg-indigo-500/15 text-indigo-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.slate}`}>
      {label}
    </span>
  );
}

// ── Input ────────────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>}
      <input
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        {...props}
      />
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}

// ── Select ───────────────────────────────────────────────────
export function Select({ label, options, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>}
      <select
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Status badge helpers ──────────────────────────────────────
export function studentStatusBadge(status) {
  const map = {
    Approved: { label: 'Approved', color: 'green' },
    UnderReview: { label: 'Under Review', color: 'yellow' },
    Rejected: { label: 'Rejected', color: 'red' },
    OnHold: { label: 'On Hold', color: 'blue' },
    Left: { label: 'Left', color: 'slate' },
    Alumni: { label: 'Alumni', color: 'purple' },
  };
  const b = map[status] || { label: status, color: 'slate' };
  return <Badge label={b.label} color={b.color} />;
}

export function feeStatusBadge(status) {
  const map = {
    Paid: { color: 'green' },
    Pending: { color: 'yellow' },
    Overdue: { color: 'red' },
    PartiallyPaid: { color: 'blue' },
    Waived: { color: 'purple' },
  };
  const b = map[status] || { color: 'slate' };
  return <Badge label={status} color={b.color} />;
}

export function leaveStatusBadge(status) {
  const map = { Approved: 'green', Pending: 'yellow', Rejected: 'red' };
  return <Badge label={status} color={map[status] || 'slate'} />;
}

// pages/admin/Dashboard.jsx - Admin dashboard with key stats and recent notices
import { useEffect, useState } from 'react';
import { Users, UserCheck, School, DollarSign, CalendarDays, Bell, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, StatCard, Card } from '../../components/ui.jsx';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current academic year first
        const ayRes = await api.get(API.ACADEMIC_YEARS.CURRENT);
        const ayId = ayRes.data?._id;

        const [overviewRes, noticesRes] = await Promise.all([
          api.get(`${API.REPORTS.OVERVIEW}?academicYear=${ayId}`),
          api.get(`${API.NOTICES.BASE}?academicYear=${ayId}`),
        ]);

        setOverview(overviewRes.data);
        setNotices(noticesRes.data?.slice(0, 5) || []);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const stats = overview?.students;
  const fees = overview?.fees;
  const employees = overview?.employees;

  return (
    <PageContent>
      <PageHeader title="Dashboard" subtitle="School management overview" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students" value={stats?.total} icon={Users} color="indigo" trend={`${stats?.approved} approved`} />
        <StatCard label="Active Employees" value={employees?.active} icon={UserCheck} color="emerald" trend={`${employees?.total} total`} />
        <StatCard label="Fee Collected" value={fees?.collected ? `₹${(fees.collected / 1000).toFixed(0)}K` : '—'} icon={DollarSign} color="amber" trend="This year" />
        <StatCard label="Pending Leaves" value={overview?.leaves?.pending} icon={CalendarDays} color="rose" trend="Awaiting action" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Under Review Students */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" /> Student Status
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Approved', value: stats?.approved, color: 'bg-emerald-500' },
              { label: 'Under Review', value: stats?.underReview, color: 'bg-amber-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{item.label}</span>
                  <span className="text-white">{item.value}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full`}
                    style={{ width: `${stats?.total ? (item.value / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Notices */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" /> Recent Notices
          </h3>
          {notices.length === 0 ? (
            <p className="text-slate-500 text-sm">No notices yet</p>
          ) : (
            <div className="space-y-3">
              {notices.map((n) => (
                <div key={n._id} className="flex items-start gap-3">
                  <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${n.priority === 'Urgent' ? 'bg-rose-500' :
                    n.priority === 'Important' ? 'bg-amber-500' : 'bg-slate-500'
                    }`} />
                  <div>
                    <p className="text-xs font-medium text-white">{n.title}</p>
                    <p className="text-xs text-slate-500">{n.priority} · {new Date(n.publishDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Fee Summary */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-400" /> Fee Overview
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Total Expected', value: fees?.total, color: 'text-white' },
              { label: 'Collected', value: fees?.collected, color: 'text-emerald-400' },
              { label: 'Pending', value: fees?.pending, color: 'text-rose-400' },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-slate-400">{item.label}</span>
                <span className={`font-semibold ${item.color}`}>
                  ₹{item.value?.toLocaleString() ?? 0}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* School Info */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <School className="w-4 h-4 text-indigo-400" /> Quick Stats
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Active Classes', value: overview?.classes?.total },
              { label: 'Total Employees', value: employees?.total },
              { label: 'Active Employees', value: employees?.active },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-slate-400">{item.label}</span>
                <span className="font-semibold text-white">{item.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContent>
  );
}

// pages/admin/Students.jsx - Student management page for admins
/**
 * STUDENTS PAGE
 * APIs Used:
 *   GET    /api/students         — list with filters
 *   GET    /api/students/:id     — detail
 *   POST   /api/students         — create (admission)
 *   PUT    /api/students/:id     — update
 *   PATCH  /api/students/:id/status — approve/reject/hold
 *   DELETE /api/students/:id     — delete
 *   GET    /api/classrooms       — populate class dropdown
 *   GET    /api/academic-years/current
 */
import { useEffect, useState } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import {
  PageContent, PageHeader, Card, Table, Button, Input, Select,
  studentStatusBadge, Modal, Badge,
} from '../../components/ui.jsx';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'Approved', label: 'Approved' },
  { value: 'UnderReview', label: 'Under Review' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'OnHold', label: 'On Hold' },
  { value: 'Left', label: 'Left' },
];

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Approved');
  const [classFilter, setClassFilter] = useState('');
  const [ayId, setAyId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [actionStudent, setActionStudent] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id || '');
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        setClassrooms(cls.data || []);
      } catch { }
    })();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (classFilter) params.set('classId', classFilter);
      if (ayId) params.set('academicYear', ayId);
      const res = await api.get(`${API.STUDENTS.BASE}?${params}`);
      setStudents(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchStudents(); }, [page, statusFilter, classFilter, ayId]);

  const handleStatusChange = async (studentId, status) => {
    try {
      await api.patch(API.STUDENTS.STATUS(studentId), { status });
      fetchStudents();
      setActionStudent(null);
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student?')) return;
    await api.delete(API.STUDENTS.BY_ID(id));
    fetchStudents();
  };

  const columns = [
    { key: 'admissionNo', label: 'Adm No' },
    {
      key: 'name', label: 'Student',
      render: (s) => (
        <div>
          <p className="font-medium text-white">{s.firstName} {s.lastName}</p>
          <p className="text-xs text-slate-500">{s.gender} · DOB: {new Date(s.dateOfBirth).toLocaleDateString('en-IN')}</p>
        </div>
      ),
    },
    { key: 'classroom', label: 'Class', render: (s) => s.classroom?.displayName || '—' },
    {
      key: 'parent', label: 'Parent',
      render: (s) => (
        <div>
          <p className="text-sm">{s.fatherName}</p>
          <p className="text-xs text-slate-500">{s.fatherPhone}</p>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (s) => studentStatusBadge(s.status) },
    {
      key: 'actions', label: '',
      render: (s) => (
        <div className="flex gap-2">
          {s.status === 'UnderReview' && (
            <>
              <Button size="sm" variant="success" onClick={() => handleStatusChange(s._id, 'Approved')}>Approve</Button>
              <Button size="sm" variant="danger" onClick={() => handleStatusChange(s._id, 'Rejected')}>Reject</Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => handleDelete(s._id)}>Del</Button>
        </div>
      ),
    },
  ];

  const classOptions = [
    { value: '', label: 'All Classes' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];

  return (
    <PageContent>
      <PageHeader
        title="Students"
        subtitle={`${total} students found`}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add Student
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="pl-9 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
          />
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        />
        <Select
          options={classOptions}
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="w-44"
        />
        <Button variant="ghost" onClick={fetchStudents}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <Card className="!p-0">
        <Table columns={columns} data={students} loading={loading} emptyMessage="No students found" />
        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-xs text-slate-500">Page {page}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button size="sm" variant="ghost" disabled={students.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Student Modal */}
      <AddStudentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        classrooms={classrooms}
        ayId={ayId}
        onSuccess={fetchStudents}
      />
    </PageContent>
  );
}

function AddStudentModal({ open, onClose, classrooms, ayId, onSuccess }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', gender: 'Male',
    dateOfBirth: '', classroom: '', fatherName: '',
    fatherPhone: '', academicYear: ayId,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post(API.STUDENTS.BASE, { ...form, academicYear: ayId });
      onSuccess();
      onClose();
      setForm({ firstName: '', lastName: '', gender: 'Male', dateOfBirth: '', classroom: '', fatherName: '', fatherPhone: '', academicYear: ayId });
    } catch (err) {
      alert(err.message);
    } finally { setSaving(false); }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <Modal open={open} onClose={onClose} title="New Student Admission">
      <div className="grid grid-cols-2 gap-4">
        <Input label="First Name *" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Arjun" />
        <Input label="Last Name *" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Gupta" />
        <Select
          label="Gender"
          value={form.gender}
          onChange={e => set('gender', e.target.value)}
          options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]}
        />
        <Input label="Date of Birth *" type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
        <Select
          label="Classroom *"
          value={form.classroom}
          onChange={e => set('classroom', e.target.value)}
          options={[{ value: '', label: 'Select class' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))]}
          className="col-span-2"
        />
        <Input label="Parents Name *" value={form.fatherName} onChange={e => set('fatherName', e.target.value)} placeholder="Anil Gupta" />
        <Input label="Father Phone" value={form.fatherPhone} onChange={e => set('fatherPhone', e.target.value)} placeholder="9999999999" />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Create Admission'}
        </Button>
      </div>
    </Modal>
  );
}
// pages/admin/Reports.jsx
/**
 * REPORTS PAGE (Admin)
 * APIs Used:
 *   GET /api/reports/fee-collection
 *   GET /api/reports/fee-defaulters
 *   GET /api/reports/attendance-summary
 *   GET /api/reports/low-attendance
 *   GET /api/reports/exam-results
 *   GET /api/reports/classwise-students
 *   GET /api/reports/payroll-summary
 */
import { useEffect, useState } from 'react';
import { BarChart3, Users, DollarSign, CheckSquare, FileText, Banknote } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Button, Select, Badge, Table } from '../../components/ui.jsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const REPORT_TYPES = [
  { key: 'classwise', label: 'Class-wise Students', icon: Users },
  { key: 'fee-collection', label: 'Fee Collection', icon: DollarSign },
  { key: 'fee-defaulters', label: 'Fee Defaulters', icon: DollarSign },
  { key: 'attendance', label: 'Low Attendance', icon: CheckSquare },
  { key: 'exam-results', label: 'Exam Results', icon: FileText },
  { key: 'payroll', label: 'Payroll Summary', icon: Banknote },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('classwise');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ayId, setAyId] = useState('');
  const [classrooms, setClassrooms] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        setClassrooms(cls.data || []);
      } catch { }
    })();
  }, []);

  const fetchReport = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      let res;
      const params = new URLSearchParams({ academicYear: ayId });
      switch (activeReport) {
        case 'classwise':
          res = await api.get(`${API.REPORTS.CLASSWISE_STUDENTS}?${params}`);
          break;
        case 'fee-collection':
          params.set('year', year);
          res = await api.get(`${API.REPORTS.FEE_COLLECTION}?${params}`);
          break;
        case 'fee-defaulters':
          if (classFilter) params.set('classId', classFilter);
          params.set('month', month); params.set('year', year);
          res = await api.get(`${API.REPORTS.FEE_DEFAULTERS}?${params}`);
          break;
        case 'attendance':
          if (classFilter) params.set('classId', classFilter);
          params.set('month', month); params.set('year', year);
          res = await api.get(`${API.REPORTS.LOW_ATTENDANCE}?${params}`);
          break;
        case 'exam-results':
          if (classFilter) params.set('classId', classFilter);
          res = await api.get(`${API.REPORTS.EXAM_RESULTS}?${params}`);
          break;
        case 'payroll':
          params.set('month', month); params.set('year', year);
          res = await api.get(`${API.REPORTS.PAYROLL_SUMMARY}?${params}`);
          break;
      }
      setReportData(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchReport(); }, [activeReport, ayId]);

  const classOptions = [{ value: '', label: 'All Classes' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))];
  const monthOptions = MONTHS.map((m, i) => ({ value: i + 1, label: m }));

  return (
    <PageContent>
      <PageHeader title="Reports" subtitle="Analytics and insights" />

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {REPORT_TYPES.map(rt => (
          <button
            key={rt.key}
            onClick={() => { setActiveReport(rt.key); setReportData(null); }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg text-xs font-medium transition border ${activeReport === rt.key
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
          >
            <rt.icon className="w-4 h-4" />
            {rt.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {['fee-defaulters', 'attendance', 'exam-results'].includes(activeReport) && (
          <Select options={classOptions} value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-44" />
        )}
        {['fee-collection', 'fee-defaulters', 'attendance', 'payroll'].includes(activeReport) && (
          <>
            <Select options={monthOptions} value={month} onChange={e => setMonth(e.target.value)} className="w-28" />
            <input type="number" value={year} onChange={e => setYear(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-24" />
          </>
        )}
        <Button onClick={fetchReport} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
      </div>

      {loading && <div className="py-12 text-center text-slate-500">Loading report...</div>}

      {!loading && reportData && (
        <ReportDisplay type={activeReport} data={reportData} />
      )}
    </PageContent>
  );
}

function ReportDisplay({ type, data }) {
  switch (type) {
    case 'classwise': return <ClasswiseReport data={data} />;
    case 'fee-collection': return <FeeCollectionReport data={data} />;
    case 'fee-defaulters': return <FeeDefaultersReport data={data} />;
    case 'attendance': return <AttendanceReport data={data} />;
    case 'exam-results': return <ExamResultsReport data={data} />;
    case 'payroll': return <PayrollReport data={data} />;
    default: return null;
  }
}

function ClasswiseReport({ data }) {
  const columns = [
    { key: 'class', label: 'Class', render: (r) => r._id?.displayName || '—' },
    { key: 'total', label: 'Total' },
    { key: 'approved', label: 'Active', render: (r) => <span className="text-emerald-400">{r.approved}</span> },
    { key: 'underReview', label: 'Under Review', render: (r) => <span className="text-amber-400">{r.underReview}</span> },
    { key: 'boys', label: 'Boys', render: (r) => <span className="text-sky-400">{r.boys}</span> },
    { key: 'girls', label: 'Girls', render: (r) => <span className="text-violet-400">{r.girls}</span> },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No data" />
    </Card>
  );
}

function FeeCollectionReport({ data }) {
  const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const columns = [
    { key: 'month', label: 'Month', render: (r) => MONTHS_FULL[r.month - 1] },
    { key: 'totalExpected', label: 'Expected', render: (r) => `₹${r.totalExpected?.toLocaleString()}` },
    { key: 'totalCollected', label: 'Collected', render: (r) => <span className="text-emerald-400">₹{r.totalCollected?.toLocaleString()}</span> },
    { key: 'totalPending', label: 'Pending', render: (r) => <span className="text-rose-400">₹{r.totalPending?.toLocaleString()}</span> },
    { key: 'collectionRate', label: 'Rate', render: (r) => <span className="text-amber-400">{r.collectionRate}%</span> },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No fee data" />
    </Card>
  );
}

function FeeDefaultersReport({ data }) {
  const columns = [
    { key: 'student', label: 'Student', render: (f) => `${f.student?.firstName} ${f.student?.lastName}` },
    { key: 'admissionNo', label: 'Adm No', render: (f) => f.student?.admissionNo },
    { key: 'classroom', label: 'Class', render: (f) => f.classroom?.displayName },
    { key: 'month', label: 'Period', render: (f) => `${f.month}/${f.year}` },
    { key: 'finalAmount', label: 'Amount', render: (f) => <span className="text-rose-400">₹{f.finalAmount?.toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (f) => <Badge label={f.status} color={f.status === 'Overdue' ? 'red' : 'yellow'} /> },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No defaulters" />
    </Card>
  );
}

function AttendanceReport({ data }) {
  const columns = [
    { key: 'student', label: 'Student', render: (r) => `${r._id?.firstName || ''} ${r._id?.lastName || ''}` },
    { key: 'total', label: 'Total Days' },
    { key: 'present', label: 'Present', render: (r) => <span className="text-emerald-400">{r.present}</span> },
    { key: 'absent', label: 'Absent', render: (r) => <span className="text-rose-400">{r.absent}</span> },
    {
      key: 'percentage', label: 'Attendance %',
      render: (r) => (
        <span className={r.percentage < 75 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>{r.percentage}%</span>
      ),
    },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No attendance data" />
    </Card>
  );
}

function ExamResultsReport({ data }) {
  const columns = [
    { key: 'exam', label: 'Exam', render: (r) => r._id?.exam?.name || '—' },
    { key: 'class', label: 'Class', render: (r) => r._id?.classroom?.displayName || '—' },
    { key: 'totalStudents', label: 'Students' },
    { key: 'averageMarks', label: 'Avg Marks', render: (r) => <span className="text-indigo-400">{r.averageMarks}</span> },
    { key: 'highestMarks', label: 'Highest', render: (r) => <span className="text-emerald-400">{r.highestMarks}</span> },
    { key: 'passCount', label: 'Passed', render: (r) => <span className="text-amber-400">{r.passCount}</span> },
    { key: 'gradeF', label: 'Failed', render: (r) => <span className="text-rose-400">{r.gradeF}</span> },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No exam data" />
    </Card>
  );
}

function PayrollReport({ data }) {
  const s = data.summary || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: s.totalEmployees },
          { label: 'Total Net Salary', value: `₹${s.totalNet?.toLocaleString() || 0}` },
          { label: 'Paid', value: s.paidCount },
          { label: 'Pending', value: s.pendingCount },
        ].map(stat => (
          <Card key={stat.label}>
            <p className="text-xs text-slate-400 uppercase">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value ?? '—'}</p>
          </Card>
        ))}
      </div>
      <Card className="!p-0">
        <Table
          columns={[
            { key: 'employee', label: 'Employee', render: (p) => p.employee?.name },
            { key: 'basicSalary', label: 'Basic', render: (p) => `₹${p.basicSalary?.toLocaleString()}` },
            { key: 'netSalary', label: 'Net', render: (p) => <span className="text-white font-semibold">₹{p.netSalary?.toLocaleString()}</span> },
            { key: 'status', label: 'Status', render: (p) => <Badge label={p.status} color={p.status === 'Paid' ? 'green' : 'yellow'} /> },
          ]}
          data={data.records || []}
          emptyMessage="No payroll records"
        />
      </Card>
    </div>
  );
}

// pages/admin/Classrooms.jsx
/**
 * CLASSROOMS PAGE
 * APIs Used:
 *   GET    /api/classrooms        — list
 *   POST   /api/classrooms        — create
 *   PUT    /api/classrooms/:id    — update
 *   PATCH  /api/classrooms/:id/toggle — activate/deactivate
 *   DELETE /api/classrooms/:id    — delete
 *   GET    /api/employees         — populate teacher dropdown
 *   GET    /api/academic-years/current
 */
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal } from '../../components/ui.jsx';

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editClassroom, setEditClassroom] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const [cls, emps] = await Promise.all([
          api.get(`${API.CLASSROOMS.BASE}?academicYear=${ay.data?._id}`),
          api.get(`${API.EMPLOYEES.BASE}?role=teacher&status=active`),
        ]);
        setClassrooms(cls.data || []);
        setTeachers(emps.data || []);
      } catch { } finally { setLoading(false); }
    })();
  }, []);

  const fetchClassrooms = async () => {
    if (!ayId) return;
    const res = await api.get(`${API.CLASSROOMS.BASE}?academicYear=${ayId}`);
    setClassrooms(res.data || []);
  };

  const handleToggle = async (id) => {
    await api.patch(API.CLASSROOMS.TOGGLE(id));
    fetchClassrooms();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this classroom?')) return;
    await api.delete(API.CLASSROOMS.BY_ID(id));
    fetchClassrooms();
  };

  const columns = [
    { key: 'displayName', label: 'Class Name', render: (c) => <span className="font-semibold text-white">{c.displayName}</span> },
    { key: 'classTeacher', label: 'Class Teacher', render: (c) => c.classTeacher?.name || <span className="text-slate-500">Not assigned</span> },
    { key: 'monthlyFees', label: 'Monthly Fee', render: (c) => <span className="text-amber-400">₹{c.monthlyFees?.toLocaleString()}</span> },
    { key: 'capacity', label: 'Capacity' },
    {
      key: 'isActive', label: 'Status',
      render: (c) => <Badge label={c.isActive ? 'Active' : 'Inactive'} color={c.isActive ? 'green' : 'slate'} />,
    },
    {
      key: 'actions', label: '',
      render: (c) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditClassroom(c)}><Edit2 className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" onClick={() => handleToggle(c._id)}>
            {c.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(c._id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Classrooms"
        subtitle={`${classrooms.length} classes`}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Add Classroom</Button>}
      />
      <Card className="!p-0">
        <Table columns={columns} data={classrooms} loading={loading} emptyMessage="No classrooms found" />
      </Card>

      <ClassroomModal
        open={addOpen || !!editClassroom}
        onClose={() => { setAddOpen(false); setEditClassroom(null); }}
        classroom={editClassroom}
        teachers={teachers}
        ayId={ayId}
        onSuccess={() => { fetchClassrooms(); setAddOpen(false); setEditClassroom(null); }}
      />
    </PageContent>
  );
}

function ClassroomModal({ open, onClose, classroom, teachers, ayId, onSuccess }) {
  const isEdit = !!classroom;
  const [form, setForm] = useState({
    className: '', section: '', displayName: '',
    monthlyFees: '', capacity: 40, classTeacher: '', order: 99,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (classroom) {
      setForm({
        className: classroom.className || '',
        section: classroom.section || '',
        displayName: classroom.displayName || '',
        monthlyFees: classroom.monthlyFees || '',
        capacity: classroom.capacity || 40,
        classTeacher: classroom.classTeacher?._id || '',
        order: classroom.order || 99,
      });
    } else {
      setForm({ className: '', section: '', displayName: '', monthlyFees: '', capacity: 40, classTeacher: '', order: 99 });
    }
  }, [classroom]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, academicYear: ayId };
      if (isEdit) {
        await api.put(API.CLASSROOMS.BY_ID(classroom._id), payload);
      } else {
        await api.post(API.CLASSROOMS.BASE, payload);
      }
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const teacherOptions = [
    { value: '', label: 'No Class Teacher' },
    ...teachers.map(t => ({ value: t._id, label: t.name })),
  ];

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Classroom' : 'Add Classroom'}>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Class Name *" value={form.className} onChange={e => set('className', e.target.value)} placeholder="Class 1" />
        <Input label="Section" value={form.section} onChange={e => set('section', e.target.value)} placeholder="A" />
        <Input label="Display Name *" value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Class 1-A" className="col-span-2" />
        <Input label="Monthly Fees *" type="number" value={form.monthlyFees} onChange={e => set('monthlyFees', e.target.value)} placeholder="2000" />
        <Input label="Capacity" type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)} />
        <Select label="Class Teacher" value={form.classTeacher} onChange={e => set('classTeacher', e.target.value)} options={teacherOptions} className="col-span-2" />
        <Input label="Order (for sorting)" type="number" value={form.order} onChange={e => set('order', e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}</Button>
      </div>
    </Modal>
  );
}
// pages/admin/Subjects.jsx
/**
 * SUBJECTS PAGE
 * APIs Used:
 *   GET    /api/subjects          — list
 *   POST   /api/subjects          — create (single or bulk)
 *   PUT    /api/subjects/:id      — update
 *   PATCH  /api/subjects/:id/toggle — toggle active
 *   DELETE /api/subjects/:id      — delete
 *   GET    /api/classrooms        — populate class dropdown
 *   GET    /api/employees         — populate teacher dropdown
 */
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal } from '../../components/ui.jsx';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editSubject, setEditSubject] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const [cls, emps] = await Promise.all([
          api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`),
          api.get(`${API.EMPLOYEES.BASE}?role=teacher&status=active`),
        ]);
        setClassrooms(cls.data || []);
        setTeachers(emps.data || []);
      } catch { } finally { setLoading(false); }
    })();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set('classId', classFilter);
      if (ayId) params.set('academicYear', ayId);
      const res = await api.get(`${API.SUBJECTS.BASE}?${params}`);
      setSubjects(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchSubjects(); }, [classFilter, ayId]);

  const handleToggle = async (id) => {
    await api.patch(API.SUBJECTS.TOGGLE(id));
    fetchSubjects();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this subject?')) return;
    await api.delete(API.SUBJECTS.BY_ID(id));
    fetchSubjects();
  };

  const classOptions = [
    { value: '', label: 'All Classes' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];

  const columns = [
    { key: 'name', label: 'Subject', render: (s) => <span className="font-medium text-white">{s.name}</span> },
    { key: 'classroom', label: 'Class', render: (s) => s.classroom?.displayName || '—' },
    { key: 'teacher', label: 'Teacher', render: (s) => s.teacher?.name || <span className="text-slate-500">Unassigned</span> },
    { key: 'totalMarks', label: 'Total Marks', render: (s) => <span className="text-indigo-400">{s.totalMarks}</span> },
    {
      key: 'isActive', label: 'Status',
      render: (s) => <Badge label={s.isActive ? 'Active' : 'Inactive'} color={s.isActive ? 'green' : 'slate'} />,
    },
    {
      key: 'actions', label: '',
      render: (s) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditSubject(s)}><Edit2 className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" onClick={() => handleToggle(s._id)}>
            {s.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(s._id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Subjects"
        subtitle={`${subjects.length} subjects`}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Add Subject</Button>}
      />
      <div className="flex gap-3 mb-4">
        <Select options={classOptions} value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-48" />
      </div>
      <Card className="!p-0">
        <Table columns={columns} data={subjects} loading={loading} emptyMessage="No subjects found" />
      </Card>

      <SubjectModal
        open={addOpen || !!editSubject}
        onClose={() => { setAddOpen(false); setEditSubject(null); }}
        subject={editSubject}
        classrooms={classrooms}
        teachers={teachers}
        ayId={ayId}
        onSuccess={() => { fetchSubjects(); setAddOpen(false); setEditSubject(null); }}
      />
    </PageContent>
  );
}

function SubjectModal({ open, onClose, subject, classrooms, teachers, ayId, onSuccess }) {
  const isEdit = !!subject;
  const [form, setForm] = useState({ name: '', classroom: '', teacher: '', totalMarks: 100 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (subject) {
      setForm({
        name: subject.name || '',
        classroom: subject.classroom?._id || '',
        teacher: subject.teacher?._id || '',
        totalMarks: subject.totalMarks || 100,
      });
    } else {
      setForm({ name: '', classroom: '', teacher: '', totalMarks: 100 });
    }
  }, [subject]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, academicYear: ayId };
      if (isEdit) {
        await api.put(API.SUBJECTS.BY_ID(subject._id), payload);
      } else {
        await api.post(API.SUBJECTS.BASE, payload);
      }
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Subject' : 'Add Subject'}>
      <div className="space-y-4">
        <Input label="Subject Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Mathematics" />
        <Select
          label="Classroom *"
          value={form.classroom}
          onChange={e => set('classroom', e.target.value)}
          options={[{ value: '', label: 'Select Class' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))]}
        />
        <Select
          label="Teacher"
          value={form.teacher}
          onChange={e => set('teacher', e.target.value)}
          options={[{ value: '', label: 'No Teacher' }, ...teachers.map(t => ({ value: t._id, label: t.name }))]}
        />
        <Input label="Total Marks" type="number" value={form.totalMarks} onChange={e => set('totalMarks', e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}</Button>
      </div>
    </Modal>
  );
}
// pages/admin/Enquiries.jsx
/**
 * ENQUIRIES PAGE
 * APIs Used:
 *   GET  /api/enquiries   — list with filters
 *   PUT  /api/enquiries/:id — update status/remark
 *   DELETE /api/enquiries/:id — delete
 */
import { useEffect, useState } from 'react';
import { Search, RefreshCw, Eye, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal } from '../../components/ui.jsx';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'New', label: 'New' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'AdmissionDone', label: 'Admission Done' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'PlanningFuture', label: 'Planning Future' },
];

function statusColor(s) {
  const map = { New: 'blue', Contacted: 'yellow', AdmissionDone: 'green', Cancelled: 'red', PlanningFuture: 'purple' };
  return map[s] || 'slate';
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ayId, setAyId] = useState('');
  const [viewEnquiry, setViewEnquiry] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?academicYear=${ay.data?._id}`);
        setClassrooms(cls.data || []);
      } catch { }
    })();
  }, []);

  const fetchEnquiries = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20, academicYear: ayId });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`${API.ENQUIRIES.BASE}?${params}`);
      setEnquiries(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchEnquiries(); }, [page, statusFilter, ayId]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this enquiry?')) return;
    await api.delete(API.ENQUIRIES.BY_ID(id));
    fetchEnquiries();
  };

  const handleUpdateStatus = async (id, status, adminRemark) => {
    await api.put(API.ENQUIRIES.BY_ID(id), { status, adminRemark });
    fetchEnquiries();
    setViewEnquiry(null);
  };

  const columns = [
    { key: 'enquiryId', label: 'ID' },
    {
      key: 'childName', label: 'Child',
      render: (e) => (
        <div>
          <p className="font-medium text-white">{e.childName}</p>
          <p className="text-xs text-slate-500">{e.classApplying?.displayName}</p>
        </div>
      ),
    },
    {
      key: 'father', label: 'Parent',
      render: (e) => (
        <div>
          <p className="text-sm">{e.fatherName}</p>
          <p className="text-xs text-slate-500">{e.mobileNo}</p>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (e) => <Badge label={e.status} color={statusColor(e.status)} /> },
    { key: 'createdAt', label: 'Date', render: (e) => new Date(e.createdAt).toLocaleDateString('en-IN') },
    {
      key: 'actions', label: '',
      render: (e) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setViewEnquiry(e)}><Eye className="w-3 h-3" /></Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(e._id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader title="Enquiries" subtitle={`${total} enquiries`} />
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="pl-9 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search by name, phone..."
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchEnquiries()}
          />
        </div>
        <Select options={STATUS_OPTIONS} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-44" />
        <Button variant="ghost" onClick={fetchEnquiries}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <Card className="!p-0">
        <Table columns={columns} data={enquiries} loading={loading} emptyMessage="No enquiries found" />
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-xs text-slate-500">Page {page}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button size="sm" variant="ghost" disabled={enquiries.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {viewEnquiry && (
        <EnquiryDetailModal
          enquiry={viewEnquiry}
          onClose={() => setViewEnquiry(null)}
          onUpdate={handleUpdateStatus}
        />
      )}
    </PageContent>
  );
}

function EnquiryDetailModal({ enquiry, onClose, onUpdate }) {
  const [status, setStatus] = useState(enquiry.status);
  const [adminRemark, setAdminRemark] = useState(enquiry.adminRemark || '');

  const statusOptions = [
    { value: 'New', label: 'New' },
    { value: 'Contacted', label: 'Contacted' },
    { value: 'AdmissionDone', label: 'Admission Done' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'PlanningFuture', label: 'Planning Future' },
  ];

  const rows = [
    ['Enquiry ID', enquiry.enquiryId],
    ['Child Name', enquiry.childName],
    ['Class Applied', enquiry.classApplying?.displayName],
    ['Gender', enquiry.gender],
    ['Age', enquiry.age],
    ['Date of Birth', new Date(enquiry.dateOfBirth).toLocaleDateString('en-IN')],
    ['Parents Name', enquiry.fatherName],
    ['Phone', enquiry.phoneNo],
    ['Mobile', enquiry.mobileNo],
    ['Email', enquiry.email],
    ['Address', enquiry.residentialAddress],
    ['Remark', enquiry.remark],
  ];

  return (
    <Modal open={true} onClose={onClose} title="Enquiry Details" width="max-w-2xl">
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        {rows.map(([label, value]) => value ? (
          <div key={label} className="col-span-1">
            <span className="text-slate-500">{label}: </span>
            <span className="text-white">{value}</span>
          </div>
        ) : null)}
      </div>
      <div className="border-t border-slate-800 pt-4 space-y-3">
        <Select label="Update Status" options={statusOptions} value={status} onChange={e => setStatus(e.target.value)} />
        <Input label="Admin Remark" value={adminRemark} onChange={e => setAdminRemark(e.target.value)} placeholder="Add a remark..." />
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button onClick={() => onUpdate(enquiry._id, status, adminRemark)}>Update</Button>
      </div>
    </Modal>
  );
}

// pages/admin/Attendance.jsx
/**
 * ATTENDANCE PAGE (Admin)
 * APIs Used:
 *   GET  /api/attendance/students    — list records
 *   POST /api/attendance/students    — bulk save
 *   GET  /api/attendance/employees   — employee records
 *   POST /api/attendance/employees   — bulk save employee
 *   GET  /api/classrooms             — populate class dropdown
 *   GET  /api/students               — student list for marking
 *   GET  /api/employees              — employee list for marking
 */
import { useEffect, useState } from 'react';
import { Save, RefreshCw, Users, UserCheck } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Button, Select, Badge } from '../../components/ui.jsx';

const STUDENT_STATUSES = ['Present', 'Absent', 'Late', 'HalfDay', 'Holiday'];
const EMPLOYEE_STATUSES = ['Present', 'Absent', 'Late', 'HalfDay', 'OnLeave', 'Holiday'];

function statusColor(s) {
  const map = { Present: 'green', Absent: 'red', Late: 'yellow', HalfDay: 'blue', Holiday: 'purple', OnLeave: 'indigo' };
  return map[s] || 'slate';
}

export default function AttendanceAdminPage() {
  const [tab, setTab] = useState('students');
  const [classrooms, setClassrooms] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        setClassrooms(cls.data || []);
      } catch { }
    })();
  }, []);

  const fetchStudentAttendance = async () => {
    if (!classFilter || !ayId) return;
    setLoading(true);
    try {
      // Load students
      const stuRes = await api.get(`${API.STUDENTS.BASE}?classId=${classFilter}&status=Approved&academicYear=${ayId}&limit=100`);
      setStudents(stuRes.data || []);

      // Load existing attendance for the day
      const attRes = await api.get(`${API.ATTENDANCE.STUDENTS}?classId=${classFilter}&date=${date}&academicYear=${ayId}`);
      const existing = {};
      (attRes.data || []).forEach(r => { existing[r.student._id || r.student] = r.status; });
      // Default all to Present if not marked
      const initial = {};
      (stuRes.data || []).forEach(s => { initial[s._id] = existing[s._id] || 'Present'; });
      setAttendance(initial);
    } catch { } finally { setLoading(false); }
  };

  const fetchEmployeeAttendance = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const empRes = await api.get(`${API.EMPLOYEES.BASE}?status=active`);
      setEmployees(empRes.data || []);
      const attRes = await api.get(`${API.ATTENDANCE.EMPLOYEES}?date=${date}&academicYear=${ayId}`);
      const existing = {};
      (attRes.data || []).forEach(r => { existing[r.employee._id || r.employee] = r.status; });
      const initial = {};
      (empRes.data || []).forEach(e => { initial[e._id] = existing[e._id] || 'Present'; });
      setAttendance(initial);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'students') fetchStudentAttendance();
    else fetchEmployeeAttendance();
  }, [tab, classFilter, date, ayId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === 'students') {
        const records = students.map(s => ({
          student: s._id, classroom: classFilter, date, status: attendance[s._id] || 'Present', academicYear: ayId,
        }));
        await api.post(API.ATTENDANCE.STUDENTS, { records });
      } else {
        const records = employees.map(e => ({
          employee: e._id, date, status: attendance[e._id] || 'Present', academicYear: ayId,
        }));
        await api.post(API.ATTENDANCE.EMPLOYEES, { records });
      }
      alert('Attendance saved!');
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const classOptions = [
    { value: '', label: 'Select Class' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];

  const markAll = (status) => {
    const list = tab === 'students' ? students : employees;
    const newAtt = {};
    list.forEach(item => { newAtt[item._id] = status; });
    setAttendance(newAtt);
  };

  return (
    <PageContent>
      <PageHeader title="Attendance" subtitle="Mark and view attendance" />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'students' ? 'primary' : 'ghost'} onClick={() => { setTab('students'); setAttendance({}); }}>
          <Users className="w-4 h-4" /> Students
        </Button>
        <Button variant={tab === 'employees' ? 'primary' : 'ghost'} onClick={() => { setTab('employees'); setAttendance({}); }}>
          <UserCheck className="w-4 h-4" /> Employees
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        {tab === 'students' && (
          <Select options={classOptions} value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-44" label="Class" />
        )}
        <Button variant="ghost" onClick={tab === 'students' ? fetchStudentAttendance : fetchEmployeeAttendance}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        <div className="flex gap-2 ml-auto">
          {['Present', 'Absent', 'Holiday'].map(s => (
            <Button key={s} size="sm" variant="ghost" onClick={() => markAll(s)}>All {s}</Button>
          ))}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      <Card className="!p-0">
        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">#</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Name</th>
                  {tab === 'students' && <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Roll No</th>}
                  {tab === 'employees' && <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Role</th>}
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {(tab === 'students' ? students : employees).map((item, i) => (
                  <tr key={item._id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-400">{i + 1}</td>
                    <td className="py-3 px-4 text-white font-medium">
                      {tab === 'students' ? `${item.firstName} ${item.lastName}` : item.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {tab === 'students' ? item.rollNumber : item.role}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(tab === 'students' ? STUDENT_STATUSES : EMPLOYEE_STATUSES).map(s => (
                          <button key={s}
                            onClick={() => setAttendance(prev => ({ ...prev, [item._id]: s }))}
                            className={`px-2 py-1 rounded text-xs font-medium transition border ${attendance[item._id] === s
                              ? `border-transparent ${s === 'Present' ? 'bg-emerald-600 text-white' : s === 'Absent' ? 'bg-rose-600 text-white' : s === 'Late' ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white'}`
                              : 'border-slate-700 text-slate-400 hover:border-slate-500'
                              }`}
                          >{s}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {(tab === 'students' ? students : employees).length === 0 && (
                  <tr><td colSpan={4} className="py-12 text-center text-slate-500">
                    {tab === 'students' ? 'Select a class to mark attendance' : 'No employees found'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContent>
  );
}

// pages/admin/Exams.jsx
/**
 * EXAMS PAGE (Admin)
 * APIs Used:
 *   GET    /api/exams              — list exams
 *   POST   /api/exams              — create exam
 *   PUT    /api/exams/:id          — update
 *   DELETE /api/exams/:id          — delete
 *   GET    /api/exams/:id/marks    — marks for exam
 *   POST   /api/exams/:id/marks    — bulk save marks
 *   GET    /api/classrooms         — dropdown
 *   GET    /api/subjects           — filtered by class
 *   GET    /api/students           — for marks entry
 */
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ClipboardList } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal } from '../../components/ui.jsx';

const EXAM_TYPES = ['UnitTest1', 'UnitTest2', 'MidTerm', 'FinalExam', 'Project', 'Other'];

export default function ExamsAdminPage() {
  const [exams, setExams] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [marksExam, setMarksExam] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        setClassrooms(cls.data || []);
      } catch { }
    })();
  }, []);

  const fetchExams = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ academicYear: ayId });
      if (classFilter) params.set('classId', classFilter);
      const res = await api.get(`${API.EXAMS.BASE}?${params}`);
      setExams(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchExams(); }, [classFilter, ayId]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam and all marks?')) return;
    await api.delete(API.EXAMS.BY_ID(id));
    fetchExams();
  };

  const classOptions = [
    { value: '', label: 'All Classes' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];

  const columns = [
    { key: 'name', label: 'Exam', render: (e) => <span className="font-medium text-white">{e.name}</span> },
    { key: 'examType', label: 'Type', render: (e) => <Badge label={e.examType} color="indigo" /> },
    { key: 'classroom', label: 'Class', render: (e) => e.classroom?.displayName || '—' },
    { key: 'subject', label: 'Subject', render: (e) => e.subject?.name || '—' },
    { key: 'totalMarks', label: 'Total Marks', render: (e) => <span className="text-amber-400">{e.totalMarks}</span> },
    { key: 'examDate', label: 'Date', render: (e) => new Date(e.examDate).toLocaleDateString('en-IN') },
    {
      key: 'actions', label: '',
      render: (e) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setMarksExam(e)}>
            <ClipboardList className="w-3 h-3 mr-1" /> Marks
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(e._id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Exams & Marks"
        subtitle={`${exams.length} exams`}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Create Exam</Button>}
      />
      <div className="flex gap-3 mb-4">
        <Select options={classOptions} value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-48" />
      </div>
      <Card className="!p-0">
        <Table columns={columns} data={exams} loading={loading} emptyMessage="No exams found" />
      </Card>

      <ExamModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        classrooms={classrooms}
        ayId={ayId}
        onSuccess={() => { fetchExams(); setAddOpen(false); }}
      />

      {marksExam && (
        <MarksModal exam={marksExam} onClose={() => setMarksExam(null)} ayId={ayId} />
      )}
    </PageContent>
  );
}

function ExamModal({ open, onClose, classrooms, ayId, onSuccess }) {
  const [form, setForm] = useState({ name: '', examType: 'UnitTest1', classroom: '', subject: '', totalMarks: '', examDate: '', description: '' });
  const [subjects, setSubjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClassChange = async (classId) => {
    set('classroom', classId);
    set('subject', '');
    if (classId) {
      try {
        const res = await api.get(`${API.SUBJECTS.BASE}?classId=${classId}&isActive=true`);
        setSubjects(res.data || []);
      } catch { }
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post(API.EXAMS.BASE, { ...form, academicYear: ayId });
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Exam">
      <div className="space-y-4">
        <Input label="Exam Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Unit Test 1" />
        <Select label="Exam Type *" value={form.examType} onChange={e => set('examType', e.target.value)}
          options={EXAM_TYPES.map(t => ({ value: t, label: t }))} />
        <Select label="Class *" value={form.classroom} onChange={e => handleClassChange(e.target.value)}
          options={[{ value: '', label: 'Select Class' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))]} />
        <Select label="Subject *" value={form.subject} onChange={e => set('subject', e.target.value)}
          options={[{ value: '', label: 'Select Subject' }, ...subjects.map(s => ({ value: s._id, label: s.name }))]} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Total Marks *" type="number" value={form.totalMarks} onChange={e => set('totalMarks', e.target.value)} placeholder="25" />
          <Input label="Exam Date *" type="date" value={form.examDate} onChange={e => set('examDate', e.target.value)} />
        </div>
        <Input label="Description" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional notes" />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Create Exam'}</Button>
      </div>
    </Modal>
  );
}

function MarksModal({ exam, onClose, ayId }) {
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [absent, setAbsent] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [stuRes, marksRes] = await Promise.all([
          api.get(`${API.STUDENTS.BASE}?classId=${exam.classroom?._id || exam.classroom}&status=Approved&academicYear=${ayId}&limit=100`),
          api.get(API.EXAMS.MARKS(exam._id)),
        ]);
        const stuList = stuRes.data || [];
        setStudents(stuList);
        const mMap = {}, aMap = {};
        (marksRes.data || []).forEach(m => {
          mMap[m.student._id || m.student] = m.marksObtained;
          aMap[m.student._id || m.student] = m.isAbsent;
        });
        setMarks(mMap);
        setAbsent(aMap);
      } catch { }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const marksArr = students.map(s => ({
        student: s._id,
        marksObtained: absent[s._id] ? 0 : Number(marks[s._id] || 0),
        isAbsent: absent[s._id] || false,
      }));
      await api.post(API.EXAMS.MARKS(exam._id), { marks: marksArr });
      alert('Marks saved!');
      onClose();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Marks — ${exam.name} (Total: ${exam.totalMarks})`} width="max-w-2xl">
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="border-b border-slate-800">
              <th className="text-left py-2 px-3 text-xs text-slate-400">Student</th>
              <th className="text-left py-2 px-3 text-xs text-slate-400">Marks (/{exam.totalMarks})</th>
              <th className="text-left py-2 px-3 text-xs text-slate-400">Absent</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s._id} className="border-b border-slate-800/50">
                <td className="py-2 px-3 text-white">{s.firstName} {s.lastName} <span className="text-slate-500 text-xs">({s.rollNumber})</span></td>
                <td className="py-2 px-3">
                  <input
                    type="number" min={0} max={exam.totalMarks}
                    disabled={absent[s._id]}
                    value={marks[s._id] ?? ''}
                    onChange={e => setMarks(prev => ({ ...prev, [s._id]: e.target.value }))}
                    className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40"
                  />
                </td>
                <td className="py-2 px-3">
                  <input type="checkbox" checked={absent[s._id] || false}
                    onChange={e => setAbsent(prev => ({ ...prev, [s._id]: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Marks'}</Button>
      </div>
    </Modal>
  );
}
// pages/admin/Fees.jsx
/**
 * FEES PAGE (Admin)
 * APIs Used:
 *   GET  /api/fees              — list
 *   POST /api/fees              — generate fee record
 *   POST /api/fees/:id/pay      — collect payment
 *   GET  /api/fees/:id/payments — payment history
 *   GET  /api/fees/receipts/all — all receipts
 *   GET  /api/classrooms        — dropdown
 *   GET  /api/students          — dropdown
 */
import { useEffect, useState } from 'react';
import { Plus, DollarSign, RefreshCw, Eye } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Input, Select, feeStatusBadge, Modal } from '../../components/ui.jsx';

const MONTHS = [
  { value: '', label: 'All Months' },
  ...['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    .map((m, i) => ({ value: i + 1, label: m })),
];

export default function FeesPage() {
  const [fees, setFees] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [payFee, setPayFee] = useState(null);
  const [viewPayments, setViewPayments] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        setClassrooms(cls.data || []);
      } catch { }
    })();
  }, []);

  const fetchFees = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ academicYear: ayId });
      if (classFilter) params.set('classId', classFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (monthFilter) params.set('month', monthFilter);
      const res = await api.get(`${API.FEES.BASE}?${params}`);
      setFees(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchFees(); }, [classFilter, statusFilter, monthFilter, ayId]);

  const classOptions = [{ value: '', label: 'All Classes' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))];
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Paid', label: 'Paid' },
    { value: 'Overdue', label: 'Overdue' },
    { value: 'PartiallyPaid', label: 'Partially Paid' },
  ];

  const monthName = (m) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] || m;

  const columns = [
    {
      key: 'student', label: 'Student',
      render: (f) => (
        <div>
          <p className="font-medium text-white">{f.student?.firstName} {f.student?.lastName}</p>
          <p className="text-xs text-slate-500">{f.student?.admissionNo}</p>
        </div>
      ),
    },
    { key: 'classroom', label: 'Class', render: (f) => f.classroom?.displayName || '—' },
    { key: 'period', label: 'Period', render: (f) => `${monthName(f.month)} ${f.year}` },
    { key: 'finalAmount', label: 'Amount', render: (f) => <span className="text-amber-400">₹{f.finalAmount?.toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (f) => feeStatusBadge(f.status) },
    { key: 'dueDate', label: 'Due Date', render: (f) => new Date(f.dueDate).toLocaleDateString('en-IN') },
    {
      key: 'actions', label: '',
      render: (f) => (
        <div className="flex gap-2">
          {f.status !== 'Paid' && (
            <Button size="sm" variant="success" onClick={() => setPayFee(f)}>
              <DollarSign className="w-3 h-3 mr-1" /> Collect
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setViewPayments(f)}>
            <Eye className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Fees"
        subtitle={`${fees.length} records`}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Generate Fee</Button>}
      />
      <div className="flex flex-wrap gap-3 mb-4">
        <Select options={classOptions} value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-44" />
        <Select options={statusOptions} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-40" />
        <Select options={MONTHS} value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-36" />
        <Button variant="ghost" onClick={fetchFees}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <Card className="!p-0">
        <Table columns={columns} data={fees} loading={loading} emptyMessage="No fee records" />
      </Card>

      <GenerateFeeModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        classrooms={classrooms}
        ayId={ayId}
        onSuccess={() => { fetchFees(); setAddOpen(false); }}
      />

      {payFee && (
        <CollectPaymentModal
          fee={payFee}
          onClose={() => setPayFee(null)}
          onSuccess={() => { fetchFees(); setPayFee(null); }}
        />
      )}

      {viewPayments && (
        <PaymentHistoryModal fee={viewPayments} onClose={() => setViewPayments(null)} />
      )}
    </PageContent>
  );
}

function GenerateFeeModal({ open, onClose, classrooms, ayId, onSuccess }) {
  const [form, setForm] = useState({ student: '', classroom: '', month: '', year: new Date().getFullYear(), tuitionFee: '', transportFee: 0, activityFee: 0, otherFee: 0, discount: 0, dueDate: '' });
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClassChange = async (classId) => {
    set('classroom', classId);
    set('student', '');
    if (classId) {
      const cls = classrooms.find(c => c._id === classId);
      if (cls) set('tuitionFee', cls.monthlyFees);
      try {
        const res = await api.get(`${API.STUDENTS.BASE}?classId=${classId}&status=Approved&academicYear=${ayId}&limit=100`);
        setStudents(res.data || []);
      } catch { }
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post(API.FEES.BASE, { ...form, academicYear: ayId });
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const monthOptions = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    .map((m, i) => ({ value: i + 1, label: m }));

  return (
    <Modal open={open} onClose={onClose} title="Generate Fee Record">
      <div className="space-y-3">
        <Select label="Class *" value={form.classroom} onChange={e => handleClassChange(e.target.value)}
          options={[{ value: '', label: 'Select Class' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))]} />
        <Select label="Student *" value={form.student} onChange={e => set('student', e.target.value)}
          options={[{ value: '', label: 'Select Student' }, ...students.map(s => ({ value: s._id, label: `${s.firstName} ${s.lastName}` }))]} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Month *" value={form.month} onChange={e => set('month', e.target.value)} options={[{ value: '', label: 'Month' }, ...monthOptions]} />
          <Input label="Year *" type="number" value={form.year} onChange={e => set('year', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Tuition Fee *" type="number" value={form.tuitionFee} onChange={e => set('tuitionFee', e.target.value)} />
          <Input label="Transport Fee" type="number" value={form.transportFee} onChange={e => set('transportFee', e.target.value)} />
          <Input label="Activity Fee" type="number" value={form.activityFee} onChange={e => set('activityFee', e.target.value)} />
          <Input label="Other Fee" type="number" value={form.otherFee} onChange={e => set('otherFee', e.target.value)} />
          <Input label="Discount" type="number" value={form.discount} onChange={e => set('discount', e.target.value)} />
          <Input label="Due Date *" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Generate'}</Button>
      </div>
    </Modal>
  );
}

function CollectPaymentModal({ fee, onClose, onSuccess }) {
  const [form, setForm] = useState({ amountPaid: fee.finalAmount, paymentMode: 'Cash', transactionId: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await api.post(API.FEES.PAY(fee._id), form);
      alert(`Payment recorded! Receipt: ${res.data?.receiptNo}`);
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title="Collect Payment">
      <div className="mb-4 p-3 bg-slate-800 rounded-lg text-sm">
        <p className="text-white">{fee.student?.firstName} {fee.student?.lastName}</p>
        <p className="text-slate-400">Due: ₹{fee.finalAmount?.toLocaleString()}</p>
      </div>
      <div className="space-y-3">
        <Input label="Amount *" type="number" value={form.amountPaid} onChange={e => set('amountPaid', e.target.value)} />
        <Select label="Payment Mode *" value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)}
          options={['Cash', 'Cheque', 'Online', 'UPI', 'BankTransfer'].map(m => ({ value: m, label: m }))} />
        <Input label="Transaction ID" value={form.transactionId} onChange={e => set('transactionId', e.target.value)} placeholder="Optional" />
        <Input label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Processing...' : 'Collect Payment'}</Button>
      </div>
    </Modal>
  );
}

function PaymentHistoryModal({ fee, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(API.FEES.PAYMENTS(fee._id))
      .then(res => setPayments(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Modal open={true} onClose={onClose} title="Payment History">
      {loading ? <p className="text-slate-500 text-sm">Loading...</p> : payments.length === 0 ? (
        <p className="text-slate-500 text-sm">No payments recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {payments.map(p => (
            <div key={p._id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div>
                <p className="text-white text-sm font-medium">{p.receiptNo}</p>
                <p className="text-xs text-slate-500">{p.paymentMode} · {new Date(p.paymentDate).toLocaleDateString('en-IN')}</p>
              </div>
              <span className="text-emerald-400 font-semibold">₹{p.amountPaid?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-4">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

// pages/admin/Payroll.jsx
/**
 * PAYROLL PAGE
 * APIs Used:
 *   GET   /api/payroll          — list
 *   POST  /api/payroll          — generate
 *   PATCH /api/payroll/:id/pay  — mark paid
 *   GET   /api/employees        — dropdown
 */
import { useEffect, useState } from 'react';
import { Plus, CheckCircle, RefreshCw } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal } from '../../components/ui.jsx';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function PayrollPage() {
  const [payroll, setPayroll] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
      setAyId(ay.data?._id);
    })();
  }, []);

  const fetchPayroll = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: monthFilter, year: yearFilter, academicYear: ayId });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`${API.PAYROLL.BASE}?${params}`);
      setPayroll(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchPayroll(); }, [monthFilter, yearFilter, statusFilter, ayId]);

  const handlePay = async (id) => {
    await api.patch(API.PAYROLL.PAY(id));
    fetchPayroll();
  };

  const monthOptions = MONTHS.map((m, i) => ({ value: i + 1, label: m }));
  const statusOptions = [{ value: '', label: 'All' }, { value: 'Pending', label: 'Pending' }, { value: 'Paid', label: 'Paid' }];

  const columns = [
    {
      key: 'employee', label: 'Employee',
      render: (p) => (
        <div>
          <p className="font-medium text-white">{p.employee?.name}</p>
          <p className="text-xs text-slate-500">{p.employee?.employeeId} · {p.employee?.role}</p>
        </div>
      ),
    },
    { key: 'basicSalary', label: 'Basic', render: (p) => `₹${p.basicSalary?.toLocaleString()}` },
    { key: 'daysPresent', label: 'Present', render: (p) => <span className="text-emerald-400">{p.daysPresent}</span> },
    { key: 'deductions', label: 'Deductions', render: (p) => <span className="text-rose-400">-₹{p.deductions?.toLocaleString()}</span> },
    { key: 'bonus', label: 'Bonus', render: (p) => p.bonus > 0 ? <span className="text-sky-400">+₹{p.bonus?.toLocaleString()}</span> : '—' },
    { key: 'netSalary', label: 'Net Salary', render: (p) => <span className="text-white font-semibold">₹{p.netSalary?.toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (p) => <Badge label={p.status} color={p.status === 'Paid' ? 'green' : 'yellow'} /> },
    {
      key: 'actions', label: '',
      render: (p) => p.status !== 'Paid' && (
        <Button size="sm" variant="success" onClick={() => handlePay(p._id)}>
          <CheckCircle className="w-3 h-3 mr-1" /> Mark Paid
        </Button>
      ),
    },
  ];

  const total = payroll.reduce((s, p) => s + (p.netSalary || 0), 0);
  const paid = payroll.filter(p => p.status === 'Paid').reduce((s, p) => s + (p.netSalary || 0), 0);

  return (
    <PageContent>
      <PageHeader
        title="Payroll"
        subtitle={`${MONTHS[monthFilter - 1]} ${yearFilter}`}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Generate Payroll</Button>}
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Payable', value: `₹${total.toLocaleString()}`, color: 'text-white' },
          { label: 'Paid', value: `₹${paid.toLocaleString()}`, color: 'text-emerald-400' },
          { label: 'Pending', value: `₹${(total - paid).toLocaleString()}`, color: 'text-rose-400' },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <Select options={monthOptions} value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-36" />
        <input type="number" value={yearFilter} onChange={e => setYearFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-24" />
        <Select options={statusOptions} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-32" />
        <Button variant="ghost" onClick={fetchPayroll}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <Card className="!p-0">
        <Table columns={columns} data={payroll} loading={loading} emptyMessage="No payroll records for this period" />
      </Card>

      <GeneratePayrollModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        ayId={ayId}
        onSuccess={() => { fetchPayroll(); setAddOpen(false); }}
      />
    </PageContent>
  );
}

function GeneratePayrollModal({ open, onClose, ayId, onSuccess }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employee: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), daysPresent: 24, bonus: 0, paymentMode: 'BankTransfer' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) {
      api.get(`${API.EMPLOYEES.BASE}?status=active`).then(res => setEmployees(res.data || [])).catch(() => { });
    }
  }, [open]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post(API.PAYROLL.BASE, { ...form, academicYear: ayId });
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const monthOptions = MONTHS.map((m, i) => ({ value: i + 1, label: m }));

  return (
    <Modal open={open} onClose={onClose} title="Generate Payroll">
      <div className="space-y-3">
        <Select label="Employee *" value={form.employee} onChange={e => set('employee', e.target.value)}
          options={[{ value: '', label: 'Select Employee' }, ...employees.map(e => ({ value: e._id, label: `${e.name} (₹${e.monthlySalary?.toLocaleString()})` }))]} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Month *" value={form.month} onChange={e => set('month', e.target.value)} options={monthOptions} />
          <Input label="Year *" type="number" value={form.year} onChange={e => set('year', e.target.value)} />
          <Input label="Days Present (of 26)" type="number" value={form.daysPresent} onChange={e => set('daysPresent', e.target.value)} />
          <Input label="Bonus (₹)" type="number" value={form.bonus} onChange={e => set('bonus', e.target.value)} />
        </div>
        <Select label="Payment Mode" value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)}
          options={['Cash', 'BankTransfer', 'Cheque'].map(m => ({ value: m, label: m }))} />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Generating...' : 'Generate'}</Button>
      </div>
    </Modal>
  );
}

// pages/admin/Leaves.jsx
/**
 * LEAVES PAGE (Admin)
 * APIs Used:
 *   GET   /api/leaves              — list
 *   PATCH /api/leaves/:id/action   — approve/reject
 */
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Select, leaveStatusBadge, Badge, Modal } from '../../components/ui.jsx';

export default function LeavesAdminPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [ayId, setAyId] = useState('');
  const [actionLeave, setActionLeave] = useState(null);

  useEffect(() => {
    (async () => {
      const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
      setAyId(ay.data?._id);
    })();
  }, []);

  const fetchLeaves = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ academicYear: ayId });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`${API.LEAVES.BASE}?${params}`);
      setLeaves(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchLeaves(); }, [statusFilter, ayId]);

  const handleAction = async (id, status, remark = '') => {
    try {
      await api.patch(API.LEAVES.ACTION(id), { status, approvalRemark: remark });
      fetchLeaves();
      setActionLeave(null);
    } catch (err) { alert(err.message); }
  };

  const statusOptions = [
    { value: '', label: 'All' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  const columns = [
    {
      key: 'employee', label: 'Employee',
      render: (l) => (
        <div>
          <p className="font-medium text-white">{l.employee?.name}</p>
          <p className="text-xs text-slate-500">{l.employee?.role}</p>
        </div>
      ),
    },
    { key: 'leaveType', label: 'Type', render: (l) => <Badge label={l.leaveType} color="indigo" /> },
    {
      key: 'dates', label: 'Duration',
      render: (l) => (
        <div>
          <p className="text-sm text-white">{new Date(l.fromDate).toLocaleDateString('en-IN')} — {new Date(l.toDate).toLocaleDateString('en-IN')}</p>
          <p className="text-xs text-slate-500">{l.totalDays} day(s)</p>
        </div>
      ),
    },
    { key: 'reason', label: 'Reason', render: (l) => <span className="text-slate-300 text-sm">{l.reason}</span> },
    { key: 'status', label: 'Status', render: (l) => leaveStatusBadge(l.status) },
    {
      key: 'actions', label: '',
      render: (l) => l.status === 'Pending' && (
        <div className="flex gap-2">
          <Button size="sm" variant="success" onClick={() => handleAction(l._id, 'Approved')}>
            <CheckCircle className="w-3 h-3 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="danger" onClick={() => setActionLeave({ ...l, actionType: 'Rejected' })}>
            <XCircle className="w-3 h-3 mr-1" /> Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader title="Leave Management" subtitle={`${leaves.length} leaves`} />
      <div className="flex gap-3 mb-4">
        <Select options={statusOptions} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-36" />
        <Button variant="ghost" onClick={fetchLeaves}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <Card className="!p-0">
        <Table columns={columns} data={leaves} loading={loading} emptyMessage="No leave applications" />
      </Card>

      {actionLeave && (
        <RejectModal leave={actionLeave} onClose={() => setActionLeave(null)} onAction={handleAction} />
      )}
    </PageContent>
  );
}

function RejectModal({ leave, onClose, onAction }) {
  const [remark, setRemark] = useState('');
  return (
    <Modal open={true} onClose={onClose} title="Reject Leave">
      <p className="text-slate-400 text-sm mb-4">Rejecting leave for <span className="text-white">{leave.employee?.name}</span></p>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Rejection Remark</label>
        <textarea
          value={remark}
          onChange={e => setRemark(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          rows={3}
          placeholder="Optional reason..."
        />
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={() => onAction(leave._id, 'Rejected', remark)}>Reject Leave</Button>
      </div>
    </Modal>
  );
}

// pages/admin/Notices.jsx
/**
 * NOTICES PAGE (Admin)
 * APIs Used:
 *   GET    /api/notices        — list
 *   POST   /api/notices        — create
 *   PUT    /api/notices/:id    — update
 *   DELETE /api/notices/:id    — delete
 */
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal } from '../../components/ui.jsx';

function priorityColor(p) {
  return { Urgent: 'red', Important: 'yellow', Normal: 'slate' }[p] || 'slate';
}

export default function NoticesAdminPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ayId, setAyId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editNotice, setEditNotice] = useState(null);

  useEffect(() => {
    (async () => {
      const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
      setAyId(ay.data?._id);
    })();
  }, []);

  const fetchNotices = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const res = await api.get(`${API.NOTICES.BASE}?academicYear=${ayId}`);
      setNotices(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchNotices(); }, [ayId]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this notice?')) return;
    await api.delete(API.NOTICES.BY_ID(id));
    fetchNotices();
  };

  const columns = [
    {
      key: 'title', label: 'Title',
      render: (n) => (
        <div>
          <p className="font-medium text-white">{n.title}</p>
          <p className="text-xs text-slate-500 line-clamp-1">{n.content}</p>
        </div>
      ),
    },
    { key: 'priority', label: 'Priority', render: (n) => <Badge label={n.priority} color={priorityColor(n.priority)} /> },
    { key: 'targetRoles', label: 'Audience', render: (n) => (n.targetRoles || []).map(r => <Badge key={r} label={r} color="indigo" className="mr-1" />) },
    { key: 'publishDate', label: 'Published', render: (n) => new Date(n.publishDate).toLocaleDateString('en-IN') },
    { key: 'createdBy', label: 'By', render: (n) => n.createdBy?.name || '—' },
    {
      key: 'actions', label: '',
      render: (n) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditNotice(n)}><Edit2 className="w-3 h-3" /></Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(n._id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Notices"
        subtitle={`${notices.length} notices`}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Publish Notice</Button>}
      />
      <Card className="!p-0">
        <Table columns={columns} data={notices} loading={loading} emptyMessage="No notices" />
      </Card>

      <NoticeModal
        open={addOpen || !!editNotice}
        onClose={() => { setAddOpen(false); setEditNotice(null); }}
        notice={editNotice}
        ayId={ayId}
        onSuccess={() => { fetchNotices(); setAddOpen(false); setEditNotice(null); }}
      />
    </PageContent>
  );
}

function NoticeModal({ open, onClose, notice, ayId, onSuccess }) {
  const isEdit = !!notice;
  const [form, setForm] = useState({ title: '', content: '', priority: 'Normal', targetRoles: ['parent', 'teacher'], publishDate: new Date().toISOString().split('T')[0], expiryDate: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (notice) {
      setForm({
        title: notice.title || '',
        content: notice.content || '',
        priority: notice.priority || 'Normal',
        targetRoles: notice.targetRoles || ['parent', 'teacher'],
        publishDate: notice.publishDate ? notice.publishDate.split('T')[0] : new Date().toISOString().split('T')[0],
        expiryDate: notice.expiryDate ? notice.expiryDate.split('T')[0] : '',
      });
    } else {
      setForm({ title: '', content: '', priority: 'Normal', targetRoles: ['parent', 'teacher'], publishDate: new Date().toISOString().split('T')[0], expiryDate: '' });
    }
  }, [notice]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleRole = (role) => {
    setForm(f => ({
      ...f,
      targetRoles: f.targetRoles.includes(role)
        ? f.targetRoles.filter(r => r !== role)
        : [...f.targetRoles, role],
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(API.NOTICES.BY_ID(notice._id), { ...form, academicYear: ayId });
      } else {
        await api.post(API.NOTICES.BASE, { ...form, academicYear: ayId });
      }
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Notice' : 'Publish Notice'}>
      <div className="space-y-4">
        <Input label="Title *" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Notice title..." />
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Content *</label>
          <textarea
            value={form.content}
            onChange={e => set('content', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={4}
            placeholder="Notice content..."
          />
        </div>
        <Select label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)}
          options={['Normal', 'Important', 'Urgent'].map(p => ({ value: p, label: p }))} />
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Target Audience</label>
          <div className="flex gap-3">
            {['parent', 'teacher', 'admin'].map(role => (
              <label key={role} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.targetRoles.includes(role)} onChange={() => toggleRole(role)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800" />
                <span className="text-sm text-slate-300 capitalize">{role}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Publish Date" type="date" value={form.publishDate} onChange={e => set('publishDate', e.target.value)} />
          <Input label="Expiry Date" type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Publish'}</Button>
      </div>
    </Modal>
  );
}

// pages/admin/Timetable.jsx
/**
 * TIMETABLE PAGE (Admin)
 * APIs Used:
 *   GET  /api/timetable/:classId  — get timetable for class
 *   POST /api/timetable           — save/replace timetable
 *   GET  /api/classrooms          — dropdown
 *   GET  /api/subjects            — by class
 *   GET  /api/employees           — teachers dropdown
 */
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Button, Select } from '../../components/ui.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_PERIODS = 8;

function emptySchedule() {
  return DAYS.map(day => ({
    day,
    periods: Array.from({ length: DEFAULT_PERIODS }, (_, i) => ({
      periodNo: i + 1,
      startTime: '',
      endTime: '',
      subject: '',
      teacher: '',
    })),
  }));
}

export default function TimetableAdminPage() {
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [ayId, setAyId] = useState('');
  const [schedule, setSchedule] = useState(emptySchedule());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const [cls, emps] = await Promise.all([
          api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`),
          api.get(`${API.EMPLOYEES.BASE}?role=teacher&status=active`),
        ]);
        setClassrooms(cls.data || []);
        setTeachers(emps.data || []);
      } catch { }
    })();
  }, []);

  const handleClassChange = async (classId) => {
    setClassFilter(classId);
    if (!classId) { setSchedule(emptySchedule()); return; }
    setLoading(true);
    try {
      const [subRes, ttRes] = await Promise.all([
        api.get(`${API.SUBJECTS.BASE}?classId=${classId}&isActive=true`),
        api.get(`${API.TIMETABLE.BY_CLASS(classId)}?academicYear=${ayId}`).catch(() => null),
      ]);
      setSubjects(subRes.data || []);
      if (ttRes?.data?.schedule?.length) {
        // Merge with default structure
        const loaded = DAYS.map(day => {
          const existing = ttRes.data.schedule.find(s => s.day === day);
          const periods = Array.from({ length: DEFAULT_PERIODS }, (_, i) => {
            const ep = existing?.periods?.find(p => p.periodNo === i + 1);
            return ep ? {
              periodNo: i + 1,
              startTime: ep.startTime || '',
              endTime: ep.endTime || '',
              subject: ep.subject?._id || ep.subject || '',
              teacher: ep.teacher?._id || ep.teacher || '',
            } : { periodNo: i + 1, startTime: '', endTime: '', subject: '', teacher: '' };
          });
          return { day, periods };
        });
        setSchedule(loaded);
      } else {
        setSchedule(emptySchedule());
      }
    } catch { } finally { setLoading(false); }
  };

  const updatePeriod = (dayIdx, periodIdx, field, value) => {
    setSchedule(prev => {
      const next = prev.map((d, di) => di === dayIdx ? {
        ...d,
        periods: d.periods.map((p, pi) => pi === periodIdx ? { ...p, [field]: value } : p),
      } : d);
      return next;
    });
  };

  const handleSave = async () => {
    if (!classFilter) return alert('Select a class first');
    setSaving(true);
    try {
      await api.post(API.TIMETABLE.BASE, { classroom: classFilter, academicYear: ayId, schedule });
      alert('Timetable saved!');
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const classOptions = [
    { value: '', label: 'Select Class' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];
  const subjectOptions = [
    { value: '', label: '—' },
    ...subjects.map(s => ({ value: s._id, label: s.name })),
  ];
  const teacherOptions = [
    { value: '', label: '—' },
    ...teachers.map(t => ({ value: t._id, label: t.name })),
  ];

  return (
    <PageContent>
      <PageHeader
        title="Timetable"
        subtitle="Manage class schedules"
        actions={
          <Button onClick={handleSave} disabled={saving || !classFilter}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Timetable'}
          </Button>
        }
      />

      <div className="flex gap-3 mb-6">
        <Select options={classOptions} value={classFilter} onChange={e => handleClassChange(e.target.value)} className="w-48" label="Class" />
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading timetable...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-xs text-slate-400 uppercase w-20">Day / Period</th>
                {Array.from({ length: DEFAULT_PERIODS }, (_, i) => (
                  <th key={i} className="py-2 px-2 text-xs text-slate-400 uppercase text-center">P{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.map((daySchedule, di) => (
                <tr key={daySchedule.day} className="border-t border-slate-800">
                  <td className="py-3 px-3 text-slate-300 font-medium text-xs">{daySchedule.day.substring(0, 3)}</td>
                  {daySchedule.periods.map((period, pi) => (
                    <td key={pi} className="py-2 px-1">
                      <div className="bg-slate-800 rounded-lg p-1.5 min-w-[120px] space-y-1">
                        <div className="flex gap-1">
                          <input
                            type="time"
                            value={period.startTime}
                            onChange={e => updatePeriod(di, pi, 'startTime', e.target.value)}
                            className="flex-1 min-w-0 px-1 py-0.5 rounded bg-slate-700 border border-slate-600 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <input
                            type="time"
                            value={period.endTime}
                            onChange={e => updatePeriod(di, pi, 'endTime', e.target.value)}
                            className="flex-1 min-w-0 px-1 py-0.5 rounded bg-slate-700 border border-slate-600 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <select
                          value={period.subject}
                          onChange={e => updatePeriod(di, pi, 'subject', e.target.value)}
                          className="w-full px-1 py-0.5 rounded bg-slate-700 border border-slate-600 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {subjectOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <select
                          value={period.teacher}
                          onChange={e => updatePeriod(di, pi, 'teacher', e.target.value)}
                          className="w-full px-1 py-0.5 rounded bg-slate-700 border border-slate-600 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {teacherOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContent>
  );
}

// pages/admin/Promote.jsx
/**
 * PROMOTE PAGE
 * APIs Used:
 *   GET  /api/promote/preview  — preview students
 *   POST /api/promote          — execute promotion
 *   GET  /api/classrooms       — dropdowns
 */
import { useEffect, useState } from 'react';
import { ArrowUpCircle, Search } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Button, Select, Badge } from '../../components/ui.jsx';

export default function PromotePage() {
  const [classrooms, setClassrooms] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [ayId, setAyId] = useState('');
  const [preview, setPreview] = useState(null);
  const [promotions, setPromotions] = useState({});
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        setClassrooms(cls.data || []);
      } catch { }
    })();
  }, []);

  const handlePreview = async () => {
    if (!classFilter) return;
    setLoading(true);
    try {
      const res = await api.get(`${API.PROMOTE.PREVIEW}?classId=${classFilter}&academicYear=${ayId}`);
      setPreview(res.data);
      // Default all to Promoted with next class
      const initMap = {};
      (res.data.students || []).forEach(s => {
        initMap[s._id] = { action: 'Promoted', nextClassId: res.data.nextClass?._id || '' };
      });
      setPromotions(initMap);
      setResult(null);
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleExecute = async () => {
    if (!confirm('Execute promotion? This cannot be undone.')) return;
    setExecuting(true);
    try {
      const promoArr = Object.entries(promotions).map(([studentId, val]) => ({
        studentId, ...val,
      }));
      const res = await api.post(API.PROMOTE.EXECUTE, { promotions: promoArr });
      setResult(res.data);
      setPreview(null);
    } catch (err) { alert(err.message); } finally { setExecuting(false); }
  };

  const updatePromotion = (studentId, field, value) => {
    setPromotions(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const classOptions = [
    { value: '', label: 'Select Class' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];

  const nextClassOptions = [
    { value: '', label: 'Same Class (Detain)' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];

  return (
    <PageContent>
      <PageHeader title="Promote Students" subtitle="Advance or detain students at year end" />

      <Card className="mb-6">
        <div className="flex gap-3 items-end">
          <Select label="Select Class to Preview" options={classOptions} value={classFilter}
            onChange={e => setClassFilter(e.target.value)} className="w-52" />
          <Button onClick={handlePreview} disabled={!classFilter || loading}>
            <Search className="w-4 h-4" /> {loading ? 'Loading...' : 'Load Preview'}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="mb-6 border-emerald-800 bg-emerald-900/10">
          <h3 className="text-emerald-400 font-semibold mb-2">Promotion Complete!</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-400">Promoted: </span><span className="text-white font-bold">{result.promoted}</span></div>
            <div><span className="text-slate-400">Detained: </span><span className="text-white font-bold">{result.detained}</span></div>
            <div><span className="text-slate-400">Left: </span><span className="text-white font-bold">{result.left}</span></div>
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-3">
              <p className="text-rose-400 text-xs font-medium">Errors:</p>
              {result.errors.map((e, i) => <p key={i} className="text-xs text-rose-300">{e}</p>)}
            </div>
          )}
        </Card>
      )}

      {preview && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">{preview.currentClass?.displayName}</h3>
              <p className="text-slate-400 text-sm">{preview.totalCount} eligible students</p>
            </div>
            <div className="flex gap-3">
              {preview.nextClass && (
                <span className="text-slate-400 text-sm">
                  Next Class: <span className="text-white">{preview.nextClass?.displayName}</span>
                </span>
              )}
              <Button onClick={handleExecute} disabled={executing}>
                <ArrowUpCircle className="w-4 h-4" /> {executing ? 'Executing...' : 'Execute Promotion'}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 px-3 text-xs text-slate-400 uppercase">Student</th>
                  <th className="text-left py-2 px-3 text-xs text-slate-400 uppercase">Action</th>
                  <th className="text-left py-2 px-3 text-xs text-slate-400 uppercase">Move To</th>
                </tr>
              </thead>
              <tbody>
                {preview.students.map(s => (
                  <tr key={s._id} className="border-b border-slate-800/50">
                    <td className="py-2 px-3 text-white">{s.firstName} {s.lastName} <span className="text-slate-500">#{s.rollNumber}</span></td>
                    <td className="py-2 px-3">
                      <select
                        value={promotions[s._id]?.action || 'Promoted'}
                        onChange={e => updatePromotion(s._id, 'action', e.target.value)}
                        className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Promoted">Promoted</option>
                        <option value="Detained">Detained</option>
                        <option value="Left">Left</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      {promotions[s._id]?.action === 'Promoted' && (
                        <select
                          value={promotions[s._id]?.nextClassId || ''}
                          onChange={e => updatePromotion(s._id, 'nextClassId', e.target.value)}
                          className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {nextClassOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageContent>
  );
}

// pages/admin/Settings.jsx
/**
 * SETTINGS PAGE
 * APIs Used:
 *   GET /api/settings  — fetch
 *   PUT /api/settings  — save
 */
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Button, Input } from '../../components/ui.jsx';

export default function SettingsPage() {
  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '', website: '',
    affiliationNo: '', board: '', lateFinePer: 10, feeDueDay: 10,
    minAttendance: 75, declaration: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(API.SETTINGS.BASE)
      .then(res => {
        if (res.data) setForm({ ...form, ...res.data });
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(API.SETTINGS.BASE, form);
      alert('Settings saved!');
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500">Loading...</div>;

  return (
    <PageContent>
      <PageHeader
        title="School Settings"
        subtitle="Configure school information and system defaults"
        actions={
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">School Information</h3>
          <div className="space-y-3">
            <Input label="School Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sunrise School" />
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Address</label>
              <textarea value={form.address} onChange={e => set('address', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3} placeholder="School address..." />
            </div>
            <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9999999999" />
            <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@school.com" />
            <Input label="Website" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://school.com" />
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Academic Information</h3>
          <div className="space-y-3">
            <Input label="Affiliation No" value={form.affiliationNo} onChange={e => set('affiliationNo', e.target.value)} placeholder="CBSE-123456" />
            <Input label="Board" value={form.board} onChange={e => set('board', e.target.value)} placeholder="CBSE / State Board" />
          </div>

          <h3 className="text-sm font-semibold text-white mb-4 mt-6">System Defaults</h3>
          <div className="space-y-3">
            <Input label="Late Fine Per Day (₹)" type="number" value={form.lateFinePer} onChange={e => set('lateFinePer', e.target.value)} />
            <Input label="Fee Due Day (of month)" type="number" value={form.feeDueDay} onChange={e => set('feeDueDay', e.target.value)} />
            <Input label="Min Attendance %" type="number" value={form.minAttendance} onChange={e => set('minAttendance', e.target.value)} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-4">Declaration / Footer Text</h3>
          <textarea value={form.declaration} onChange={e => set('declaration', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={4} placeholder="Declaration text for result cards..." />
        </Card>
      </div>
    </PageContent>
  );
}

// pages/admin/AcademicYears.jsx
/**
 * ACADEMIC YEARS PAGE
 * APIs Used:
 *   GET   /api/academic-years          — list
 *   POST  /api/academic-years          — create
 *   PUT   /api/academic-years/:id      — update
 *   PATCH /api/academic-years/:id/set-current — set as current
 *   DELETE /api/academic-years/:id     — delete
 */
import { useEffect, useState } from 'react';
import { Plus, Star, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Input, Badge, Modal } from '../../components/ui.jsx';

export default function AcademicYearsPage() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const fetchYears = async () => {
    setLoading(true);
    try {
      const res = await api.get(API.ACADEMIC_YEARS.BASE);
      setYears(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchYears(); }, []);

  const handleSetCurrent = async (id) => {
    await api.patch(API.ACADEMIC_YEARS.SET_CURRENT(id));
    fetchYears();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this academic year?')) return;
    try {
      await api.delete(API.ACADEMIC_YEARS.BY_ID(id));
      fetchYears();
    } catch (err) { alert(err.message); }
  };

  const columns = [
    { key: 'name', label: 'Year', render: (y) => <span className="font-semibold text-white">{y.name}</span> },
    { key: 'startDate', label: 'Start Date', render: (y) => new Date(y.startDate).toLocaleDateString('en-IN') },
    { key: 'endDate', label: 'End Date', render: (y) => new Date(y.endDate).toLocaleDateString('en-IN') },
    {
      key: 'isCurrent', label: 'Status',
      render: (y) => y.isCurrent ? <Badge label="Current" color="green" /> : <Badge label="Inactive" color="slate" />,
    },
    {
      key: 'actions', label: '',
      render: (y) => (
        <div className="flex gap-2">
          {!y.isCurrent && (
            <Button size="sm" variant="ghost" onClick={() => handleSetCurrent(y._id)}>
              <Star className="w-3 h-3 mr-1" /> Set Current
            </Button>
          )}
          {!y.isCurrent && (
            <Button size="sm" variant="danger" onClick={() => handleDelete(y._id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Academic Years"
        subtitle="Manage academic year cycles"
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> New Year</Button>}
      />
      <Card className="!p-0">
        <Table columns={columns} data={years} loading={loading} emptyMessage="No academic years found" />
      </Card>

      <AddYearModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={() => { fetchYears(); setAddOpen(false); }} />
    </PageContent>
  );
}

function AddYearModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', isCurrent: false });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post(API.ACADEMIC_YEARS.BASE, form);
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Academic Year">
      <div className="space-y-4">
        <Input label="Year Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="2024-2025" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Date *" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          <Input label="End Date *" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isCurrent} onChange={e => set('isCurrent', e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800" />
          <span className="text-sm text-slate-300">Set as current year</span>
        </label>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Creating...' : 'Create Year'}</Button>
      </div>
    </Modal>
  );
}

// pages/admin/Reports.jsx
/**
 * REPORTS PAGE (Admin)
 * APIs Used:
 *   GET /api/reports/fee-collection
 *   GET /api/reports/fee-defaulters
 *   GET /api/reports/attendance-summary
 *   GET /api/reports/low-attendance
 *   GET /api/reports/exam-results
 *   GET /api/reports/classwise-students
 *   GET /api/reports/payroll-summary
 */
import { useEffect, useState } from 'react';
import { BarChart3, Users, DollarSign, CheckSquare, FileText, Banknote } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Button, Select, Badge, Table } from '../../components/ui.jsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const REPORT_TYPES = [
  { key: 'classwise', label: 'Class-wise Students', icon: Users },
  { key: 'fee-collection', label: 'Fee Collection', icon: DollarSign },
  { key: 'fee-defaulters', label: 'Fee Defaulters', icon: DollarSign },
  { key: 'attendance', label: 'Low Attendance', icon: CheckSquare },
  { key: 'exam-results', label: 'Exam Results', icon: FileText },
  { key: 'payroll', label: 'Payroll Summary', icon: Banknote },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('classwise');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ayId, setAyId] = useState('');
  const [classrooms, setClassrooms] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        setClassrooms(cls.data || []);
      } catch { }
    })();
  }, []);

  const fetchReport = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      let res;
      const params = new URLSearchParams({ academicYear: ayId });
      switch (activeReport) {
        case 'classwise':
          res = await api.get(`${API.REPORTS.CLASSWISE_STUDENTS}?${params}`);
          break;
        case 'fee-collection':
          params.set('year', year);
          res = await api.get(`${API.REPORTS.FEE_COLLECTION}?${params}`);
          break;
        case 'fee-defaulters':
          if (classFilter) params.set('classId', classFilter);
          params.set('month', month); params.set('year', year);
          res = await api.get(`${API.REPORTS.FEE_DEFAULTERS}?${params}`);
          break;
        case 'attendance':
          if (classFilter) params.set('classId', classFilter);
          params.set('month', month); params.set('year', year);
          res = await api.get(`${API.REPORTS.LOW_ATTENDANCE}?${params}`);
          break;
        case 'exam-results':
          if (classFilter) params.set('classId', classFilter);
          res = await api.get(`${API.REPORTS.EXAM_RESULTS}?${params}`);
          break;
        case 'payroll':
          params.set('month', month); params.set('year', year);
          res = await api.get(`${API.REPORTS.PAYROLL_SUMMARY}?${params}`);
          break;
      }
      setReportData(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchReport(); }, [activeReport, ayId]);

  const classOptions = [{ value: '', label: 'All Classes' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))];
  const monthOptions = MONTHS.map((m, i) => ({ value: i + 1, label: m }));

  return (
    <PageContent>
      <PageHeader title="Reports" subtitle="Analytics and insights" />

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {REPORT_TYPES.map(rt => (
          <button
            key={rt.key}
            onClick={() => { setActiveReport(rt.key); setReportData(null); }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg text-xs font-medium transition border ${activeReport === rt.key
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
          >
            <rt.icon className="w-4 h-4" />
            {rt.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {['fee-defaulters', 'attendance', 'exam-results'].includes(activeReport) && (
          <Select options={classOptions} value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-44" />
        )}
        {['fee-collection', 'fee-defaulters', 'attendance', 'payroll'].includes(activeReport) && (
          <>
            <Select options={monthOptions} value={month} onChange={e => setMonth(e.target.value)} className="w-28" />
            <input type="number" value={year} onChange={e => setYear(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-24" />
          </>
        )}
        <Button onClick={fetchReport} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
      </div>

      {loading && <div className="py-12 text-center text-slate-500">Loading report...</div>}

      {!loading && reportData && (
        <ReportDisplay type={activeReport} data={reportData} />
      )}
    </PageContent>
  );
}

function ReportDisplay({ type, data }) {
  switch (type) {
    case 'classwise': return <ClasswiseReport data={data} />;
    case 'fee-collection': return <FeeCollectionReport data={data} />;
    case 'fee-defaulters': return <FeeDefaultersReport data={data} />;
    case 'attendance': return <AttendanceReport data={data} />;
    case 'exam-results': return <ExamResultsReport data={data} />;
    case 'payroll': return <PayrollReport data={data} />;
    default: return null;
  }
}

function ClasswiseReport({ data }) {
  const columns = [
    { key: 'class', label: 'Class', render: (r) => r._id?.displayName || '—' },
    { key: 'total', label: 'Total' },
    { key: 'approved', label: 'Active', render: (r) => <span className="text-emerald-400">{r.approved}</span> },
    { key: 'underReview', label: 'Under Review', render: (r) => <span className="text-amber-400">{r.underReview}</span> },
    { key: 'boys', label: 'Boys', render: (r) => <span className="text-sky-400">{r.boys}</span> },
    { key: 'girls', label: 'Girls', render: (r) => <span className="text-violet-400">{r.girls}</span> },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No data" />
    </Card>
  );
}

function FeeCollectionReport({ data }) {
  const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const columns = [
    { key: 'month', label: 'Month', render: (r) => MONTHS_FULL[r.month - 1] },
    { key: 'totalExpected', label: 'Expected', render: (r) => `₹${r.totalExpected?.toLocaleString()}` },
    { key: 'totalCollected', label: 'Collected', render: (r) => <span className="text-emerald-400">₹{r.totalCollected?.toLocaleString()}</span> },
    { key: 'totalPending', label: 'Pending', render: (r) => <span className="text-rose-400">₹{r.totalPending?.toLocaleString()}</span> },
    { key: 'collectionRate', label: 'Rate', render: (r) => <span className="text-amber-400">{r.collectionRate}%</span> },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No fee data" />
    </Card>
  );
}

function FeeDefaultersReport({ data }) {
  const columns = [
    { key: 'student', label: 'Student', render: (f) => `${f.student?.firstName} ${f.student?.lastName}` },
    { key: 'admissionNo', label: 'Adm No', render: (f) => f.student?.admissionNo },
    { key: 'classroom', label: 'Class', render: (f) => f.classroom?.displayName },
    { key: 'month', label: 'Period', render: (f) => `${f.month}/${f.year}` },
    { key: 'finalAmount', label: 'Amount', render: (f) => <span className="text-rose-400">₹{f.finalAmount?.toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (f) => <Badge label={f.status} color={f.status === 'Overdue' ? 'red' : 'yellow'} /> },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No defaulters" />
    </Card>
  );
}

function AttendanceReport({ data }) {
  const columns = [
    { key: 'student', label: 'Student', render: (r) => `${r._id?.firstName || ''} ${r._id?.lastName || ''}` },
    { key: 'total', label: 'Total Days' },
    { key: 'present', label: 'Present', render: (r) => <span className="text-emerald-400">{r.present}</span> },
    { key: 'absent', label: 'Absent', render: (r) => <span className="text-rose-400">{r.absent}</span> },
    {
      key: 'percentage', label: 'Attendance %',
      render: (r) => (
        <span className={r.percentage < 75 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>{r.percentage}%</span>
      ),
    },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No attendance data" />
    </Card>
  );
}

function ExamResultsReport({ data }) {
  const columns = [
    { key: 'exam', label: 'Exam', render: (r) => r._id?.exam?.name || '—' },
    { key: 'class', label: 'Class', render: (r) => r._id?.classroom?.displayName || '—' },
    { key: 'totalStudents', label: 'Students' },
    { key: 'averageMarks', label: 'Avg Marks', render: (r) => <span className="text-indigo-400">{r.averageMarks}</span> },
    { key: 'highestMarks', label: 'Highest', render: (r) => <span className="text-emerald-400">{r.highestMarks}</span> },
    { key: 'passCount', label: 'Passed', render: (r) => <span className="text-amber-400">{r.passCount}</span> },
    { key: 'gradeF', label: 'Failed', render: (r) => <span className="text-rose-400">{r.gradeF}</span> },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No exam data" />
    </Card>
  );
}

function PayrollReport({ data }) {
  const s = data.summary || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: s.totalEmployees },
          { label: 'Total Net Salary', value: `₹${s.totalNet?.toLocaleString() || 0}` },
          { label: 'Paid', value: s.paidCount },
          { label: 'Pending', value: s.pendingCount },
        ].map(stat => (
          <Card key={stat.label}>
            <p className="text-xs text-slate-400 uppercase">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value ?? '—'}</p>
          </Card>
        ))}
      </div>
      <Card className="!p-0">
        <Table
          columns={[
            { key: 'employee', label: 'Employee', render: (p) => p.employee?.name },
            { key: 'basicSalary', label: 'Basic', render: (p) => `₹${p.basicSalary?.toLocaleString()}` },
            { key: 'netSalary', label: 'Net', render: (p) => <span className="text-white font-semibold">₹{p.netSalary?.toLocaleString()}</span> },
            { key: 'status', label: 'Status', render: (p) => <Badge label={p.status} color={p.status === 'Paid' ? 'green' : 'yellow'} /> },
          ]}
          data={data.records || []}
          emptyMessage="No payroll records"
        />
      </Card>
    </div>
  );
}

// pages/teacher/Dashboard.jsx
/**
 * TEACHER DASHBOARD
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/classrooms             — teacher's assigned class
 *   GET /api/homework               — recent homework
 *   GET /api/notices                — recent notices
 *   GET /api/leaves                 — teacher's own leaves
 *   GET /api/attendance/students    — today's attendance for teacher's class
 */
import { useEffect, useState } from 'react';
import {
  Users, ClipboardList, Bell, CalendarDays,
  CheckSquare, BookOpen, Loader2, Clock,
} from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, StatCard, Card } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myClass, setMyClass] = useState(null);
  const [homework, setHomework] = useState([]);
  const [notices, setNotices] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState({ present: 0, absent: 0, total: 0 });
  const [ayId, setAyId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        const ayId = ay.data?._id;
        setAyId(ayId);

        const [classRes, hwRes, noticesRes, leavesRes] = await Promise.all([
          api.get(`${API.CLASSROOMS.BASE}?academicYear=${ayId}&isActive=true`),
          api.get(`${API.HOMEWORK.BASE}?academicYear=${ayId}&limit=5`),
          api.get(`${API.NOTICES.BASE}?academicYear=${ayId}`),
          api.get(`${API.LEAVES.BASE}?academicYear=${ayId}`),
        ]);

        // Find class taught by this teacher (classTeacher match)
        const allClasses = classRes.data || [];
        const employeeId = user?.employeeId;
        const teacherClass = allClasses.find(c => c.classTeacher?._id === employeeId || c.classTeacher === employeeId);
        setMyClass(teacherClass || allClasses[0] || null);

        setHomework((hwRes.data || []).slice(0, 5));
        setNotices((noticesRes.data || []).slice(0, 4));
        setLeaves(leavesRes.data || []);

        // Today's attendance summary
        if (teacherClass || allClasses[0]) {
          const cls = teacherClass || allClasses[0];
          const today = new Date().toISOString().split('T')[0];
          const attRes = await api.get(
            `${API.ATTENDANCE.STUDENTS}?classId=${cls._id}&date=${today}&academicYear=${ayId}`
          );
          const records = attRes.data || [];
          const present = records.filter(r => r.status === 'Present' || r.status === 'Late').length;
          const absent = records.filter(r => r.status === 'Absent').length;
          setTodayAttendance({ present, absent, total: records.length });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
  const approvedLeaves = leaves.filter(l => l.status === 'Approved').length;

  return (
    <PageContent>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Here's your teaching overview for today"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="My Class"
          value={myClass?.displayName || '—'}
          icon={Users}
          color="emerald"
          trend={`Capacity: ${myClass?.capacity || 0}`}
        />
        <StatCard
          label="Present Today"
          value={todayAttendance.present}
          icon={CheckSquare}
          color="sky"
          trend={`${todayAttendance.absent} absent`}
        />
        <StatCard
          label="Pending Leaves"
          value={pendingLeaves}
          icon={CalendarDays}
          color="amber"
          trend={`${approvedLeaves} approved`}
        />
        <StatCard
          label="Recent Homework"
          value={homework.length}
          icon={ClipboardList}
          color="violet"
          trend="Assigned by you"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Attendance Summary */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-400" /> Today's Attendance
          </h3>
          {todayAttendance.total === 0 ? (
            <p className="text-slate-500 text-sm">No attendance marked yet today.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Present', value: todayAttendance.present, color: 'bg-emerald-500' },
                { label: 'Absent', value: todayAttendance.absent, color: 'bg-rose-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{item.label}</span>
                    <span className="text-white">{item.value} / {todayAttendance.total}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${todayAttendance.total ? (item.value / todayAttendance.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Notices */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" /> Notices
          </h3>
          {notices.length === 0 ? (
            <p className="text-slate-500 text-sm">No notices.</p>
          ) : (
            <div className="space-y-3">
              {notices.map(n => (
                <div key={n._id} className="flex items-start gap-3">
                  <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.priority === 'Urgent' ? 'bg-rose-500' :
                    n.priority === 'Important' ? 'bg-amber-500' : 'bg-slate-500'
                    }`} />
                  <div>
                    <p className="text-xs font-medium text-white">{n.title}</p>
                    <p className="text-xs text-slate-500">{n.priority} · {new Date(n.publishDate).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Homework */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-violet-400" /> Recent Homework
          </h3>
          {homework.length === 0 ? (
            <p className="text-slate-500 text-sm">No homework assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {homework.map(hw => (
                <div key={hw._id} className="flex items-start justify-between gap-3 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-xs font-medium text-white">{hw.title}</p>
                    <p className="text-xs text-slate-500">
                      {hw.classroom?.displayName} · {hw.subject?.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-amber-400">Due: {new Date(hw.dueDate).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Leave Status */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-amber-400" /> My Leaves
          </h3>
          {leaves.length === 0 ? (
            <p className="text-slate-500 text-sm">No leave applications.</p>
          ) : (
            <div className="space-y-2">
              {leaves.slice(0, 5).map(l => (
                <div key={l._id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-white text-xs font-medium">{l.leaveType}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(l.fromDate).toLocaleDateString('en-IN')} — {new Date(l.toDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-400' :
                    l.status === 'Rejected' ? 'bg-rose-500/15 text-rose-400' :
                      'bg-amber-500/15 text-amber-400'
                    }`}>{l.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContent>
  );
}

// pages/teacher/Attendance.jsx
/**
 * TEACHER ATTENDANCE PAGE
 * APIs Used:
 *   GET  /api/academic-years/current
 *   GET  /api/classrooms              — teacher's classes
 *   GET  /api/students                — students in selected class
 *   GET  /api/attendance/students     — fetch existing records for a date
 *   POST /api/attendance/students     — bulk save attendance
 */
import { useEffect, useState } from 'react';
import { Save, RefreshCw, CheckCircle } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Button, Select } from '../../components/ui.jsx';

const STATUSES = ['Present', 'Absent', 'Late', 'HalfDay', 'Holiday'];

function statusBtnClass(s, active) {
  if (!active) return 'border border-slate-700 text-slate-400 hover:border-slate-500 px-2 py-1 rounded text-xs font-medium transition';
  const map = {
    Present: 'bg-emerald-600 text-white',
    Absent: 'bg-rose-600 text-white',
    Late: 'bg-amber-500 text-white',
    HalfDay: 'bg-sky-600 text-white',
    Holiday: 'bg-violet-600 text-white',
  };
  return `${map[s] || 'bg-slate-600 text-white'} px-2 py-1 rounded text-xs font-medium transition`;
}

export default function AttendancePage() {
  const [classrooms, setClassrooms] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        const classes = cls.data || [];
        setClassrooms(classes);
        if (classes.length > 0) setClassFilter(classes[0]._id);
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (classFilter && ayId) fetchAttendance();
  }, [classFilter, date, ayId]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const [stuRes, attRes] = await Promise.all([
        api.get(`${API.STUDENTS.BASE}?classId=${classFilter}&status=Approved&academicYear=${ayId}&limit=100`),
        api.get(`${API.ATTENDANCE.STUDENTS}?classId=${classFilter}&date=${date}&academicYear=${ayId}`),
      ]);
      const stuList = stuRes.data || [];
      setStudents(stuList);

      const existing = {};
      (attRes.data || []).forEach(r => {
        existing[r.student?._id || r.student] = r.status;
      });
      const init = {};
      stuList.forEach(s => { init[s._id] = existing[s._id] || 'Present'; });
      setAttendance(init);
    } catch { } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = students.map(s => ({
        student: s._id,
        classroom: classFilter,
        date,
        status: attendance[s._id] || 'Present',
        academicYear: ayId,
      }));
      await api.post(API.ATTENDANCE.STUDENTS, { records });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status) => {
    const next = {};
    students.forEach(s => { next[s._id] = status; });
    setAttendance(next);
  };

  const summary = {
    present: Object.values(attendance).filter(s => s === 'Present').length,
    absent: Object.values(attendance).filter(s => s === 'Absent').length,
    late: Object.values(attendance).filter(s => s === 'Late').length,
  };

  const classOptions = classrooms.map(c => ({ value: c._id, label: c.displayName }));

  return (
    <PageContent>
      <PageHeader
        title="Mark Attendance"
        subtitle="Record daily student attendance"
        actions={
          <Button onClick={handleSave} disabled={saving || students.length === 0}>
            {saved ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Attendance'}
          </Button>
        }
      />

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <Select
          label="Class"
          options={classOptions}
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="w-44"
        />
        <Button variant="ghost" onClick={fetchAttendance}><RefreshCw className="w-4 h-4" /></Button>

        {students.length > 0 && (
          <div className="flex gap-2 ml-auto">
            {['Present', 'Absent', 'Holiday'].map(s => (
              <Button key={s} size="sm" variant="ghost" onClick={() => markAll(s)}>
                All {s}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Summary bar */}
      {students.length > 0 && (
        <div className="flex gap-4 mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <span className="text-xs text-slate-400">Total: <span className="text-white font-bold">{students.length}</span></span>
          <span className="text-xs text-slate-400">Present: <span className="text-emerald-400 font-bold">{summary.present}</span></span>
          <span className="text-xs text-slate-400">Absent: <span className="text-rose-400 font-bold">{summary.absent}</span></span>
          <span className="text-xs text-slate-400">Late: <span className="text-amber-400 font-bold">{summary.late}</span></span>
        </div>
      )}

      <Card className="!p-0">
        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading students...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">#</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Student</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Roll No</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      No students found. Select a class.
                    </td>
                  </tr>
                ) : (
                  students.map((s, i) => (
                    <tr key={s._id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="py-3 px-4 text-slate-400">{i + 1}</td>
                      <td className="py-3 px-4 text-white font-medium">{s.firstName} {s.lastName}</td>
                      <td className="py-3 px-4 text-slate-400">{s.rollNumber || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {STATUSES.map(st => (
                            <button
                              key={st}
                              onClick={() => setAttendance(prev => ({ ...prev, [s._id]: st }))}
                              className={statusBtnClass(st, attendance[s._id] === st)}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContent>
  );
}

// pages/teacher/Exams.jsx
/**
 * TEACHER EXAMS PAGE
 * APIs Used:
 *   GET    /api/academic-years/current
 *   GET    /api/classrooms              — teacher's classes
 *   GET    /api/subjects                — by class
 *   GET    /api/exams                   — list exams
 *   POST   /api/exams                   — create exam
 *   GET    /api/exams/:id/marks         — get marks
 *   POST   /api/exams/:id/marks         — save marks
 *   GET    /api/students                — for marks entry
 */
import { useEffect, useState } from 'react';
import { Plus, ClipboardList, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import {
  PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal,
} from '../../components/ui.jsx';

const EXAM_TYPES = ['UnitTest1', 'UnitTest2', 'MidTerm', 'FinalExam', 'Project', 'Other'];

export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [marksExam, setMarksExam] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        const classes = cls.data || [];
        setClassrooms(classes);
        if (classes.length > 0) setClassFilter(classes[0]._id);
      } catch { }
    })();
  }, []);

  const fetchExams = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ academicYear: ayId });
      if (classFilter) params.set('classId', classFilter);
      const res = await api.get(`${API.EXAMS.BASE}?${params}`);
      setExams(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchExams(); }, [classFilter, ayId]);

  const columns = [
    { key: 'name', label: 'Exam', render: (e) => <span className="font-medium text-white">{e.name}</span> },
    { key: 'examType', label: 'Type', render: (e) => <Badge label={e.examType} color="indigo" /> },
    { key: 'classroom', label: 'Class', render: (e) => e.classroom?.displayName || '—' },
    { key: 'subject', label: 'Subject', render: (e) => e.subject?.name || '—' },
    { key: 'totalMarks', label: 'Marks', render: (e) => <span className="text-amber-400">{e.totalMarks}</span> },
    { key: 'examDate', label: 'Date', render: (e) => new Date(e.examDate).toLocaleDateString('en-IN') },
    {
      key: 'actions', label: '',
      render: (e) => (
        <Button size="sm" variant="ghost" onClick={() => setMarksExam(e)}>
          <ClipboardList className="w-3 h-3 mr-1" /> Enter Marks
        </Button>
      ),
    },
  ];

  const classOptions = classrooms.map(c => ({ value: c._id, label: c.displayName }));

  return (
    <PageContent>
      <PageHeader
        title="Exams & Marks"
        subtitle={`${exams.length} exams`}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Create Exam</Button>}
      />
      <div className="flex gap-3 mb-4">
        <Select options={[{ value: '', label: 'All Classes' }, ...classOptions]} value={classFilter}
          onChange={e => setClassFilter(e.target.value)} className="w-48" />
      </div>
      <Card className="!p-0">
        <Table columns={columns} data={exams} loading={loading} emptyMessage="No exams found" />
      </Card>

      <ExamCreateModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        classrooms={classrooms}
        ayId={ayId}
        onSuccess={() => { fetchExams(); setAddOpen(false); }}
      />

      {marksExam && (
        <MarksModal exam={marksExam} onClose={() => setMarksExam(null)} ayId={ayId} />
      )}
    </PageContent>
  );
}

function ExamCreateModal({ open, onClose, classrooms, ayId, onSuccess }) {
  const [form, setForm] = useState({
    name: '', examType: 'UnitTest1', classroom: '', subject: '',
    totalMarks: '', examDate: '', description: '',
  });
  const [subjects, setSubjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClassChange = async (classId) => {
    set('classroom', classId);
    set('subject', '');
    if (classId) {
      try {
        const res = await api.get(`${API.SUBJECTS.BASE}?classId=${classId}&isActive=true`);
        setSubjects(res.data || []);
      } catch { }
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post(API.EXAMS.BASE, { ...form, academicYear: ayId });
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Exam">
      <div className="space-y-4">
        <Input label="Exam Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Unit Test 1" />
        <Select label="Exam Type *" value={form.examType} onChange={e => set('examType', e.target.value)}
          options={EXAM_TYPES.map(t => ({ value: t, label: t }))} />
        <Select label="Class *" value={form.classroom} onChange={e => handleClassChange(e.target.value)}
          options={[{ value: '', label: 'Select Class' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))]} />
        <Select label="Subject *" value={form.subject} onChange={e => set('subject', e.target.value)}
          options={[{ value: '', label: 'Select Subject' }, ...subjects.map(s => ({ value: s._id, label: s.name }))]} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Total Marks *" type="number" value={form.totalMarks} onChange={e => set('totalMarks', e.target.value)} placeholder="25" />
          <Input label="Exam Date *" type="date" value={form.examDate} onChange={e => set('examDate', e.target.value)} />
        </div>
        <Input label="Description" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional" />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Create'}</Button>
      </div>
    </Modal>
  );
}

function MarksModal({ exam, onClose, ayId }) {
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [absent, setAbsent] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const classId = exam.classroom?._id || exam.classroom;
        const [stuRes, marksRes] = await Promise.all([
          api.get(`${API.STUDENTS.BASE}?classId=${classId}&status=Approved&academicYear=${ayId}&limit=100`),
          api.get(API.EXAMS.MARKS(exam._id)),
        ]);
        setStudents(stuRes.data || []);
        const mMap = {}, aMap = {};
        (marksRes.data || []).forEach(m => {
          mMap[m.student?._id || m.student] = m.marksObtained;
          aMap[m.student?._id || m.student] = m.isAbsent;
        });
        setMarks(mMap);
        setAbsent(aMap);
      } catch { }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const marksArr = students.map(s => ({
        student: s._id,
        marksObtained: absent[s._id] ? 0 : Number(marks[s._id] || 0),
        isAbsent: absent[s._id] || false,
      }));
      await api.post(API.EXAMS.MARKS(exam._id), { marks: marksArr });
      alert('Marks saved!');
      onClose();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Marks — ${exam.name} (/${exam.totalMarks})`} width="max-w-2xl">
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="border-b border-slate-800">
              <th className="text-left py-2 px-3 text-xs text-slate-400">Student</th>
              <th className="text-left py-2 px-3 text-xs text-slate-400">Marks (/{exam.totalMarks})</th>
              <th className="text-left py-2 px-3 text-xs text-slate-400">Absent</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s._id} className="border-b border-slate-800/50">
                <td className="py-2 px-3 text-white">
                  {s.firstName} {s.lastName}
                  <span className="text-slate-500 text-xs ml-1">({s.rollNumber})</span>
                </td>
                <td className="py-2 px-3">
                  <input
                    type="number" min={0} max={exam.totalMarks}
                    disabled={absent[s._id]}
                    value={marks[s._id] ?? ''}
                    onChange={e => setMarks(prev => ({ ...prev, [s._id]: e.target.value }))}
                    className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40"
                  />
                </td>
                <td className="py-2 px-3">
                  <input type="checkbox" checked={absent[s._id] || false}
                    onChange={e => setAbsent(prev => ({ ...prev, [s._id]: e.target.checked }))}
                    className="w-4 h-4 rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Marks'}</Button>
      </div>
    </Modal>
  );
}

// pages/teacher/Homework.jsx
/**
 * TEACHER HOMEWORK PAGE
 * APIs Used:
 *   GET    /api/academic-years/current
 *   GET    /api/classrooms
 *   GET    /api/subjects              — by class
 *   GET    /api/homework              — list
 *   POST   /api/homework              — create
 *   PUT    /api/homework/:id          — update
 *   DELETE /api/homework/:id          — delete
 */
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import {
  PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal,
} from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext';

export default function HomeworkPage() {
  const { user } = useAuth();
  const [homework, setHomework] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editHw, setEditHw] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        setClassrooms(cls.data || []);
      } catch { }
    })();
  }, []);

  const fetchHomework = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ academicYear: ayId });
      if (classFilter) params.set('classId', classFilter);
      const res = await api.get(`${API.HOMEWORK.BASE}?${params}`);
      setHomework(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchHomework(); }, [classFilter, ayId]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this homework?')) return;
    await api.delete(API.HOMEWORK.BY_ID(id));
    fetchHomework();
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();

  const columns = [
    {
      key: 'title', label: 'Assignment',
      render: (h) => (
        <div>
          <p className="font-medium text-white">{h.title}</p>
          {h.description && <p className="text-xs text-slate-500 line-clamp-1">{h.description}</p>}
        </div>
      ),
    },
    { key: 'classroom', label: 'Class', render: (h) => h.classroom?.displayName || '—' },
    { key: 'subject', label: 'Subject', render: (h) => <Badge label={h.subject?.name || '—'} color="indigo" /> },
    {
      key: 'dueDate', label: 'Due Date',
      render: (h) => (
        <span className={isOverdue(h.dueDate) ? 'text-rose-400 font-medium' : 'text-amber-400'}>
          {new Date(h.dueDate).toLocaleDateString('en-IN')}
          {isOverdue(h.dueDate) && <span className="ml-1 text-xs">(Overdue)</span>}
        </span>
      ),
    },
    { key: 'createdAt', label: 'Assigned', render: (h) => new Date(h.createdAt).toLocaleDateString('en-IN') },
    {
      key: 'actions', label: '',
      render: (h) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditHw(h)}><Edit2 className="w-3 h-3" /></Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(h._id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      ),
    },
  ];

  const classOptions = [
    { value: '', label: 'All Classes' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];

  return (
    <PageContent>
      <PageHeader
        title="Homework"
        subtitle={`${homework.length} assignments`}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Assign Homework</Button>}
      />
      <div className="flex gap-3 mb-4">
        <Select options={classOptions} value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-48" />
      </div>
      <Card className="!p-0">
        <Table columns={columns} data={homework} loading={loading} emptyMessage="No homework assigned" />
      </Card>

      <HomeworkModal
        open={addOpen || !!editHw}
        onClose={() => { setAddOpen(false); setEditHw(null); }}
        homework={editHw}
        classrooms={classrooms}
        ayId={ayId}
        onSuccess={() => { fetchHomework(); setAddOpen(false); setEditHw(null); }}
      />
    </PageContent>
  );
}

function HomeworkModal({ open, onClose, homework, classrooms, ayId, onSuccess }) {
  const { user } = useAuth();
  const isEdit = !!homework;
  const [form, setForm] = useState({ title: '', description: '', classroom: '', subject: '', dueDate: '' });
  const [subjects, setSubjects] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (homework) {
      setForm({
        title: homework.title || '',
        description: homework.description || '',
        classroom: homework.classroom?._id || '',
        subject: homework.subject?._id || '',
        dueDate: homework.dueDate ? homework.dueDate.split('T')[0] : '',
      });
      if (homework.classroom?._id) loadSubjects(homework.classroom._id);
    } else {
      setForm({ title: '', description: '', classroom: '', subject: '', dueDate: '' });
      setSubjects([]);
    }
  }, [homework, open]);

  const loadSubjects = async (classId) => {
    try {
      const res = await api.get(`${API.SUBJECTS.BASE}?classId=${classId}&isActive=true`);
      setSubjects(res.data || []);
    } catch { }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClassChange = (classId) => {
    set('classroom', classId);
    set('subject', '');
    if (classId) loadSubjects(classId);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, academicYear: ayId, teacher: user?.employeeId };
      if (isEdit) {
        await api.put(API.HOMEWORK.BY_ID(homework._id), payload);
      } else {
        await api.post(API.HOMEWORK.BASE, payload);
      }
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Homework' : 'Assign Homework'}>
      <div className="space-y-4">
        <Input label="Title *" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Chapter 5 Exercise" />
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows={3}
            placeholder="Details about the assignment..."
          />
        </div>
        <Select
          label="Class *"
          value={form.classroom}
          onChange={e => handleClassChange(e.target.value)}
          options={[{ value: '', label: 'Select Class' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))]}
        />
        <Select
          label="Subject *"
          value={form.subject}
          onChange={e => set('subject', e.target.value)}
          options={[{ value: '', label: 'Select Subject' }, ...subjects.map(s => ({ value: s._id, label: s.name }))]}
        />
        <Input label="Due Date *" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Assign'}</Button>
      </div>
    </Modal>
  );
}

// pages/teacher/Leaves.jsx
/**
 * TEACHER LEAVES PAGE
 * APIs Used:
 *   GET    /api/academic-years/current
 *   GET    /api/leaves                — teacher's own leaves
 *   POST   /api/leaves                — apply for leave
 *   DELETE /api/leaves/:id            — cancel pending leave
 */
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import {
  PageContent, PageHeader, Card, Table, Button, Input, Select, leaveStatusBadge, Badge, Modal,
} from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext';

const LEAVE_TYPES = ['Sick', 'Casual', 'Earned', 'Maternity', 'Unpaid', 'Other'];

export default function TeacherLeaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ayId, setAyId] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
      setAyId(ay.data?._id);
    })();
  }, []);

  const fetchLeaves = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const res = await api.get(`${API.LEAVES.BASE}?academicYear=${ayId}`);
      setLeaves(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchLeaves(); }, [ayId]);

  const handleDelete = async (id) => {
    if (!confirm('Cancel this leave application?')) return;
    try {
      await api.delete(API.LEAVES.BY_ID(id));
      fetchLeaves();
    } catch (err) { alert(err.message); }
  };

  // Summary counts
  const pending = leaves.filter(l => l.status === 'Pending').length;
  const approved = leaves.filter(l => l.status === 'Approved').length;
  const totalDays = leaves.filter(l => l.status === 'Approved').reduce((s, l) => s + l.totalDays, 0);

  const columns = [
    { key: 'leaveType', label: 'Type', render: (l) => <Badge label={l.leaveType} color="indigo" /> },
    {
      key: 'dates', label: 'Duration',
      render: (l) => (
        <div>
          <p className="text-sm text-white">
            {new Date(l.fromDate).toLocaleDateString('en-IN')} — {new Date(l.toDate).toLocaleDateString('en-IN')}
          </p>
          <p className="text-xs text-slate-500">{l.totalDays} day(s)</p>
        </div>
      ),
    },
    { key: 'reason', label: 'Reason', render: (l) => <span className="text-slate-300 text-sm">{l.reason}</span> },
    { key: 'status', label: 'Status', render: (l) => leaveStatusBadge(l.status) },
    {
      key: 'approvalRemark', label: 'Remark',
      render: (l) => l.approvalRemark
        ? <span className="text-xs text-slate-400">{l.approvalRemark}</span>
        : <span className="text-xs text-slate-600">—</span>,
    },
    {
      key: 'actions', label: '',
      render: (l) => l.status === 'Pending' && (
        <Button size="sm" variant="danger" onClick={() => handleDelete(l._id)}>
          <Trash2 className="w-3 h-3" />
        </Button>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="My Leaves"
        subtitle="Apply and track your leave applications"
        actions={<Button onClick={() => setApplyOpen(true)}><Plus className="w-4 h-4" /> Apply Leave</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', value: pending, color: 'text-amber-400' },
          { label: 'Approved', value: approved, color: 'text-emerald-400' },
          { label: 'Approved Days', value: totalDays, color: 'text-sky-400' },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="!p-0">
        <Table columns={columns} data={leaves} loading={loading} emptyMessage="No leave applications" />
      </Card>

      <ApplyLeaveModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        ayId={ayId}
        employeeId={user?.employeeId}
        onSuccess={() => { fetchLeaves(); setApplyOpen(false); }}
      />
    </PageContent>
  );
}

function ApplyLeaveModal({ open, onClose, ayId, employeeId, onSuccess }) {
  const [form, setForm] = useState({
    leaveType: 'Sick', fromDate: '', toDate: '', reason: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calcDays = () => {
    if (!form.fromDate || !form.toDate) return 0;
    return Math.ceil((new Date(form.toDate) - new Date(form.fromDate)) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async () => {
    if (!form.fromDate || !form.toDate || !form.reason) {
      alert('Please fill all required fields');
      return;
    }
    if (new Date(form.toDate) < new Date(form.fromDate)) {
      alert('End date must be after start date');
      return;
    }
    setSaving(true);
    try {
      await api.post(API.LEAVES.BASE, { ...form, employee: employeeId, academicYear: ayId });
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply for Leave">
      <div className="space-y-4">
        <Select
          label="Leave Type *"
          value={form.leaveType}
          onChange={e => set('leaveType', e.target.value)}
          options={LEAVE_TYPES.map(t => ({ value: t, label: t }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="From Date *" type="date" value={form.fromDate} onChange={e => set('fromDate', e.target.value)} />
          <Input label="To Date *" type="date" value={form.toDate} onChange={e => set('toDate', e.target.value)} />
        </div>
        {calcDays() > 0 && (
          <p className="text-xs text-emerald-400 font-medium">Total: {calcDays()} day(s)</p>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Reason *</label>
          <textarea
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows={3}
            placeholder="State the reason for leave..."
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Submitting...' : 'Apply'}</Button>
      </div>
    </Modal>
  );
}

// pages/teacher/Notices.jsx
/**
 * TEACHER NOTICES PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/notices                — filtered to teacher role
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Badge } from '../../components/ui.jsx';

function priorityColor(p) {
  return { Urgent: 'red', Important: 'yellow', Normal: 'slate' }[p] || 'slate';
}

export default function TeacherNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        const res = await api.get(`${API.NOTICES.BASE}?academicYear=${ay.data?._id}`);
        setNotices(res.data || []);
      } catch { } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <PageContent>
      <PageHeader title="Notices" subtitle={`${notices.length} active notices`} />

      {notices.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm text-center py-8">No notices at this time.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notices.map(n => (
            <Card key={n._id} className={`border-l-4 ${n.priority === 'Urgent' ? 'border-l-rose-500' :
              n.priority === 'Important' ? 'border-l-amber-500' :
                'border-l-slate-600'
              }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{n.title}</h3>
                    <Badge label={n.priority} color={priorityColor(n.priority)} />
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{n.content}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                    <span>By {n.createdBy?.name || 'Admin'}</span>
                    <span>·</span>
                    <span>{new Date(n.publishDate).toLocaleDateString('en-IN')}</span>
                    {n.expiryDate && (
                      <>
                        <span>·</span>
                        <span>Expires: {new Date(n.expiryDate).toLocaleDateString('en-IN')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContent>
  );
}

// pages/teacher/Timetable.jsx
/**
 * TEACHER TIMETABLE PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/classrooms              — find teacher's class
 *   GET /api/timetable/:classId      — fetch timetable
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Select } from '../../components/ui.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TeacherTimetable() {
  const [classrooms, setClassrooms] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ayId, setAyId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        const classes = cls.data || [];
        setClassrooms(classes);
        if (classes.length > 0) {
          setClassFilter(classes[0]._id);
        }
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (classFilter && ayId) fetchTimetable();
  }, [classFilter, ayId]);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API.TIMETABLE.BY_CLASS(classFilter)}?academicYear=${ayId}`);
      setTimetable(res.data);
    } catch {
      setTimetable(null);
    } finally { setLoading(false); }
  };

  const classOptions = classrooms.map(c => ({ value: c._id, label: c.displayName }));

  const getScheduleForDay = (day) => {
    if (!timetable?.schedule) return [];
    const dayData = timetable.schedule.find(s => s.day === day);
    return dayData?.periods?.filter(p => p.subject || p.startTime) || [];
  };

  return (
    <PageContent>
      <PageHeader title="Timetable" subtitle="View class schedule" />

      <div className="flex gap-3 mb-6">
        <Select
          label="Select Class"
          options={classOptions}
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="w-48"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading timetable...</div>
      ) : !timetable ? (
        <Card>
          <p className="text-slate-500 text-sm text-center py-8">No timetable found for this class.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {DAYS.map(day => {
            const periods = getScheduleForDay(day);
            return (
              <Card key={day} className="!py-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{day}</h3>
                {periods.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No periods scheduled</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {periods.map((p, i) => (
                      <div key={i} className="bg-slate-800 rounded-lg p-3 min-w-[130px] border border-slate-700">
                        <div className="text-xs text-slate-500 mb-1 font-medium">Period {p.periodNo}</div>
                        {p.startTime && p.endTime && (
                          <div className="text-xs text-indigo-400 mb-1.5 font-mono">
                            {p.startTime} – {p.endTime}
                          </div>
                        )}
                        {p.subject?.name ? (
                          <div className="text-sm font-semibold text-white leading-tight">{p.subject.name}</div>
                        ) : (
                          <div className="text-xs text-slate-500 italic">—</div>
                        )}
                        {p.teacher?.name && (
                          <div className="text-xs text-slate-500 mt-0.5">{p.teacher.name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageContent>
  );
}

// pages/parent/Dashboard.jsx
/**
 * PARENT DASHBOARD
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/students               — parent's children
 *   GET /api/fees                   — pending fees
 *   GET /api/notices                — recent notices
 *   GET /api/attendance/students    — recent attendance summary
 */
import { useEffect, useState } from 'react';
import {
  GraduationCap, DollarSign, Bell, CheckSquare,
  Loader2, TrendingUp, AlertCircle,
} from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Badge, feeStatusBadge } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [pendingFees, setPendingFees] = useState([]);
  const [notices, setNotices] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        const ayId = ay.data?._id;

        const [studentsRes, feesRes, noticesRes] = await Promise.all([
          api.get(`${API.STUDENTS.BASE}?academicYear=${ayId}`),
          api.get(`${API.FEES.BASE}?academicYear=${ayId}&status=Pending`),
          api.get(`${API.NOTICES.BASE}?academicYear=${ayId}`),
        ]);

        const childList = studentsRes.data || [];
        setChildren(childList);
        setPendingFees(feesRes.data || []);
        setNotices((noticesRes.data || []).slice(0, 4));

        // Attendance summary for each child
        if (childList.length > 0) {
          const now = new Date();
          const summaries = await Promise.all(
            childList.map(child =>
              api.get(
                `${API.ATTENDANCE.STUDENTS_SUMMARY}?studentId=${child._id}&month=${now.getMonth() + 1}&year=${now.getFullYear()}&academicYear=${ayId}`
              ).then(r => ({ childId: child._id, data: r.data?.[0] || null })).catch(() => ({ childId: child._id, data: null }))
            )
          );
          setAttendanceSummary(summaries);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const totalPendingFees = pendingFees.reduce((s, f) => s + (f.finalAmount || 0), 0);

  return (
    <PageContent>
      <PageHeader
        title={`Hello, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Your children's school overview"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Children</p>
              <p className="text-2xl font-bold text-white mt-1">{children.length}</p>
              <p className="text-xs text-slate-500 mt-1">Enrolled</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-500/10">
              <GraduationCap className="w-5 h-5 text-violet-400" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Pending Fees</p>
              <p className="text-2xl font-bold text-white mt-1">₹{(totalPendingFees / 1000).toFixed(1)}K</p>
              <p className="text-xs text-rose-400 mt-1">{pendingFees.length} unpaid</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-500/10">
              <DollarSign className="w-5 h-5 text-rose-400" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Notices</p>
              <p className="text-2xl font-bold text-white mt-1">{notices.length}</p>
              <p className="text-xs text-slate-500 mt-1">Active</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/10">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Attendance</p>
              <p className="text-2xl font-bold text-white mt-1">
                {attendanceSummary.length > 0 && attendanceSummary[0].data
                  ? `${attendanceSummary[0].data.percentage}%`
                  : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">This month</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Children Summary */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-violet-400" /> My Children
          </h3>
          {children.length === 0 ? (
            <p className="text-slate-500 text-sm">No children linked to your account.</p>
          ) : (
            <div className="space-y-3">
              {children.map((child, i) => {
                const attData = attendanceSummary.find(a => a.childId === child._id)?.data;
                return (
                  <div key={child._id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
                        {child.firstName?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{child.firstName} {child.lastName}</p>
                        <p className="text-xs text-slate-500">{child.classroom?.displayName} · #{child.admissionNo}</p>
                      </div>
                    </div>
                    {attData && (
                      <span className={`text-xs font-bold ${attData.percentage >= 75 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {attData.percentage}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Pending Fees */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" /> Pending Fees
          </h3>
          {pendingFees.length === 0 ? (
            <p className="text-slate-500 text-sm">All fees are up to date! 🎉</p>
          ) : (
            <div className="space-y-2">
              {pendingFees.slice(0, 5).map(f => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return (
                  <div key={f._id} className="flex items-center justify-between text-sm border-b border-slate-800/50 pb-2 last:border-0">
                    <div>
                      <p className="text-white text-xs font-medium">{f.student?.firstName} {f.student?.lastName}</p>
                      <p className="text-xs text-slate-500">{months[f.month - 1]} {f.year}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-rose-400 font-semibold text-xs">₹{f.finalAmount?.toLocaleString()}</p>
                      {feeStatusBadge(f.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Notices */}
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" /> School Notices
          </h3>
          {notices.length === 0 ? (
            <p className="text-slate-500 text-sm">No notices at this time.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notices.map(n => (
                <div key={n._id} className={`p-3 rounded-lg border-l-4 bg-slate-800 ${n.priority === 'Urgent' ? 'border-l-rose-500' :
                  n.priority === 'Important' ? 'border-l-amber-500' : 'border-l-slate-600'
                  }`}>
                  <p className="text-xs font-semibold text-white">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{n.content}</p>
                  <p className="text-xs text-slate-600 mt-1">{new Date(n.publishDate).toLocaleDateString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContent>
  );
}

// pages/parent/MyChildren.jsx
/**
 * PARENT - MY CHILDREN PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/students               — parent's linked children (filtered server-side)
 */
import { useEffect, useState } from 'react';
import { Loader2, User, Phone, Mail, School } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Badge, studentStatusBadge } from '../../components/ui.jsx';

export default function MyChildren() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        const res = await api.get(`${API.STUDENTS.BASE}?academicYear=${ay.data?._id}`);
        setChildren(res.data || []);
      } catch { } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
    </div>
  );

  return (
    <PageContent>
      <PageHeader title="My Children" subtitle={`${children.length} enrolled`} />

      {children.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm text-center py-8">
            No children are linked to your account. Please contact the school.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {children.map(child => (
            <Card key={child._id}>
              {/* Header */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                  {child.firstName?.charAt(0)}{child.lastName?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {child.firstName} {child.middleName} {child.lastName}
                  </h3>
                  <p className="text-xs text-slate-400">{child.admissionNo}</p>
                  <div className="mt-1">{studentStatusBadge(child.status)}</div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <InfoRow label="Class" value={child.classroom?.displayName} />
                <InfoRow label="Roll No." value={child.rollNumber} />
                <InfoRow label="Gender" value={child.gender} />
                <InfoRow label="Date of Birth" value={child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString('en-IN') : '—'} />
                {child.bloodGroup && <InfoRow label="Blood Group" value={child.bloodGroup} />}
                {child.religion && <InfoRow label="Religion" value={child.religion} />}
              </div>

              {/* Parent Info */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Parent / Guardian</p>
                <div className="space-y-1.5">
                  {child.fatherName && (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <User className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span>{child.fatherName} (Father)</span>
                    </div>
                  )}
                  {child.fatherPhone && (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span>{child.fatherPhone}</span>
                    </div>
                  )}
                  {child.fatherEmail && (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Mail className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span>{child.fatherEmail}</span>
                    </div>
                  )}
                  {child.motherName && (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <User className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span>{child.motherName} (Mother)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Previous School */}
              {child.previousSchoolName && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <School className="w-3 h-3 flex-shrink-0" />
                    <span>Previous: {child.previousSchoolName}</span>
                    {child.previousClass && <span>· {child.previousClass}</span>}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </PageContent>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-white font-medium mt-0.5">{value || '—'}</p>
    </div>
  );
}

// pages/parent/Attendance.jsx
/**
 * PARENT ATTENDANCE PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/students               — parent's children
 *   GET /api/attendance/students    — attendance records
 *   GET /api/attendance/students/summary — monthly summary
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Select, Badge } from '../../components/ui.jsx';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function statusColor(s) {
  const map = {
    Present: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Absent: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    Late: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    HalfDay: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    Holiday: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  };
  return map[s] || 'bg-slate-700 text-slate-400 border-slate-600';
}

export default function ParentAttendance() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year] = useState(new Date().getFullYear());
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const res = await api.get(`${API.STUDENTS.BASE}?academicYear=${ay.data?._id}`);
        const kids = res.data || [];
        setChildren(kids);
        if (kids.length > 0) setSelectedChild(kids[0]._id);
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (selectedChild && ayId) fetchAttendance();
  }, [selectedChild, month, ayId]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const [recRes, sumRes] = await Promise.all([
        api.get(`${API.ATTENDANCE.STUDENTS}?studentId=${selectedChild}&fromDate=${fromDate}&toDate=${toDate}&academicYear=${ayId}`),
        api.get(`${API.ATTENDANCE.STUDENTS_SUMMARY}?studentId=${selectedChild}&month=${month}&year=${year}&academicYear=${ayId}`),
      ]);
      setRecords(recRes.data || []);
      setSummary((sumRes.data || [])[0] || null);
    } catch { } finally { setLoading(false); }
  };

  const childOptions = children.map(c => ({
    value: c._id,
    label: `${c.firstName} ${c.lastName} (${c.classroom?.displayName || ''})`,
  }));
  const monthOptions = MONTHS.map((m, i) => ({ value: i + 1, label: m }));

  // Build calendar grid
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  const getRecord = (day) => {
    const d = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return records.find(r => r.date?.startsWith(d));
  };

  return (
    <PageContent>
      <PageHeader title="Attendance" subtitle="Monthly attendance tracker" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select options={childOptions} value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="w-64" label="Child" />
        <Select options={monthOptions} value={month} onChange={e => setMonth(Number(e.target.value))} className="w-36" label="Month" />
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Present', value: summary.present, color: 'text-emerald-400' },
            { label: 'Absent', value: summary.absent, color: 'text-rose-400' },
            { label: 'Late', value: summary.late || 0, color: 'text-amber-400' },
            {
              label: 'Percentage', value: `${summary.percentage}%`,
              color: summary.percentage >= 75 ? 'text-emerald-400' : 'text-rose-400',
            },
          ].map(s => (
            <Card key={s.label}>
              <p className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">
          {MONTHS[month - 1]} {year}
        </h3>
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : (
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-slate-500 py-1">{d}</div>
              ))}
            </div>
            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const rec = getRecord(day);
                const isToday = day === new Date().getDate() && month === new Date().getMonth() + 1;
                return (
                  <div
                    key={day}
                    className={`rounded-lg p-1.5 min-h-[52px] flex flex-col items-center gap-1 border ${isToday ? 'border-violet-500 bg-violet-500/5' : 'border-slate-800'
                      }`}
                  >
                    <span className={`text-xs font-medium ${isToday ? 'text-violet-400' : 'text-slate-400'}`}>{day}</span>
                    {rec ? (
                      <span className={`text-[9px] px-1 py-0.5 rounded border font-medium leading-tight text-center ${statusColor(rec.status)}`}>
                        {rec.status === 'HalfDay' ? 'Half' : rec.status.slice(0, 4)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-800">
              {['Present', 'Absent', 'Late', 'HalfDay', 'Holiday'].map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${statusColor(s)}`}>
                    {s === 'HalfDay' ? 'Half' : s.slice(0, 4)}
                  </span>
                  <span className="text-xs text-slate-500">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </PageContent>
  );
}

// pages/parent/Marks.jsx
/**
 * PARENT MARKS PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/students               — parent's children
 *   GET /api/marks                  — marks filtered by student
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Select, Badge } from '../../components/ui.jsx';

function gradeColor(grade) {
  const map = {
    'A+': 'text-emerald-400', 'A': 'text-emerald-400',
    'B+': 'text-sky-400', 'B': 'text-sky-400',
    'C': 'text-amber-400', 'D': 'text-amber-400',
    'F': 'text-rose-400',
  };
  return map[grade] || 'text-slate-400';
}

function gradeBarColor(grade) {
  const map = {
    'A+': 'bg-emerald-500', 'A': 'bg-emerald-500',
    'B+': 'bg-sky-500', 'B': 'bg-sky-500',
    'C': 'bg-amber-500', 'D': 'bg-amber-500',
    'F': 'bg-rose-500',
  };
  return map[grade] || 'bg-slate-500';
}

export default function ParentMarks() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [marks, setMarks] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const res = await api.get(`${API.STUDENTS.BASE}?academicYear=${ay.data?._id}`);
        const kids = res.data || [];
        setChildren(kids);
        if (kids.length > 0) setSelectedChild(kids[0]._id);
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (selectedChild && ayId) fetchMarks();
  }, [selectedChild, ayId]);

  const fetchMarks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API.MARKS.BASE}?studentId=${selectedChild}&academicYear=${ayId}`);
      setMarks(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  const childOptions = children.map(c => ({
    value: c._id,
    label: `${c.firstName} ${c.lastName} (${c.classroom?.displayName || ''})`,
  }));

  // Group marks by exam type
  const groupedByExam = marks.reduce((acc, m) => {
    const key = m.exam?.name || 'Unknown';
    if (!acc[key]) acc[key] = { exam: m.exam, subjects: [] };
    acc[key].subjects.push(m);
    return acc;
  }, {});

  // Overall stats
  const presentMarks = marks.filter(m => !m.isAbsent);
  const totalObtained = presentMarks.reduce((s, m) => s + m.marksObtained, 0);
  const totalMax = presentMarks.reduce((s, m) => s + (m.exam?.totalMarks || 0), 0);
  const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

  return (
    <PageContent>
      <PageHeader title="Marks & Results" subtitle="Exam performance overview" />

      <div className="flex gap-3 mb-6">
        <Select options={childOptions} value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="w-64" label="Child" />
      </div>

      {/* Overall Summary */}
      {marks.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Obtained', value: `${totalObtained}/${totalMax}`, color: 'text-white' },
            { label: 'Overall %', value: `${overallPct}%`, color: overallPct >= 60 ? 'text-emerald-400' : 'text-rose-400' },
            { label: 'Exams Taken', value: Object.keys(groupedByExam).length, color: 'text-sky-400' },
          ].map(s => (
            <Card key={s.label}>
              <p className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading marks...</div>
      ) : marks.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm text-center py-8">No marks available yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByExam).map(([examName, { exam, subjects }]) => {
            const examObtained = subjects.filter(m => !m.isAbsent).reduce((s, m) => s + m.marksObtained, 0);
            const examMax = subjects.filter(m => !m.isAbsent).reduce((s, m) => s + (m.exam?.totalMarks || 0), 0);
            const examPct = examMax > 0 ? Math.round((examObtained / examMax) * 100) : 0;

            return (
              <Card key={examName}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">{examName}</h3>
                    {exam?.examType && <Badge label={exam.examType} color="indigo" />}
                    {exam?.examDate && (
                      <span className="ml-2 text-xs text-slate-500">{new Date(exam.examDate).toLocaleDateString('en-IN')}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${examPct >= 60 ? 'text-emerald-400' : 'text-rose-400'}`}>{examPct}%</p>
                    <p className="text-xs text-slate-500">{examObtained}/{examMax}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {subjects.map(m => {
                    const pct = m.isAbsent ? 0 : Math.round((m.marksObtained / (m.exam?.totalMarks || 1)) * 100);
                    return (
                      <div key={m._id} className="flex items-center gap-3">
                        <div className="w-28 text-xs text-slate-400 truncate flex-shrink-0">
                          {m.subject?.name || '—'}
                        </div>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${m.isAbsent ? 'bg-slate-600' : gradeBarColor(m.grade)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 w-20 justify-end">
                          {m.isAbsent ? (
                            <span className="text-xs text-slate-500">Absent</span>
                          ) : (
                            <>
                              <span className="text-xs text-white">{m.marksObtained}/{m.exam?.totalMarks}</span>
                              <span className={`text-xs font-bold w-6 text-right ${gradeColor(m.grade)}`}>{m.grade}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContent>
  );
}

// pages/parent/Fees.jsx
/**
 * PARENT FEES PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/students               — parent's children
 *   GET /api/fees                   — fee records for children
 *   GET /api/fees/:id/payments      — payment history
 */
import { useEffect, useState } from 'react';
import { Eye, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Select, feeStatusBadge, Modal } from '../../components/ui.jsx';

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function ParentFees() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [fees, setFees] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewPayments, setViewPayments] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const res = await api.get(`${API.STUDENTS.BASE}?academicYear=${ay.data?._id}`);
        const kids = res.data || [];
        setChildren(kids);
        if (kids.length > 0) setSelectedChild(kids[0]._id);
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (selectedChild && ayId) fetchFees();
  }, [selectedChild, ayId]);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API.FEES.BASE}?studentId=${selectedChild}&academicYear=${ayId}`);
      setFees(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  const childOptions = children.map(c => ({
    value: c._id,
    label: `${c.firstName} ${c.lastName}`,
  }));

  const totalDue = fees.filter(f => f.status !== 'Paid').reduce((s, f) => s + f.finalAmount, 0);
  const totalPaid = fees.filter(f => f.status === 'Paid').reduce((s, f) => s + f.finalAmount, 0);

  const columns = [
    {
      key: 'period', label: 'Period',
      render: (f) => <span className="font-medium text-white">{MONTHS_FULL[f.month - 1]} {f.year}</span>,
    },
    { key: 'tuitionFee', label: 'Tuition', render: (f) => `₹${f.tuitionFee?.toLocaleString()}` },
    {
      key: 'details', label: 'Extras',
      render: (f) => {
        const extras = [];
        if (f.transportFee > 0) extras.push(`Transport: ₹${f.transportFee}`);
        if (f.activityFee > 0) extras.push(`Activity: ₹${f.activityFee}`);
        if (f.discount > 0) extras.push(`Discount: -₹${f.discount}`);
        if (f.lateFine > 0) extras.push(`Late fine: ₹${f.lateFine}`);
        return extras.length > 0
          ? <span className="text-xs text-slate-400">{extras.join(', ')}</span>
          : <span className="text-slate-600">—</span>;
      },
    },
    {
      key: 'finalAmount', label: 'Total Due',
      render: (f) => <span className="font-semibold text-amber-400">₹{f.finalAmount?.toLocaleString()}</span>,
    },
    { key: 'dueDate', label: 'Due Date', render: (f) => new Date(f.dueDate).toLocaleDateString('en-IN') },
    { key: 'status', label: 'Status', render: (f) => feeStatusBadge(f.status) },
    {
      key: 'actions', label: '',
      render: (f) => (
        <Button size="sm" variant="ghost" onClick={() => setViewPayments(f)}>
          <Eye className="w-3 h-3 mr-1" /> Receipt
        </Button>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader title="Fee Details" subtitle="View your fee status and receipts" />

      <div className="flex gap-3 mb-6">
        {children.length > 1 && (
          <Select options={childOptions} value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="w-52" label="Child" />
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Paid', value: `₹${totalPaid.toLocaleString()}`, color: 'text-emerald-400' },
          { label: 'Outstanding', value: `₹${totalDue.toLocaleString()}`, color: totalDue > 0 ? 'text-rose-400' : 'text-white' },
          { label: 'Total Records', value: fees.length, color: 'text-sky-400' },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {totalDue > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <p className="text-sm text-rose-300">
            You have outstanding fees of <strong>₹{totalDue.toLocaleString()}</strong>. Please pay at the school office.
          </p>
        </div>
      )}

      <Card className="!p-0">
        <Table columns={columns} data={fees} loading={loading} emptyMessage="No fee records found" />
      </Card>

      {viewPayments && (
        <PaymentHistoryModal fee={viewPayments} onClose={() => setViewPayments(null)} />
      )}
    </PageContent>
  );
}

function PaymentHistoryModal({ fee, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  useEffect(() => {
    api.get(API.FEES.PAYMENTS(fee._id))
      .then(res => setPayments(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Modal open={true} onClose={onClose} title={`Receipts — ${months[fee.month - 1]} ${fee.year}`}>
      <div className="mb-4 p-3 bg-slate-800 rounded-lg text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Total Amount</span>
          <span className="text-white font-semibold">₹{fee.finalAmount?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-slate-400">Status</span>
          {feeStatusBadge(fee.status)}
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : payments.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">No payments made yet.</p>
      ) : (
        <div className="space-y-3">
          {payments.map(p => (
            <div key={p._id} className="p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-emerald-400">₹{p.amountPaid?.toLocaleString()}</p>
                <p className="text-xs text-slate-500 font-mono">{p.receiptNo}</p>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
                <span>Mode: {p.paymentMode}</span>
                <span>Date: {new Date(p.paymentDate).toLocaleDateString('en-IN')}</span>
                {p.transactionId && <span className="col-span-2">Txn: {p.transactionId}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-4">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

// pages/parent/Homework.jsx
/**
 * PARENT HOMEWORK PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/students               — parent's children
 *   GET /api/homework               — by classId of selected child
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Select, Badge } from '../../components/ui.jsx';

export default function ParentHomework() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [homework, setHomework] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const res = await api.get(`${API.STUDENTS.BASE}?academicYear=${ay.data?._id}`);
        const kids = res.data || [];
        setChildren(kids);
        if (kids.length > 0) setSelectedChild(kids[0]._id);
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (selectedChild && ayId) fetchHomework();
  }, [selectedChild, ayId]);

  const fetchHomework = async () => {
    const child = children.find(c => c._id === selectedChild);
    if (!child?.classroom?._id) return;
    setLoading(true);
    try {
      const res = await api.get(`${API.HOMEWORK.BASE}?classId=${child.classroom._id}&academicYear=${ayId}`);
      setHomework(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  const childOptions = children.map(c => ({
    value: c._id,
    label: `${c.firstName} ${c.lastName} (${c.classroom?.displayName || ''})`,
  }));

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();
  const today = homework.filter(h => !isOverdue(h.dueDate));
  const overdue = homework.filter(h => isOverdue(h.dueDate));

  return (
    <PageContent>
      <PageHeader title="Homework" subtitle="Assignments for your child" />

      <div className="flex gap-3 mb-6">
        {children.length > 1 && (
          <Select options={childOptions} value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="w-64" label="Child" />
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading...</div>
      ) : homework.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm text-center py-8">No homework assigned yet.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {today.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Upcoming</h3>
              <div className="space-y-3">
                {today.map(hw => <HomeworkCard key={hw._id} hw={hw} overdue={false} />)}
              </div>
            </div>
          )}
          {overdue.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3">Overdue</h3>
              <div className="space-y-3">
                {overdue.map(hw => <HomeworkCard key={hw._id} hw={hw} overdue={true} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </PageContent>
  );
}

function HomeworkCard({ hw, overdue }) {
  return (
    <Card className={overdue ? '!border-rose-500/20' : ''}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white">{hw.title}</h3>
            <Badge label={hw.subject?.name || '—'} color="indigo" />
          </div>
          {hw.description && (
            <p className="text-xs text-slate-400 leading-relaxed">{hw.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span>Class: {hw.classroom?.displayName}</span>
            <span>·</span>
            <span>By: {hw.teacher?.name || 'Teacher'}</span>
            <span>·</span>
            <span>Assigned: {new Date(hw.createdAt).toLocaleDateString('en-IN')}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-xs font-semibold ${overdue ? 'text-rose-400' : 'text-amber-400'}`}>
            {overdue ? 'Overdue' : 'Due'}
          </p>
          <p className="text-xs text-slate-300">{new Date(hw.dueDate).toLocaleDateString('en-IN')}</p>
        </div>
      </div>
    </Card>
  );
}

// pages/parent/Notices.jsx
/**
 * PARENT NOTICES PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/notices                — filtered to parent role
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Badge } from '../../components/ui.jsx';

function priorityColor(p) {
  return { Urgent: 'red', Important: 'yellow', Normal: 'slate' }[p] || 'slate';
}

export default function ParentNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        const res = await api.get(`${API.NOTICES.BASE}?academicYear=${ay.data?._id}`);
        setNotices(res.data || []);
      } catch { } finally { setLoading(false); }
    })();
  }, []);

  const urgent = notices.filter(n => n.priority === 'Urgent');
  const important = notices.filter(n => n.priority === 'Important');
  const normal = notices.filter(n => n.priority === 'Normal');

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const NoticeGroup = ({ title, items, borderColor }) => items.length > 0 && (
    <div>
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${borderColor === 'rose' ? 'text-rose-400' : borderColor === 'amber' ? 'text-amber-400' : 'text-slate-400'
        }`}>{title}</h3>
      <div className="space-y-3 mb-6">
        {items.map(n => (
          <Card key={n._id} className={`border-l-4 ${borderColor === 'rose' ? 'border-l-rose-500' :
            borderColor === 'amber' ? 'border-l-amber-500' : 'border-l-slate-600'
            }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <h4 className="text-sm font-semibold text-white">{n.title}</h4>
                  <Badge label={n.priority} color={priorityColor(n.priority)} />
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{n.content}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                  <span>From: {n.createdBy?.name || 'School'}</span>
                  <span>·</span>
                  <span>{new Date(n.publishDate).toLocaleDateString('en-IN')}</span>
                  {n.expiryDate && (
                    <>
                      <span>·</span>
                      <span>Expires {new Date(n.expiryDate).toLocaleDateString('en-IN')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <PageContent>
      <PageHeader title="School Notices" subtitle={`${notices.length} active notices`} />

      {notices.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm text-center py-8">No notices at this time.</p>
        </Card>
      ) : (
        <>
          <NoticeGroup title="🚨 Urgent" items={urgent} borderColor="rose" />
          <NoticeGroup title="⚠️ Important" items={important} borderColor="amber" />
          <NoticeGroup title="📢 General" items={normal} borderColor="slate" />
        </>
      )}
    </PageContent>
  );
}

// pages/parent/Timetable.jsx
/**
 * PARENT TIMETABLE PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/students               — parent's children to get classId
 *   GET /api/timetable/:classId     — timetable for that class
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Select } from '../../components/ui.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_COLORS = {
  Monday: 'border-l-indigo-500',
  Tuesday: 'border-l-violet-500',
  Wednesday: 'border-l-sky-500',
  Thursday: 'border-l-emerald-500',
  Friday: 'border-l-amber-500',
  Saturday: 'border-l-rose-500',
};

export default function ParentTimetable() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const res = await api.get(`${API.STUDENTS.BASE}?academicYear=${ay.data?._id}`);
        const kids = res.data || [];
        setChildren(kids);
        if (kids.length > 0) setSelectedChild(kids[0]._id);
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (selectedChild && ayId) fetchTimetable();
  }, [selectedChild, ayId]);

  const fetchTimetable = async () => {
    const child = children.find(c => c._id === selectedChild);
    const classId = child?.classroom?._id || child?.classroom;
    if (!classId) return;

    setLoading(true);
    try {
      const res = await api.get(`${API.TIMETABLE.BY_CLASS(classId)}?academicYear=${ayId}`);
      setTimetable(res.data);
    } catch {
      setTimetable(null);
    } finally { setLoading(false); }
  };

  const childOptions = children.map(c => ({
    value: c._id,
    label: `${c.firstName} ${c.lastName} (${c.classroom?.displayName || ''})`,
  }));

  const getScheduleForDay = (day) => {
    if (!timetable?.schedule) return [];
    const dayData = timetable.schedule.find(s => s.day === day);
    return (dayData?.periods || []).filter(p => p.subject?.name || p.startTime);
  };

  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

  return (
    <PageContent>
      <PageHeader title="Class Timetable" subtitle="Weekly schedule" />

      <div className="flex gap-3 mb-6">
        {children.length > 1 && (
          <Select options={childOptions} value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="w-64" label="Child" />
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading timetable...</div>
      ) : !timetable ? (
        <Card>
          <p className="text-slate-500 text-sm text-center py-8">No timetable published yet for this class.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {DAYS.map(day => {
            const periods = getScheduleForDay(day);
            const isToday = day === todayName;
            return (
              <Card
                key={day}
                className={`border-l-4 ${DAY_COLORS[day]} ${isToday ? 'ring-1 ring-violet-500/40' : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {day}
                    {isToday && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-medium">Today</span>
                    )}
                  </h3>
                  <span className="text-xs text-slate-500">{periods.length} period(s)</span>
                </div>

                {periods.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No periods scheduled</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {periods.map((p, i) => (
                      <div key={i} className="bg-slate-800 rounded-lg px-3 py-2 border border-slate-700 min-w-[110px]">
                        <div className="text-xs text-slate-500 mb-0.5">Period {p.periodNo}</div>
                        {p.startTime && p.endTime && (
                          <div className="text-xs font-mono text-indigo-400 mb-1">{p.startTime}–{p.endTime}</div>
                        )}
                        <div className="text-sm font-semibold text-white leading-tight">
                          {p.subject?.name || <span className="text-slate-500 font-normal italic text-xs">Free</span>}
                        </div>
                        {p.teacher?.name && (
                          <div className="text-xs text-slate-500 mt-0.5">{p.teacher.name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageContent>
  );
}

