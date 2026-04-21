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
  { label: 'Employees', path: 'employees', icon: UserCheck, roles: ['admin', 'principal'] },
  { label: 'Classrooms', path: 'classrooms', icon: School, roles: ['admin', 'principal'] },
  { label: 'Subjects', path: 'subjects', icon: BookOpen, roles: ['admin', 'principal'] },
  { label: 'Timetable', path: 'timetable', icon: Clock, roles: ['admin', 'principal'] },
  { label: 'Exams & Marks', path: 'exams', icon: FileText, roles: ['admin', 'principal'] },
  { label: 'Attendance', path: 'attendance', icon: CheckSquare, roles: ['admin', 'principal'] },
  { label: 'Students', path: 'students', icon: Users, roles: ['admin', 'principal'] },
  { label: 'Fees', path: 'fees', icon: DollarSign, roles: ['admin', 'principal'] },
  { label: 'Payroll', path: 'payroll', icon: Banknote, roles: ['admin'] },
  { label: 'Leaves', path: 'leaves', icon: CalendarDays, roles: ['admin', 'principal'] },
  // { label: 'Homework',        path: 'homework',        icon: ClipboardList,    roles: ['admin','principal'] },
  { label: 'Notices', path: 'notices', icon: Bell, roles: ['admin', 'principal'] },
  { label: 'Promote', path: 'promote', icon: ArrowUpCircle, roles: ['admin', 'principal'] },
  { label: 'Reports', path: 'reports', icon: BarChart3, roles: ['admin', 'principal'] },
  { label: 'Academic Years', path: 'academic-years', icon: CalendarRange, roles: ['admin'] },
  { label: 'Enquiries', path: 'enquiries', icon: ClipboardList, roles: ['admin', 'principal'] },
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
          {sidebarOpen && (<>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">Sunrise School</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div></>
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