import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import Project from '@/models/Project';
import Lead from '@/models/Lead';
import { verifyPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';

// Helper: divide annual amount by payment schedule cycle
const getCycleAmount = (amount: number, schedule: string) => {
    if (!amount || amount <= 0) return amount || 0;
    switch (schedule) {
        case 'Monthly': return Math.round(amount / 12);
        case 'Quarterly': return Math.round(amount / 4);
        case 'Annually':
        case 'Yearly':
        case 'One Time':
        default: return amount;
    }
};

export async function GET(request: Request) {
    try {
        await connectDB();
        const auth = await verifyPermission(PERMISSIONS.DASHBOARD_VIEW);
        if (!auth.authorized) return NextResponse.json({ error: auth.message }, { status: auth.status });

        const { searchParams } = new URL(request.url);
        const monthParam = searchParams.get('month');
        const yearParam = searchParams.get('year');

        if (!monthParam || !yearParam) {
            return NextResponse.json({ error: 'Missing month or year' }, { status: 400 });
        }

        const currentMonth = parseInt(monthParam);
        const currentYear = parseInt(yearParam);

        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

        const calendarEvents: any[] = [];

        // 1. Quotation Follow-ups
        const activeQuotes = await Quotation.find({
            Quotation_Status: { $in: ['Sent', 'Follow-up'] }
        }).populate('Client_Reference', 'Company_Name Client_Name').lean();

        activeQuotes.forEach((q: any) => {
            let dueDate: Date | null = null;
            if (q.Follow_Ups && q.Follow_Ups.length > 0) {
                const pendingFollowUps = q.Follow_Ups.filter((f: any) => f.Outcome === 'Pending');
                if (pendingFollowUps.length > 0) {
                    const lastFU = pendingFollowUps[pendingFollowUps.length - 1];
                    dueDate = new Date(lastFU.Followup_Date);
                    dueDate.setDate(dueDate.getDate() + 3); // 3 days after last pending interaction
                }
            } else {
                // Rule: 5 days after quotation creation if no follow-ups recorded
                dueDate = new Date(q.Quotation_Date || q.createdAt);
                dueDate.setDate(dueDate.getDate() + 5);
            }

            if (dueDate && dueDate >= startOfMonth && dueDate <= endOfMonth) {
                calendarEvents.push({
                    id: `fu-${q._id}`,
                    date: dueDate.toISOString(),
                    type: 'followup',
                    title: `Follow-up Due: ${q.Quotation_ID}`,
                    clientName: q.Client_Reference?.Company_Name || q.Client_Reference?.Client_Name || 'Unknown',
                    value: q.Commercial,
                    refId: q.Quotation_ID
                });
            }
        });
        
        // 2. Lead Follow-ups
        const activeLeads = await Lead.find({
            Lead_Status: { $in: ['New', 'In Progress'] }
        }).populate('Client_Reference', 'Company_Name Client_Name').lean();

        activeLeads.forEach((l: any) => {
            let dueDate: Date | null = null;
            if (l.Follow_Ups && l.Follow_Ups.length > 0) {
                const pendingFollowUps = l.Follow_Ups.filter((f: any) => f.Outcome === 'Pending');
                if (pendingFollowUps.length > 0) {
                    const lastFU = pendingFollowUps[pendingFollowUps.length - 1];
                    dueDate = new Date(lastFU.Followup_Date);
                    dueDate.setDate(dueDate.getDate() + 3); // 3 days after last pending interaction
                }
            } else {
                // Rule: 5 days after lead inquiry if no follow-ups recorded
                dueDate = new Date(l.Inquiry_Date || l.createdAt);
                dueDate.setDate(dueDate.getDate() + 5);
            }

            if (dueDate && dueDate >= startOfMonth && dueDate <= endOfMonth) {
                calendarEvents.push({
                    id: `lfu-${l._id}`,
                    date: dueDate.toISOString(),
                    type: 'followup',
                    title: `Lead Follow-up Due: ${l.Lead_ID}`,
                    clientName: l.Client_Reference?.Company_Name || l.Client_Reference?.Client_Name || 'Unknown',
                    value: 0,
                    refId: l.Lead_ID
                });
            }
        });

        // 3. Service Billings (External Services)
        const activeProjects = await Project.find({})
            .populate('Client_Reference', 'Company_Name Client_Name')
            .lean();

        activeProjects.forEach((p: any) => {
            // --- SERVICE BILLINGS ---
            if (p.External_Services && p.External_Services.length > 0) {
                p.External_Services.forEach((svc: any) => {
                    if (svc.Billing_Status === 'Received' && svc.Payment_Terms === 'One Time') return;

                    let nextBilling: Date | null = null;
                    const anchorRaw = svc.Cycle_Anchor_Date || svc.Inquiry_Date || p.createdAt;
                    const anchorDate = new Date(anchorRaw);

                    if (svc.Payment_Terms === 'One Time') {
                        let target = svc.Reminder?.Custom_Date ? new Date(svc.Reminder.Custom_Date) : anchorDate;
                        if (target >= startOfMonth && target <= endOfMonth) {
                            nextBilling = target;
                        }
                    } else {
                        nextBilling = new Date(anchorDate);

                        let isValidOccurrence = false;
                        const mDiff = (currentYear - anchorDate.getFullYear()) * 12 + (currentMonth - anchorDate.getMonth());

                        if (mDiff >= 0 && mDiff < 12) {
                            if (svc.Payment_Terms === 'Monthly') {
                                isValidOccurrence = true;
                                nextBilling.setFullYear(currentYear);
                                nextBilling.setMonth(currentMonth);
                            } else if (svc.Payment_Terms === 'Quarterly') {
                                if (mDiff % 3 === 0) {
                                    isValidOccurrence = true;
                                    nextBilling.setFullYear(currentYear);
                                    nextBilling.setMonth(currentMonth);
                                }
                            } else if (svc.Payment_Terms === 'Annually' || svc.Payment_Terms === 'Yearly') {
                                if (mDiff === 0) {
                                    isValidOccurrence = true;
                                    nextBilling.setFullYear(currentYear);
                                }
                            }
                        }

                        if (!isValidOccurrence) {
                            nextBilling = null;
                        } else {
                            if (nextBilling?.getMonth() !== currentMonth) {
                                nextBilling = new Date(currentYear, currentMonth + 1, 0);
                            }
                        }
                    }

                    if (nextBilling) {
                        // Check if this cycle is already paid
                        const isPaid = (svc.Payment_History || []).some((ph: any) =>
                            new Date(ph.Cycle_Date).getTime() === nextBilling!.getTime()
                        );
                        calendarEvents.push({
                            id: `svc-${p._id}-${svc._id}-${currentMonth}`,
                            date: nextBilling.toISOString(),
                            type: 'billing',
                            title: `${p.Project_Name} - Service Billing: ${svc.Service_Name}`,
                            clientName: p.Client_Reference?.Company_Name || p.Client_Reference?.Client_Name || 'Unknown',
                            value: getCycleAmount(svc.Amount, svc.Payment_Terms),
                            schedule: svc.Payment_Terms,
                            refId: p.Project_ID,
                            isPaid,
                            projectId: p._id.toString(),
                            serviceId: svc._id.toString()
                        });
                    }
                });
            }

            // --- PROJECT COSTING (Go-Live Renewals) ---
            const goLive = p.Go_Live;
            if (goLive?.GoLive_Date && goLive?.Payment_Schedule) {
                const anchorDate = new Date(goLive.GoLive_Date);
                let nextBilling: Date | null = null;

                if (goLive.Payment_Schedule === 'One Time') {
                    if (anchorDate >= startOfMonth && anchorDate <= endOfMonth) {
                        nextBilling = anchorDate;
                    }
                } else {
                    nextBilling = new Date(anchorDate);
                    let isValidOccurrence = false;
                    const mDiff = (currentYear - anchorDate.getFullYear()) * 12 + (currentMonth - anchorDate.getMonth());

                    if (mDiff >= 0 && mDiff < 12) {
                        if (goLive.Payment_Schedule === 'Monthly') {
                            isValidOccurrence = true;
                            nextBilling.setFullYear(currentYear);
                            nextBilling.setMonth(currentMonth);
                        } else if (goLive.Payment_Schedule === 'Quarterly') {
                            if (mDiff % 3 === 0) {
                                isValidOccurrence = true;
                                nextBilling.setFullYear(currentYear);
                                nextBilling.setMonth(currentMonth);
                            }
                        } else if (goLive.Payment_Schedule === 'Annually' || goLive.Payment_Schedule === 'Yearly') {
                            if (mDiff % 12 === 0) {
                                isValidOccurrence = true;
                                nextBilling.setFullYear(currentYear);
                            }
                        }
                    }

                    if (!isValidOccurrence) {
                        nextBilling = null;
                    } else if (nextBilling?.getMonth() !== currentMonth) {
                        nextBilling = new Date(currentYear, currentMonth + 1, 0);
                    }
                }

                if (nextBilling) {
                    const isPaid = (goLive.Payment_History || []).some((ph: any) =>
                        new Date(ph.Cycle_Date).getTime() === nextBilling!.getTime()
                    );
                    calendarEvents.push({
                        id: `renewal-${p._id}-${currentMonth}`,
                        date: nextBilling.toISOString(),
                        type: 'renewal',
                        title: `Project Billing: ${p.Project_Name}`,
                        clientName: p.Client_Reference?.Company_Name || p.Client_Reference?.Client_Name || 'Unknown',
                        value: getCycleAmount(p.Start_Details?.Costing || 0, goLive.Payment_Schedule),
                        schedule: goLive.Payment_Schedule,
                        refId: p.Project_ID,
                        isPaid,
                        projectId: p._id.toString(),
                        serviceId: null
                    });
                }
            }
        });

        return NextResponse.json({ calendarEvents });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
