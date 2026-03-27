import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Quotation from '@/models/Quotation';
import Project from '@/models/Project';
import Ticket from '@/models/Ticket';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

// --- UTILITIES (Ported from mainController.js) ---

const getFYRange = (fy: string | null) => {
    if (!fy || fy === 'all') return { isFY: false, filter: {}, startYear: 0, endYear: 0 };
    const [startYear, endYear] = fy.split('-').map(Number);
    return {
        isFY: true,
        startYear,
        endYear,
        filter: { $gte: new Date(startYear, 3, 1), $lte: new Date(endYear, 2, 31, 23, 59, 59) }
    };
};

const formatMonthlyTrends = (leadsAgg: any[], quotesAgg: any[], projectsAgg: any[], fyRange: any, customCount?: number) => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trends = [];
    const count = customCount || (fyRange.isFY ? 12 : 6);

    for (let i = 0; i < count; i++) {
        let m: number, y: number;
        if (fyRange.isFY) {
            m = (3 + i) % 12 + 1; // Start from April (month 4)
            y = m >= 4 ? fyRange.startYear : fyRange.endYear;
        } else {
            const d = new Date();
            d.setMonth(d.getMonth() - (count - 1 - i));
            m = d.getMonth() + 1;
            y = d.getFullYear();
        }

        const lMatch = leadsAgg.find((l: any) => l._id.month === m && l._id.year === y);
        const qMatch = quotesAgg.find((q: any) => q._id.month === m && q._id.year === y);
        const pMatch = projectsAgg.find((p: any) => p._id.month === m && p._id.year === y);

        trends.push({
            name: `${monthNames[m - 1]}${fyRange.isFY ? '' : ` '${String(y).slice(-2)}`}`,
            Leads: lMatch?.count || 0,
            Quotations: qMatch?.count || 0,
            Projects: pMatch?.count || 0
        });
    }
    return trends;
};

