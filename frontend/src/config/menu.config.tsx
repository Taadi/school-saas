import {
  ArrowUpRight,
  BookOpen,
  Building,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  GraduationCap,
  Layers,
  LayoutGrid,
  PencilLine,
  Receipt,
  Settings,
  SlidersHorizontal,
  UserCheck,
  UserCircle,
  Wallet,
} from 'lucide-react';
import { type MenuConfig } from './types';

export const MENU_SIDEBAR: MenuConfig = [
  /* ----- Platform admin (super_admin only, hidden while impersonating) ----- */
  {
    heading: 'Platform',
    roles: ['super_admin'],
    hideWhenImpersonating: true,
  },
  {
    title: 'Overview',
    icon: LayoutGrid,
    path: '/admin',
    roles: ['super_admin'],
    hideWhenImpersonating: true,
  },
  {
    title: 'Schools',
    icon: Building,
    path: '/admin/schools',
    roles: ['super_admin'],
    hideWhenImpersonating: true,
  },
  {
    title: 'Platform Settings',
    icon: Settings,
    path: '/admin/platform-settings',
    roles: ['super_admin'],
    hideWhenImpersonating: true,
  },

  /* ----- Tenant-scoped (school_admin, teacher, and impersonating super_admin) ----- */
  {
    title: 'Dashboard',
    icon: LayoutGrid,
    path: '/dashboard',
  },
  {
    heading: 'School Management',
    roles: ['super_admin', 'school_admin', 'teacher'],
  },
  {
    title: 'Students',
    icon: GraduationCap,
    path: '/students',
    roles: ['super_admin', 'school_admin', 'teacher'],
  },
  {
    title: 'Teachers',
    icon: UserCheck,
    path: '/teachers',
    roles: ['super_admin', 'school_admin'],
  },
  {
    title: 'Classes & Arms',
    icon: Layers,
    path: '/academic/classes',
    roles: ['super_admin', 'school_admin'],
  },
  {
    title: 'Subjects',
    icon: BookOpen,
    path: '/academic/subjects',
    roles: ['super_admin', 'school_admin', 'teacher'],
  },
  {
    title: 'Academic Sessions',
    icon: CalendarDays,
    path: '/academic/sessions',
    roles: ['super_admin', 'school_admin'],
  },
  {
    title: 'Promotion Manager',
    icon: ArrowUpRight,
    path: '/academic/promotions',
    roles: ['super_admin', 'school_admin'],
  },

  { heading: 'College Report' },
  {
    title: 'Score Entry',
    icon: PencilLine,
    path: '/results/entry',
    roles: ['super_admin', 'school_admin', 'teacher'],
  },
  {
    title: 'All Results',
    icon: ClipboardList,
    path: '/results',
  },
  {
    title: 'Report Setup',
    icon: SlidersHorizontal,
    path: '/college-report/setup',
    roles: ['super_admin', 'school_admin'],
  },
  {
    title: 'Weekly Evaluation',
    icon: ClipboardList,
    path: '/evaluations/entry',
    roles: ['super_admin', 'school_admin', 'teacher'],
  },
  {
    title: 'Evaluation Rubrics',
    icon: SlidersHorizontal,
    path: '/evaluations/rubrics',
    roles: ['super_admin', 'school_admin'],
  },

  { heading: 'Fees' },
  {
    title: 'Fees Dashboard',
    icon: Wallet,
    path: '/fees',
    roles: ['super_admin', 'school_admin'],
  },
  {
    title: 'Invoices',
    icon: Receipt,
    path: '/fees/invoices',
  },
  {
    title: 'Fee Structures',
    icon: Layers,
    path: '/fees/structures',
    roles: ['super_admin', 'school_admin'],
  },
  {
    title: 'Fee Categories',
    icon: CircleDollarSign,
    path: '/fees/categories',
    roles: ['super_admin', 'school_admin'],
  },

  /* ----- Universal account ----- */
  { heading: 'Account' },
  {
    title: 'Account Settings',
    icon: UserCircle,
    path: '/account/settings',
  },
];
