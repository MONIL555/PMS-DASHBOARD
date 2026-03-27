export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard_view',

  // Leads
  LEADS_VIEW: 'leads_view',
  LEADS_CREATE: 'leads_create',
  LEADS_EDIT: 'leads_edit',
  LEADS_DELETE: 'leads_delete',
  LEADS_CONVERT: 'leads_convert',

  // Quotations
  QUOTATIONS_VIEW: 'quotations_view',
  QUOTATIONS_CREATE: 'quotations_create',
  QUOTATIONS_EDIT: 'quotations_edit',
  QUOTATIONS_DELETE: 'quotations_delete',
  QUOTATIONS_CONVERT: 'quotations_convert',

  // Projects
  PROJECTS_VIEW: 'projects_view',
  PROJECTS_CREATE: 'projects_create',
  PROJECTS_EDIT: 'projects_edit',
  PROJECTS_DELETE: 'projects_delete',

  // Tickets
  TICKETS_VIEW: 'tickets_view',
  TICKETS_CREATE: 'tickets_create',
  TICKETS_EDIT: 'tickets_edit',
  TICKETS_DELETE: 'tickets_delete',

  // Archives / Cancelled Items
  ARCHIVES_VIEW: 'archives_view',
  ARCHIVES_RESTORE: 'archives_restore',

  // Masters
  CLIENTS_VIEW: 'clients_view',
  CLIENTS_CREATE: 'clients_create',
  CLIENTS_EDIT: 'clients_edit',
  CLIENTS_DELETE: 'clients_delete',

  PRODUCTS_VIEW: 'products_view',
  PRODUCTS_CREATE: 'products_create',
  PRODUCTS_EDIT: 'products_edit',
  PRODUCTS_DELETE: 'products_delete',

  // Settings & Configuration
  PROJECT_TYPES_VIEW: 'project_types_view',
  PROJECT_TYPES_CREATE: 'project_types_create',
  PROJECT_TYPES_EDIT: 'project_types_edit',
  PROJECT_TYPES_DELETE: 'project_types_delete',

  LEAD_SOURCES_VIEW: 'lead_sources_view',
  LEAD_SOURCES_CREATE: 'lead_sources_create',
  LEAD_SOURCES_EDIT: 'lead_sources_edit',
  LEAD_SOURCES_DELETE: 'lead_sources_delete',

  ROLES_VIEW: 'roles_view',
  ROLES_CREATE: 'roles_create',
  ROLES_EDIT: 'roles_edit',
  ROLES_DELETE: 'roles_delete',

  USERS_VIEW: 'users_view',
  USERS_CREATE: 'users_create',
  USERS_EDIT: 'users_edit',
  USERS_DELETE: 'users_delete',
};

export const PERMISSION_GROUPS = {
  Dashboard: [
    { id: PERMISSIONS.DASHBOARD_VIEW, label: 'View Dashboard' },
  ],
  Leads: [
    { id: PERMISSIONS.LEADS_VIEW, label: 'View Leads' },
    { id: PERMISSIONS.LEADS_CREATE, label: 'Create Leads' },
    { id: PERMISSIONS.LEADS_EDIT, label: 'Edit Leads' },
    { id: PERMISSIONS.LEADS_DELETE, label: 'Delete Leads' },
    { id: PERMISSIONS.LEADS_CONVERT, label: 'Convert Lead to Quotation' },
  ],
  Quotations: [
    { id: PERMISSIONS.QUOTATIONS_VIEW, label: 'View Quotations' },
    { id: PERMISSIONS.QUOTATIONS_CREATE, label: 'Create Quotations' },
    { id: PERMISSIONS.QUOTATIONS_EDIT, label: 'Edit Quotations' },
    { id: PERMISSIONS.QUOTATIONS_DELETE, label: 'Delete Quotations' },
    { id: PERMISSIONS.QUOTATIONS_CONVERT, label: 'Convert Quotation to Project' },
  ],
  Projects: [
    { id: PERMISSIONS.PROJECTS_VIEW, label: 'View Projects' },
    { id: PERMISSIONS.PROJECTS_CREATE, label: 'Create Projects' },
    { id: PERMISSIONS.PROJECTS_EDIT, label: 'Edit Projects' },
    { id: PERMISSIONS.PROJECTS_DELETE, label: 'Delete Projects' },
  ],
  Tickets: [
    { id: PERMISSIONS.TICKETS_VIEW, label: 'View Tickets' },
    { id: PERMISSIONS.TICKETS_CREATE, label: 'Create Tickets' },
    { id: PERMISSIONS.TICKETS_EDIT, label: 'Edit Tickets' },
    { id: PERMISSIONS.TICKETS_DELETE, label: 'Delete Tickets' },
  ],
  Archives: [
    { id: PERMISSIONS.ARCHIVES_VIEW, label: 'View Archives' },
    { id: PERMISSIONS.ARCHIVES_RESTORE, label: 'Restore Archives' },
  ],
  Masters: [
    { id: PERMISSIONS.CLIENTS_VIEW, label: 'View Clients' },
    { id: PERMISSIONS.CLIENTS_CREATE, label: 'Create Clients' },
    { id: PERMISSIONS.CLIENTS_EDIT, label: 'Edit Clients' },
    { id: PERMISSIONS.CLIENTS_DELETE, label: 'Delete Clients' },
    { id: PERMISSIONS.PRODUCTS_VIEW, label: 'View Services' },
    { id: PERMISSIONS.PRODUCTS_CREATE, label: 'Create Services' },
    { id: PERMISSIONS.PRODUCTS_EDIT, label: 'Edit Services' },
    { id: PERMISSIONS.PRODUCTS_DELETE, label: 'Delete Services' },
  ],
  Settings: [
    { id: PERMISSIONS.PROJECT_TYPES_VIEW, label: 'View Project Types' },
    { id: PERMISSIONS.PROJECT_TYPES_CREATE, label: 'Create Project Types' },
    { id: PERMISSIONS.PROJECT_TYPES_EDIT, label: 'Edit Project Types' },
    { id: PERMISSIONS.PROJECT_TYPES_DELETE, label: 'Delete Project Types' },
    { id: PERMISSIONS.LEAD_SOURCES_VIEW, label: 'View Lead Sources' },
    { id: PERMISSIONS.LEAD_SOURCES_CREATE, label: 'Create Lead Sources' },
    { id: PERMISSIONS.LEAD_SOURCES_EDIT, label: 'Edit Lead Sources' },
    { id: PERMISSIONS.LEAD_SOURCES_DELETE, label: 'Delete Lead Sources' },
  ],
  Management: [
    { id: PERMISSIONS.ROLES_VIEW, label: 'View Roles' },
    { id: PERMISSIONS.ROLES_CREATE, label: 'Create Roles' },
    { id: PERMISSIONS.ROLES_EDIT, label: 'Edit Roles' },
    { id: PERMISSIONS.ROLES_DELETE, label: 'Delete Roles' },
    { id: PERMISSIONS.USERS_VIEW, label: 'View Users' },
    { id: PERMISSIONS.USERS_CREATE, label: 'Create Users' },
    { id: PERMISSIONS.USERS_EDIT, label: 'Edit Users' },
    { id: PERMISSIONS.USERS_DELETE, label: 'Delete Users' },
  ]
};