const formatActivities = (leads: any[], quotes: any[], projs: any[], tickets: any[]) => {
    return [
        ...leads.map(l => ({
            type: 'Lead',
            id: l.Lead_ID,
            title: l.Product_Reference?.Product_Name || l.Client_Reference?.Company_Name || l.Client_Reference?.Client_Name || 'Untitled Lead',
            date: l.updatedAt || l.createdAt,
            status: l.Lead_Status
        })),
        ...quotes.map(q => ({
            type: 'Quotation',
            id: q.Quotation_ID,
            title: q.Product_Reference?.Product_Name || q.Client_Reference?.Company_Name || q.Client_Reference?.Client_Name || 'Untitled Quote',
            date: q.updatedAt || q.createdAt,
            status: q.Quotation_Status
        })),
        ...projs.map(p => ({
            type: 'Project',
            id: p.Project_ID,
            title: p.Project_Name,
            date: p.updatedAt || p.createdAt,
            status: p.Pipeline_Status
        })),
        ...tickets.map(t => ({
            type: 'Ticket',
            id: t.Ticket_Number,
            title: t.Title,
            date: t.updatedAt || t.createdAt,
            status: t.Status
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
};

export async function GET(request: Request) {
    try {
        await connectDB();
        const auth = await verifyPermission(PERMISSIONS.DASHBOARD_VIEW);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const { searchParams } = new URL(request.url);
        const fy = searchParams.get('fy');
        const fyRange = getFYRange(fy);
        const dateFilter = fyRange.filter;
        const isFY = fyRange.isFY;

        // --- Trends Parameters ---
        let trendsCount = isFY ? 12 : 6;
        let trendFilter: any = isFY ? dateFilter : { $gte: new Date(new Date().setMonth(new Date().getMonth() - 5)) };

        if (fy === 'all') {
            const earliestLead = await Lead.findOne({}).sort({ Inquiry_Date: 1 }).lean();
            if (earliestLead && earliestLead.Inquiry_Date) {
                const start = new Date(earliestLead.Inquiry_Date);
                const end = new Date();
                trendsCount = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
                trendFilter = {}; // All history
            }
        }

        const [
            leadCount, quoteCount, activeProjCount, openTicketCount,
            commValueActive, commValueConverted,
            leadStats, projectPhases, projectPriorities, ticketPriorities,
            monthlyLeads, monthlyQuotes, monthlyProjects,
            recentLeads, recentQuotes, recentProjects, recentTickets,
            upcomingProjects, allProjCount,
            prevCommValueActiveAgg = []
        ] = await Promise.all([
            Lead.countDocuments(isFY ? { Inquiry_Date: dateFilter } : {}),
            Quotation.countDocuments(isFY ? { Quotation_Date: dateFilter } : {}),
            Project.countDocuments({ Pipeline_Status: 'Active', ...(isFY ? { "Start_Details.Start_Date": dateFilter } : {}) }),
            Ticket.countDocuments({ Status: { $ne: 'Closed' }, ...(isFY ? { Raised_Date_Time: dateFilter } : {}) }),
            Project.aggregate([{ $match: { Pipeline_Status: 'Active', ...(isFY ? { "Start_Details.Start_Date": dateFilter } : {}) } }, { $group: { _id: null, total: { $sum: "$Start_Details.Costing" } } }]),
            Quotation.aggregate([{ $match: { Quotation_Status: 'Converted', ...(isFY ? { Quotation_Date: dateFilter } : {}) } }, { $group: { _id: null, total: { $sum: "$Commercial" } } }]),
            Lead.aggregate([{ $match: isFY ? { Inquiry_Date: dateFilter } : {} }, { $group: { _id: "$Lead_Status", count: { $sum: 1 } } }]),
            Project.aggregate([{ $match: { Pipeline_Status: 'Active', ...(isFY ? { "Start_Details.Start_Date": dateFilter } : {}) } }, { $group: { _id: "$Start_Details.Phase", count: { $sum: 1 } } }]),
            Project.aggregate([{ $match: { Pipeline_Status: 'Active', ...(isFY ? { "Start_Details.Start_Date": dateFilter } : {}) } }, { $group: { _id: "$Priority", count: { $sum: 1 } } }]),
            Ticket.aggregate([{ $match: { Status: { $ne: 'Closed' }, ...(isFY ? { Raised_Date_Time: dateFilter } : {}) } }, { $group: { _id: "$Priority", count: { $sum: 1 } } }]),
            Lead.aggregate([{ $match: fy === 'all' ? {} : { Inquiry_Date: trendFilter } }, { $group: { _id: { month: { $month: "$Inquiry_Date" }, year: { $year: "$Inquiry_Date" } }, count: { $sum: 1 } } }, { $sort: { "_id.year": 1, "_id.month": 1 } }]),
            Quotation.aggregate([{ $match: fy === 'all' ? {} : { Quotation_Date: trendFilter } }, { $group: { _id: { month: { $month: "$Quotation_Date" }, year: { $year: "$Quotation_Date" } }, count: { $sum: 1 } } }, { $sort: { "_id.year": 1, "_id.month": 1 } }]),
            Project.aggregate([{ $match: { Pipeline_Status: 'Active', ...(fy === 'all' ? {} : { "Start_Details.Start_Date": trendFilter }) } }, { $group: { _id: { month: { $month: "$Start_Details.Start_Date" }, year: { $year: "$Start_Details.Start_Date" } }, count: { $sum: 1 } } }, { $sort: { "_id.year": 1, "_id.month": 1 } }]),
            Lead.find({}, 'Lead_ID createdAt updatedAt Lead_Status Client_Reference Product_Reference')
                .populate('Client_Reference', 'Company_Name Client_Name')
                .populate('Product_Reference', 'Product_Name')
                .sort({ updatedAt: -1 }).limit(3).lean(),
            Quotation.find({}, 'Quotation_ID createdAt updatedAt Quotation_Status Client_Reference Product_Reference')
                .populate('Client_Reference', 'Company_Name Client_Name')
                .populate('Product_Reference', 'Product_Name')
                .sort({ updatedAt: -1 }).limit(3).lean(),
            Project.find({}, 'Project_ID Project_Name createdAt updatedAt Pipeline_Status').sort({ updatedAt: -1 }).limit(3).lean(),
            Ticket.find({}, 'Ticket_Number Title createdAt updatedAt Status').sort({ updatedAt: -1 }).limit(3).lean(),
            Project.find({ Pipeline_Status: { $in: ['Active', 'On Hold'] }, 'Start_Details.End_Date': { $exists: true, $ne: null } }).sort({ 'Start_Details.End_Date': 1 }).limit(5).lean(),
            Project.countDocuments(isFY ? { "Start_Details.Start_Date": dateFilter } : {}),
            isFY ? Project.aggregate([{ $match: { Pipeline_Status: 'Active', "Start_Details.Start_Date": { $gte: new Date(fyRange.startYear - 1, 3, 1), $lte: new Date(fyRange.endYear - 1, 2, 31, 23, 59, 59) } } }, { $group: { _id: null, total: { $sum: "$Start_Details.Costing" } } }]) : Promise.resolve([])
        ]);

        const currentTotal = commValueActive[0]?.total || 0;
        const previousTotal = prevCommValueActiveAgg[0]?.total || 0;
        let activeProjectsRate = "0.0%";
        if (previousTotal > 0) {
            activeProjectsRate = `${(currentTotal > previousTotal ? '+' : '')}${((currentTotal - previousTotal) / previousTotal * 100).toFixed(1)}%`;
        } else if (currentTotal > 0 && isFY) {
            activeProjectsRate = "+100%";
        }

        return NextResponse.json({
            stats: { totalLeads: leadCount, totalQuotations: quoteCount, totalActiveProjects: activeProjCount, totalOpenTickets: openTicketCount },
            commercialValue: { activeProjects: currentTotal, activeProjectsRate, totalConvertedQuotes: commValueConverted[0]?.total || 0 },
            leadStatusDist: leadStats.map((s: any) => ({ name: s._id || 'Unknown', value: s.count })),
            projectPhaseDist: projectPhases.map((p: any) => ({ name: p._id || 'Not Started', value: p.count })),
            projectPriorityDist: projectPriorities.map((p: any) => ({ name: p._id || 'Normal', value: p.count })),
            ticketPriorityDist: ticketPriorities.map((t: any) => ({ name: t._id || 'Medium', value: t.count })),
            trends: formatMonthlyTrends(monthlyLeads, monthlyQuotes, monthlyProjects, fyRange, fy === 'all' ? trendsCount : undefined),
            conversionRates: {
                leadToQuote: leadCount ? ((quoteCount / leadCount) * 100).toFixed(1) : "0.0",
                quoteToProject: quoteCount ? ((allProjCount / quoteCount) * 100).toFixed(1) : "0.0"
            },
            recentActivities: formatActivities(recentLeads, recentQuotes, recentProjects, recentTickets),
            upcomingDeadlines: upcomingProjects.map((p: any) => ({ id: p.Project_ID, name: p.Project_Name, deadline: p.Start_Details.End_Date }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
