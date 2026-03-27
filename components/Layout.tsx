'use client';

import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';

const Layout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-container">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        transition: 'margin-left 0.3s ease'
      }}>
        <main style={{ flex: 1, padding: 'clamp(1rem, 2vw, 2rem)', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
