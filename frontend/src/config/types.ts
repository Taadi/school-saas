import { type LucideIcon } from 'lucide-react';
import { type SchoolRole } from '@/auth/lib/models';

export interface MenuItem {
  title?: string;
  icon?: LucideIcon;
  path?: string;
  rootPath?: string;
  childrenIndex?: number;
  heading?: string;
  children?: MenuConfig;
  disabled?: boolean;
  collapse?: boolean;
  collapseTitle?: string;
  expandTitle?: string;
  badge?: string;
  separator?: boolean;
  /**
   * If set, the item is only shown to the listed roles. When omitted, the item
   * is visible to every authenticated user.
   */
  roles?: SchoolRole[];
  /**
   * Hide this item while a super-admin is impersonating a school. Useful for
   * platform-only links that should disappear when the user enters a tenant.
   */
  hideWhenImpersonating?: boolean;
  /**
   * For super_admin only: show while impersonating a school. School admins and
   * teachers are unaffected and always see the item when their role matches.
   */
  onlyWhenImpersonating?: boolean;
}

export type MenuConfig = MenuItem[];

export interface Settings {
  container: 'fixed' | 'fluid';
  layout: string;
  layouts: {
    demo1: {
      sidebarCollapse: boolean;
      sidebarTheme: 'dark';
    };
    demo2: {
      headerSticky: boolean;
      headerStickyOffset: number;
    };
    demo5: {
      headerSticky: boolean;
      headerStickyOffset: number;
    };
    demo7: {
      headerSticky: boolean;
      headerStickyOffset: number;
    };
    demo9: {
      headerSticky: boolean;
      headerStickyOffset: number;
    };
  };
}
