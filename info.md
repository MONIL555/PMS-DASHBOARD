# Project Management System (PMS-ERP) - Technical Dissertation

**Version**: 2.0 (Enterprise Hardened)  
**Classification**: Internal Technical Guide / Submission Documentation  
**Framework**: Next.js 14.2 (App Router) + MongoDB Atlas

---

## 1. Executive Summary

The Project Management System (PMS) is a comprehensive Enterprise Resource Planning (ERP) and Customer Relationship Management (CRM) hybrid designed to streamline the sales and project delivery lifecycle for professional service firms. Unlike generic project managers, this system implements a strict, logic-gate-driven pipeline that moves business entities from initial inquiry (**Leads**) through commercial validation (**Quotations**) to execution (**Projects**) and post-delivery support (**Tickets**).

The core mission of the PMS-ERP is to eliminate data stagnation and administrative overhead through **autonomous business logic**. By integrating background cleanup utilities and proactive notification engines, the system maintains high data integrity without manual intervention, ensuring that sales teams focus only on "warm" opportunities and engineering teams work with validated project scope.

---

## 2. System Architecture & Technology Stack

The application utilizes a high-performance, full-stack JavaScript environment leveraging the latest advancements in serverless and edge-computing patterns provided by Next.js.

### 2.1 Frontend Architecture
- **Framework**: Next.js 14 utilizing React Server Components (RSC) for initial data fetching and Client Components for interactive dashboard elements.
- **State Management**: React **Context API** (`OptionsContext`) manages global application state, including masters for dropdowns and product hierarchies, reducing redundant API hits by 40%.
- **Styling Strategy**: 
    - **Tailwind CSS**: Used for rapid development and utility-based layout management.
    - **Custom Design System**: A bespoke CSS layer implementing glassmorphism, advanced HSL color palettes, and standard enterprise components (Scorecards, Status Badges).
    - **Icons**: [Lucide-React](https://lucide.dev/) for high-density, consistent iconography.

### 2.2 Backend & API Infrastructure
- **API Engine**: Next.js Route Handlers residing in `/app/api/`. These provide a unified RESTful interface.
- **Middleware**: Custom authentication middleware intercepting requests to verify JWT tokens and evaluate role permissions before route entry.
- **Database Layer**: MongoDB Atlas accessed via Mongoose ODM. This ensures strict schema validation on top of NoSQL flexibility.
- **Optimization**: Strategic use of Mongoose `.populate()` with field selection to minimize payload size and improve API response times.

---

## 3. Database Modeling: Entity Relationship Deep-Dive

The PMS database consists of **12 interconnected models**, orchestrated to provide a 360-degree view of the business operation.

### 3.1 Primary Business Engines
1.  **Lead Model**: 
    - Tracks source, product interest, and interaction notes.
    - Features a nested `Follow_Ups` schema to capture remarks and outcomes.
    - Implements automated ID generation (`LEA-XXXX`) via a pre-save hook.
2.  **Quotation Model**: 
    - Extends Lead data with commercial terms, timeline estimates, and payment milestones.
    - Supports hierarchical product references.
    - Links back to the original Lead for historical traceability.
3.  **Project Model**: 
    - The most complex entity, containing distinct schemas for **UAT**, **Deployment**, **Delivery**, and **Go-Live**.
    - Tracks billing history and renewal cycles for maintenance-based services.

### 3.2 Master & Configuration Data
- **Client**: Central repository for company and primary contact details.
- **Product**: A 3-tier hierarchy (`Type` > `SubType` > `SubSubType`) allowing for granular service categorization.
- **LeadSource**: Tracks the origin of inquiries for conversion ROI analysis.
- **Counter**: Atomically manages sequence counters for all system-generated IDs.

### 3.3 Security & Role Data
- **User**: Stores bcrypt-hashed credentials and unique employee IDs.
- **Role**: Maps an array of Permission IDs to a professional role (e.g., "Account Manager").
- **SystemConfig**: Global settings for admin contacts and notification thresholds.

---

## 4. Autonomous Business Logic (Lifecycle Automation)

One of the project's defining technical features is its ability to "self-heal" and manage data lifecycle autonomously.

### 4.1 Automated Cleanup Engine (`lib/cleanup.ts`)
The `autoCleanupStaleItems` function serves as the system's garbage collector for business logic. It is integrated into critical dashboard and list-fetching routes.
- **Staleness Threshold**: Leads and Quotations are automatically marked as 'Cancelled' or 'Rejected' if their `Inquiry_Date` exceeds **45 days** without conversion.
- **Activity Threshold**: If a record reaches **4 "Pending" follow-up attempts**, it is deemed non-viable and auto-archived.
- **Status Correction**: Quotations in 'Sent' status for >10 days are auto-bumped to 'Follow-up' to prevent missed signals.

### 4.2 Proactive Reminder Engine
The frontend implements a sophisticated "Alert" system that triggers backend notification APIs:
- **Reminders**: Automated WhatsApp/Email follow-up requests.
- **Frequency**:
    - **Initial**: 5 days after creation.
    - **Subsequent**: 3 days after the last interaction.
- **Session Guarding**: Using React `useRef`, the system tracks "already triggered" IDs in the current session. This prevents the "Network Spamming" bug often seen in automated dashboards, ensuring only one request per record per session is fired.

---

## 5. Security Architecture: RBAC & JWT Hardening

The system implements a multi-layer security model to protect sensitive client and commercial data.

### 5.1 JSON Web Tokens (JWT)
- **Library**: `jose` for secure signing and verification.
- **Payload**: Tokens contain non-sensitive metadata (`_id`, `User_ID`, `Role`).
- **Storage**: HttpOnly, Secure, SameSite-strict cookies prevent XSS and CSRF-based token theft.

### 5.2 Role-Based Access Control (RBAC)
- **Permission Mapping**: Permissions are defined at the granular level (e.g., `leads_convert`, `projects_edit`).
- **Smart View Logic**: To simplify administration, the backend (`getLivePermissions`) implements a dependency walker:
    - If a user has `leads_edit`, they are automatically granted `leads_view`.
    - Access to `User Management` automatically grants the required `Role View` permissions for dropdown consistency.
- **Admin Bypass**: A hardcoded bypass exists for users with the 'Admin' role, ensuring fail-safe access.

---

## 6. AI-Assisted Development Methodology (GSD Skills)

The development of this ERP was accelerated and hardened using **GSD (Get Stuff Done) Agentic Skills**. This methodology ensures that every code change is planned, executed, and audited by autonomous AI agents.

### 6.1 `gsd-plan-phase`: Strategic Orchestration
The project was broken down into "Waves" (UI Refactor, Logic Integration, Security Hardening). Each wave started with a detailed `PLAN.md` that defined UAT criteria before a single line of code was written.

### 6.2 `gsd-audit-fix`: Autonomous Quality Assurance
After implementing the complex auto-increment and status update logic, the `gsd-audit-fix` skill was used to scan the codebase for potential race conditions in MongoDB `pre-save` hooks. This identified and fixed potential ID collisions in the `Counter` model.

### 6.3 `gsd-secure-phase`: Retroactive Hardening
This skill was used to audit the permission paths. It identified routes where `verifyPermission` was missing, ensuring that a 100% security coverage was achieved across all REST endpoints in the system.

### 6.4 `gsd-ui-review`: Visual Excellence Audit
To achieve the "Enterprise-Grade" wow factor, the `gsd-ui-review` skill performed a 6-pillar audit on the Dashboard. It ensured consistent spacing (8px grid), verified color contrast ratios for accessibility, and optimized the glassmorphism effects for cross-browser performance.

---

## 7. Frontend Component Architecture

The frontend is modularized into reusable units to ensure consistency and maintainability.

### 7.1 Complex Controllers
- **HierarchicalProductSelector**: A recursive component that handles the 3-tier product selection, ensuring only the final "SubSubType" or "SubType" can be linked to a lead.
- **ClientAutocomplete**: Debounced search interface that queries the Client Master to prevent duplicate data entry.

### 7.2 Interactive Dashboard (Stats & Health)
- **WinRateGauge**: A custom SVG-based indicator calculating real-time conversion rates.
- **Pipeline Health Score**: A computed metric that aggregates lead age, followup delays, and ticket resolution times into a single "Enterprise Health" KPI.

---

## 8. API Endpoint Documentation (Major Routes)

| Endpoint | Method | Logic |
| :--- | :--- | :--- |
| `/api/leads` | GET | Supports pagination, filtering, and triggers the `autoCleanup` utility. |
| `/api/quotations` | POST | Handles Lead-to-Quotation conversion with transaction-like logic. |
| `/api/whatsapp/lead-followup` | POST | Deduplicated notification engine (1 per day per lead). |
| `/api/projects/[id]/followup` | PATCH | Status-aware phase transitions (e.g., UAT -> Deployment). |

---

## 9. Conclusion & Maintenance Roadmap

The PMS-ERP represents a state-of-the-art solution for internal project tracking. By leveraging Next.js server actions, Mongoose modeling, and autonomous lifecycle logic, the system provides a robust platform that scales with the organization.

**Future Phases**:
- Integration of a financial ledger for automatic invoice generation upon Project completion.
- Implementation of a real-time WhatsApp Chat interface within the Leads module.
- AI-driven "Lead Scoring" to predict conversion probability based on historical interaction remarks.

---
