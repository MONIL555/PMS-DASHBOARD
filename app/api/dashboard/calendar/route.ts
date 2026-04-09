import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import Project from '@/models/Project';
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
            if (q.Follow_Ups && q.Follow_Ups.length > 0) {
                const pendingFollowUps = q.Follow_Ups.filter((f: any) => f.Outcome === 'Pending');
                pendingFollowUps.forEach((f: any) => {
                     const fDate = new Date(f.Followup_Date);
                     if (fDate >= startOfMonth && fDate <= endOfMonth) {
                         calendarEvents.push({
                             id: `fu-${q._id}-${fDate.getTime()}`,
                             date: fDate.toISOString(),
                             type: 'followup',
                             title: `Follow-up: ${q.Quotation_ID}`,
                             clientName: q.Client_Reference?.Company_Name || q.Client_Reference?.Client_Name || 'Unknown',
                             value: q.Commercial,
                             refId: q.Quotation_ID
                         });
                     }
                });
            }
        });

        // 2. Service Billings (External Services)
        const activeProjects = await Project.find({
            Pipeline_Status: { $in: ['Active', 'On Hold'] }
        }).populate('Client_Reference', 'Company_Name Client_Name').lean();

        activeProjects.forEach((p: any) => {
            // --- SERVICE BILLINGS ---
            if (p.External_Services && p.External_Services.length > 0) {
                p.External_Services.forEach((svc: any) => {
                    if (svc.Billing_Status === 'Received') return;

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
                            } else if (svc.Payment_Terms === 'Annually') {
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
                        calendarEvents.push({
                            id: `svc-${p._id}-${svc._id}-${currentMonth}`,
                            date: nextBilling.toISOString(),
                            type: 'billing',
                            title: `Billing: ${svc.Service_Name}`,
                            clientName: p.Client_Reference?.Company_Name || p.Client_Reference?.Client_Name || 'Unknown',
                            value: getCycleAmount(svc.Amount, svc.Payment_Terms),
                            schedule: svc.Payment_Terms,
                            refId: p.Project_ID
                        });
                    }
                });
            }

            // --- PROJECT COSTING (Go-Live Renewals) ---
            const goLive = p.Go_Live;
            if (goLive?.GoLive_Date && goLive?.Renewal_Rate && goLive?.Payment_Schedule) {
                const anchorDate = new Date(goLive.GoLive_Date);

                let nextBilling: Date | null = null;

                if (goLive.Payment_Schedule === 'One Time') {
                    // One-time: show only in the anchor month
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
                        } else if (goLive.Payment_Schedule === 'Yearly') {
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
                    calendarEvents.push({
                        id: `renewal-${p._id}-${currentMonth}`,
                        date: nextBilling.toISOString(),
                        type: 'renewal',
                        title: `Project Costing: ${p.Project_Name}`,
                        clientName: p.Client_Reference?.Company_Name || p.Client_Reference?.Client_Name || 'Unknown',
                        value: getCycleAmount(p.Start_Details?.Costing || 0, goLive.Payment_Schedule),
                        schedule: goLive.Payment_Schedule,
                        refId: p.Project_ID
                    });
                }
            }
        });

        return NextResponse.json({ calendarEvents });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
