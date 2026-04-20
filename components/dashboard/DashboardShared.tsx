import React, { useEffect, useState } from 'react';

/* ─── RESPONSIVE ICON SIZE HOOK ──────────────────────────── */
export function useIconSize(base: number): number {
  const [size, setSize] = useState(base);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w >= 3840) setSize(Math.round(base * 1.5));
      else if (w >= 3200) setSize(Math.round(base * 1.375));
      else if (w >= 2560) setSize(Math.round(base * 1.25));
      else if (w >= 1920) setSize(Math.round(base * 1.125));
      else setSize(base);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [base]);

  return size;
}

/* ─── SCALED ICON WRAPPER ────────────────────────────────── */
export const SI = ({ icon: Icon, size = 16, ...props }: { icon: any; size?: number; [key: string]: any }) => {
  const scaled = useIconSize(size);
  return <Icon size={scaled} {...props} />;
};

/* ─── ANIMATED COUNTER ───────────────────────────────────── */
export function useCountUp(target: number, duration = 800, trigger = true) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger || target === 0) { setVal(target); return; }
    let current = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      current += step;
      if (current >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.floor(current));
    }, 16);
    return () => clearInterval(id);
  }, [target, duration, trigger]);
  return val;
}

export const AnimatedNum = ({ value, ready }: { value: number; ready: boolean }) => {
  const display = useCountUp(value, 800, ready);
  return <>{display.toLocaleString()}</>;
};

/* ─── SKELETON ───────────────────────────────────────────── */
export const DashboardSkeleton = () => (
  <div style={{ padding: '2rem', maxWidth: '220rem', width: '100%', margin: '0 auto' }}>
    <div style={{ marginBottom: '2rem' }}>
      <div className="db-skeleton" style={{ height: '2.8rem', width: '18rem', marginBottom: '0.75rem', borderRadius: '8px' }} />
      <div className="db-skeleton" style={{ height: '1.4rem', width: '28rem', borderRadius: '6px' }} />
    </div>
    <div className="db-grid-4" style={{ marginBottom: '1.5rem' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="premium-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="db-skeleton" style={{ height: '0.8rem', width: '6rem', borderRadius: '4px' }} />
              <div className="db-skeleton" style={{ height: '1.8rem', width: '3rem', borderRadius: '6px' }} />
            </div>
            <div className="db-skeleton" style={{ height: '2.5rem', width: '2.5rem', borderRadius: '8px' }} />
          </div>
          <div className="db-skeleton" style={{ height: '0.8rem', width: '8rem', borderRadius: '4px' }} />
        </div>
      ))}
    </div>
    {[1, 2, 3].map(i => (
      <div key={i} className="premium-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div className="db-skeleton" style={{ height: '1.2rem', width: '14rem', borderRadius: '4px', marginBottom: '1.5rem' }} />
        <div className="db-skeleton" style={{ height: '22rem', width: '100%', borderRadius: '12px' }} />
      </div>
    ))}
  </div>
);

/* ─── CUSTOM TOOLTIP ─────────────────────────────────────── */
export const CTooltip = ({ active, payload, label, prefix = '' }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="premium-card" style={{ padding: '0.75rem 1rem', minWidth: '10rem', border: '1px solid var(--border-color)' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
          <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ color: 'var(--text-primary)' }}>{prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── SECTION TITLE ──────────────────────────────────────── */
export const STitle = ({ icon: Icon, title, sub, action }: { icon: any; title: string; sub?: string; action?: React.ReactNode }) => {
  const iconSize = useIconSize(18);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
      <Icon size={iconSize} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
      {sub && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{sub}</span>}
      {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
    </div>
  );
};

/* ─── CARD ───────────────────────────────────────────────── */
export const Card = ({ children, style = {}, className = '' }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
  <div className={`premium-card ${className}`} style={{ padding: '1.5rem', ...style }}>{children}</div>
);

/* ─── PROGRESS BAR ───────────────────────────────────────── */
export const ProgressBar = ({ pct, color, height = 6 }: { pct: number; color: string; height?: number }) => (
  <div style={{ height, borderRadius: height, overflow: 'hidden', backgroundColor: '#f1f5f9', width: '100%' }}>
    <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, backgroundColor: color, borderRadius: height, transition: 'width 0.7s ease' }} />
  </div>
);

/* ─── BADGE ──────────────────────────────────────────────── */
export const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Active: 'badge-green', Approved: 'badge-green', Converted: 'badge-green', Sent: 'badge-green',
    'On Hold': 'badge-yellow', Pending: 'badge-yellow', 'Follow-up': 'badge-yellow', 'Follow Up': 'badge-yellow',
    Rejected: 'badge-red', Cancelled: 'badge-red', Closed: 'badge-red',
    Open: 'badge-blue', 'In Progress': 'badge-blue', New: 'badge-blue',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.6rem' }}>{status}</span>;
};
