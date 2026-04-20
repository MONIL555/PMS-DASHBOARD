import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Loader2, Check, X } from 'lucide-react';
import { useQueryState, parseAsString } from 'nuqs';
import toast from 'react-hot-toast';
import { useIconSize } from './DashboardShared';

export const DashboardCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);
  const [popupDay, setPopupDay] = useState<number | null>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [markingPayment, setMarkingPayment] = useState<string | null>(null);
  const [calView, setCalView] = useQueryState('calView', parseAsString.withDefault('calendar'));
  const calendarPopupRef = useRef<HTMLDivElement>(null);

  const loaderSize = useIconSize(13);
  const chevronSize = useIconSize(15);
  const calIconSize = useIconSize(16);
  const xIconSize = useIconSize(14);
  const checkIconSize = useIconSize(12);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarPopupRef.current && !calendarPopupRef.current.contains(event.target as Node)) {
        setPopupDay(null);
      }
    };
    if (popupDay !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popupDay]);

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
        <Calendar size={calIconSize} style={{ color: 'var(--text-secondary)' }} />
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Operation Calendar</h2>
        {loadingCal && <Loader2 size={loaderSize} style={{ animation: 'spin 1s linear infinite', color: '#94a3b8' }} />}

        {/* view toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', background: 'var(--bg-color)' }}>
          {(['calendar', 'list'] as const).map(v => (
            <button key={v} onClick={() => setCalView(v)} style={{ padding: '0.4rem 0.9rem', fontSize: '0.72rem', fontWeight: 700, border: 'none', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s', background: calView === v ? 'white' : 'transparent', color: calView === v ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: calView === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>{v}</button>
          ))}
        </div>

        {/* month nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px', color: 'var(--text-secondary)', display: 'flex' }}><ChevronLeft size={chevronSize} /></button>
          <span style={{ minWidth: '130px', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '20px', padding: '0.3rem 1rem' }}>{MONTHS[cm]} {cy}</span>
          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px', color: 'var(--text-secondary)', display: 'flex' }}><ChevronRight size={chevronSize} /></button>
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
                  {evs.slice(0, 3).map((ev: any, idx: number) => (
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
              <Calendar size={calIconSize * 2} style={{ opacity: 0.1, marginBottom: '0.75rem' }} />
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
                  <span style={{ textTransform: 'capitalize' }}>{ev.type === 'renewal' ? 'Project Billing' : ev.type === 'billing' ? 'Service Billing' : ev.type}</span>
                  {ev.value && <span>· ₹{ev.value.toLocaleString()}</span>}
                </div>
              </div>
              {(ev.type === 'billing' || ev.type === 'renewal') && (
                <button onClick={() => handleToggle(ev)} disabled={!!markingPayment} className={`db-event-check ${ev.isPaid ? 'paid' : ''}`}>
                  {markingPayment === ev.id ? <Loader2 size={checkIconSize} className="spin" /> : <Check size={checkIconSize} strokeWidth={3} />}
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
        <div ref={calendarPopupRef} className="db-calendar-popup" style={{ top: popupPos.top, left: popupPos.left }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Events on {popupDay} {MONTHS[cm]}</h3>
            <button onClick={() => setPopupDay(null)} style={{ background: '#f8fafc', border: 'none', cursor: 'pointer', padding: '0.25rem', borderRadius: '6px', color: '#64748b' }}><X size={xIconSize} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {popupEvs.map((ev, i) => (
              <div key={i} className="db-popup-ev-card" style={evStyle(ev.type, ev.isPaid)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>{ev.projectTitle || ev.title}</p>
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.8 }}>{ev.type === 'renewal' ? 'Project Billing' : ev.type === 'billing' ? 'Service Billing' : ev.type}</span>
                </div>
                {ev.clientName && <p style={{ fontSize: '0.68rem', margin: '0 0 0.5rem 0', opacity: 0.9 }}>Client: {ev.clientName}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {ev.value ? <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>₹{ev.value.toLocaleString()}</span> : <div />}
                  {(ev.type === 'billing' || ev.type === 'renewal') && (
                    <button onClick={() => handleToggle(ev)} disabled={!!markingPayment} className={`db-popup-mark ${ev.isPaid ? 'paid' : ''}`}>
                      {markingPayment === ev.id ? <Loader2 size={checkIconSize} className="spin" /> : ev.isPaid ? 'Mark Pending' : 'Mark Collected'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
