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
	Building2,
	ChevronLeft,
	ChevronRight,
	Loader2,
	Banknote,
	Check,
	ChevronDown,
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
	const getCurrentFY = () => {
		const today = new Date();
		const year = today.getFullYear();
		if (today.getMonth() >= 3) {
			return `${year}-${year + 1}`;
		}
		return `${year - 1}-${year}`;
	};

	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [selectedFY, setSelectedFY] = useState(getCurrentFY());
	const [filters, setFilters] = useState(['Leads', 'Quotations', 'Projects', 'Tickets']);
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const router = useRouter();

	const toggleFilter = (filter: string) => {
		setFilters(prev =>
			prev.includes(filter)
				? prev.filter(f => f !== filter)
				: [...prev, filter]
		);
	};

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
			category: 'Leads',
			value: data.stats.totalLeads,
			icon: Users,
			color: '#3b82f6',
			rate: data.stats.leadGrowth || data.conversionRates.leadToQuote + '%',
			label: data.stats.leadGrowth ? 'vs prev. FY' : 'Conv. Rate',
			path: '/leads'
		},
		{
			title: 'Quotations',
			category: 'Quotations',
			value: data.stats.totalQuotations,
			icon: FileText,
			color: '#f59e0b',
			rate: data.stats.quoteGrowth || 'Sent',
			label: data.stats.quoteGrowth ? 'vs prev. FY' : 'Inquiry Status',
			path: '/quotations'
		},
		{
			title: 'Total Projects',
			category: 'Projects',
			value: data.stats.totalActiveProjects,
			icon: Briefcase,
			color: '#10b981',
			rate: data.stats.activeProjectsGrowth || data.conversionRates.quoteToProject + '%',
			label: data.stats.activeProjectsGrowth ? 'vs prev. FY' : 'Conv. Rate',
			path: '/projects'
		},
		{
			title: 'Open Tickets',
			category: 'Tickets',
			value: data.stats.totalOpenTickets,
			icon: TicketIcon,
			color: '#ef4444',
			rate: 'Support',
			label: 'Workload',
			path: '/tickets'
		}
	].filter(card => filters.includes(card.category));

	const getFYDates = (fy: string) => {
		if (fy === 'all') return { startDate: '', endDate: '' };
		const [startYear, endYear] = fy.split('-').map(Number);
		return {
			startDate: `${startYear}-04-01`,
			endDate: `${endYear}-03-31`
		};
	};

	const DashboardCalendar = () => {
		const [currentDate, setCurrentDate] = useState(new Date());
		const [events, setEvents] = useState<any[]>([]);
		const [loadingCal, setLoadingCal] = useState(true);
		const [popupDay, setPopupDay] = useState<number | null>(null);
		const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

		const now = new Date();
		const currentMonth = currentDate.getMonth();
		const currentYear = currentDate.getFullYear();
		const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
		const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

		const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

		useEffect(() => {
			const fetchEvents = async () => {
				setLoadingCal(true);
				try {
					const res = await fetch(`/api/dashboard/calendar?month=${currentMonth}&year=${currentYear}`);
					const data = await res.json();
					if (data.calendarEvents) {
						setEvents(data.calendarEvents);
					}
				} catch (err) {
					console.error("Error fetching calendar events", err);
				} finally {
					setLoadingCal(false);
				}
			};
			fetchEvents();
		}, [currentMonth, currentYear]);

		const changeMonth = (offset: number) => {
			setCurrentDate(prev => {
				const updated = new Date(prev);
				updated.setMonth(updated.getMonth() + offset);
				return updated;
			});
			setPopupDay(null);
		};

		const getEventStyle = (type: string) => {
			if (type === 'renewal') return { bg: '#f3e8ff', color: '#7c3aed', border: '#a855f7' };
			if (type === 'billing') return { bg: '#dcfce7', color: '#166534', border: '#22c55e' };
			return { bg: '#fef3c7', color: '#b45309', border: '#f59e0b' };
		};

		const getEventsForDay = (day: number) => {
			return (events || []).filter(e => {
				if (!e.date) return false;
				const eDate = new Date(e.date);
				return eDate.getDate() === day && eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear;
			});
		};

		const handleCellClick = (day: number, e: React.MouseEvent) => {
			const dayEvents = getEventsForDay(day);
			if (dayEvents.length === 0) { setPopupDay(null); return; }
			if (popupDay === day) { setPopupDay(null); return; }
			const rect = e.currentTarget.getBoundingClientRect();
			setPopupPos({ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 340) });
			setPopupDay(day);
		};

		const renderCell = (day: number) => {
			const dayEvents = getEventsForDay(day);
			const renderDate = new Date(currentYear, currentMonth, day);
			const isToday = renderDate.toDateString() === now.toDateString();
			const hasEvents = dayEvents.length > 0;

			return (
				<div key={day} onClick={(e) => handleCellClick(day, e)} style={{
					minHeight: '70px',
					minWidth: 0,
					padding: '0.5rem',
					border: isToday ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
					borderRadius: '8px',
					backgroundColor: isToday ? '#eff6ff' : 'white',
					display: 'flex',
					flexDirection: 'column',
					gap: '0.25rem',
					transition: 'all 0.2s ease',
					cursor: hasEvents ? 'pointer' : 'default',
					position: 'relative'
				}}>
					<div style={{ fontSize: '0.8rem', fontWeight: isToday ? 800 : 600, color: isToday ? '#3b82f6' : 'var(--text-secondary)', alignSelf: 'flex-end', marginBottom: '2px' }}>
						{day}
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
						{dayEvents.slice(0, 3).map((ev: any) => {
							const style = getEventStyle(ev.type);
							return (
								<div key={ev.id} title={`${ev.title} - ${ev.clientName} (₹${ev.value?.toLocaleString()})`} style={{
									padding: '2px 5px',
									borderRadius: '4px',
									fontSize: '0.65rem',
									fontWeight: 700,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									backgroundColor: style.bg,
									color: style.color,
									borderLeft: `3px solid ${style.border}`,
									cursor: 'pointer'
								}}>
									{ev.clientName}
								</div>
							);
						})}
						{dayEvents.length > 3 && (
							<div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#3b82f6', textAlign: 'center', cursor: 'pointer' }}>
								+{dayEvents.length - 3} more
							</div>
						)}
					</div>
				</div>
			);
		}

		const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => (
			<div key={`blank-${i}`} style={{ minHeight: '70px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px dashed #e2e8f0' }}></div>
		));

		const cells = Array.from({ length: daysInMonth }, (_, i) => renderCell(i + 1));

		const popupEvents = popupDay ? getEventsForDay(popupDay) : [];

		return (
			<div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
						<Calendar size={20} className="text-secondary" />
						<h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Operation Calendar</h2>
						{loadingCal && <Loader2 size={16} className="text-secondary animate-spin" />}
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<button onClick={() => changeMonth(-1)} style={{ padding: '0.25rem', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent', border: 'none', color: 'var(--text-secondary)' }} title="Previous Month">
							<ChevronLeft size={18} />
						</button>
						<div style={{ fontSize: '0.90rem', fontWeight: 700, color: '#3b82f6', backgroundColor: '#eff6ff', padding: '0.35rem 1rem', borderRadius: '20px', border: '1px solid #bfdbfe', minWidth: '130px', textAlign: 'center' }}>
							{monthNames[currentMonth]} {currentYear}
						</div>
						<button onClick={() => changeMonth(1)} style={{ padding: '0.25rem', borderRadius: '4px', cursor: 'pointer', backgroundColor: 'transparent', border: 'none', color: 'var(--text-secondary)' }} title="Next Month">
							<ChevronRight size={18} />
						</button>
					</div>
				</div>

				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
					{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
						<div key={day} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
							{day}
						</div>
					))}
				</div>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.5rem', flex: 1 }}>
					{blanks}
					{cells}
				</div>

				<div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', fontSize: '0.8rem', fontWeight: 600, flexWrap: 'wrap' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f59e0b' }}></div>
						<span style={{ color: 'var(--text-secondary)' }}>Quotations Follow-up</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#22c55e' }}></div>
						<span style={{ color: 'var(--text-secondary)' }}>Service Billings</span>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#a855f7' }}></div>
						<span style={{ color: 'var(--text-secondary)' }}>Project Costing</span>
					</div>
				</div>

				{popupDay !== null && popupEvents.length > 0 && (
					<>
						<div onClick={() => setPopupDay(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} />
						<div style={{
							position: 'fixed',
							top: popupPos.top,
							left: popupPos.left,
							width: '320px',
							maxHeight: '360px',
							overflowY: 'auto',
							backgroundColor: 'white',
							borderRadius: '12px',
							border: '1px solid #e2e8f0',
							boxShadow: '0 20px 40px -5px rgba(0,0,0,0.15), 0 8px 16px -8px rgba(0,0,0,0.1)',
							zIndex: 100,
							padding: '1rem'
						}}>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
								<h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
									{popupDay} {monthNames[currentMonth]} {currentYear}
								</h4>
								<span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '10px' }}>
									{popupEvents.length} event{popupEvents.length > 1 ? 's' : ''}
								</span>
							</div>
							<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
								{popupEvents.map((ev: any) => {
									const style = getEventStyle(ev.type);
									return (
										<div key={ev.id} style={{
											padding: '0.6rem 0.75rem',
											borderRadius: '8px',
											backgroundColor: style.bg,
											borderLeft: `3px solid ${style.border}`,
											display: 'flex',
											flexDirection: 'column',
											gap: '0.2rem'
										}}>
											<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
												<span style={{ fontSize: '0.78rem', fontWeight: 700, color: style.color }}>{ev.clientName}</span>
												{ev.value > 0 && (
													<span style={{ fontSize: '0.72rem', fontWeight: 800, color: style.color }}>
														₹{ev.value.toLocaleString()}
													</span>
												)}
											</div>
											<div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
												{ev.title}
												{ev.schedule && <span style={{ marginLeft: '0.5rem', fontWeight: 600, opacity: 0.7 }}>({ev.schedule})</span>}
											</div>
											<div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 500 }}>
												{ev.refId}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</>
				)}
			</div>
		);
	};

	// Filter checks
	const hasLeads = filters.includes('Leads');
	const hasQuotations = filters.includes('Quotations');
	const hasProjects = filters.includes('Projects');
	const hasTickets = filters.includes('Tickets');
	const hasFinance = filters.includes('Finance');

	// Build renderable sections
	const sections: any[] = [];

	// ROW 1: STATS CARDS (full width, wrapping)
	if (statsCards.length > 0) {
		sections.push({
			id: 'stats-cards',
			rowStart: 'auto',
			colStart: '1 / -1',
			component: (
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', gridColumn: '1 / -1' }}>
					{statsCards.map((stat, idx) => (
						<div
							key={idx}
							className="premium-card"
							style={{
								padding: '1.75rem',
								position: 'relative',
								overflow: 'hidden',
								cursor: 'pointer',
							}}
							onClick={() => {
								const { startDate, endDate } = getFYDates(selectedFY);
								const params = new URLSearchParams();
								if (startDate) params.append('startDate', startDate);
								if (endDate) params.append('endDate', endDate);
								const query = params.toString();
								router.push(`${stat.path}${query ? `?${query}` : ''}`);
							}}
						>
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
			)
		});
	}

	// ROW 2: GROWTH TRENDS (2 cols if Finance, else full width)
	if (hasLeads || hasQuotations || hasProjects || hasFinance) {
		const showFinanceCards = (hasProjects && hasFinance) || (hasQuotations && hasFinance);

		sections.push({
			id: 'growth-trends',
			colStart: '1 / -1',
			component: (
				<div style={{ display: 'grid', gridTemplateColumns: showFinanceCards ? '2fr 1fr' : '1fr', gap: '1.5rem', gridColumn: '1 / -1' }}>
					{/* Growth Trends Chart */}
					<div className="premium-card" style={{ padding: '1.5rem' }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
								<BarChart3 size={20} className="text-secondary" />
								<h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Growth Trends</h2>
							</div>
							<div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', flexWrap: 'wrap' }}>
								{hasLeads && (
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
										<div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3b82f6' }}></div>
										<span style={{ color: 'var(--text-secondary)' }}>Leads</span>
									</div>
								)}
								{hasQuotations && (
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
										<div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }}></div>
										<span style={{ color: 'var(--text-secondary)' }}>Quotations</span>
									</div>
								)}
								{hasProjects && (
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
										<div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }}></div>
										<span style={{ color: 'var(--text-secondary)' }}>Projects</span>
									</div>
								)}
								{hasFinance && (
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
										<div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px dashed #8b5cf6' }}></div>
										<span style={{ color: 'var(--text-secondary)' }}>Finance</span>
									</div>
								)}
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
									{hasLeads && <Area type="monotone" dataKey="Leads" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />}
									{hasQuotations && <Area type="monotone" dataKey="Quotations" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorQuotes)" />}
									{hasProjects && <Area type="monotone" dataKey="Projects" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProjects)" />}
									{hasFinance && <Area type="monotone" dataKey="Value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} strokeDasharray="5 5" />}
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</div>

					{/* Finance Cards */}
					{showFinanceCards && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
							{(hasProjects && hasFinance) && (
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
											marginTop: '0.5rem',
											flexWrap: 'wrap'
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
										</div>
									)}
								</div>
							)}
							{(hasQuotations && hasFinance) && (
								<div className="premium-card" style={{ padding: '1.5rem', background: 'white' }}>
									<p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>TOTAL QUOTATIONS VALUE</p>
									<h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>₹{data.commercialValue.totalConvertedQuotes.toLocaleString()}</h2>
									{selectedFY !== 'all' && (
										<div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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
										</div>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			)
		});
	}

	// ROW 3: CONVERSION METRICS (full width, auto-fit)
	const conversionItems = [
		{ show: hasLeads && hasFinance, label: 'Lead → Quote', value: `${data.conversionRates.leadToQuote}%`, icon: <Users size={16} />, color: '#3b82f6' },
		{ show: hasQuotations && hasFinance, label: 'Quote → Project', value: `${data.conversionRates.quoteToProject}%`, icon: <FileText size={16} />, color: '#f59e0b' },
		{ show: hasProjects, label: 'Avg Project Duration', value: `${data.conversionRates.avgCompletionTime} Days`, icon: <Clock size={16} />, color: '#10b981' },
		{ show: hasTickets, label: 'Support Load', value: data.stats.totalOpenTickets, icon: <TicketIcon size={16} />, color: '#ef4444' }
	].filter(item => item.show);

	if (conversionItems.length > 0) {
		sections.push({
			id: 'conversion',
			colStart: '1 / -1',
			component: (
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', gridColumn: '1 / -1' }}>
					{conversionItems.map((item, idx) => (
						<div key={idx} className="premium-card" style={{ padding: '0.75rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
							<div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: `${item.color}08`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
								{item.icon}
							</div>
							<div>
								<p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>{item.label}</p>
								<p style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{item.value}</p>
							</div>
						</div>
					))}
				</div>
			)
		});
	}

	// ROW 4: CALENDAR & STRATEGIC (if Finance enabled)
	if (hasFinance) {
		const showTopClients = hasFinance && hasProjects;
		const showTopServices = hasLeads;

		sections.push({
			id: 'calendar-strategic',
			colStart: '1 / -1',
			component: (
				<div style={{ display: 'grid', gridTemplateColumns: showTopClients || showTopServices ? '2fr 1fr' : '1fr', gap: '1.5rem', gridColumn: '1 / -1' }}>
					{/* Calendar */}
					<div className="premium-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
						<DashboardCalendar />
					</div>

					{/* Strategic Cards */}
					{(showTopClients || showTopServices) && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
							{showTopClients && (
								<div className="premium-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', minHeight: '26rem' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
										<div style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
											<Building2 size={18} />
										</div>
										<h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Top Clients Portfolio</h2>
									</div>
									<div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', flex: 1, overflowY: 'auto' }}>
										{data.strategic.topClients.map((client: any, idx: number) => (
											<div key={idx} style={{ padding: '0 0.25rem' }}>
												<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
													<span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
														{client.name}
													</span>
													<div style={{
														fontSize: '0.62rem',
														fontWeight: 800,
														color: '#1e40af',
														backgroundColor: '#eff6ff',
														padding: '2px 8px',
														borderRadius: '12px',
														border: '1px solid #bfdbfe'
													}}>
														₹{client.value.toLocaleString()}
													</div>
												</div>
												<div style={{ height: '3px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
													<div style={{
														width: `${(client.value / (data.strategic.topClients[0]?.value || 1)) * 100}%`,
														height: '100%',
														background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
														borderRadius: '4px'
													}}></div>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{showTopServices && (
								<div className="premium-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', minHeight: '26rem' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
										<div style={{ padding: '0.45rem', borderRadius: '8px', backgroundColor: '#fff7ed', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
											<TrendingUp size={18} />
										</div>
										<h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Top Service/Product Trends</h2>
									</div>
									<div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', flex: 1, overflowY: 'auto' }}>
										{data.strategic.topServices?.length > 0 ? (
											data.strategic.topServices.map((service: any, idx: number) => (
												<div key={idx} style={{ padding: '0 0.25rem' }}>
													<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
														<span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
															{service.name}
														</span>
														<div style={{
															fontSize: '0.62rem',
															fontWeight: 800,
															color: '#9a3412',
															backgroundColor: '#fff7ed',
															padding: '2px 8px',
															borderRadius: '12px',
															border: '1px solid #fed7aa'
														}}>
															{service.value} {service.value === 1 ? 'Lead' : 'Leads'}
														</div>
													</div>
													<div style={{ height: '3px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
														<div style={{
															width: `${(service.value / (data.strategic.topServices[0]?.value || 1)) * 100}%`,
															height: '100%',
															background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
															borderRadius: '4px'
														}}></div>
													</div>
												</div>
											))
										) : (
											<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
												No trends found for this period.
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			)
		});
	}

	// ROW 5: CHARTS (Leads Funnel, Projects, Tickets)
	const chartItems = [
		{ show: hasLeads, title: 'Lead Funnel', icon: <PieChartIcon size={20} />, component: 'pie' },
		{ show: hasProjects, title: 'Project Priorities', icon: <TrendingUp size={20} />, component: 'bar' },
		{ show: hasTickets, title: 'Ticket Support load', icon: <TicketIcon size={20} />, component: 'barHorizontal' }
	].filter(item => item.show);

	if (chartItems.length > 0) {
		sections.push({
			id: 'charts',
			colStart: '1 / -1',
			component: (
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', gridColumn: '1 / -1' }}>
					{hasLeads && (
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
					)}

					{hasProjects && (
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
					)}

					{hasTickets && (
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
					)}
				</div>
			)
		});
	}

	// ROW 6: RECENT ACTIVITY & DEADLINES
	sections.push({
		id: 'activity-deadlines',
		colStart: '1 / -1',
		component: (
			<div style={{ display: 'grid', gridTemplateColumns: hasProjects ? '2fr 1fr' : '1fr', gap: '2rem', gridColumn: '1 / -1' }}>
				{/* Recent Activity */}
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
										marginRight: '1rem',
										flexShrink: 0
									}}>
										{activity.type === 'Lead' && <Users size={20} color="#3b82f6" />}
										{activity.type === 'Quotation' && <FileText size={20} color="#f59e0b" />}
										{activity.type === 'Project' && <Briefcase size={20} color="#10b981" />}
										{activity.type === 'Ticket' && <TicketIcon size={20} color="#ef4444" />}
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
											<p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
												{activity.title}
											</p>
											<span className={`badge ${getBadgeClass(activity.status)}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', whiteSpace: 'nowrap' }}>
												{activity.status}
											</span>
										</div>
										<p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0 0' }}>
											#{activity.id}
										</p>
									</div>
									<div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap', marginLeft: '1rem', flexShrink: 0 }}>
										{formatDateDDMMYYYY(activity.date)}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Upcoming Deadlines */}
				{hasProjects && (
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
											<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
												<span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Code: {p.id}</span>
												<span style={{
													fontSize: '0.8rem',
													fontWeight: 600,
													color: '#d97706',
													display: 'flex',
													alignItems: 'center',
													gap: '0.25rem',
													whiteSpace: 'nowrap'
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
				)}
			</div>
		)
	});

	return (
		<div className="dashboard-container" style={{ padding: '0 1rem 2rem 1rem', maxWidth: '160rem', margin: '0 auto' }}>
			{/* HEADER */}
			<header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
				<div>
					<h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem', letterSpacing: '-0.025em' }}>Dashboard</h1>
					<p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Real-time performance metrics and insights.</p>
				</div>
				<div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
					{/* Domain Filters Dropdown */}
					<div style={{ position: 'relative' }}>
						<button
							onClick={() => setIsFilterOpen(!isFilterOpen)}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.75rem',
								padding: '0.6rem 1.25rem',
								borderRadius: '10px',
								border: '1px solid var(--border-color)',
								backgroundColor: 'white',
								color: 'var(--text-primary)',
								fontWeight: 600,
								fontSize: '0.9rem',
								cursor: 'pointer',
								boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
								transition: 'all 0.2s ease',
							}}
						>
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
								<div style={{ display: 'flex', marginLeft: '-4px' }}>
									{filters.slice(0, 3).map((f, i) => (
										<div key={f} style={{
											width: '20px',
											height: '20px',
											borderRadius: '50%',
											backgroundColor: 'white',
											border: '2px solid white',
											marginLeft: i > 0 ? '-8px' : '0',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
											zIndex: 5 - i
										}}>
											{f === 'Leads' && <Users size={10} color="#3b82f6" />}
											{f === 'Quotations' && <FileText size={10} color="#f59e0b" />}
											{f === 'Projects' && <Briefcase size={10} color="#10b981" />}
											{f === 'Tickets' && <TicketIcon size={10} color="#ef4444" />}
											{f === 'Finance' && <Banknote size={10} color="#8b5cf6" />}
										</div>
									))}
								</div>
								<span>{filters.length === 5 ? 'All Domains' : `${filters.length} selected`}</span>
							</div>
							<ChevronDown size={16} style={{ transform: isFilterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
						</button>

						{isFilterOpen && (
							<>
								<div
									onClick={() => setIsFilterOpen(false)}
									style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
								/>
								<div style={{
									position: 'absolute',
									top: 'calc(100% + 8px)',
									right: 0,
									backgroundColor: 'white',
									borderRadius: '12px',
									border: '1px solid var(--border-color)',
									boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
									padding: '0.75rem',
									minWidth: '220px',
									zIndex: 100,
									display: 'flex',
									flexDirection: 'column',
									gap: '0.25rem'
								}}>
									{[
										{ id: 'Leads', icon: <Users size={16} />, color: '#3b82f6', desc: 'Leads & Inquiries' },
										{ id: 'Quotations', icon: <FileText size={16} />, color: '#f59e0b', desc: 'Quotes & Proposals' },
										{ id: 'Projects', icon: <Briefcase size={16} />, color: '#10b981', desc: 'Active Projects' },
										{ id: 'Tickets', icon: <TicketIcon size={16} />, color: '#ef4444', desc: 'Support Tickets' },
										{ id: 'Finance', color: '#8b5cf6' }
									].map(f => {
										const isActive = filters.includes(f.id);
										return (
											<div
												key={f.id}
												onClick={() => toggleFilter(f.id)}
												style={{
													display: 'flex',
													alignItems: 'center',
													gap: '0.75rem',
													padding: '0.6rem 0.75rem',
													borderRadius: '8px',
													cursor: 'pointer',
													backgroundColor: isActive ? `${f.color}08` : 'transparent',
													transition: 'all 0.15s ease',
												}}
											>
												<div style={{
													width: '18px',
													height: '18px',
													borderRadius: '4px',
													border: `2px solid ${isActive ? f.color : '#e2e8f0'}`,
													backgroundColor: isActive ? f.color : 'transparent',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													transition: 'all 0.15s ease'
												}}>
													{isActive && <Check size={12} color="white" strokeWidth={4} />}
												</div>
												<div style={{ flex: 1 }}>
													<p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.id}</p>
												</div>
											</div>
										);
									})}
									<div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0.5rem 0' }} />
									<div style={{ display: 'flex', gap: '0.5rem' }}>
										<button
											onClick={(e) => { e.stopPropagation(); setFilters(['Leads', 'Quotations', 'Projects', 'Tickets', 'Finance']); }}
											style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
										>
											Select All
										</button>
										<button
											onClick={(e) => { e.stopPropagation(); setFilters([]); }}
											style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
										>
											Clear
										</button>
									</div>
								</div>
							</>
						)}
					</div>

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
							{
								Array.from({ length: new Date().getFullYear() - 2023 + (new Date().getMonth() >= 3 ? 1 : 0) }, (_, i) => {
									const startH = new Date().getFullYear() - i + (new Date().getMonth() >= 3 ? 0 : -1);
									return <option key={`${startH}-${startH + 1}`} value={`${startH}-${startH + 1}`}>FY {startH}-{String(startH + 1).slice(2)}</option>
								})
							}
						</select>
						<Calendar size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
					</div>
				</div>
			</header>

			{/* MAIN GRID CONTAINER */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
				{sections.map((section) => (
					<div key={section.id} style={{ gridColumn: section.colStart || 'auto' }}>
						{section.component}
					</div>
				))}
			</div>
		</div>
	);
};

export default Dashboard;