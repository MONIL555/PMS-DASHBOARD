'use client';

import { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const Layout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
