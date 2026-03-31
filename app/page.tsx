'use client';

import { useEffect, useState } from 'react';
import {
	Users,
	FileText,
	Briefcase,
	Ticket as TicketIcon,
	TrendingUp,
	Clock,
	PieChart as PieChartIcon,
	Calendar,
	ArrowUpRight,
	ArrowDownRight,
	BarChart3,
	Building2
} from 'lucide-react';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	Legend,
	AreaChart,
	Area
} from 'recharts';
import { fetchDashboardStats } from '@/utils/api';
import {
	formatDateDDMMYYYY,
} from '@/utils/dateUtils';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const Dashboard = () => {
	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [selectedFY, setSelectedFY] = useState('2025-2026');
	const router = useRouter();

	useEffect(() => {
		const loadStats = async () => {
			setLoading(true);
			try {
				const stats = await fetchDashboardStats(selectedFY);
				setData(stats);
			} catch (err: any) {
				toast.error('Failed to load dashboard statistics');
				console.error(err);
			} finally {
				setLoading(false);
			}
		};
		loadStats();
	}, [selectedFY]);

	if (loading) return (
		<div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
			<div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
			<p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading analytics...</p>
		</div>
	);

	if (!data) return <div className="p-8 text-red-500 text-center">Error loading dashboard data. Please try again later.</div>;

	const STATUS_COLORS: { [key: string]: string } = {
		'New': '#3b82f6',
		'In Progress': '#ddca19ff',
		'Converted': '#10b981',
		'Cancelled': '#ef4444'
	};

	const getStatusColor = (status: string) => STATUS_COLORS[status] || '#94a3b8';

	const getBadgeClass = (status: string) => {
		const success = ['Active', 'Approved', 'Converted', 'Sent'];
		const warning = ['On Hold', 'Pending', 'Follow-up'];
		const danger = ['Rejected', 'Cancelled', 'Closed'];
		const info = ['Open', 'In Progress', 'New'];

		if (success.includes(status)) return 'badge-green';
		if (warning.includes(status)) return 'badge-yellow';
		if (danger.includes(status)) return 'badge-red';
		if (info.includes(status)) return 'badge-blue';
		return 'badge-gray';
	};

	const statsCards = [
		{
			title: 'Total Leads',
			value: data.stats.totalLeads,
			icon: Users,
			color: '#3b82f6',
			rate: data.stats.leadGrowth || data.conversionRates.leadToQuote + '%',
			label: data.stats.leadGrowth ? 'vs prev. FY' : 'Conv. Rate',
			path: '/leads'
		},
		{
			title: 'Quotations',
			value: data.stats.totalQuotations,
			icon: FileText,
			color: '#f59e0b',
			rate: data.stats.quoteGrowth || 'Sent',
			label: data.stats.quoteGrowth ? 'vs prev. FY' : 'Inquiry Status',
			path: '/quotations'
		},
		{
			title: 'Total Projects',
			value: data.stats.totalActiveProjects,
			icon: Briefcase,
			color: '#10b981',
			rate: data.stats.activeProjectsGrowth || data.conversionRates.quoteToProject + '%',
			label: data.stats.activeProjectsGrowth ? 'vs prev. FY' : 'Conv. Rate',
			path: '/projects'
		},
		{
			title: 'Open Tickets',
			value: data.stats.totalOpenTickets,
			icon: TicketIcon,
			color: '#ef4444',
			rate: 'Support',
			label: 'Workload',
			path: '/tickets'
		},
	];

	const getFYDates = (fy: string) => {
		if (fy === 'all') return { startDate: '', endDate: '' };
		const [startYear, endYear] = fy.split('-').map(Number);
		return {
			startDate: `${startYear}-04-01`,
			endDate: `${endYear}-03-31`
		};
	};

	return (
		<div className="dashboard-container" style={{ padding: '0 1rem 2rem 1rem', maxWidth: '160rem', margin: '0 auto' }}>
			<header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
				<div>
					<h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem', letterSpacing: '-0.025em' }}>Dashboard</h1>
					<p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Real-time performance metrics and insights.</p>
				</div>
				<div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
					<div style={{ position: 'relative' }}>
						<select
							value={selectedFY}
							onChange={(e) => setSelectedFY(e.target.value)}
							style={{
								padding: '0.6rem 2.5rem 0.6rem 1.25rem',
								borderRadius: '10px',
								border: '1px solid var(--border-color)',
								backgroundColor: 'white',
								color: 'var(--text-primary)',
								fontWeight: 600,
								fontSize: '0.9rem',
								appearance: 'none',
								cursor: 'pointer',
								boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
								outline: 'none',
								transition: 'all 0.2s ease'
							}}
						>
							<option value="all">Full Data</option>
							{/* <option value="2026-2027">FY 2026-27</option> */}
							<option value="2025-2026">FY 2025-26</option>
							<option value="2024-2025">FY 2024-25</option>
							<option value="2023-2024">FY 2023-24</option>
						</select>
						<Calendar size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
					</div>
				</div>
			</header>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
				{statsCards.map((stat, idx) => (
					<div key={idx} className="premium-card" style={{
						padding: '1.75rem',
						position: 'relative',
						overflow: 'hidden',
						cursor: 'pointer',
					}} onClick={() => {
						const { startDate, endDate } = getFYDates(selectedFY);
						const params = new URLSearchParams();
						if (startDate) params.append('startDate', startDate);
						if (endDate) params.append('endDate', endDate);
						const query = params.toString();
						router.push(`${stat.path}${query ? `?${query}` : ''}`);
					}}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
							<div>
								<h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{stat.title}</h3>
								<p style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{stat.value}</p>
							</div>
							<div style={{
								backgroundColor: `${stat.color}15`,
								padding: '0.75rem',
								borderRadius: '12px',
								color: stat.color
							}}>
								<stat.icon size={28} />
							</div>
						</div>
						<div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
							<span style={{
								fontSize: '0.875rem',
								fontWeight: 700,
								color: (stat.rate && stat.rate.startsWith('-')) ? '#ef4444' : stat.color,
								display: 'flex',
								alignItems: 'center'
							}}>
								{stat.rate && (stat.rate.includes('%') || stat.rate.startsWith('+') || stat.rate.startsWith('-')) ? (
									stat.rate.startsWith('-') ? <ArrowDownRight size={14} style={{ marginRight: '4px' }} /> : <ArrowUpRight size={14} style={{ marginRight: '4px' }} />
								) : null}
								{stat.rate}
							</span>
							<span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
								{stat.label}
							</span>
						</div>
					</div>
				))}
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
				<div className="premium-card" style={{ padding: '1.5rem' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
							<BarChart3 size={20} className="text-secondary" />
							<h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Growth Trends</h2>
						</div>
						<div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
								<div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3b82f6' }}></div>
								<span style={{ color: 'var(--text-secondary)' }}>Leads</span>
							</div>
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
								<div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }}></div>
								<span style={{ color: 'var(--text-secondary)' }}>Quotations</span>
							</div>
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
								<div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }}></div>
								<span style={{ color: 'var(--text-secondary)' }}>Projects</span>
							</div>
						</div>
					</div>
					<div style={{ height: '320px', width: '100%' }}>
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={data.trends}>
								<defs>
									<linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
										<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
									</linearGradient>
									<linearGradient id="colorQuotes" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
										<stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
									</linearGradient>
									<linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
										<stop offset="95%" stopColor="#10b981" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
								<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
								<YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
								<Tooltip
									contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
									cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
								/>
								<Area type="monotone" dataKey="Leads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
								<Area type="monotone" dataKey="Quotations" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorQuotes)" />
								<Area type="monotone" dataKey="Projects" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProjects)" />
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
					<div className="premium-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: 'white', position: 'relative' }}>
						<div style={{ position: 'absolute', top: '1rem', right: '1rem', opacity: 0.1 }}>
							<TrendingUp size={80} strokeWidth={1} />
						</div>
						<p style={{ opacity: 0.7, fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>TOTAL PROJECTS VALUE</p>
						<h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>₹{data.commercialValue.activeProjects.toLocaleString()}</h2>
						{selectedFY !== 'all' && (
							<div style={{
								display: 'flex',
								alignItems: 'center',
								gap: '1rem',
								marginTop: '0.5rem'
							}}>
								<div style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
									color: data.commercialValue.activeProjectsRate?.startsWith('-') ? '#f87171' : '#34d399',
									fontSize: '0.9rem',
									fontWeight: 700
								}}>
									{data.commercialValue.activeProjectsRate?.startsWith('-') ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
									<span>{data.commercialValue.activeProjectsRate} vs prev. FY</span>
								</div>
								<div style={{ height: '12px', width: '1px', background: 'rgba(255,255,255,0.2)' }}></div>
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8, fontSize: '0.85rem' }}>
									<PieChartIcon size={14} />
									<span>Avg. Project: ₹{Math.round(data.commercialValue.avgProjectValue).toLocaleString()}</span>
								</div>
							</div>
						)}
					</div>
					<div className="premium-card" style={{ padding: '1.5rem', background: 'white' }}>
						<p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>TOTAL QUOTATIONS VALUE</p>
						<h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>₹{data.commercialValue.totalConvertedQuotes.toLocaleString()}</h2>
						{selectedFY !== 'all' && (
							<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
								<div style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
									color: data.commercialValue.totalConvertedQuotesRate?.startsWith('-') ? '#ef4444' : '#10b981',
									fontSize: '0.9rem',
									fontWeight: 700
								}}>
									{data.commercialValue.totalConvertedQuotesRate?.startsWith('-') ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
									<span>{data.commercialValue.totalConvertedQuotesRate} vs prev. FY</span>
								</div>
								<div style={{ height: '12px', width: '1px', background: '#e2e8f0' }}></div>
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
									<TrendingUp size={14} />
									<span>Avg. Quote: ₹{Math.round(data.commercialValue.avgQuoteValue).toLocaleString()}</span>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Conversion & Efficiency Grid */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
				{[
					{ label: 'Lead → Quote', value: `${data.conversionRates.leadToQuote}%`, icon: <Users size={16} />, color: '#3b82f6' },
					{ label: 'Quote → Project', value: `${data.conversionRates.quoteToProject}%`, icon: <FileText size={16} />, color: '#f59e0b' },
					{ label: 'Avg. Project Completion Time', value: `${data.conversionRates.avgCompletionTime} Days`, icon: <Clock size={16} />, color: '#10b981' },
					{ label: 'Support Load', value: data.stats.totalOpenTickets, icon: <TicketIcon size={16} />, color: '#ef4444' }
				].map((item, idx) => (
					<div key={idx} className="premium-card" style={{ padding: '0.75rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
						<div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: `${item.color}15`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
							{item.icon}
						</div>
						<div>
							<p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>{item.label}</p>
							<p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{item.value}</p>
						</div>
					</div>
				))}
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
				{/* Revenue & Forecast Trend */}
				<div className="premium-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
							<TrendingUp size={20} className="text-secondary" />
							<h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Project Amounts vs Quote Amounts</h2>
						</div>
						<div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', fontWeight: 600 }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
								<div style={{ width: '7px', height: '7px', borderRadius: '2px', backgroundColor: '#3b82f6' }}></div>
								<span>Project Amounts</span>
							</div>
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
								<div style={{ width: '7px', height: '7px', borderRadius: '2px', backgroundColor: '#10b981' }}></div>
								<span>Quote Amounts</span>
							</div>
						</div>
					</div>
					<div style={{ flex: 1, minHeight: '240px' }}>
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={data.trends} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
								<defs>
									<linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
										<stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
									</linearGradient>
									<linearGradient id="colorFore" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
										<stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
								<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
								<YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={(val) => `₹${val / 1000}k`} />
								<Tooltip
									contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 12px -3px rgba(0,0,0,0.1)', fontSize: '0.75rem' }}
									formatter={(val: any) => [`₹${val.toLocaleString()}`, '']}
								/>
								<Area type="monotone" dataKey="Revenue" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
								<Area type="monotone" dataKey="Forecast" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFore)" />
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Top Clients by Value */}
				<div className="premium-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
						<Building2 size={20} className="text-secondary" />
						<h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Top Clients Portfolio</h2>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', paddingBottom: '0.25rem' }}>
						{data.strategic.topClients.map((client: any, idx: number) => (
							<div key={idx} style={{ position: 'relative' }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.8rem' }}>
									<span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{client.name}</span>
									<span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>₹{client.value.toLocaleString()}</span>
								</div>
								<div style={{ height: '5px', backgroundColor: '#f1f5f9', borderRadius: '2.5px', overflow: 'hidden' }}>
									<div style={{ width: `${(client.value / data.strategic.topClients[0].value) * 100}%`, height: '100%', backgroundColor: '#3b82f6', borderRadius: '2.5px' }}></div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
				<div className="premium-card" style={{ padding: '1.5rem' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
						<PieChartIcon size={20} className="text-secondary" />
						<h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Lead Funnel</h2>
					</div>
					<div style={{ height: '300px' }}>
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={data.leadStatusDist}
									cx="50%"
									cy="50%"
									innerRadius={70}
									outerRadius={100}
									paddingAngle={8}
									dataKey="value"
									stroke="none"
								>
									{data.leadStatusDist.map((entry: any, index: number) => (
										<Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
									))}
								</Pie>
								<Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
								<Legend verticalAlign="bottom" iconType="circle" />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div className="premium-card" style={{ padding: '1.5rem' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
						<TrendingUp size={20} className="text-secondary" />
						<h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Project Priorities</h2>
					</div>
					<div style={{ height: '300px' }}>
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={data.projectPriorityDist} margin={{ left: -30 }}>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
								<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
								<YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
								<Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
								<Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div className="premium-card" style={{ padding: '1.5rem' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
						<TicketIcon size={20} className="text-secondary" />
						<h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Ticket Support load</h2>
					</div>
					<div style={{ height: '300px' }}>
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={data.ticketPriorityDist} layout="vertical" margin={{ left: 0, right: 30 }}>
								<CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
								<XAxis type="number" hide />
								<YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
								<Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
								<Bar dataKey="value" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={30} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
				<div className="premium-card" style={{ padding: '1.5rem' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
							<Clock size={20} className="text-secondary" />
							<h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Recent Activity</h2>
						</div>
					</div>

					<div style={{ display: 'grid', gap: '0.75rem' }}>
						{data.recentActivities.map((activity: { type: string; id: string; title: string; date: string; status: string }, idx: number) => {
							const handleClick = () => {
								if (activity.type === 'Project') {
									router.push(`/projects/${activity.id}`);
								} else if (activity.type === 'Lead') {
									router.push('/leads');
								} else if (activity.type === 'Quotation') {
									router.push('/quotations');
								} else if (activity.type === 'Ticket') {
									router.push('/tickets');
								}
							};

							return (
								<div key={idx} style={{
									display: 'flex',
									alignItems: 'center',
									padding: '1rem',
									borderRadius: '12px',
									backgroundColor: '#f8fafc',
									border: '1px solid #f1f5f9',
									transition: 'all 0.2s ease',
									cursor: 'pointer'
								}}
									onClick={handleClick}
									onMouseEnter={(e) => {
										e.currentTarget.style.transform = 'translateY(-2px)';
										e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.transform = 'translateY(0)';
										e.currentTarget.style.boxShadow = 'none';
									}}
								>
									<div style={{
										width: '42px',
										height: '42px',
										borderRadius: '10px',
										backgroundColor: 'white',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
										marginRight: '1rem'
									}}>
										{activity.type === 'Lead' && <Users size={20} color="#3b82f6" />}
										{activity.type === 'Quotation' && <FileText size={20} color="#f59e0b" />}
										{activity.type === 'Project' && <Briefcase size={20} color="#10b981" />}
										{activity.type === 'Ticket' && <TicketIcon size={20} color="#ef4444" />}
									</div>
									<div style={{ flex: 1 }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
											<p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
												{activity.title}
											</p>
											<span className={`badge ${getBadgeClass(activity.status)}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem' }}>
												{activity.status}
											</span>
										</div>
										<p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0 0' }}>
											#{activity.id}
										</p>
									</div>
									<div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
										{formatDateDDMMYYYY(activity.date)}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<div className="premium-card" style={{ padding: '1.5rem' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
						<Calendar size={20} className="text-secondary" />
						<h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Upcoming Deadlines</h2>
					</div>
					{data.upcomingDeadlines.length > 0 ? (
						<div style={{ display: 'grid', gap: '1rem' }}>
							{data.upcomingDeadlines.map((p: any, idx: number) => {
								const isOverdue = new Date(p.deadline) < new Date();
								return (
									<div key={idx}
										style={{
											padding: '1rem',
											borderRadius: '12px',
											borderLeft: '4px solid #f59e0b',
											backgroundColor: '#fffbeb'
										}}>
										<h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem' }}>{p.name}</h4>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
											<span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Code: {p.id}</span>
											<span style={{
												fontSize: '0.8rem',
												fontWeight: 600,
												color: '#d97706',
												display: 'flex',
												alignItems: 'center',
												gap: '0.25rem'
											}}>
												{isOverdue ? 'Overdue' : 'Due'}: {formatDateDDMMYYYY(p.deadline)}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
							<Calendar size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
							<p>No upcoming deadlines found.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Dashboard;
