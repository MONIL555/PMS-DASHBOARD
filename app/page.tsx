'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Users, FileText, Briefcase, Ticket as TicketIcon, TrendingUp, Clock,
  PieChart as PieChartIcon, Calendar, ArrowUpRight, ArrowDownRight,
  BarChart3, Building2, ChevronLeft, ChevronRight, Loader2, Banknote,
  Check, ChevronDown, Target, Activity, Layers, UserCheck, AlertTriangle,
  CheckCircle2, IndianRupee, Zap, GitCompare, ListChecks, TrendingDown,
  Minus, RefreshCw, ExternalLink, Info, Moon, Sun, Search, X, Star, Award,
  Printer,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart, Line,
  ReferenceLine, RadialBarChart, RadialBar,
} from 'recharts';
import { fetchDashboardStats } from '@/utils/api';
import { formatDateDDMMYYYY } from '@/utils/dateUtils';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

/* ─── CONSTANTS ─────────────────────────────────────────── */
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const STATUS_COLORS: Record<string, string> = {
  New: '#3b82f6', 'In Progress': '#f59e0b', Converted: '#10b981', Cancelled: '#ef4444', Lost: '#ef4444', Pending: '#94a3b8',
};
const PHASE_COLORS: Record<string, string> = {
  Planning: '#8b5cf6', Development: '#3b82f6', Testing: '#f59e0b', Deployment: '#06b6d4',
  'Go-Live': '#10b981', Maintenance: '#84cc16', Completed: '#22c55e', 'Not Started': '#94a3b8',
};

