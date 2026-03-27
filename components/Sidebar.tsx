'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, User, FileText, Briefcase,
  TicketIcon, Archive, Building2, Layers, Package,
  Link as LinkIcon, Shield, LogOut, ChevronLeft, ChevronRight,
  User as UserIcon
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}
import { logout } from '@/utils/api';

const Sidebar = ({ isCollapsed, setIsCollapsed }: SidebarProps) => {
  const { hasPermission, loading, user } = usePermissions();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      router.refresh();
    } catch (err: any) {
      console.error('Logout failed:', err);
      // Fallback redirect even if API fails
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div style={{
        width: isCollapsed ? '5%' : '15%',
        backgroundColor: 'var(--surface-color)',
        borderRight: '1px solid var(--border-color)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'width 0.3s ease'
      }}></div>
    );
  }

  // Determine if MASTERS section should be shown
  const showMasters = hasPermission(PERMISSIONS.CLIENTS_VIEW) ||
    hasPermission(PERMISSIONS.PRODUCTS_VIEW) ||
    hasPermission(PERMISSIONS.PROJECT_TYPES_VIEW) ||
    hasPermission(PERMISSIONS.LEAD_SOURCES_VIEW) ||
    hasPermission(PERMISSIONS.ROLES_VIEW) ||
    hasPermission(PERMISSIONS.USERS_VIEW);

  return (
    <div style={{
      width: isCollapsed ? '5%' : '15%',
      backgroundColor: 'var(--surface-color)',
      borderRight: '1px solid var(--border-color)',
      padding: isCollapsed ? '2rem 0.5rem 1rem 0.5rem' : '2rem 1rem 1rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      transition: 'all 0.3s ease',
      zIndex: 20
    }}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute',
          right: '-12px',
          top: isCollapsed ? '49px' : '75px',
          width: '2.4rem',
          height: '2.4rem',
          borderRadius: '50%',
          backgroundColor: 'white',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 30,
          color: 'var(--text-secondary)'
        }}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div style={{
        marginBottom: '3rem',
        padding: isCollapsed ? '0' : '0 1rem',
        textAlign: isCollapsed ? 'center' : 'left',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }}>
        <h2 style={{
          color: 'var(--primary-color)',
          letterSpacing: '-0.05em',
          fontSize: isCollapsed ? '1.2rem' : '1.5rem'
        }}>
          PMS{!isCollapsed && <span style={{ color: 'var(--text-primary)' }}>.ERP</span>}
        </h2>
        {!isCollapsed && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Project Management System</p>}
      </div>

      <nav style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflowY: 'auto',
        gap: '0.25rem'
      }}>
        {hasPermission(PERMISSIONS.DASHBOARD_VIEW) && <SidebarLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" isCollapsed={isCollapsed} />}
        {hasPermission(PERMISSIONS.LEADS_VIEW) && <SidebarLink to="/leads" icon={<Users size={20} />} label="Leads" isCollapsed={isCollapsed} />}
        {hasPermission(PERMISSIONS.QUOTATIONS_VIEW) && <SidebarLink to="/quotations" icon={<FileText size={20} />} label="Quotations" isCollapsed={isCollapsed} />}
        {hasPermission(PERMISSIONS.PROJECTS_VIEW) && <SidebarLink to="/projects" icon={<Briefcase size={20} />} label="Projects" isCollapsed={isCollapsed} />}
        {hasPermission(PERMISSIONS.TICKETS_VIEW) && <SidebarLink to="/tickets" icon={<TicketIcon size={20} />} label="Tickets" isCollapsed={isCollapsed} />}
        {hasPermission(PERMISSIONS.ARCHIVES_VIEW) && <SidebarLink to="/archives" icon={<Archive size={20} />} label="Cancelled Items" isCollapsed={isCollapsed} />}

        {showMasters && (
          <>
            {isCollapsed && (
              <div style={{
                height: '1px',
                backgroundColor: 'var(--border-color)',
                margin: isCollapsed ? '1rem 0.5rem' : '1.5rem 1rem 0.75rem 1rem'
              }}></div>
            )}
            {!isCollapsed && (
              <h2 style={{
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                textAlign: 'left',
                padding: '0 1rem',
                marginTop: '1rem',
                marginBottom: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Masters</h2>
            )}
            {hasPermission(PERMISSIONS.CLIENTS_VIEW) && <SidebarLink to="/clients" icon={<Building2 size={20} />} label="Clients" isCollapsed={isCollapsed} />}
            {hasPermission(PERMISSIONS.PROJECT_TYPES_VIEW) && <SidebarLink to="/project-types" icon={<Layers size={20} />} label="Project Types" isCollapsed={isCollapsed} />}
            {hasPermission(PERMISSIONS.PRODUCTS_VIEW) && <SidebarLink to="/products" icon={<Package size={20} />} label="Services" isCollapsed={isCollapsed} />}
            {hasPermission(PERMISSIONS.LEAD_SOURCES_VIEW) && <SidebarLink to="/lead-sources" icon={<LinkIcon size={20} />} label="Lead Sources" isCollapsed={isCollapsed} />}
            {hasPermission(PERMISSIONS.ROLES_VIEW) && <SidebarLink to="/roles" icon={<Shield size={20} />} label="Roles" isCollapsed={isCollapsed} />}
            {hasPermission(PERMISSIONS.USERS_VIEW) && <SidebarLink to="/users" icon={<User size={20} />} label="Users" isCollapsed={isCollapsed} />}
          </>
        )}
      </nav>

      {/* User Profile Section (Lookalike from Header) */}
      {user && (
        <div style={{
          marginTop: 'auto',
          padding: isCollapsed ? '1rem 0' : '1rem 0.5rem 0.5rem 0.5rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: isCollapsed ? 'column' : 'row',
          alignItems: 'center',
          gap: isCollapsed ? '1rem' : '0.75rem',
          justifyContent: isCollapsed ? 'center' : 'flex-start'
        }}>
          {!isCollapsed && (
            <>
              <div style={{
                width: '3.6rem',
                height: '3.6rem',
                backgroundColor: '#eff6ff',
                color: '#3b82f6',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #dbeafe',
                flexShrink: 0
              }}>
                <UserIcon size={20} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>{user.Name}</p>
                <p style={{
                  margin: 0,
                  fontSize: '0.75rem',
                  color: 'var(--primary-color)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>{user.Role_Name}</p>
              </div>
            </>
          )}

          <button
            onClick={handleLogout}
            title="Log Out"
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fff1f2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          >
            <LogOut size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

const SidebarLink = ({ to, icon, label, isCollapsed }: { to: string, icon: ReactNode, label: string, isCollapsed: boolean }) => {
  const pathname = usePathname();
  const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));

  return (
    <Link
      href={to}
      title={isCollapsed ? label : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isCollapsed ? '0' : '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: '0.5rem',
        textDecoration: 'none',
        color: isActive ? 'white' : 'var(--text-secondary)',
        backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
        transition: 'all 0.2s ease',
        fontWeight: 500,
        fontSize: '0.95rem',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        overflow: 'hidden'
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
    </Link>
  );
};

export default Sidebar;
