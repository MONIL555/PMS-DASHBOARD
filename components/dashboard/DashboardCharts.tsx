import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart, Line,
  ReferenceLine
} from 'recharts';
import { AnimatedNum } from './DashboardShared';

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

/* ─── WIN RATE GAUGE ─────────────────────────────────────── */
export const WinRateGauge = ({ rate, label, ready = true }: { rate: number; label: string; ready?: boolean }) => {
  const color = rate >= 70 ? '#10b981' : rate >= 40 ? '#3b82f6' : rate >= 20 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '200px' }}>
      <div style={{ position: 'relative', width: '100%', height: '6.25rem', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
            <Pie
              data={[{ value: 1 }]}
              dataKey="value"
              cx="50%"
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius="70%"
              outerRadius="90%"
              fill="var(--surface-hover)"
              stroke="none"
              isAnimationActive={false}
            />
            <Pie
              data={[{ value: rate }, { value: 100 - rate }]}
              dataKey="value"
              cx="50%"
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius="70%"
              outerRadius="90%"
              stroke="none"
              cornerRadius={6}
              isAnimationActive={true}
              animationDuration={800}
            >
              <Cell key="val" fill={color} />
              <Cell key="bg" fill="transparent" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', bottom: '15%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: '2.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>
            <AnimatedNum value={Math.round(rate)} ready={ready} />
            <span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: '1px', color: 'var(--text-secondary)' }}>%</span>
          </p>
        </div>
      </div>
      <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.2 }}>
        {label}
      </p>
    </div>
  );
};

/* ─── TRENDS AREA CHART ─────────────────────────────────────── */
export const TrendsAreaChart = ({ data, hasLeads, hasQuotations, hasProjects, hasFinance }: any) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
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
  );
};

/* ─── REVENUE FORECAST CHART ─────────────────────────────────────── */
export const RevenueForecastChart = ({ rfData }: any) => {
  return (
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
  );
};

/* ─── LEAD FUNNEL PIE CHART ─────────────────────────────────────── */
export const LeadFunnelChart = ({ data, STATUS_COLORS }: any) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
          {data.map((e: any, i: number) => <Cell key={i} fill={STATUS_COLORS[e.name] || '#94a3b8'} />)}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', fontSize: '12px' }} />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

/* ─── PROJECT PRIORITY BAR CHART ─────────────────────────────────────── */
export const ProjectPriorityChart = ({ data, CHART_COLORS }: any) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -20, top: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', fontSize: '12px' }} />
        <Bar dataKey="value" name="Projects" radius={[6, 6, 0, 0]} barSize={32}>
          {data.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

/* ─── TICKET LOAD BAR CHART ─────────────────────────────────────── */
export const TicketLoadChart = ({ data }: any) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={72} />
        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', fontSize: '12px' }} />
        <Bar dataKey="value" name="Tickets" radius={[0, 6, 6, 0]} barSize={24}>
          {data.map((_: any, i: number) => <Cell key={i} fill={(['#ef4444', '#f59e0b', '#3b82f6', '#94a3b8'][i]) || '#ef4444'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