/* ─── ANIMATED COUNTER ───────────────────────────────────── */
function useCountUp(target: number, duration = 800, trigger = true) {
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

/* ─── SKELETON ───────────────────────────────────────────── */
const DashboardSkeleton = () => (
  <div style={{ padding: '2rem', maxWidth: '160rem', margin: '0 auto' }}>
    <div style={{ marginBottom: '2rem' }}>
      <div className="db-skeleton" style={{ height: '2.8rem', width: '18rem', marginBottom: '0.75rem', borderRadius: '8px' }} />
      <div className="db-skeleton" style={{ height: '1.4rem', width: '28rem', borderRadius: '6px' }} />
    </div>
    <div className="db-grid-4" style={{ marginBottom: '1.5rem' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="premium-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div className="db-skeleton" style={{ height: '1rem', width: '8rem', borderRadius: '4px' }} />
            <div className="db-skeleton" style={{ height: '3.2rem', width: '3.2rem', borderRadius: '10px' }} />
          </div>
          <div className="db-skeleton" style={{ height: '3rem', width: '6rem', borderRadius: '6px', marginBottom: '1rem' }} />
          <div className="db-skeleton" style={{ height: '1rem', width: '12rem', borderRadius: '4px' }} />
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
const CTooltip = ({ active, payload, label, prefix = '' }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="premium-card" style={{ padding: '0.75rem 1rem', minWidth: '160px', border: '1px solid var(--border-color)' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
          <span style={{ color: 'var(--text-primary)' }}>{prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── WIN RATE GAUGE ─────────────────────────────────────── */
const WinRateGauge = ({ rate, label }: { rate: number; label: string }) => {
  const color = rate >= 60 ? '#10b981' : rate >= 35 ? '#f59e0b' : '#ef4444';
  const gaugeData = [{ value: rate, fill: color }, { value: 100 - rate, fill: '#f1f5f9' }];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: '180px', height: '110px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="80%" innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={gaugeData} barSize={14}>
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f1f5f9' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{rate.toFixed(1)}%</span>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.25rem', textAlign: 'center' }}>{label}</span>
        </div>
      </div>
    </div>
  );
};

/* ─── SECTION TITLE ──────────────────────────────────────── */
const STitle = ({ icon: Icon, title, sub, action }: { icon: any; title: string; sub?: string; action?: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
    <Icon size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
    {sub && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{sub}</span>}
    {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
  </div>
);

/* ─── CARD ───────────────────────────────────────────────── */
const Card = ({ children, style = {}, className = '' }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
  <div className={`premium-card ${className}`} style={{ padding: '1.5rem', ...style }}>{children}</div>
);

/* ─── PROGRESS BAR ───────────────────────────────────────── */
const ProgressBar = ({ pct, color, height = 6 }: { pct: number; color: string; height?: number }) => (
  <div style={{ height, borderRadius: height, overflow: 'hidden', backgroundColor: '#f1f5f9', width: '100%' }}>
    <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, backgroundColor: color, borderRadius: height, transition: 'width 0.7s ease' }} />
  </div>
);

/* ─── BADGE ──────────────────────────────────────────────── */
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    Active: 'badge-green', Approved: 'badge-green', Converted: 'badge-green', Sent: 'badge-green',
    'On Hold': 'badge-yellow', Pending: 'badge-yellow', 'Follow-up': 'badge-yellow', 'Follow Up': 'badge-yellow',
    Rejected: 'badge-red', Cancelled: 'badge-red', Closed: 'badge-red',
    Open: 'badge-blue', 'In Progress': 'badge-blue', New: 'badge-blue',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.6rem' }}>{status}</span>;
};

/* ══════════════════════════════════════════════════════════ */
/* ─── HELPERS ───────────────────────────────────────────── */
const AnimatedNum = ({ value, ready }: { value: number; ready: boolean }) => {
  const display = useCountUp(value, 800, ready);
  return <>{display.toLocaleString()}</>;
};

const DashboardCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);
  const [popupDay, setPopupDay] = useState<number | null>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [markingPayment, setMarkingPayment] = useState<string | null>(null);
  const [calView, setCalView] = useState<'calendar' | 'list'>('calendar');

  const now = new Date();
  const cm = currentDate.getMonth();
  const cy = currentDate.getFullYear();
  const daysInMonth = new Date(cy, cm + 1, 0).getDate();
  const firstDay = new Date(cy, cm, 1).getDay();
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    setLoadingCal(true);
    fetch(`/api/dashboard/calendar?month=${cm}&year=${cy}`)
      .then(r => r.json()).then(d => { if (d.calendarEvents) setEvents(d.calendarEvents); })
      .catch(console.error).finally(() => setLoadingCal(false));
  }, [cm, cy]);

  const changeMonth = (n: number) => {
    setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + n); return d; });
    setPopupDay(null);
  };

  const eventsForDay = (day: number) =>
    events.filter(e => { if (!e.date) return false; const d = new Date(e.date); return d.getDate() === day && d.getMonth() === cm && d.getFullYear() === cy; });

  const evStyle = (type: string, paid?: boolean): React.CSSProperties => {
    if (paid) return { background: '#f0fdf4', color: '#15803d', borderLeftColor: '#22c55e' };
    if (type === 'renewal') return { background: '#faf5ff', color: '#7c3aed', borderLeftColor: '#a855f7' };
    if (type === 'billing') return { background: '#f0fdf4', color: '#166534', borderLeftColor: '#22c55e' };
    return { background: '#fffbeb', color: '#92400e', borderLeftColor: '#f59e0b' };
  };

  const handleCellClick = (day: number, e: React.MouseEvent) => {
    if (!eventsForDay(day).length) return;
    setPopupPos({ top: Math.min(e.clientY + 10, window.innerHeight - 440), left: Math.min(Math.max(10, e.clientX - 160), window.innerWidth - 350) });
    setPopupDay(day);
  };

  const handleToggle = async (ev: any) => {
    if (markingPayment) return;
    setMarkingPayment(ev.id);
    try {
      const body: any = { projectId: ev.projectId, serviceId: ev.serviceId, cycleDate: ev.date, type: ev.type === 'renewal' ? 'renewal' : 'billing' };
      if (!ev.isPaid) body.amount = ev.value || 0;
      const res = await fetch('/api/projects/payment', { method: ev.isPaid ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, isPaid: !ev.isPaid } : e));
        ev.isPaid ? toast.success('Payment undone') : toast.success(`₹${(ev.value || 0).toLocaleString()} collected`);
      }
    } catch { toast.error('Failed to update payment status'); }
    finally { setMarkingPayment(null); }
  };

  const billing = events.filter(e => e.type === 'billing' || e.type === 'renewal');
  const totalBill = billing.reduce((s, e) => s + (e.value || 0), 0);
  const collected = billing.filter(e => e.isPaid).reduce((s, e) => s + (e.value || 0), 0);
  const outstanding = totalBill - collected;
  const followUps = events.filter(e => e.type === 'followup').length;
  const collectPct = totalBill > 0 ? Math.round((collected / totalBill) * 100) : 0;
  const popupEvs = popupDay ? eventsForDay(popupDay) : [];
  const sortedEvs = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Operation Calendar</h2>
        {loadingCal && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', color: '#94a3b8' }} />}

        {/* view toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg-color)' }}>
          {(['calendar', 'list'] as const).map(v => (
            <button key={v} onClick={() => setCalView(v)} style={{ padding: '0.4rem 0.9rem', fontSize: '0.72rem', fontWeight: 700, border: 'none', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s', background: calView === v ? 'white' : 'transparent', color: calView === v ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: calView === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>{v}</button>
          ))}
        </div>

        {/* month nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px', color: 'var(--text-secondary)', display: 'flex' }}><ChevronLeft size={15} /></button>
          <span style={{ minWidth: '130px', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '20px', padding: '0.3rem 1rem' }}>{MONTHS[cm]} {cy}</span>
          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px', color: 'var(--text-secondary)', display: 'flex' }}><ChevronRight size={15} /></button>
        </div>
      </div>

      {calView === 'calendar' ? (
        <div className="db-calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', padding: '0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1; const evs = eventsForDay(day);
            const isToday = day === now.getDate() && cm === now.getMonth() && cy === now.getFullYear();
            return (
              <div key={day} onClick={(e) => handleCellClick(day, e)} className={`db-calendar-cell ${isToday ? 'today' : ''} ${evs.length ? 'has-events' : ''}`}>
                <span className="day-num">{day}</span>
                <div className="event-dots">
                  {evs.slice(0, 3).map((ev, idx) => (
                    <div key={idx} className="event-dot" style={{ background: ev.isPaid ? '#22c55e' : ev.type === 'renewal' ? '#a855f7' : ev.type === 'billing' ? '#22c55e' : '#f59e0b' }} />
                  ))}
                  {evs.length > 3 && <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700 }}>+{evs.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.5rem', scrollbarWidth: 'thin' }}>
          {sortedEvs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
              <Calendar size={32} style={{ opacity: 0.1, marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.82rem' }}>No events scheduled for this month</p>
            </div>
          ) : sortedEvs.map((ev, i) => (
            <div key={i} className="db-event-list-item" style={{ borderLeft: `3px solid ${ev.type === 'renewal' ? '#a855f7' : ev.type === 'billing' ? '#22c55e' : '#f59e0b'}` }}>
              <div style={{ minWidth: '45px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{new Date(ev.date).getDate()}</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{MONTHS[new Date(ev.date).getMonth()].slice(0, 3)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.1rem' }}>{ev.projectTitle || ev.title || 'General Activity'}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ textTransform: 'capitalize' }}>{ev.type}</span>
                  {ev.value && <span>· ₹{ev.value.toLocaleString()}</span>}
                </div>
              </div>
              {(ev.type === 'billing' || ev.type === 'renewal') && (
                <button onClick={() => handleToggle(ev)} disabled={!!markingPayment} className={`db-event-check ${ev.isPaid ? 'paid' : ''}`}>
                  {markingPayment === ev.id ? <Loader2 size={12} className="spin" /> : <Check size={12} strokeWidth={3} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats Summary Footer */}
      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        <div style={{ background: 'var(--bg-color)', padding: '0.6rem', borderRadius: '10px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Target</p>
          <p style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{totalBill.toLocaleString()}</p>
        </div>
        <div style={{ background: '#f0fdf4', padding: '0.6rem', borderRadius: '10px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Collected</p>
          <p style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534' }}>₹{collected.toLocaleString()} <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>({collectPct}%)</span></p>
        </div>
        <div style={{ background: outstanding > 0 ? '#fef2f2' : 'var(--bg-color)', padding: '0.6rem', borderRadius: '10px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, color: outstanding > 0 ? '#991b1b' : 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Due</p>
          <p style={{ fontSize: '0.82rem', fontWeight: 800, color: outstanding > 0 ? '#991b1b' : 'var(--text-primary)' }}>₹{outstanding.toLocaleString()}</p>
        </div>
      </div>

      {/* POPUP */}
      {popupDay !== null && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setPopupDay(null)} />
          <div className="db-calendar-popup" style={{ top: popupPos.top, left: popupPos.left }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Events on {popupDay} {MONTHS[cm]}</h3>
              <button onClick={() => setPopupDay(null)} style={{ background: '#f8fafc', border: 'none', cursor: 'pointer', padding: '0.25rem', borderRadius: '6px', color: '#64748b' }}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {popupEvs.map((ev, i) => (
                <div key={i} className="db-popup-ev-card" style={evStyle(ev.type, ev.isPaid)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.25rem' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>{ev.projectTitle || ev.title}</p>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8 }}>{ev.type}</span>
                  </div>
                  {ev.clientName && <p style={{ fontSize: '0.68rem', margin: '0 0 0.5rem 0', opacity: 0.9 }}>Client: {ev.clientName}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {ev.value ? <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>₹{ev.value.toLocaleString()}</span> : <div />}
                    {(ev.type === 'billing' || ev.type === 'renewal') && (
                      <button onClick={() => handleToggle(ev)} disabled={!!markingPayment} className={`db-popup-mark ${ev.isPaid ? 'paid' : ''}`}>
                        {markingPayment === ev.id ? <Loader2 size={12} className="spin" /> : ev.isPaid ? 'Mark Pending' : 'Mark Collected'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ─── MAIN DASHBOARD ─────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const getCurrentFY = () => {
    const t = new Date(); const y = t.getFullYear();
    return t.getMonth() >= 3 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  };

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFY, setSelectedFY] = useState(getCurrentFY());
  const [filters, setFilters] = useState(['Leads', 'Quotations', 'Projects', 'Tickets']);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityTab, setActivityTab] = useState<'All' | 'Lead' | 'Quotation' | 'Project' | 'Ticket'>('All');
  const [countersReady, setCountersReady] = useState(false);
  const router = useRouter();

  const toggleFilter = (f: string) =>
    setFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const load = useCallback(() => {
    setLoading(true); setCountersReady(false);
    fetchDashboardStats(selectedFY)
      .then(d => { setData(d); setTimeout(() => setCountersReady(true), 120); })
      .catch(() => toast.error('Failed to load dashboard statistics'))
      .finally(() => setLoading(false));
  }, [selectedFY]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  /* velocity & health (Top of component) */
  const revenueVelocity = useMemo(() => {
    if (!data?.trends || data.trends.length < 6) return null;
    const t = data.trends;
    const recent = t.slice(-3).reduce((s: number, m: any) => s + (m.Revenue || 0), 0);
    const before = t.slice(-6, -3).reduce((s: number, m: any) => s + (m.Revenue || 0), 0);
    return before === 0 ? null : ((recent - before) / before * 100).toFixed(1);
  }, [data]);

  const leadVelocity = useMemo(() => {
    if (!data?.trends || data.trends.length < 6) return null;
    const t = data.trends;
    const recent = t.slice(-3).reduce((s: number, m: any) => s + (m.Leads || 0), 0);
    const before = t.slice(-6, -3).reduce((s: number, m: any) => s + (m.Leads || 0), 0);
    return before === 0 ? null : ((recent - before) / before * 100).toFixed(1);
  }, [data]);

  const billingHealth = useMemo(() => {
    if (!data) return 0;
    const lr = parseFloat(data.conversionRates.leadToQuote) || 0;
    const qr = parseFloat(data.conversionRates.quoteToProject) || 0;
    const d = data.conversionRates.avgCompletionTime || 999;
    return Math.round(Math.min(100, Math.min(lr, 50) + Math.min(qr * (10 / 3), 30) + Math.max(0, 20 - (d / 30) * 10)));
  }, [data]);

  const winRate = useMemo(() => {
    if (!data) return 0;
    const conv = data.leadStatusDist?.find((s: any) => s.name === 'Converted')?.value || 0;
    return data.stats.totalLeads > 0 ? (conv / data.stats.totalLeads) * 100 : 0;
  }, [data]);

  const quoteConvRate = useMemo(() => {
    if (!data) return 0;
    const q = data.stats.totalQuotations || 0; const p = data.stats.totalActiveProjects || 0;
    return q > 0 ? (p / q) * 100 : 0;
  }, [data]);

  const filteredActivities = useMemo(() => {
    if (!data) return [];
    let list = data.recentActivities || [];
    if (activityTab !== 'All') list = list.filter((a: any) => a.type === activityTab);
    if (activitySearch.trim()) {
      const q = activitySearch.toLowerCase();
      list = list.filter((a: any) => a.title?.toLowerCase().includes(q) || a.id?.toLowerCase().includes(q) || a.status?.toLowerCase().includes(q));
    }
    return list;
  }, [data, activityTab, activitySearch]);

  const hasLeads = filters.includes('Leads');
  const hasQuotations = filters.includes('Quotations');
  const hasProjects = filters.includes('Projects');
  const hasTickets = filters.includes('Tickets');
  const hasFinance = filters.includes('Finance');

  if (loading) return <DashboardSkeleton />;
  if (!data) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
      <AlertTriangle size={32} style={{ color: '#ef4444' }} />
      <p style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem' }}>Error loading dashboard data.</p>
      <button onClick={load} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  );

  const getFYDates = (fy: string) => {
    if (fy === 'all') return { startDate: '', endDate: '' };
    const [sy, ey] = fy.split('-').map(Number);
    return { startDate: `${sy}-04-01`, endDate: `${ey}-03-31` };
  };



  /* ══════════════════════════════════════════════════════════ */
  /*  BUILD SECTIONS                                           */
  /* ══════════════════════════════════════════════════════════ */
  const sections: Array<{ id: string; component: React.ReactNode }> = [];

  /* ── STAT CARDS ── */
  const statsCards = [
    { title: 'Total Leads', cat: 'Leads', val: data.stats.totalLeads, icon: Users, color: '#3b82f6', iconBg: '#eff6ff', rate: data.stats.leadGrowth || `${data.conversionRates.leadToQuote}%`, rlabel: data.stats.leadGrowth ? 'vs prev. FY' : 'lead→quote', vel: leadVelocity, path: '/leads' },
    { title: 'Quotations', cat: 'Quotations', val: data.stats.totalQuotations, icon: FileText, color: '#f59e0b', iconBg: '#fffbeb', rate: data.stats.quoteGrowth || `${data.conversionRates.quoteToProject}%`, rlabel: data.stats.quoteGrowth ? 'vs prev. FY' : 'quote→proj', vel: null, path: '/quotations' },
    { title: 'Active Projects', cat: 'Projects', val: data.stats.totalActiveProjects, icon: Briefcase, color: '#10b981', iconBg: '#f0fdf4', rate: data.stats.activeProjectsGrowth || `${data.conversionRates.avgCompletionTime}d`, rlabel: data.stats.activeProjectsGrowth ? 'vs prev. FY' : 'avg duration', vel: revenueVelocity, path: '/projects' },
    { title: 'Open Tickets', cat: 'Tickets', val: data.stats.totalOpenTickets, icon: TicketIcon, color: '#ef4444', iconBg: '#fef2f2', rate: 'Support', rlabel: 'Queue', vel: null, path: '/tickets' },
  ].filter(c => filters.includes(c.cat));

  if (statsCards.length > 0) {
    sections.push({
      id: 'stats', component: (
        <div className="db-grid-4">
          {statsCards.map((stat, i) => (
            <div key={i} className="premium-card db-stat-card" onClick={() => { const { startDate, endDate } = getFYDates(selectedFY); const p = new URLSearchParams(); if (startDate) p.append('startDate', startDate); if (endDate) p.append('endDate', endDate); router.push(`${stat.path}${p.toString() ? `?${p}` : ''}`); }}>
              {/* background blob */}
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: stat.color, opacity: 0.06, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>{stat.title}</p>
                <div style={{ background: stat.iconBg, padding: '0.5rem', borderRadius: '10px', color: stat.color, transition: 'transform 0.2s' }}><stat.icon size={18} /></div>
              </div>
              <p style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, marginBottom: '0.4rem', fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedNum value={stat.val} ready={countersReady} />
              </p>
              {stat.vel != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', fontSize: '0.65rem', fontWeight: 700, color: Number(stat.vel) >= 0 ? '#16a34a' : '#dc2626' }}>
                  <Zap size={10} />{Number(stat.vel) >= 0 ? '+' : ''}{stat.vel}% velocity (3-mo)
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {stat.rate && (stat.rate.startsWith('+') || stat.rate.startsWith('-'))
                  ? stat.rate.startsWith('-') ? <ArrowDownRight size={13} style={{ color: '#ef4444' }} /> : <ArrowUpRight size={13} style={{ color: '#10b981' }} />
                  : null}
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: stat.rate?.startsWith('-') ? '#ef4444' : '#10b981' }}>{stat.rate}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{stat.rlabel}</span>
              </div>
              <ExternalLink size={12} style={{ position: 'absolute', bottom: '1rem', right: '1rem', color: '#e2e8f0', transition: 'color 0.15s' }} />
            </div>
          ))}
        </div>
      )
    });
  }

  /* ── KPI STRIP ── */
  const kpis = [
    { show: hasLeads && hasQuotations, lbl: 'Lead → Quote', val: `${data.conversionRates.leadToQuote}%`, icon: TrendingUp, color: '#3b82f6', bg: '#eff6ff' },
    { show: hasQuotations && hasProjects, lbl: 'Quote → Project', val: `${data.conversionRates.quoteToProject}%`, icon: Target, color: '#f59e0b', bg: '#fffbeb' },
    { show: hasProjects, lbl: 'Avg Duration', val: `${data.conversionRates.avgCompletionTime}d`, icon: Clock, color: '#10b981', bg: '#f0fdf4' },
    { show: hasTickets, lbl: 'Open Tickets', val: data.stats.totalOpenTickets, icon: TicketIcon, color: '#ef4444', bg: '#fef2f2' },
    { show: hasFinance && hasProjects, lbl: 'Avg Proj. Value', val: `₹${Math.round(data.commercialValue.avgProjectValue).toLocaleString()}`, icon: IndianRupee, color: '#8b5cf6', bg: '#faf5ff' },
    { show: hasFinance && hasQuotations, lbl: 'Avg Quote Value', val: `₹${Math.round(data.commercialValue.avgQuoteValue).toLocaleString()}`, icon: Banknote, color: '#06b6d4', bg: '#ecfeff' },
  ].filter(k => k.show);

  if (kpis.length > 0) {
    sections.push({
      id: 'kpis', component: (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(kpis.length, 6)},1fr)`, gap: '0.75rem' }}>
          {kpis.map((k, i) => (
            <div key={i} className="premium-card" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: k.bg, padding: '0.5rem', borderRadius: '8px', color: k.color, flexShrink: 0 }}><k.icon size={15} /></div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.lbl}</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{typeof k.val === 'number' ? k.val.toLocaleString() : k.val}</p>
              </div>
            </div>
          ))}
        </div>
      )
    });
  }

  /* ── MONTHLY TRENDS ── */
  if (hasLeads || hasQuotations || hasProjects || hasFinance) {
    sections.push({
      id: 'trends', component: (
        <Card>
          <STitle icon={BarChart3} title="Monthly Trends" sub={selectedFY === 'all' ? 'All Time' : `FY ${selectedFY}`}
            action={<span style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '0.25rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>{data.trends.length} months</span>} />
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trends} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
                <defs>
                  {[['leads', '#3b82f6'], ['quotes', '#f59e0b'], ['proj', '#8b5cf6'], ['rev', '#10b981'], ['fore', '#06b6d4']].map(([id, c]) => (
                    <linearGradient key={id} id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={c} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip content={<CTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                {hasLeads && <Area type="monotone" dataKey="Leads" stroke="#3b82f6" strokeWidth={2} fill="url(#g-leads)" dot={false} activeDot={{ r: 4 }} />}
                {hasQuotations && <Area type="monotone" dataKey="Quotations" stroke="#f59e0b" strokeWidth={2} fill="url(#g-quotes)" dot={false} activeDot={{ r: 4 }} />}
                {hasProjects && <Area type="monotone" dataKey="Projects" stroke="#8b5cf6" strokeWidth={2} fill="url(#g-proj)" dot={false} activeDot={{ r: 4 }} />}
                {hasProjects && hasFinance && <>
                  <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#g-rev)" dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="Forecast" stroke="#06b6d4" strokeWidth={2} fill="url(#g-fore)" dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3" />
                </>}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )
    });
  }

  /* ── CALENDAR + STRATEGIC SIDEBAR ── */
  if (hasFinance) {
    const fc = [
      ...(hasProjects ? [{ lbl: 'Active Projects Value', val: `₹${data.commercialValue.activeProjects.toLocaleString()}`, sub: `Avg ₹${Math.round(data.commercialValue.avgProjectValue).toLocaleString()} / project`, rate: data.commercialValue.activeProjectsRate, borderColor: '#10b981', bg: '#f0fdf4', vc: '#14532d', icon: Briefcase, iconBg: '#d1fae5', iconColor: '#059669' }] : []),
      ...(hasQuotations ? [{ lbl: 'Total Quotations Value', val: `₹${data.commercialValue.totalConvertedQuotes.toLocaleString()}`, sub: `Avg ₹${Math.round(data.commercialValue.avgQuoteValue).toLocaleString()} / quote`, rate: data.commercialValue.totalConvertedQuotesRate, borderColor: '#3b82f6', bg: '#eff6ff', vc: '#1e3a8a', icon: FileText, iconBg: '#dbeafe', iconColor: '#2563eb' }] : []),
    ];

    const showClients = hasProjects && data.strategic.topClients?.length > 0;
    const showServices = hasLeads && data.strategic.topServices?.length > 0;
    const showStaff = hasProjects && data.strategic.staffDistribution?.length > 0;
    const hasSidebar = showClients || showServices || showStaff;
    sections.push({
      id: 'calendar-strategic', component: (
        <div style={{ display: 'grid', gridTemplateColumns: hasSidebar ? '2fr 1fr' : '1fr', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Card><DashboardCalendar /></Card>
            {fc.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                {fc.map((c, i) => (
                  <div key={i} style={{ background: 'white', border: '1px solid var(--border-color)', borderLeft: `4.5px solid ${c.borderColor}`, borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', borderRadius: '50%', background: c.borderColor, opacity: 0.04, pointerEvents: 'none' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>{c.lbl}</p>
                      <div style={{ background: c.iconBg, padding: '0.5rem', borderRadius: '10px', color: c.iconColor }}><c.icon size={17} /></div>
                    </div>
                    <p style={{ fontSize: '1.9rem', fontWeight: 800, color: c.vc, marginBottom: '0.25rem', fontVariantNumeric: 'tabular-nums' }}>{c.val}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{c.sub}</p>
                    {c.rate && selectedFY !== 'all' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 700, color: c.rate.startsWith('-') ? '#ef4444' : '#10b981' }}>
                        {c.rate.startsWith('-') ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                        <span>{c.rate} vs previous FY</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasSidebar && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {showClients && <Card style={{ padding: '1.25rem' }}>
                <STitle icon={Building2} title="Top Clients" sub="by project value" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {data.strategic.topClients.map((c: any, i: number) => {
                    const pct = (c.value / (data.strategic.topClients[0]?.value || 1)) * 100;
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontSize: '0.9rem' }}>{['🥇', '🥈', '🥉'][i] || `${i + 1}.`}</span>
                          <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                          <span className="badge badge-blue" style={{ fontSize: '0.62rem', flexShrink: 0 }}>₹{c.value.toLocaleString()}</span>
                        </div>
                        <ProgressBar pct={pct} color="#3b82f6" height={5} />
                      </div>
                    );
                  })}
                </div>
              </Card>}
              {showServices && <Card style={{ padding: '1.25rem' }}>
                <STitle icon={TrendingUp} title="Top Services" sub="by lead count" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {data.strategic.topServices.map((s: any, i: number) => {
                    const pct = (s.value / (data.strategic.topServices[0]?.value || 1)) * 100;
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                          <span className="badge badge-yellow" style={{ fontSize: '0.62rem', flexShrink: 0 }}>{s.value} leads</span>
                        </div>
                        <ProgressBar pct={pct} color="#f59e0b" height={5} />
                      </div>
                    );
                  })}
                </div>
              </Card>}
              {showStaff && <Card style={{ padding: '1.25rem' }}>
                <STitle icon={UserCheck} title="Staff Workload" sub="active projects" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {data.strategic.staffDistribution.slice(0, 6).map((s: any, i: number) => {
                    const pct = (s.value / (data.strategic.staffDistribution[0]?.value || 1)) * 100;
                    const over = s.value >= 5; const warn = !over && s.value >= 3;
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || 'Unassigned'}</span>
                          <span className={`badge ${over ? 'badge-red' : warn ? 'badge-yellow' : 'badge-gray'}`} style={{ fontSize: '0.62rem', flexShrink: 0 }}>{s.value} proj{s.value !== 1 ? 's' : ''}{over ? ' ⚠' : ''}</span>
                        </div>
                        <ProgressBar pct={pct} color={over ? '#ef4444' : warn ? '#f59e0b' : '#10b981'} height={5} />
                      </div>
                    );
                  })}
                </div>
              </Card>}
            </div>
          )}
        </div>
      )
    });
  }

  /* ── SCORECARDS (Win Rate + Health) ── */
  if (hasLeads || hasQuotations || hasProjects) {
    const hColor = billingHealth >= 70 ? '#10b981' : billingHealth >= 45 ? '#f59e0b' : '#ef4444';
    sections.push({
      id: 'scorecards', component: (
        <div className="db-grid-3">
          {hasLeads && <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <STitle icon={Award} title="Lead Win Rate" sub="converted leads" />
            <WinRateGauge rate={winRate} label="of leads converted" />
            <p style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {data.leadStatusDist?.find((s: any) => s.name === 'Converted')?.value || 0} converted · {data.stats.totalLeads} total leads
            </p>
          </Card>}

          {hasQuotations && hasProjects && <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <STitle icon={Star} title="Quote Conversion" sub="quotes → projects" />
            <WinRateGauge rate={quoteConvRate} label="of quotes become projects" />
            <p style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              {data.stats.totalActiveProjects} projects · {data.stats.totalQuotations} quotations
            </p>
          </Card>}

          <Card style={{ borderLeft: `4px solid ${hColor}` }}>
            <STitle icon={Target} title="Pipeline Health Score" />
            <div style={{ background: billingHealth >= 70 ? '#f0fdf4' : billingHealth >= 45 ? '#fffbeb' : '#fef2f2', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '3rem', fontWeight: 800, color: hColor, lineHeight: 1 }}>{billingHealth}</p>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.25rem' }}>/ 100 points</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { lbl: 'L→Q Conversion', val: `${data.conversionRates.leadToQuote}%`, max: 50, score: Math.min(parseFloat(data.conversionRates.leadToQuote) || 0, 50) },
                { lbl: 'Q→P Conversion', val: `${data.conversionRates.quoteToProject}%`, max: 30, score: Math.min((parseFloat(data.conversionRates.quoteToProject) || 0) * (10 / 3), 30) },
                { lbl: 'Delivery Speed', val: `${data.conversionRates.avgCompletionTime}d avg`, max: 20, score: Math.max(0, 20 - ((data.conversionRates.avgCompletionTime || 999) / 30) * 10) },
              ].map((row, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{row.lbl}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)' }}>{row.val}</span>
                  </div>
                  <ProgressBar pct={(row.score / row.max) * 100} color="#3b82f6" height={5} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )
    });
  }

  /* ── PIPELINE FUNNEL ── */
  if (hasLeads || hasQuotations || hasProjects) {
    const steps = [
      { label: 'Leads', val: data.stats.totalLeads, color: '#3b82f6', show: hasLeads },
      { label: 'Quotations', val: data.stats.totalQuotations, color: '#f59e0b', show: hasQuotations },
      { label: 'Projects', val: data.stats.totalActiveProjects, color: '#10b981', show: hasProjects },
    ].filter(s => s.show);
    sections.push({
      id: 'pipeline', component: (
        <Card>
          <STitle icon={Target} title="Pipeline Funnel" sub="Lead → Quotation → Project" />
          <div className="db-grid-3" style={{ gap: '2rem' }}>
            {steps.map((step, i) => {
              const pct = i === 0 ? 100 : Math.min(100, (step.val / (steps[0].val || 1)) * 100);
              const conv = i > 0 ? ((step.val / (steps[i - 1].val || 1)) * 100).toFixed(1) : null;
              return (
                <div key={step.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>{step.label}</span>
                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{step.val.toLocaleString()}</span>
                  </div>
                  <ProgressBar pct={pct} color={step.color} height={10} />
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                    {conv ? <><span style={{ fontWeight: 700, color: step.color }}>{conv}%</span> from {steps[i - 1].label.toLowerCase()}</> : <><span style={{ fontWeight: 700, color: '#3b82f6' }}>{data.conversionRates.leadToQuote}%</span> overall L→Q</>}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )
    });
  }

  /* ── REVENUE vs FORECAST ── */
  if (hasFinance && hasProjects && data.trends?.some((t: any) => t.Forecast > 0 || t.Revenue > 0)) {
    const rfData = data.trends.map((t: any) => ({ name: t.name, Revenue: t.Revenue || 0, Forecast: t.Forecast || 0, Gap: (t.Forecast || 0) - (t.Revenue || 0) }));
    const totalRev = rfData.reduce((s: number, m: any) => s + m.Revenue, 0);
    const totalFore = rfData.reduce((s: number, m: any) => s + m.Forecast, 0);
    const attain = totalFore > 0 ? Math.round((totalRev / totalFore) * 100) : 0;
    const best = [...rfData].sort((a, b) => b.Revenue - a.Revenue)[0];
    const attColor = attain >= 100 ? '#10b981' : attain >= 80 ? '#f59e0b' : '#ef4444';

    sections.push({
      id: 'revenue-forecast', component: (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <Card>
            <STitle icon={GitCompare} title="Revenue vs Forecast" sub="actuals vs projected" />
            <div style={{ height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rfData} margin={{ left: -10, right: 10, top: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip content={<CTooltip prefix="₹" />} />
                  <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <ReferenceLine y={0} stroke="#e2e8f0" />
                  <Bar dataKey="Revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} opacity={0.9} />
                  <Bar dataKey="Forecast" name="Forecast" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={16} opacity={0.55} />
                  <Line type="monotone" dataKey="Gap" name="Gap" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <STitle icon={IndianRupee} title="Revenue Summary" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '1rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16a34a', marginBottom: '0.25rem' }}>Total Revenue</p>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#14532d' }}>₹{totalRev.toLocaleString()}</p>
              </div>
              <div style={{ background: '#ecfeff', borderRadius: '10px', padding: '1rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0e7490', marginBottom: '0.25rem' }}>Total Forecast</p>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#164e63' }}>₹{totalFore.toLocaleString()}</p>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Attainment</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: attColor }}>{attain}%</span>
                </div>
                <ProgressBar pct={Math.min(100, attain)} color={attColor} height={8} />
              </div>
              {best && <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '0.75rem' }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Best Month</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{best.name}</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>₹{best.Revenue.toLocaleString()}</p>
              </div>}
            </div>
          </Card>
        </div>
      )
    });
  }

  /* ── FY COMPARISON TABLE ── */
  if (selectedFY !== 'all' && (hasLeads || hasQuotations || hasProjects)) {
    const rows = [
      { lbl: 'Leads', cur: data.stats.totalLeads, rate: data.stats.leadGrowth, show: hasLeads, icon: '👥' },
      { lbl: 'Quotations', cur: data.stats.totalQuotations, rate: data.stats.quoteGrowth, show: hasQuotations, icon: '📄' },
      { lbl: 'Active Projects', cur: data.stats.totalActiveProjects, rate: data.stats.activeProjectsGrowth, show: hasProjects, icon: '📦' },
      { lbl: 'Open Tickets', cur: data.stats.totalOpenTickets, rate: null, show: hasTickets, icon: '🎫' },
      { lbl: 'L→Q Rate', cur: `${data.conversionRates.leadToQuote}%`, rate: null, show: hasLeads && hasQuotations, icon: '🔀' },
      { lbl: 'Q→P Rate', cur: `${data.conversionRates.quoteToProject}%`, rate: null, show: hasQuotations && hasProjects, icon: '🔁' },
      { lbl: 'Avg Duration', cur: `${data.conversionRates.avgCompletionTime}d`, rate: null, show: hasProjects, icon: '⏱' },
    ].filter(r => r.show);
    sections.push({
      id: 'fy-comparison', component: (
        <Card>
          <STitle icon={GitCompare} title={`FY ${selectedFY} at a Glance`} sub="vs previous year" />
          <div className="table-container" style={{ borderRadius: '10px', boxShadow: 'none' }}>
            <table>
              <thead><tr>
                {['Metric', 'Current FY', 'YoY Change', 'Trend'].map((h, i) => <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map((row, i) => {
                  const isPos = row.rate && !row.rate.startsWith('-');
                  const isNeg = row.rate?.startsWith('-');
                  return (
                    <tr key={i}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ fontSize: '1rem' }}>{row.icon}</span><span style={{ fontWeight: 600 }}>{row.lbl}</span></div></td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{row.cur}</td>
                      <td style={{ textAlign: 'right' }}>
                        {row.rate
                          ? <span className={`badge ${isPos ? 'badge-green' : isNeg ? 'badge-red' : 'badge-gray'}`} style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            {isPos ? <ArrowUpRight size={10} /> : isNeg ? <ArrowDownRight size={10} /> : <Minus size={10} />}{row.rate}
                          </span>
                          : <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '2px', height: '20px' }}>
                          {[0.4, 0.55, 0.45, 0.75, isPos ? 1 : 0.3].map((h, j) => (
                            <div key={j} style={{ width: '5px', borderRadius: '2px', background: isPos ? '#10b981' : isNeg ? '#ef4444' : '#e2e8f0', height: `${h * 100}%` }} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )
    });
  }

  /* ── PROJECT STATUS BOARD ── */
  if (hasProjects && data.projectPhaseDist?.length > 0) {
    const total = data.projectPhaseDist.reduce((s: number, p: any) => s + p.value, 0);
    sections.push({
      id: 'project-board', component: (
        <Card>
          <STitle icon={Layers} title="Project Status Board" sub={`${total} total · ${data.projectPhaseDist.length} phases`} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {[...data.projectPhaseDist].sort((a: any, b: any) => b.value - a.value).map((phase: any, i: number) => {
              const color = PHASE_COLORS[phase.name] || CHART_COLORS[i % CHART_COLORS.length];
              const pct = Math.round((phase.value / total) * 100);
              return (
                <div key={i} style={{ flex: '1', minWidth: '130px', border: '1px solid #f1f5f9', borderLeft: `4px solid ${color}`, borderRadius: '10px', padding: '0.85rem 1rem', transition: 'box-shadow 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>{phase.name}</span>
                    <span style={{ background: color, color: 'white', borderRadius: '20px', padding: '1px 7px', fontSize: '0.65rem', fontWeight: 800 }}>{phase.value}</span>
                  </div>
                  <ProgressBar pct={pct} color={color} height={5} />
                  <p style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{pct}% of pipeline</p>
                </div>
              );
            })}
          </div>
        </Card>
      )
    });
  }

  /* ── CHARTS GRID ── */
  const chartSlots = [
    hasLeads && data.leadStatusDist?.length ? 'leadFunnel' : null,
    hasProjects && data.projectPriorityDist?.length ? 'projPriority' : null,
    hasTickets && data.ticketPriorityDist?.length ? 'ticketLoad' : null,
  ].filter(Boolean) as string[];

  if (chartSlots.length > 0) {
    sections.push({
      id: 'charts', component: (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${chartSlots.length},1fr)`, gap: '1.5rem' }}>
          {chartSlots.includes('leadFunnel') && <Card>
            <STitle icon={PieChartIcon} title="Lead Funnel" />
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.leadStatusDist} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {data.leadStatusDist.map((e: any, i: number) => <Cell key={i} fill={STATUS_COLORS[e.name] || '#94a3b8'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              {data.leadStatusDist.map((e: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[e.name] || '#94a3b8' }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{e.name}: {e.value}</span>
                </div>
              ))}
            </div>
          </Card>}
          {chartSlots.includes('projPriority') && <Card>
            <STitle icon={AlertTriangle} title="Project Priorities" />
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.projectPriorityDist} margin={{ left: -20, top: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  <Bar dataKey="value" name="Projects" radius={[6, 6, 0, 0]} barSize={32}>
                    {data.projectPriorityDist.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>}
          {chartSlots.includes('ticketLoad') && <Card>
            <STitle icon={TicketIcon} title="Ticket Priority Load" />
            <div style={{ height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ticketPriorityDist} layout="vertical" margin={{ left: 0, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={72} />
                  <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  <Bar dataKey="value" name="Tickets" radius={[0, 6, 6, 0]} barSize={24}>
                    {data.ticketPriorityDist.map((_: any, i: number) => <Cell key={i} fill={(['#ef4444', '#f59e0b', '#3b82f6', '#94a3b8'][i]) || '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>}
        </div>
      )
    });
  }

  /* ── RECENT ACTIVITY + DEADLINES ── */
  sections.push({
    id: 'activity-deadlines', component: (
      <div style={{ display: 'grid', gridTemplateColumns: hasProjects ? '2fr 1fr' : '1fr', gap: '1.5rem' }}>
        <Card>
          <STitle icon={Activity} title="Recent Activity" sub="live feed" />
          {/* search + tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
              <input value={activitySearch} onChange={e => setActivitySearch(e.target.value)} placeholder="Search activity…"
                style={{ width: '100%', padding: '0.5rem 2.5rem 0.5rem 2.25rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-primary)', background: 'var(--bg-color)', outline: 'none', fontFamily: 'inherit' }} />
              {activitySearch && <button onClick={() => setActivitySearch('')} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><X size={12} /></button>}
            </div>
            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-color)' }}>
              {(['All', 'Lead', 'Quotation', 'Project', 'Ticket'] as const).map(tab => (
                <button key={tab} onClick={() => setActivityTab(tab)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.65rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: activityTab === tab ? 'white' : 'transparent', color: activityTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: activityTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>{tab}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minHeight: '200px' }}>
            {filteredActivities.length === 0
              ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <Search size={28} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>No matching activity</p>
              </div>
              : filteredActivities.map((act: any, idx: number) => {
                const goto = () => {
                  if (act.type === 'Project') router.push(`/projects/${act.id}`);
                  else if (act.type === 'Lead') router.push('/leads');
                  else if (act.type === 'Quotation') router.push('/quotations');
                  else router.push('/tickets');
                };
                const iconMap: Record<string, React.ReactNode> = {
                  Lead: <Users size={16} color="#3b82f6" />, Quotation: <FileText size={16} color="#f59e0b" />,
                  Project: <Briefcase size={16} color="#10b981" />, Ticket: <TicketIcon size={16} color="#ef4444" />,
                };
                return (
                  <div key={idx} onClick={goto} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0.75rem', borderRadius: '10px', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-color)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'white', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      {iconMap[act.type]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.title}</p>
                        <StatusBadge status={act.status} />
                      </div>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>#{act.id} · {act.type}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{formatDateDDMMYYYY(act.date)}</span>
                      <ExternalLink size={11} style={{ color: '#e2e8f0' }} />
                    </div>
                  </div>
                );
              })
            }
          </div>
        </Card>

        {hasProjects && <Card>
          <STitle icon={ListChecks} title="Upcoming Deadlines" />
          {data.upcomingDeadlines.length > 0
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.upcomingDeadlines.map((p: any, idx: number) => {
                const isOver = new Date(p.deadline) < new Date();
                const days = Math.ceil((new Date(p.deadline).getTime() - Date.now()) / 86400000);
                const urgent = !isOver && days <= 7;
                return (
                  <div key={idx} style={{ border: '1px solid var(--border-color)', borderLeft: `4px solid ${isOver ? '#ef4444' : urgent ? '#f59e0b' : '#e2e8f0'}`, borderRadius: '10px', padding: '0.85rem 1rem', background: isOver ? '#fef2f2' : urgent ? '#fffbeb' : 'var(--bg-color)' }}>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{p.id}</span>
                      {isOver
                        ? <span className="badge badge-red" style={{ fontSize: '0.62rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><TrendingDown size={9} /> Overdue {Math.abs(days)}d</span>
                        : <span className={`badge ${urgent ? 'badge-yellow' : 'badge-gray'}`} style={{ fontSize: '0.62rem' }}>{days}d left</span>
                      }
                    </div>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>{formatDateDDMMYYYY(p.deadline)}</p>
                  </div>
                );
              })}
            </div>
            : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '0.5rem' }}>
              <CheckCircle2 size={36} style={{ color: '#e2e8f0' }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>All projects on track</p>
              <p style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>No upcoming deadlines</p>
            </div>
          }
        </Card>}
      </div>
    )
  });

  /* ══════════════════════════════════════════════════════════ */
  /*  MAIN RENDER                                              */
  /* ══════════════════════════════════════════════════════════ */
  return (
    <div style={{ maxWidth: '160rem', margin: '0 auto' }}>

      {/* HEADER */}
      <header className="db-header db-no-print">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>Dashboard</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>
            Real-time metrics & pipeline overview · {selectedFY === 'all' ? 'All Time' : `FY ${selectedFY}`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* dark mode */}
          <button onClick={() => setDarkMode(d => !d)} className="db-icon-btn" title={darkMode ? 'Light mode' : 'Dark mode'}>
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {/* print */}
          <button onClick={() => window.print()} className="db-icon-btn" title="Print / Export PDF">
            <Printer size={15} />
          </button>

          {/* filter */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="db-filter-btn">
              <div style={{ display: 'flex', marginRight: '0.5rem' }}>
                {filters.slice(0, 4).map((f, i) => (
                  <div key={f} style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', border: '2px solid white', marginLeft: i > 0 ? '-6px' : '0', boxShadow: '0 1px 4px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 - i, position: 'relative' }}>
                    {f === 'Leads' && <Users size={8} color="#3b82f6" />}
                    {f === 'Quotations' && <FileText size={8} color="#f59e0b" />}
                    {f === 'Projects' && <Briefcase size={8} color="#10b981" />}
                    {f === 'Tickets' && <TicketIcon size={8} color="#ef4444" />}
                    {f === 'Finance' && <Banknote size={8} color="#8b5cf6" />}
                  </div>
                ))}
              </div>
              <span>{filters.length === 5 ? 'All Domains' : `${filters.length} active`}</span>
              <ChevronDown size={13} style={{ marginLeft: '0.35rem', color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: isFilterOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {isFilterOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setIsFilterOpen(false)} />
                <div className="premium-card" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', minWidth: '230px', padding: '0.5rem', zIndex: 100, border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)', padding: '0.4rem 0.75rem 0.5rem' }}>Toggle sections</p>
                  {[
                    { id: 'Leads', icon: <Users size={13} />, color: '#3b82f6', desc: 'Leads & Inquiries' },
                    { id: 'Quotations', icon: <FileText size={13} />, color: '#f59e0b', desc: 'Quotes & Proposals' },
                    { id: 'Projects', icon: <Briefcase size={13} />, color: '#10b981', desc: 'Active Projects' },
                    { id: 'Tickets', icon: <TicketIcon size={13} />, color: '#ef4444', desc: 'Support Tickets' },
                    { id: 'Finance', icon: <Banknote size={13} />, color: '#8b5cf6', desc: 'Financial Metrics' },
                  ].map(f => {
                    const on = filters.includes(f.id);
                    return (
                      <div key={f.id} onClick={() => toggleFilter(f.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0.75rem', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-color)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${on ? f.color : '#e2e8f0'}`, background: on ? f.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                          {on && <Check size={9} color="white" strokeWidth={4} />}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{f.id}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.4rem 0' }} />
                  <div style={{ display: 'flex', gap: '0.5rem', padding: '0 0.35rem' }}>
                    <button onClick={e => { e.stopPropagation(); setFilters(['Leads', 'Quotations', 'Projects', 'Tickets', 'Finance']); }} className="btn btn-secondary" style={{ flex: 1, fontSize: '0.72rem', padding: '0.4rem' }}>All</button>
                    <button onClick={e => { e.stopPropagation(); setFilters([]); }} className="btn btn-secondary" style={{ flex: 1, fontSize: '0.72rem', padding: '0.4rem' }}>Clear</button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* FY selector */}
          <select value={selectedFY} onChange={e => setSelectedFY(e.target.value)} className="premium-select">
            <option value="all">Full Data</option>
            {Array.from({ length: new Date().getFullYear() - 2023 + (new Date().getMonth() >= 3 ? 1 : 0) }, (_, i) => {
              const s = new Date().getFullYear() - i + (new Date().getMonth() >= 3 ? 0 : -1);
              return <option key={`${s}-${s + 1}`} value={`${s}-${s + 1}`}>FY {s}-{String(s + 1).slice(-2)}</option>;
            })}
          </select>
        </div>
      </header>

      {/* SECTIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sections.map(s => <div key={s.id}>{s.component}</div>)}
      </div>

      {/* FOOTER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '2.5rem', fontSize: '0.72rem', color: '#94a3b8' }} className="db-no-print">
        <Info size={11} />
        <span>Data refreshes on page load · FY runs April – March · All values in INR (₹)</span>
      </div>

      {/* QUICK ACTIONS FAB 
      <div className="db-fab db-no-print">
        {[
          { lbl: 'New Lead', icon: Users, color: '#3b82f6', path: '/leads/new' },
          { lbl: 'New Quotation', icon: FileText, color: '#f59e0b', path: '/quotations/new' },
          { lbl: 'New Project', icon: Briefcase, color: '#10b981', path: '/projects/new' },
          { lbl: 'New Ticket', icon: TicketIcon, color: '#ef4444', path: '/tickets/new' },
        ].map((action, i) => (
          <button key={i} onClick={() => router.push(action.path)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', borderRadius: '20px', border: 'none', background: action.color, color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, boxShadow: `0 4px 14px ${action.color}55`, transition: 'all 0.2s', fontFamily: 'inherit' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 20px ${action.color}66`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 14px ${action.color}55`; }}>
            <action.icon size={13} />{action.lbl}
          </button>
        ))}
      </div>*/}
    </div>
  );
};

export default Dashboard;