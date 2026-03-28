export type ProductHierarchy = {
  [category: string]: {
    [subCategory: string]: string[];
  };
};

export const PRODUCT_HIERARCHY: ProductHierarchy = {
  "Software Solution": {
    "ERP (Enterprise Resource Planning)": [
      "Core Module",
      "Finance & Accounting",
      "Inventory & Warehouse",
      "Sales & Distribution",
      "HR & Payroll"
    ],
    "CRM (Customer Relation)": [
      "Lead Management",
      "Sales Pipeline",
      "Customer Support",
      "Marketing Automation"
    ],
    "HRMS (Human Resource)": [
      "Attendance & Leave",
      "Payroll Management",
      "Recruitment & Onboarding",
      "Performance Appraisal"
    ],
    "Custom Web Application": [
      "E-commerce Portal",
      "Admin Dashboard",
      "Customer Portal",
      "API Integration"
    ]
  },
  "Services": {
    "Development Services": [
      "Web Development",
      "Mobile App Development",
      "Custom Software Development",
      "UI/UX Design"
    ],
    "Cloud & Infrastructure": [
      "AWS/Azure Setup",
      "DevOps Automation",
      "Cloud Migration",
      "Server Management"
    ],
    "Consultancy": [
      "IT Strategy",
      "Digital Transformation",
      "Cybersecurity Audit",
      "Business Intelligence"
    ]
  },
  "Hardware": {
    "Computing Devices": [
      "Laptops",
      "Desktops",
      "Workstations",
      "Tablets"
    ],
    "Networking Equipment": [
      "Routers",
      "Switches",
      "Firewalls",
      "Access Points"
    ],
    "Storage Solutions": [
      "Network Attached Storage (NAS)",
      "Storage Area Network (SAN)",
      "External Backup Drives"
    ],
    "Peripherals": [
      "Printers & Scanners",
      "Monitors",
      "UPS & Power Backup"
    ]
  }
};

export const PRODUCT_TYPES = Object.keys(PRODUCT_HIERARCHY);
