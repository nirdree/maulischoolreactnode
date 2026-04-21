// App.jsx -
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute, RoleRoute, RoleRedirect } from './guards.jsx';
import { ROLES } from './api/constants.js';

// Layouts
import AdminLayout    from './components/layout/AdminLayout.jsx';
import TeacherLayout  from './components/layout/TeacherLayout.jsx';
import ParentLayout   from './components/layout/ParentLayout.jsx';

// Auth Pages
import LoginPage from './pages/shared/LoginPage.jsx';
import Unauthorized from './pages/shared/Unauthorized.jsx';

// ── Admin / Principal Pages ──────────────────────────────────
import AdminDashboard     from './pages/admin/Dashboard.jsx';
import StudentsPage       from './pages/admin/Students.jsx';
import StudentDetailPage from './pages/admin/StudentDetail.jsx';
import EmployeesPage      from './pages/admin/Employees.jsx';
import ClassroomsPage     from './pages/admin/Classrooms.jsx';
import SubjectsPage       from './pages/admin/Subjects.jsx';
import EnquiriesPage      from './pages/admin/Enquiries.jsx';
import FeesPage           from './pages/admin/Fees.jsx';
import PayrollPage        from './pages/admin/Payroll.jsx';
import LeavesAdminPage    from './pages/admin/Leaves.jsx';
import NoticesAdminPage   from './pages/admin/Notices.jsx';
import TimetableAdminPage from './pages/admin/Timetable.jsx';
import PromotePage        from './pages/admin/Promote.jsx';
import SettingsPage       from './pages/admin/Settings.jsx';
import ReportsPage        from './pages/admin/Reports.jsx';
import AcademicYearsPage  from './pages/admin/AcademicYears.jsx';
import AttendanceAdminPage from './pages/admin/Attendance.jsx';
import ExamsAdminPage      from './pages/admin/Exams.jsx';

// ── Teacher Pages ─────────────────────────────────────────────
import TeacherDashboard  from './pages/teacher/Dashboard.jsx';
import AttendancePage    from './pages/teacher/Attendance.jsx';
import ExamsPage         from './pages/teacher/Exams.jsx';
import HomeworkPage      from './pages/teacher/Homework.jsx';
import TeacherLeaves     from './pages/teacher/Leaves.jsx';
import TeacherNotices    from './pages/teacher/Notices.jsx';
import TeacherTimetable  from './pages/teacher/Timetable.jsx';

// ── Parent Pages ──────────────────────────────────────────────
import ParentDashboard   from './pages/parent/Dashboard.jsx';
import MyChildren        from './pages/parent/MyChildren.jsx';
import ParentAttendance  from './pages/parent/Attendance.jsx';
import ParentMarks       from './pages/parent/Marks.jsx';
import ParentFees        from './pages/parent/Fees.jsx';
import ParentHomework    from './pages/parent/Homework.jsx';
import ParentNotices     from './pages/parent/Notices.jsx';
import ParentTimetable   from './pages/parent/Timetable.jsx';

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.PRINCIPAL];

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login"        element={<LoginPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/"             element={<RoleRedirect />} />

          {/* ── Admin & Principal ── */}
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={ADMIN_ROLES}>
                <AdminLayout />
              </RoleRoute>
            }
          >
            <Route index                  element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"       element={<AdminDashboard />} />
            <Route path="students"        element={<StudentsPage />} />
            <Route path="students/:id"     element={<StudentDetailPage />} />
            <Route path="employees"       element={<EmployeesPage />} />
            <Route path="classrooms"      element={<ClassroomsPage />} />
            <Route path="subjects"        element={<SubjectsPage />} />
            <Route path="enquiries"       element={<EnquiriesPage />} />
            <Route path="attendance"      element={<AttendanceAdminPage />} />
            <Route path="exams"           element={<ExamsAdminPage />} />
            <Route path="fees"            element={<FeesPage />} />
            <Route path="payroll"         element={<PayrollPage allowedRoles={[ROLES.ADMIN]} />} />
            <Route path="leaves"          element={<LeavesAdminPage />} />
            <Route path="notices"         element={<NoticesAdminPage />} />
            <Route path="timetable"       element={<TimetableAdminPage />} />
            <Route path="promote"         element={<PromotePage />} />
            <Route path="reports"         element={<ReportsPage />} />
            <Route path="academic-years"  element={<AcademicYearsPage allowedRoles={[ROLES.ADMIN]} />} />
            <Route path="settings"        element={<SettingsPage allowedRoles={[ROLES.ADMIN]} />} />
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
            <Route index                element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"     element={<TeacherDashboard />} />
            <Route path="attendance"    element={<AttendancePage />} />
            <Route path="exams"         element={<ExamsPage />} />
            <Route path="homework"      element={<HomeworkPage />} />
            <Route path="leaves"        element={<TeacherLeaves />} />
            <Route path="notices"       element={<TeacherNotices />} />
            <Route path="timetable"     element={<TeacherTimetable />} />
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
            <Route index              element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"   element={<ParentDashboard />} />
            <Route path="my-children" element={<MyChildren />} />
            <Route path="attendance"  element={<ParentAttendance />} />
            <Route path="marks"       element={<ParentMarks />} />
            <Route path="fees"        element={<ParentFees />} />
            <Route path="homework"    element={<ParentHomework />} />
            <Route path="notices"     element={<ParentNotices />} />
            <Route path="timetable"   element={<ParentTimetable />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}