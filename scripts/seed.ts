import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

import Client from '../models/Client';
import Product from '../models/Product';
import LeadSource from '../models/LeadSource';
import Lead from '../models/Lead';
import Quotation from '../models/Quotation';
import Project from '../models/Project';
import Ticket from '../models/Ticket';
import Counter from '../models/Counter';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined");
  process.exit(1);
}

// Helpers
const START_DATE = new Date(2023, 3, 1); // April 1, 2023
const END_DATE = new Date(2026, 3, 8); // April 8, 2026

const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI!);
    console.log("✅ Connected successfully.");

    console.log("🗑️ Wiping existing non-auth database collections...");
    // explicitly NOT deleting users or roles
    await Promise.all([
      Client.deleteMany({}),
      Product.deleteMany({}),
      LeadSource.deleteMany({}),
      Lead.deleteMany({}),
      Quotation.deleteMany({}),
      Project.deleteMany({}),
      Ticket.deleteMany({}),
      Counter.deleteMany({}) // Reset all counters for clean slate
    ]);

    try {
      await Product.collection.dropIndexes();
      console.log("✅ Product indexes dropped.");
    } catch (e) {
      console.log("ℹ️ No product indexes to drop or collection empty.");
    }

    console.log("✅ Main transactional databases wiped clean!");

    // ============================================
    // 1. SEED MASTERS
    // ============================================

    const sourcesData = [
      { name: "LinkedIn", desc: "Leads generated through professional networking and targeted outreach." },
      { name: "Website", desc: "Organic traffic and inquiries received via the official contact forms." },
      { name: "Referral", desc: "Business opportunities recommended by existing clients or partners." },
      { name: "Direct Call", desc: "Proactive outbound calls and direct sales engagement." },
      { name: "Exhibition", desc: "Prospects captured during trade shows, seminars, and industry events." },
      { name: "Email Campaign", desc: "Inbound interest from newsletters and cold email marketing." },
      { name: "Inbound Call", desc: "Direct phone inquiries from potential customers." },
      { name: "Partner", desc: "Strategic leads shared by third-party affiliates and resellers." }
    ];

    const leadSources = [];
    for (const s of sourcesData) {
      const ls = new LeadSource({ Source_Name: s.name, Description: s.desc });
      await ls.save();
      leadSources.push(ls);
    }
    console.log(`✅ Seeded ${leadSources.length} Lead Sources.`);

     const productPool = [
      { type: "Software Solution", subType: "ERP (Enterprise Resource Planning)", subSub: "Core Module", desc: "Foundational ERP features for business management." },
      { type: "Software Solution", subType: "ERP (Enterprise Resource Planning)", subSub: "Finance & Accounting", desc: "Advanced financial tracking and reporting." },
      { type: "Software Solution", subType: "ERP (Enterprise Resource Planning)", subSub: "Inventory & Warehouse", desc: "Real-time stock management and audit." },
      { type: "Software Solution", subType: "CRM (Customer Relation)", subSub: "Sales Pipeline", desc: "Visual sales tracking and forecasting." },
      { type: "Software Solution", subType: "HRMS (Human Resource)", subSub: "Payroll Management", desc: "Automated salary processing and statutory compliance." },
      { type: "Software Solution", subType: "Custom Web Application", subSub: "E-commerce Portal", desc: "Scalable online storefront with payment integration." },
      { type: "Services", subType: "Development Services", subSub: "Web Development", desc: "Modern, responsive web applications using React/Next.js." },
      { type: "Services", subType: "Development Services", subSub: "Mobile App Development", desc: "Native and cross-platform mobile solutions." },
      { type: "Services", subType: "Cloud & Infrastructure", subSub: "AWS/Azure Setup", desc: "Professional cloud infrastructure provisioning." },
      { type: "Hardware", subType: "Computing Devices", subSub: "Laptops", desc: "High-performance enterprise laptop for professionals." }
    ];

    const products = [];
    for (const item of productPool) {
      const prod = new Product({ Type: item.type, SubType: item.subType, SubSubType: item.subSub, Description: item.desc });
      await prod.save();
      products.push(prod);
    }
    console.log(`✅ Seeded ${products.length} Products.`);

    const industries = ["Tech", "Pharma", "Education", "Finance", "Logistics", "Retail", "Healthcare", "Manufacturing", "Energy", "Entertainment"];
    const companySuffixes = ["Solutions", "Corp", "Ltd", "Inc", "Ventures", "Systems", "Network", "Group", "Works", "Dynamics"];
    const locations = ["Mumbai", "Dubai", "London", "New York", "Singapore", "Sydney", "Berlin", "Toronto", "Riyadh", "Tokyo"];
    const people = ["Alex Mercer", "Sarah Connor", "Bruce Wayne", "Clark Kent", "Diana Prince", "Tony Stark", "Steve Rogers", "Natasha Romanoff", "Wanda Maximoff", "Peter Parker", "Bruce Banner", "Arthur Curry"];

    const clients = [];
    for (let i = 0; i < 80; i++) {
      const industry = randomItem(industries);
      const company = `${industry} ${randomItem(companySuffixes)} ${i + 1}`;
      const client = new Client({
        Company_Name: company,
        Company_No: `TAX-${randomInt(100000, 999999)}`,
        Client_Name: randomItem(people),
        Contact_Number: `+91 ${randomInt(7000000000, 9999999999)}`,
        Email: `contact@${company.toLowerCase().replace(/\s/g, '')}.com`,
        Location: randomItem(locations),
        Description: `${industry} sector.`
      });
      await client.save();
      clients.push(client);
    }
    console.log(`✅ Seeded ${clients.length} Clients.`);

    // ============================================
    // 2. SEED TRANSACTIONAL DATA
    // ============================================

    console.log("Generating 500 Leads...");
    const leads = [];
    const leadDist = ['Converted', 'Converted', 'In Progress', 'In Progress', 'In Progress', 'New', 'New', 'New', 'Cancelled'];
    for (let i = 0; i < 500; i++) {
        const client = randomItem(clients);
        const source = randomItem(leadSources);
        const product = randomItem(products);
        const date = randomDate(START_DATE, END_DATE);
        const status = randomItem(leadDist);

        const lead = new Lead({
            Client_Reference: client._id,
            Source_Reference: source._id,
            Product_Reference: product._id,
            Lead_Status: status,
            Inquiry_Date: date,
            Lead_Status_Date_Time: new Date(date.getTime() + randomInt(1, 10) * 86400000), // Random offset past inquiry
            Notes: `Interested in ${product.SubSubType}.`,
            Cancel_Reason: status === 'Cancelled' ? randomItem(["Budget constraints", "Change in management", "No response"]) : null,
            createdAt: date,
            updatedAt: date
        });
        await lead.save();
        leads.push(lead);
    }
    console.log(`✅ ${leads.length} Leads seeded.`);

    console.log("Generating 300 Quotations...");
    const quotes = [];
    const qStatuses = ['Sent', 'Follow-up', 'Follow-up', 'Approved', 'Rejected', 'Converted', 'Converted'];
    const convLeads = leads.filter(l => l.Lead_Status === 'Converted');
    
    // We want lots of followups, including old ones
    for (let i = 0; i < 300; i++) {
        // Tie to a converted lead if we have it, else any lead
        const lead = (i < convLeads.length) ? convLeads[i] : randomItem(leads);
        // Ensure quote date is slightly after lead date
        const qDate = new Date(lead.Inquiry_Date.getTime() + randomInt(1, 10) * 86400000); 
        const qStatus = i < 150 ? 'Converted' : randomItem(qStatuses);

        // Generate multiple followups based on date
        const followUps = [];
        let curFollowDate = new Date(qDate);
        const numFollows = randomInt(1, 4);
        for(let f=0; f < numFollows; f++) {
            curFollowDate = new Date(curFollowDate.getTime() + randomInt(2, 7) * 86400000); // add 2-7 days
            if (curFollowDate > END_DATE) break;
            
            let outcome = 'Pending';
            if (f === numFollows - 1) { // last follow up matching status
                outcome = qStatus === 'Converted' ? 'Converted' : (qStatus === 'Rejected' ? 'Cancelled' : 'Pending');
            }
            followUps.push({
                Followup_Date: curFollowDate,
                Remarks: `Follow up attempt ${f+1}`,
                Outcome: outcome
            });
        }

        const quote = new Quotation({
            Lead_ID: lead._id,
            Client_Reference: lead.Client_Reference,
            Product_Reference: lead.Product_Reference,
            Quotation_Date: qDate,
            Client_Info: `Enterprise Level Setup`,
            Requirement: `Requires extensive API integrations`,
            Project_Scope_Description: "Standard base with multiple custom modules.",
            Commercial: randomInt(3000, 150000),
            Timeline: `${randomInt(2, 8)} Months`,
            Payment_Terms: "30% Advance, 40% Milestone 1, 30% Go-Live",
            Other_Terms: "AMC after 1 year.",
            Letterhead: randomItem(['Yes', 'No']),
            Sent_Via: randomItem(['Email', 'WhatsApp']),
            Quotation_Status: qStatus,
            Followup_Notification: true,
            Follow_Ups: followUps,
            Cancel_Reason: qStatus === 'Rejected' ? randomItem(["Client chose competitor", "Project shelved"]) : null,
            createdAt: qDate,
            updatedAt: followUps.length ? followUps[followUps.length-1].Followup_Date : qDate
        });
        await quote.save();
        quotes.push(quote);
    }
    console.log(`✅ ${quotes.length} Quotations seeded.`);

    console.log("Generating 150 Projects with varying External Services...");
    const projects = [];
    const projectPhases = ["UAT", "Deployment", "Go-Live Configuration", "Delivery"];
    const convQuotes = quotes.filter(q => q.Quotation_Status === 'Converted');
    
    const esTerms = ["Monthly", "Quarterly", "Annually", "One Time"];
    const esBillingStatuses = ["Working On", "Invoice Generated", "Given to Client", "Under Process", "Received"];

    for (let i = 0; i < 150; i++) {
        // if we run out of converted quotes, just reuse them
        const quote = convQuotes[i % convQuotes.length]; 
        const pDate = new Date(quote.Quotation_Date.getTime() + randomInt(5, 30) * 86400000);
        
        let pStatus = 'Active';
        if (pDate.getTime() < new Date(END_DATE.getTime() - 365*86400000).getTime()) {
           pStatus = randomItem(['Closed', 'Closed', 'Active']); // old projects get closed
        } else {
           pStatus = randomItem(['Active', 'Active', 'Active', 'On Hold']); 
        }

        const currentPhaseIndex = randomInt(0, projectPhases.length - 1);

        // Generate External Services for calendar
        const numServices = randomInt(0, 3);
        const services = [];
        for (let s = 0; s < numServices; s++) {
            const term = randomItem(esTerms);
            
            // Random anchor date heavily distributed over the last 3 years
            const anchorOffDays = randomInt(10, 800); 
            const anchorDate = new Date(END_DATE.getTime() - anchorOffDays * 86400000);
            
            const remindDate = term === 'One Time' ? new Date(anchorDate.getTime() + randomInt(2, 20) * 86400000) : anchorDate;
            
            services.push({
                Service_Name: `External Add-On ${s+1} (${term})`,
                Inquiry_Date: anchorDate,
                Delivery_Date: new Date(anchorDate.getTime() + randomInt(3, 10) * 86400000),
                Amount: randomInt(500, 15000),
                Billing_Status: randomItem(esBillingStatuses),
                Status_Date: new Date(),
                Cycle_Anchor_Date: anchorDate,
                Payment_Timeline: `${randomInt(2, 10)} Days`,
                Payment_Terms: term,
                Reminder: {
                    Enabled: true,
                    Notify_Before: `3 days before`,
                    Custom_Date: remindDate
                }
            });
        }

        const project = new Project({
            Project_Name: `Enterprise Implementation - ${quote.Quotation_ID}`,
            Lead_Reference: quote.Lead_ID,
            Quotation_Reference: quote._id,
            Client_Reference: quote.Client_Reference,
            Product_Reference: quote.Product_Reference,
            Priority: randomItem(['Normal', 'High']),
            Pipeline_Status: pStatus,
            Start_Details: {
                Phase: pStatus === 'Active' ? projectPhases[currentPhaseIndex] : (pStatus === 'Closed' ? 'Delivery' : 'UAT'),
                Report_Type: randomItem(['Overview', 'Detailed']),
                Costing: quote.Commercial,
                Assigned_Person: randomItem(people),
                Start_Date: pDate,
                End_Date: new Date(pDate.getTime() + 120 * 24 * 60 * 60 * 1000)
            },
            External_Services: services,
            Hold_History: pStatus === 'On Hold' ? [{
                Hold_Reason: "Client delayed requirements",
                Hold_Start_Date: new Date(pDate.getTime() + 10 * 86400000),
            }] : [],
            UAT: {
                UAT_Status: currentPhaseIndex >= 2 ? 'Approved' : 'Pending',
                Feedback: currentPhaseIndex >= 2 ? "Passed" : "Testing",
                UAT_Date: currentPhaseIndex >= 2 ? new Date(pDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null
            },
            Deployment: {
                Deployment_Status: currentPhaseIndex >= 3 ? 'Success' : 'Pending',
                Deployment_Date: currentPhaseIndex >= 3 ? new Date(pDate.getTime() + 45 * 24 * 60 * 60 * 1000) : null,
                Remarks: currentPhaseIndex >= 3 ? "Deployed successfully" : ""
            },
            Delivery: {
                Delivery_Status: pStatus === 'Closed' ? 'Delivered' : 'Pending',
                Delivery_Date: pStatus === 'Closed' ? new Date(pDate.getTime() + 60 * 24 * 60 * 60 * 1000) : null
            },
            Go_Live: pStatus === 'Closed' || currentPhaseIndex >= 2 ? {
                GoLive_Date: new Date(pDate.getTime() + 65 * 24 * 60 * 60 * 1000),
                Renewal_Rate: randomInt(1000, 3000),
                User_Wise_Rate: randomInt(50, 150),
                Payment_Schedule: randomItem(['Monthly', 'Quarterly', 'Yearly'])
            } : undefined,
            Termination: pStatus === 'Closed' ? {
                Exit_Type: 'Discontinue',
                Stage: 'Delivery',
                Date_Time: new Date(pDate.getTime() + 100 * 24 * 60 * 60 * 1000),
                Reason: "Fully delivered"
            } : undefined,
            createdAt: pDate,
            updatedAt: pDate
        });
        await project.save();
        projects.push(project);
    }
    console.log(`✅ ${projects.length} Projects seeded. External Services populated.`);

    console.log("Generating 200 Tickets...");
    for (let i = 0; i < 200; i++) {
        const project = randomItem(projects);
        const status = randomItem(['Open', 'In_Progress', 'Closed', 'Closed']);
        const raisedDate = randomDate(project.Start_Details.Start_Date, END_DATE);

        const ticket = new Ticket({
            Project_ID: project._id,
            Client_Reference: project.Client_Reference,
            Title: `Task / Bug #${i + 1}`,
            Description: "General support request tracking.",
            Raised_By: randomItem(people),
            Assigned_To: randomItem(people),
            Priority: randomItem(['Low', 'Medium', 'High']),
            Status: status,
            Raised_Date_Time: raisedDate,
            Action_Taken_DT: status === 'Closed' ? new Date(raisedDate.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000) : null,
            Cancel_Reason: status === 'Closed' ? "Resolved" : null,
            createdAt: raisedDate,
            updatedAt: raisedDate
        });
        await ticket.save();
    }
    console.log(`✅ 200 Tickets seeded.`);

    console.log("🎉 SUCCESS: Massive Analytics Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
}

seed();