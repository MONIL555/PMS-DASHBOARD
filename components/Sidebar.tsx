'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, User, FileText, Briefcase,
  TicketIcon, Archive, Building2, Package,
  Link as LinkIcon, Shield, LogOut, ChevronLeft, ChevronRight,
  User as UserIcon, ChevronDown, ChevronUp, Bell
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { logout } from '@/utils/api';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const Sidebar = ({ isCollapsed, setIsCollapsed }: SidebarProps) => {
  const { hasPermission, loading, user } = usePermissions();
  const router = useRouter();
  const pathname = usePathname();
  const [isMastersOpen, setIsMastersOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      router.refresh();
    } catch (err: any) {
      console.error('Logout failed:', err);
      router.push('/login');
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsCollapsed]);

  if (loading) {
    return (
      <div style={{
        width: isCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
        backgroundColor: 'var(--surface-color)',
        borderRight: '1px solid var(--border-color)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'width 0.3s ease'
      }}></div>
    );
  }

  const showMasters = hasPermission(PERMISSIONS.CLIENTS_VIEW) ||
    hasPermission(PERMISSIONS.PRODUCTS_VIEW) ||
    hasPermission(PERMISSIONS.LEAD_SOURCES_VIEW) ||
    hasPermission(PERMISSIONS.ROLES_VIEW) ||
    hasPermission(PERMISSIONS.USERS_VIEW) ||
    hasPermission(PERMISSIONS.NOTIFICATIONS_VIEW);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && !isCollapsed && (
        <div
          onClick={() => setIsCollapsed(true)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
            animation: 'fadeIn 0.2s ease'
          }}
        />
      )}

      <div style={{
        width: isCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)',
        backgroundColor: 'var(--surface-color)',
        borderRight: '1px solid var(--border-color)',
        padding: isCollapsed ? '1.5rem 0.5rem 1rem 0.5rem' : '1.5rem 1.25rem 1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: isMobile ? 'fixed' : 'sticky',
        left: 0,
        top: 0,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 100,
        flexShrink: 0,
        boxShadow: isCollapsed ? 'none' : '4px 0 24px -15px rgba(15, 23, 42, 0.2)',
        transform: isMobile && isCollapsed ? 'translateX(-100%)' : 'translateX(0)',
        overflowX: 'hidden'
      }}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            position: 'absolute',
            right: 'calc(-2.2rem / 2)',
            top: '48px',
            width: '3.4rem',
            height: '3.4rem',
            borderRadius: '50%',
            backgroundColor: 'white',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            zIndex: 30,
            color: 'var(--text-secondary)',
            transition: 'transform 0.2s, background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Header/Logo */}
        <div style={{
          marginBottom: '2.5rem',
          padding: isCollapsed ? '0' : '0 0.5rem',
          textAlign: isCollapsed ? 'center' : 'left',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          flexShrink: 0 /* FIX: Prevents logo from squishing */
        }}>
          <h2 style={{
            color: 'var(--primary-color)',
            letterSpacing: '-0.06em',
            fontSize: isCollapsed ? '1.4rem' : '1.8rem',
            fontWeight: 900,
            margin: 0,
            transition: 'font-size 0.3s'
          }}>
            PMS{!isCollapsed && <span style={{ color: 'var(--text-primary)' }}>.ERP</span>}
          </h2>
          {!isCollapsed && <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>Project Management</p>}
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
                  margin: '1rem 0.25rem',
                  flexShrink: 0 /* FIX */
                }}></div>
              )}
              {!isCollapsed && (
                <div
                  onClick={() => setIsMastersOpen(!isMastersOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 0.5rem',
                    marginTop: '1.5rem',
                    marginBottom: '0.75rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    flexShrink: 0 /* FIX: Prevents the header from squishing */
                  }}
                >
                  <h2 style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: 0
                  }}>Masters</h2>
                  <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isMastersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              )}
              {(isMastersOpen || isCollapsed) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 /* FIX: Prevents entire block from squishing */ }}>
                  {hasPermission(PERMISSIONS.CLIENTS_VIEW) && <SidebarLink to="/clients" icon={<Building2 size={20} />} label="Clients" isCollapsed={isCollapsed} />}
                  {hasPermission(PERMISSIONS.PRODUCTS_VIEW) && <SidebarLink to="/products" icon={<Package size={20} />} label="Services" isCollapsed={isCollapsed} />}
                  {hasPermission(PERMISSIONS.LEAD_SOURCES_VIEW) && <SidebarLink to="/lead-sources" icon={<LinkIcon size={20} />} label="Lead Sources" isCollapsed={isCollapsed} />}
                  {hasPermission(PERMISSIONS.ROLES_VIEW) && <SidebarLink to="/roles" icon={<Shield size={20} />} label="Roles" isCollapsed={isCollapsed} />}
                  {hasPermission(PERMISSIONS.USERS_VIEW) && <SidebarLink to="/users" icon={<User size={20} />} label="Users" isCollapsed={isCollapsed} />}
                  {hasPermission(PERMISSIONS.NOTIFICATIONS_VIEW) && <SidebarLink to="/notifications" icon={<Bell size={20} />} label="Notifications" isCollapsed={isCollapsed} />}
                </div>
              )}
            </>
          )}
        </nav>

        {/* User Profile Section */}
        {user && (
          <div style={{
            marginTop: 'auto',
            padding: isCollapsed ? '1rem 0 0 0' : '1rem 0.5rem 0.5rem 0.5rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: isCollapsed ? 'column' : 'row',
            alignItems: 'center',
            gap: isCollapsed ? '1rem' : '0.75rem',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            flexShrink: 0 /* FIX: Protects profile section */
          }}>
            {!isCollapsed && (
              <>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  backgroundColor: '#eff6ff',
                  color: '#3b82f6',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #dbeafe',
                  flexShrink: 0
                }}>
                  <UserIcon size={18} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>{user.Name}</p>
                  <p style={{
                    margin: 0,
                    fontSize: '0.7rem',
                    color: 'var(--primary-color)',
                    fontWeight: 600,
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
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0 /* FIX */
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </>
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
        padding: isCollapsed ? '0.75rem 0' : '0.75rem 1rem',
        borderRadius: '0.75rem',
        textDecoration: 'none',
        color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
        backgroundColor: isActive ? '#eff6ff' : 'transparent',
        transition: 'all 0.2s ease',
        fontWeight: isActive ? 700 : 600,
        fontSize: '0.85rem',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        overflow: 'hidden',
        border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
        flexShrink: 0, /* THE MAGIC FIX: Protects the entire button from vertical squishing */
      }}
      onMouseOver={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseOut={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 /* PROTECTS THE ICON */ }}>{icon}</span>
      {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
    </Link>
  );
};

export default Sidebar;