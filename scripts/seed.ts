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
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI!);
    console.log("✅ Connected successfully.");

    console.log("🗑️ Wiping existing database...");
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

    console.log("✅ Database wiped clean!");

    // ============================================
    // 1. SEED MASTERS
    // ============================================

    //lead sources
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
      const ls = new LeadSource({ 
        Source_Name: s.name,
        Description: s.desc // Added Description field
      });
      await ls.save();
      leadSources.push(ls);
    }
    console.log(`✅ Seeded ${leadSources.length} Lead Sources with descriptions.`);

     const productPool = [
      // Software Solutions
      { type: "Software Solution", subType: "ERP (Enterprise Resource Planning)", subSub: "Core Module", desc: "Foundational ERP features for business management." },
      { type: "Software Solution", subType: "ERP (Enterprise Resource Planning)", subSub: "Finance & Accounting", desc: "Advanced financial tracking and reporting." },
      { type: "Software Solution", subType: "ERP (Enterprise Resource Planning)", subSub: "Inventory & Warehouse", desc: "Real-time stock management and audit." },
      { type: "Software Solution", subType: "CRM (Customer Relation)", subSub: "Sales Pipeline", desc: "Visual sales tracking and forecasting." },
      { type: "Software Solution", subType: "CRM (Customer Relation)", subSub: "Customer Support", desc: "Integrated helpdesk and ticketing system." },
      { type: "Software Solution", subType: "HRMS (Human Resource)", subSub: "Payroll Management", desc: "Automated salary processing and statutory compliance." },
      { type: "Software Solution", subType: "HRMS (Human Resource)", subSub: "Attendance & Leave", desc: "Biometric and manual attendance management." },
      { type: "Software Solution", subType: "Custom Web Application", subSub: "E-commerce Portal", desc: "Scalable online storefront with payment integration." },
      
      // Services
      { type: "Services", subType: "Development Services", subSub: "Web Development", desc: "Modern, responsive web applications using React/Next.js." },
      { type: "Services", subType: "Development Services", subSub: "Mobile App Development", desc: "Native and cross-platform mobile solutions." },
      { type: "Services", subType: "Cloud & Infrastructure", subSub: "AWS/Azure Setup", desc: "Professional cloud infrastructure provisioning." },
      { type: "Services", subType: "Consultancy", subSub: "Cybersecurity Audit", desc: "Comprehensive vulnerability assessment and mitigation." },
      
      // Hardware
      { type: "Hardware", subType: "Computing Devices", subSub: "Laptops", desc: "High-performance enterprise laptop for professionals." },
      { type: "Hardware", subType: "Networking Equipment", subSub: "Routers", desc: "High-speed core routing for large offices." },
      { type: "Hardware", subType: "Networking Equipment", subSub: "Firewalls", desc: "Next-gen security gateway for network protection." },
      { type: "Hardware", subType: "Storage Solutions", subSub: "Network Attached Storage (NAS)", desc: "Centralized data backup and sharing." },
      { type: "Hardware", subType: "Peripherals", subSub: "Printers & Scanners", desc: "High-capacity network printer for office use." }
    ];

    const products = [];
    for (const item of productPool) {
      const prod = new Product({ 
        Type: item.type,
        SubType: item.subType,
        SubSubType: item.subSub,
        Description: item.desc
      });
      await prod.save();
      products.push(prod);
    }
    console.log(`✅ Seeded ${products.length} Products with descriptions.`);

    // Clients
    const industries = ["Tech", "Pharma", "Education", "Finance", "Logistics", "Retail", "Healthcare", "Manufacturing", "Energy", "Entertainment"];
    const companySuffixes = ["Solutions", "Corp", "Ltd", "Inc", "Ventures", "Systems", "Network", "Group", "Works", "Dynamics"];
    const locations = ["Mumbai", "Dubai", "London", "New York", "Singapore", "Sydney", "Berlin", "Toronto", "Riyadh", "Tokyo"];
    const people = ["Alex Mercer", "Sarah Connor", "Bruce Wayne", "Clark Kent", "Diana Prince", "Tony Stark", "Steve Rogers", "Natasha Romanoff", "Wanda Maximoff", "Peter Parker"];

    const clients = [];
    for (let i = 0; i < 60; i++) {
      const industry = randomItem(industries);
      const company = `${industry} ${randomItem(companySuffixes)} ${i + 1}`;
      const client = new Client({
        Company_Name: company,
        Company_No: `TAX-${randomInt(100000, 999999)}`,
        Client_Name: randomItem(people),
        Contact_Number: `+91 ${randomInt(7000000000, 9999999999)}`,
        Email: `contact@${company.toLowerCase().replace(/\s/g, '')}.com`,
        Location: randomItem(locations),
        Description: `Major player in the ${industry} sector.`
      });
      await client.save();
      clients.push(client);
    }
    console.log(`✅ Seeded ${clients.length} Clients.`);

    // ============================================
    // 2. SEED TRANSACTIONAL DATA
    // ============================================

    console.log("Generating 100 Leads...");
    const leads = [];
    const leadDist = ['Converted', 'Converted', 'In Progress', 'In Progress', 'New', 'New', 'Cancelled'];
    for (let i = 0; i < 100; i++) {
        const client = randomItem(clients);
        const source = randomItem(leadSources);
        const product = randomItem(products);
        const now = new Date();
        const date = new Date(now.getTime() - Math.random() * 500 * 24 * 60 * 60 * 1000);
        const status = randomItem(leadDist);

        const lead = new Lead({
            Client_Reference: client._id,
            Source_Reference: source._id,
            Product_Reference: product._id,
            Lead_Status: status,
            Inquiry_Date: date,
            Lead_Status_Date_Time: date,
            Notes: `Interested in ${status === 'Converted' ? 'full' : 'partial'} implementation.`,
            Cancel_Reason: status === 'Cancelled' ? randomItem(["Budget constraints", "Change in management"]) : null
        });
        await lead.save();
        leads.push(lead);
    }
    console.log(`✅ ${leads.length} Leads seeded.`);

    console.log("Generating 60 Quotations...");
    const quotes = [];
    const qStatuses = ['Sent', 'Follow-up', 'Approved', 'Rejected', 'Converted'];
    const convLeads = leads.filter(l => l.Lead_Status === 'Converted');

    for (let i = 0; i < 60; i++) {
        const lead = (i < convLeads.length) ? convLeads[i] : randomItem(leads);
        const qDate = randomDate(lead.Inquiry_Date, new Date(lead.Inquiry_Date.getTime() + 15 * 24 * 60 * 60 * 1000));
        const qStatus = i < 20 ? 'Converted' : qStatuses[i % qStatuses.length];

        const quote = new Quotation({
            Lead_ID: lead._id,
            Client_Reference: lead.Client_Reference,
            Product_Reference: lead.Product_Reference,
            Quotation_Date: qDate,
            Client_Info: `Consulting for client implementation`,
            Requirement: `Full-scale deployment requirement.`,
            Project_Scope_Description: "Standard deployment with custom reporting and API integration.",
            Commercial: randomInt(4000, 85000),
            Timeline: `${randomInt(2, 8)} Months`,
            Payment_Terms: "30% Advance, 40% Milestone 1, 30% Go-Live",
            Other_Terms: "AMC applicable after 1 year.",
            Letterhead: randomItem(['Yes', 'No']),
            Sent_Via: randomItem(['Email', 'WhatsApp']),
            Quotation_Status: qStatus,
            Followup_Notification: true,
            Follow_Ups: qStatus === 'Converted' ? [
                { Followup_Date: qDate, Remarks: "Agreed on terms.", Outcome: 'Converted' }
            ] : [
                { Followup_Date: qDate, Remarks: "Initial quote sent.", Outcome: 'Pending' }
            ],
            Cancel_Reason: qStatus === 'Rejected' ? randomItem(["Client chose competitor", "Project shelved"]) : null
        });
        await quote.save();
        quotes.push(quote);
    }
    console.log(`✅ ${quotes.length} Quotations seeded.`);

    console.log("Generating 30 Projects...");
    const projects = [];
    const projectPhases = ["UAT", "Deployment", "Go-Live Configuration", "Delivery"];
    const convQuotes = quotes.filter(q => q.Quotation_Status === 'Converted');

    for (let i = 0; i < Math.min(30, convQuotes.length); i++) {
        const quote = convQuotes[i];
        const pDate = randomDate(quote.Quotation_Date, new Date(quote.Quotation_Date.getTime() + 10 * 24 * 60 * 60 * 1000));
        const pStatus = i < 20 ? 'Active' : (i < 25 ? 'Closed' : 'On Hold');
        const currentPhaseIndex = i % projectPhases.length;

        const project = new Project({
            Project_Name: `Enterprise Project ${i+1}`,
            Lead_Reference: quote.Lead_ID,
            Quotation_Reference: quote._id,
            Client_Reference: quote.Client_Reference,
            Product_Reference: quote.Product_Reference,
            Priority: randomItem(['Normal', 'High']),
            Pipeline_Status: pStatus,
            Start_Details: {
                Phase: pStatus === 'Active' ? projectPhases[currentPhaseIndex] : (pStatus === 'Closed' ? projectPhases[currentPhaseIndex] : projectPhases[0]),
                Report_Type: randomItem(['Overview', 'Detailed']),
                Costing: quote.Commercial,
                Assigned_Person: randomItem(people),
                Start_Date: pDate,
                End_Date: new Date(pDate.getTime() + 120 * 24 * 60 * 60 * 1000)
            },
            Hold_History: pStatus === 'On Hold' ? [{
                Hold_Reason: "Client delayed",
                Hold_Start_Date: new Date(),
                Hold_End_Date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }] : [],
            UAT: {
                UAT_Status: currentPhaseIndex >= 2 ? 'Approved' : 'Pending',
                Feedback: currentPhaseIndex >= 2 ? "Passed" : "Testing",
                UAT_Date: currentPhaseIndex >= 2 ? new Date(pDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null
            },
            Deployment: {
                Deployment_Status: currentPhaseIndex >= 3 ? 'Success' : 'Pending',
                Deployment_Date: currentPhaseIndex >= 3 ? new Date(pDate.getTime() + 45 * 24 * 60 * 60 * 1000) : null,
                Remarks: currentPhaseIndex >= 3 ? "Deployed" : ""
            },
            Delivery: {
                Delivery_Status: currentPhaseIndex >= 5 ? 'Delivered' : 'Pending',
                Delivery_Date: currentPhaseIndex >= 5 ? new Date(pDate.getTime() + 60 * 24 * 60 * 60 * 1000) : null
            },
            Go_Live: currentPhaseIndex >= 4 ? {
                GoLive_Date: new Date(pDate.getTime() + 65 * 24 * 60 * 60 * 1000),
                Renewal_Rate: randomInt(1000, 3000),
                User_Wise_Rate: randomInt(50, 150),
                Payment_Schedule: randomItem(['Monthly', 'Quarterly', 'Yearly'])
            } : undefined,
            Termination: pStatus === 'Closed' ? {
                Exit_Type: 'Terminate',
                Stage: 'Delivery',
                Date_Time: new Date(),
                Reason: "Done"
            } : undefined
        });
        await project.save();
        projects.push(project);
    }
    console.log(`✅ ${projects.length} Projects seeded.`);

    console.log("Generating 50 Tickets...");
    for (let i = 0; i < 50; i++) {
        const project = randomItem(projects);
        const status = randomItem(['Open', 'In_Progress', 'Closed']);
        const raisedDate = randomDate(project.Start_Details.Start_Date, new Date());

        const ticket = new Ticket({
            Project_ID: project._id,
            Client_Reference: project.Client_Reference,
            Title: `Task #${i + 1}: ${randomItem(['Fix CSS', 'Data Patch', 'UAT Bug', 'Config Update'])}`,
            Description: "Detailed ticket for workflow management.",
            Raised_By: randomItem(people),
            Assigned_To: randomItem(people),
            Priority: randomItem(['Low', 'Medium', 'High']),
            Status: status,
            Raised_Date_Time: raisedDate,
            Action_Taken_DT: status === 'Closed' ? new Date(raisedDate.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
            Cancel_Reason: status === 'Closed' ? "Issue resolved" : null
        });
        await ticket.save();
    }
    console.log(`✅ 50 Tickets seeded.`);

    console.log("🎉 SUCCESS: Normalized database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
}

seed();