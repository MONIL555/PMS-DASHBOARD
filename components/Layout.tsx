'use client';

import { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Bell, X, ChevronRight } from 'lucide-react';
import { fetchPaymentReminders } from '@/utils/api';

const Layout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersDismissed, setRemindersDismissed] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load payment reminders
  useEffect(() => {
    if (isLoginPage) return;
    const dismissed = sessionStorage.getItem('reminders_dismissed');
    if (dismissed === 'true') {
      setRemindersDismissed(true);
      return;
    }

    const loadReminders = async () => {
      try {
        const data = await fetchPaymentReminders();
        setReminders(data.reminders || []);
      } catch {
        // Silently fail — reminders are non-critical
      }
    };
    loadReminders();
  }, [isLoginPage]);

  const handleDismissReminders = () => {
    setRemindersDismissed(true);
    sessionStorage.setItem('reminders_dismissed', 'true');
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-container" style={{ overflow: 'hidden', height: '100vh', width: '100vw' }}>
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Mobile Header */}
        {isMobile && (
          <header style={{
            height: '60px',
            backgroundColor: 'var(--surface-color)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.5rem',
            justifyContent: 'space-between',
            zIndex: 80
          }}>
            <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, color: 'var(--primary-color)' }}>
              PMS<span style={{ color: 'var(--text-primary)' }}>.ERP</span>
            </h1>
            <button
              onClick={() => setIsCollapsed(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Menu size={24} />
            </button>
          </header>
        )}

        {/* Payment Reminder Banner */}
        {!remindersDismissed && reminders.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            borderBottom: '1px solid rgba(245,158,11,0.2)',
            padding: '0.6rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            zIndex: 50,
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, overflow: 'hidden' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                backgroundColor: 'rgba(245,158,11,0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Bell size={14} color="#d97706" />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>
                  {reminders.length} Payment Reminder{reminders.length > 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#a16207', marginLeft: '0.5rem' }}>
                  — {reminders[0]?.serviceName} ({reminders[0]?.projectCode}){reminders[0]?.urgent ? ' ⚡ Due today!' : ` due in ${reminders[0]?.daysUntilDue} days`}
                  {reminders.length > 1 && ` and ${reminders.length - 1} more`}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              {reminders.length > 0 && (
                <button
                  onClick={() => router.push(`/projects/${reminders[0]?.projectId}`)}
                  style={{
                    background: 'rgba(146,64,14,0.08)', border: '1px solid rgba(146,64,14,0.15)',
                    color: '#92400e', padding: '0.3rem 0.6rem', borderRadius: '0.4rem',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(146,64,14,0.12)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(146,64,14,0.08)'}
                >
                  View <ChevronRight size={12} />
                </button>
              )}
              <button
                onClick={handleDismissReminders}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#a16207', padding: '0.2rem', display: 'flex',
                  opacity: 0.7, transition: 'opacity 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <main style={{ 
          flex: 1, 
          padding: 'clamp(1rem, 3vw, 2.5rem)', 
          overflowY: 'auto',
          backgroundColor: 'var(--bg-color)',
          width: '100%'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

