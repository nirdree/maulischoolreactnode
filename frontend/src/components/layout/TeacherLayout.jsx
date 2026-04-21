// components/layout/TeacherLayout.jsx - Main layout for teachers with sidebar navigation
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap, LayoutDashboard, CheckSquare, FileText,
  ClipboardList, CalendarDays, Bell, Clock, LogOut, Menu, X,
} from 'lucide-react';

const TEACHER_NAV = [
  { label: 'Dashboard',  path: 'dashboard',  icon: LayoutDashboard },
  { label: 'Attendance', path: 'attendance', icon: CheckSquare },
  { label: 'Exams',      path: 'exams',      icon: FileText },
  { label: 'Homework',   path: 'homework',   icon: ClipboardList },
  { label: 'Leaves',     path: 'leaves',     icon: CalendarDays },
  { label: 'Notices',    path: 'notices',    icon: Bell },
  { label: 'Timetable',  path: 'timetable',  icon: Clock },
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
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? `bg-${accentColor}-600 text-white` : 'text-slate-400 hover:text-white hover:bg-slate-800'
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
  { label: 'Dashboard',   path: 'dashboard',   icon: LayoutDashboard },
  { label: 'My Children', path: 'my-children', icon: GraduationCap },
  { label: 'Attendance',  path: 'attendance',  icon: CheckSquare },
  { label: 'Marks',       path: 'marks',       icon: FileText },
  { label: 'Fees',        path: 'fees',        icon: ClipboardList },
  { label: 'Homework',    path: 'homework',    icon: ClipboardList },
  { label: 'Notices',     path: 'notices',     icon: Bell },
  { label: 'Timetable',   path: 'timetable',   icon: Clock },
];

export function ParentLayout() {
  return <SidebarLayout navItems={PARENT_NAV} prefix="parent" accentColor="violet" />;
}

export default TeacherLayout;