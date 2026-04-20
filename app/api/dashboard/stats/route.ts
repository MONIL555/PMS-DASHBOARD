import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Quotation from '@/models/Quotation';
import Project from '@/models/Project';
import Ticket from '@/models/Ticket';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { autoCleanupStaleItems } from '@/lib/cleanup';

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

const formatMonthlyTrends = (leadsAgg: any[], quotesAgg: any[], forecastAgg: any[], projectsAgg: any[], fyRange: any, customCount?: number) => {
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
        const fMatch = forecastAgg.find((f: any) => f._id.month === m && f._id.year === y);
        const pMatch = projectsAgg.find((p: any) => p._id.month === m && p._id.year === y);

        trends.push({
            name: `${monthNames[m - 1]}${fyRange.isFY ? '' : ` '${String(y).slice(-2)}`}`,
            Leads: lMatch?.count || 0,
            Quotations: qMatch?.count || 0,
            Revenue: pMatch?.totalValue || 0,
            Forecast: fMatch?.totalValue || 0,
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
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Simple server-side cache for Dashboard stats to ensure sub-second response times
let statsCache: { data: any, timestamp: number } | null = null;
const STATS_CACHE_TTL = 1000 * 60 * 2; // 2 minutes

export async function GET(request: Request) {
    try {
        await connectDB();
        
        // --- BACKGROUND CLEANUP (Fire and Forget) ---
        // We do NOT await this, so it doesn't block the dashboard load.
        autoCleanupStaleItems().catch(err => console.error("Background cleanup failed:", err));

        const auth = await verifyPermission(PERMISSIONS.DASHBOARD_VIEW);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const { searchParams } = new URL(request.url);
        const fy = searchParams.get('fy');
        const forceRefresh = searchParams.get('refresh') === 'true';

        // --- CACHE CHECK ---
        const now = Date.now();
        const cacheKey = fy || 'current';
        if (!forceRefresh && statsCache && (now - statsCache.timestamp < STATS_CACHE_TTL) && statsCache.data.fy === fy) {
            return NextResponse.json(statsCache.data.payload);
        }

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
            monthlyLeads, monthlyQuotes, monthlyForecast, monthlyProjects,
            recentLeads, recentQuotes, recentProjects, recentTickets,
            upcomingProjects, allProjCount,
            topClientsAgg, staffDistAgg, avgDurationAgg, topServicesAgg,
            avgLeadToQuoteAgg, avgQuoteToProjectAgg,
            detailedPrevData = [0, 0, 0, [], []]
        ] = await Promise.all([
            Lead.countDocuments(isFY ? { Inquiry_Date: dateFilter } : {}),
            Quotation.countDocuments(isFY ? { Quotation_Date: dateFilter } : {}),
            Project.countDocuments(isFY ? { "Start_Details.Start_Date": dateFilter } : {}),
            Ticket.countDocuments({ Status: { $ne: 'Closed' }, ...(isFY ? { Raised_Date_Time: dateFilter } : {}) }),
            Project.aggregate([{ $match: isFY ? { "Start_Details.Start_Date": dateFilter } : {} }, { $group: { _id: null, total: { $sum: "$Start_Details.Costing" } } }]),
            Quotation.aggregate([{ $match: isFY ? { Quotation_Date: dateFilter } : {} }, { $group: { _id: null, total: { $sum: "$Commercial" } } }]),
            Lead.aggregate([{ $match: isFY ? { Inquiry_Date: dateFilter } : {} }, { $group: { _id: "$Lead_Status", count: { $sum: 1 } } }]),
            Project.aggregate([{ $match: { ...(isFY ? { "Start_Details.Start_Date": dateFilter } : {}) } }, { $group: { _id: "$Start_Details.Phase", count: { $sum: 1 } } }]),
            Project.aggregate([{ $match: { ...(isFY ? { "Start_Details.Start_Date": dateFilter } : {}) } }, { $group: { _id: "$Priority", count: { $sum: 1 } } }]),
            Ticket.aggregate([{ $match: { Status: { $ne: 'Closed' }, ...(isFY ? { Raised_Date_Time: dateFilter } : {}) } }, { $group: { _id: "$Priority", count: { $sum: 1 } } }]),
            Lead.aggregate([{ $match: fy === 'all' ? {} : { Inquiry_Date: trendFilter } }, { $group: { _id: { month: { $month: "$Inquiry_Date" }, year: { $year: "$Inquiry_Date" } }, count: { $sum: 1 } } }, { $sort: { "_id.year": 1, "_id.month": 1 } }]),
            Quotation.aggregate([{ $match: fy === 'all' ? {} : { Quotation_Date: trendFilter } }, { $group: { _id: { month: { $month: "$Quotation_Date" }, year: { $year: "$Quotation_Date" } }, count: { $sum: 1 } } }, { $sort: { "_id.year": 1, "_id.month": 1 } }]),
            Quotation.aggregate([{ $match: { ...(fy === 'all' ? {} : { Quotation_Date: trendFilter }), Quotation_Status: { $in: ['Approved', 'Sent', 'Follow Up', 'Converted'] } } }, { $group: { _id: { month: { $month: "$Quotation_Date" }, year: { $year: "$Quotation_Date" } }, count: { $sum: 1 }, totalValue: { $sum: "$Commercial" } } }, { $sort: { "_id.year": 1, "_id.month": 1 } }]),
            Project.aggregate([{ $match: { ...(fy === 'all' ? {} : { "Start_Details.Start_Date": trendFilter }) } }, { $group: { _id: { month: { $month: "$Start_Details.Start_Date" }, year: { $year: "$Start_Details.Start_Date" } }, count: { $sum: 1 }, totalValue: { $sum: "$Start_Details.Costing" } } }, { $sort: { "_id.year": 1, "_id.month": 1 } }]),
            Lead.find({}, 'Lead_ID createdAt updatedAt Lead_Status Client_Reference Product_Reference')
                .populate('Client_Reference', 'Company_Name Client_Name')
                .populate('Product_Reference', 'Product_Name')
                .sort({ updatedAt: -1 }).limit(6).lean(),
            Quotation.find({}, 'Quotation_ID createdAt updatedAt Quotation_Status Client_Reference Product_Reference')
                .populate('Client_Reference', 'Company_Name Client_Name')
                .populate('Product_Reference', 'Product_Name')
                .sort({ updatedAt: -1 }).limit(6).lean(),
            Project.find({}, 'Project_ID Project_Name createdAt updatedAt Pipeline_Status').sort({ updatedAt: -1 }).limit(6).lean(),
            Ticket.find({}, 'Ticket_Number Title createdAt updatedAt Status').sort({ updatedAt: -1 }).limit(6).lean(),
            Project.find({ Pipeline_Status: { $in: ['Active', 'On Hold'] }, 'Start_Details.End_Date': { $exists: true, $ne: null } }).sort({ 'Start_Details.End_Date': 1 }).limit(5).lean(),
            Project.countDocuments(isFY ? { "Start_Details.Start_Date": dateFilter } : {}),

            // New Strategic Aggregations
            Project.aggregate([
                { $match: { Pipeline_Status: 'Active', ...(isFY ? { "Start_Details.Start_Date": dateFilter } : {}) } },
                { $group: { _id: "$Client_Reference", totalValue: { $sum: "$Start_Details.Costing" } } },
                { $sort: { totalValue: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'client' } },
                { $unwind: '$client' },
                { $project: { name: { $ifNull: ['$client.Company_Name', '$client.Client_Name'] }, value: '$totalValue' } }
            ]),
            Project.aggregate([
                { $match: { Pipeline_Status: 'Active' } },
                { $group: { _id: "$Start_Details.Assigned_Person", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $project: { name: { $ifNull: ["$_id", "Unassigned"] }, value: "$count" } }
            ]),
            Project.aggregate([
                { $match: { 'Start_Details.Start_Date': { $exists: true }, 'Start_Details.End_Date': { $exists: true } } },
                { $project: { duration: { $divide: [{ $subtract: ["$Start_Details.End_Date", "$Start_Details.Start_Date"] }, 1000 * 60 * 60 * 24] } } },
                { $group: { _id: null, avg: { $avg: "$duration" } } }
            ]),
            Lead.aggregate([
                { $match: isFY ? { Inquiry_Date: dateFilter } : {} },
                { $group: { _id: "$Product_Reference", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
                { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
                { $unwind: '$product' },
                { $project: { name: "$product.SubSubType", value: '$count' } }
            ]),
            Quotation.aggregate([
                { $match: { Lead_ID: { $exists: true }, ...(isFY ? { Quotation_Date: dateFilter } : {}) } },
                { $lookup: { from: 'leads', localField: 'Lead_ID', foreignField: '_id', as: 'lead' } },
                { $unwind: '$lead' },
                { $project: { duration: { $divide: [{ $subtract: ["$Quotation_Date", "$lead.Inquiry_Date"] }, 1000 * 60 * 60 * 24] } } },
                { $group: { _id: null, avg: { $avg: "$duration" } } }
            ]),
            Project.aggregate([
                { $match: { Quotation_Reference: { $exists: true }, ...(isFY ? { "Start_Details.Start_Date": dateFilter } : {}) } },
                { $lookup: { from: 'quotations', localField: 'Quotation_Reference', foreignField: '_id', as: 'quote' } },
                { $unwind: '$quote' },
                { $project: { duration: { $divide: [{ $subtract: ["$Start_Details.Start_Date", "$quote.Quotation_Date"] }, 1000 * 60 * 60 * 24] } } },
                { $group: { _id: null, avg: { $avg: "$duration" } } }
            ]),
            
            // Previous FY data for comparisons
            (isFY ? Promise.all([
                Lead.countDocuments({ Inquiry_Date: { $gte: new Date(fyRange.startYear - 1, 3, 1), $lte: new Date(fyRange.endYear - 1, 2, 31, 23, 59, 59) } }),
                Quotation.countDocuments({ Quotation_Date: { $gte: new Date(fyRange.startYear - 1, 3, 1), $lte: new Date(fyRange.endYear - 1, 2, 31, 23, 59, 59) } }),
                Project.countDocuments({ "Start_Details.Start_Date": { $gte: new Date(fyRange.startYear - 1, 3, 1), $lte: new Date(fyRange.endYear - 1, 2, 31, 23, 59, 59) } }),
                Project.aggregate([{ $match: { "Start_Details.Start_Date": { $gte: new Date(fyRange.startYear - 1, 3, 1), $lte: new Date(fyRange.endYear - 1, 2, 31, 23, 59, 59) } } }, { $group: { _id: null, total: { $sum: "$Start_Details.Costing" } } }]),
                Quotation.aggregate([{ $match: { Quotation_Date: { $gte: new Date(fyRange.startYear - 1, 3, 1), $lte: new Date(fyRange.endYear - 1, 2, 31, 23, 59, 59) } } }, { $group: { _id: null, total: { $sum: "$Commercial" } } }])
            ]) : Promise.resolve([0, 0, 0, [], []])) as Promise<[number, number, number, any[], any[]]>
        ]);

        const [prevLeadCount, prevQuoteCount, prevProjCount, prevCommValueActiveAgg, prevCommValueConvertedAgg] = detailedPrevData;

        const currentTotal = commValueActive[0]?.total || 0;
        const previousTotalValue = prevCommValueActiveAgg[0]?.total || 0;
        const totalConvertedCurrent = commValueConverted[0]?.total || 0;
        const totalConvertedPrev = prevCommValueConvertedAgg[0]?.total || 0;
        
        const calculateRate = (curr: number, prev: number) => {
            if (!isFY) return null;
            if (prev === 0 && curr > 0) return "+100%";
            if (prev === 0) return "0.0%";
            return `${(curr >= prev ? '+' : '')}${((curr - prev) / prev * 100).toFixed(1)}%`;
        };

        // ── CARD BREAKDOWN AGGREGATIONS ──
        const leadDateMatch = isFY ? { Inquiry_Date: dateFilter } : {};
        const quoteDateMatch = isFY ? { Quotation_Date: dateFilter } : {};
        const projDateMatch = isFY ? { "Start_Details.Start_Date": dateFilter } : {};
        const ticketDateMatch = isFY ? { Raised_Date_Time: dateFilter } : {};

        const [
            leadFollowupAgg, leadAvgConvAgg,
            quoteStatusAgg, quotePipelineValueAgg,
            projPipelineAgg, projPhaseDetailAgg, projHighPriorityCount, projOverdueCount, projTotalCostingAgg,
            ticketAllStatusAgg, ticketOpenPriorityAgg, ticketAvgResolutionAgg
        ] = await Promise.all([
            // Lead: count with follow-ups and pending follow-ups
            Lead.aggregate([
                { $match: leadDateMatch },
                { $project: {
                    hasFollowUps: { $gt: [{ $size: { $ifNull: ["$Follow_Ups", []] } }, 0] },
                    hasPendingFU: { $gt: [{ $size: { $filter: { input: { $ifNull: ["$Follow_Ups", []] }, as: "fu", cond: { $eq: ["$$fu.Outcome", "Pending"] } } } }, 0] }
                }},
                { $group: { _id: null, withFollowUps: { $sum: { $cond: ["$hasFollowUps", 1, 0] } }, pendingFollowUps: { $sum: { $cond: ["$hasPendingFU", 1, 0] } } } }
            ]),
            // Lead: avg days to convert (Inquiry_Date → Lead_Status_Date_Time for Converted)
            Lead.aggregate([
                { $match: { ...leadDateMatch, Lead_Status: 'Converted', Lead_Status_Date_Time: { $exists: true } } },
                { $project: { days: { $divide: [{ $subtract: ["$Lead_Status_Date_Time", "$Inquiry_Date"] }, 86400000] } } },
                { $group: { _id: null, avg: { $avg: "$days" } } }
            ]),
            // Quotation: status breakdown
            Quotation.aggregate([
                { $match: quoteDateMatch },
                { $group: { _id: "$Quotation_Status", count: { $sum: 1 } } }
            ]),
            // Quotation: pipeline value (non-Rejected)
            Quotation.aggregate([
                { $match: { ...quoteDateMatch, Quotation_Status: { $nin: ['Rejected'] } } },
                { $group: { _id: null, total: { $sum: "$Commercial" }, avg: { $avg: "$Commercial" }, withFollowUps: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ["$Follow_Ups", []] } }, 0] }, 1, 0] } } } }
            ]),
            // Project: pipeline status breakdown
            Project.aggregate([
                { $match: projDateMatch },
                { $group: { _id: "$Pipeline_Status", count: { $sum: 1 } } }
            ]),
            // Project: phase detail (calculated from UAT/Deployment/Delivery fields)
            Project.aggregate([
                { $match: { ...projDateMatch } },
                { $project: {
                    phase: { $switch: { branches: [
                        { case: { $eq: ["$Delivery.Delivery_Status", "Delivered"] }, then: "Go-Live" },
                        { case: { $eq: ["$Deployment.Deployment_Status", "Success"] }, then: "Delivery" },
                        { case: { $eq: ["$UAT.UAT_Status", "Approved"] }, then: "Deployment" }
                    ], default: "UAT" } }
                }},
                { $group: { _id: "$phase", count: { $sum: 1 } } }
            ]),
            // Project: high priority count
            Project.countDocuments({ ...projDateMatch, Priority: 'High' }),
            // Project: overdue count (any status past End_Date AND Go-Live not configured)
            Project.countDocuments({ 
                ...projDateMatch, 
                Pipeline_Status: { $ne: 'Closed' },
                'Start_Details.End_Date': { $lt: new Date(), $exists: true },
                'Go_Live.GoLive_Date': { $exists: false }
            }),
            // Project: total costing for active
            Project.aggregate([
                { $match: { ...projDateMatch, Pipeline_Status: 'Active' } },
                { $group: { _id: null, total: { $sum: "$Start_Details.Costing" } } }
            ]),
            // Ticket: ALL status breakdown (including closed)
            Ticket.aggregate([
                { $match: ticketDateMatch },
                { $group: { _id: "$Status", count: { $sum: 1 } } }
            ]),
            // Ticket: open priority breakdown
            Ticket.aggregate([
                { $match: { ...ticketDateMatch, Status: { $ne: 'Closed' } } },
                { $group: { _id: "$Priority", count: { $sum: 1 } } }
            ]),
            // Ticket: avg resolution time (Raised → Action_Taken for Closed)
            Ticket.aggregate([
                { $match: { ...ticketDateMatch, Status: 'Closed', Action_Taken_DT: { $exists: true } } },
                { $project: { days: { $divide: [{ $subtract: ["$Action_Taken_DT", "$Raised_Date_Time"] }, 86400000] } } },
                { $group: { _id: null, avg: { $avg: "$days" } } }
            ])
        ]);

        // Build breakdown objects
        const leadStatusMap: Record<string, number> = {};
        leadStats.forEach((s: any) => { leadStatusMap[s._id || 'Unknown'] = s.count; });

        const quoteStatusMap: Record<string, number> = {};
        quoteStatusAgg.forEach((s: any) => { quoteStatusMap[s._id || 'Unknown'] = s.count; });

        const projPipelineMap: Record<string, number> = {};
        projPipelineAgg.forEach((s: any) => { projPipelineMap[s._id || 'Active'] = s.count; });

        const projPhaseMap: Record<string, number> = {};
        projPhaseDetailAgg.forEach((s: any) => { projPhaseMap[s._id] = s.count; });

        const ticketStatusMap: Record<string, number> = {};
        ticketAllStatusAgg.forEach((s: any) => { ticketStatusMap[s._id || 'Open'] = s.count; });

        const ticketPriorityMap: Record<string, number> = {};
        ticketOpenPriorityAgg.forEach((s: any) => { ticketPriorityMap[s._id || 'Medium'] = s.count; });

        const payload = {
            stats: { 
                totalLeads: leadCount, 
                totalQuotations: quoteCount, 
                totalActiveProjects: activeProjCount, 
                totalOpenTickets: openTicketCount,
                leadGrowth: calculateRate(leadCount, prevLeadCount),
                quoteGrowth: calculateRate(quoteCount, prevQuoteCount),
                activeProjectsGrowth: calculateRate(activeProjCount, prevProjCount)
            },
            commercialValue: { 
                activeProjects: currentTotal, 
                activeProjectsRate: calculateRate(currentTotal, previousTotalValue), 
                totalConvertedQuotes: totalConvertedCurrent,
                totalConvertedQuotesRate: calculateRate(totalConvertedCurrent, totalConvertedPrev),
                avgQuoteValue: quoteCount > 0 ? (totalConvertedCurrent / quoteCount) : 0,
                avgProjectValue: activeProjCount > 0 ? (currentTotal / activeProjCount) : 0
            },
            // Card Breakdowns
            leadBreakdown: {
                new: leadStatusMap['New'] || 0,
                inProgress: leadStatusMap['In Progress'] || 0,
                converted: leadStatusMap['Converted'] || 0,
                cancelled: leadStatusMap['Cancelled'] || 0,
                withFollowUps: leadFollowupAgg[0]?.withFollowUps || 0,
                pendingFollowUps: leadFollowupAgg[0]?.pendingFollowUps || 0,
                avgDaysToConvert: leadAvgConvAgg[0]?.avg ? Math.round(leadAvgConvAgg[0].avg) : 0
            },
            quotationBreakdown: {
                sent: quoteStatusMap['Sent'] || 0,
                followUp: quoteStatusMap['Follow-up'] || 0,
                approved: quoteStatusMap['Approved'] || 0,
                rejected: quoteStatusMap['Rejected'] || 0,
                converted: quoteStatusMap['Converted'] || 0,
                pipelineValue: quotePipelineValueAgg[0]?.total || 0,
                avgQuoteValue: quotePipelineValueAgg[0]?.avg ? Math.round(quotePipelineValueAgg[0].avg) : 0,
                withFollowUps: quotePipelineValueAgg[0]?.withFollowUps || 0
            },
            projectBreakdown: {
                active: projPipelineMap['Active'] || 0,
                onHold: projPipelineMap['On Hold'] || 0,
                closed: projPipelineMap['Closed'] || 0,
                highPriority: projHighPriorityCount,
                uatPhase: projPhaseMap['UAT'] || 0,
                deploymentPhase: projPhaseMap['Deployment'] || 0,
                deliveryPhase: projPhaseMap['Delivery'] || 0,
                goLivePhase: projPhaseMap['Go-Live'] || 0,
                totalCosting: projTotalCostingAgg[0]?.total || 0,
                overdue: projOverdueCount
            },
            ticketBreakdown: {
                open: ticketStatusMap['Open'] || 0,
                inProgress: ticketStatusMap['In_Progress'] || 0,
                closed: ticketStatusMap['Closed'] || 0,
                highPriority: ticketPriorityMap['High'] || 0,
                mediumPriority: ticketPriorityMap['Medium'] || 0,
                lowPriority: ticketPriorityMap['Low'] || 0,
                avgResolutionDays: ticketAvgResolutionAgg[0]?.avg ? Math.round(ticketAvgResolutionAgg[0].avg) : 0
            },
            leadStatusDist: leadStats.map((s: any) => ({ name: s._id || 'Unknown', value: s.count })),
            projectPhaseDist: projectPhases.map((p: any) => ({ name: p._id || 'Not Started', value: p.count })),
            projectPriorityDist: projectPriorities.map((p: any) => ({ name: p._id || 'Normal', value: p.count })),
            ticketPriorityDist: ticketPriorities.map((t: any) => ({ name: t._id || 'Medium', value: t.count })),
            trends: formatMonthlyTrends(monthlyLeads, monthlyQuotes, monthlyForecast, monthlyProjects, fyRange, fy === 'all' ? trendsCount : undefined),
            conversionRates: {
                leadToQuote: leadCount ? ((quoteCount / leadCount) * 100).toFixed(1) : "0.0",
                quoteToProject: quoteCount ? ((allProjCount / quoteCount) * 100).toFixed(1) : "0.0",
                avgCompletionTime: avgDurationAgg[0]?.avg ? Math.round(avgDurationAgg[0].avg) : 0,
                avgLeadToQuoteTime: avgLeadToQuoteAgg[0]?.avg ? Math.round(avgLeadToQuoteAgg[0].avg) : 0,
                avgQuoteToProjectTime: avgQuoteToProjectAgg[0]?.avg ? Math.round(avgQuoteToProjectAgg[0].avg) : 0
            },
            strategic: {
                topClients: topClientsAgg || [],
                topServices: topServicesAgg || [],
                staffDistribution: staffDistAgg || []
            },
            recentActivities: formatActivities(recentLeads, recentQuotes, recentProjects, recentTickets),
            upcomingDeadlines: upcomingProjects.map((p: any) => ({ id: p.Project_ID, name: p.Project_Name, deadline: p.Start_Details.End_Date }))
        };

        // Cache the result
        statsCache = {
            data: { fy, payload },
            timestamp: now
        };

        return NextResponse.json(payload);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
