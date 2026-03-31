/**
 * ====================================================
 * API UTILITY - PMS Frontend (Next.js Version)
 * ====================================================
 * 
 * Ported from existing MERN project.
 */

const API_URL = '/api';

export const fetchLeads = async (params: any = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.sortBy) query.append('sortBy', params.sortBy);

  const res = await fetch(`${API_URL}/leads?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch leads');
  return res.json();
};

export const createLead = async (leadData: any) => {
  const res = await fetch(`${API_URL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadData)
  });
  if (!res.ok) throw new Error('Failed to create lead');
  return res.json();
};

export const updateLeadDetails = async (leadId: string, leadData: any) => {
  const res = await fetch(`${API_URL}/leads/${leadId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadData)
  });
  if (!res.ok) throw new Error('Failed to update lead');
  return res.json();
};

export const updateLeadStatus = async (leadId: string, status: string) => {
  const res = await fetch(`${API_URL}/leads/${leadId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Lead_Status: status })
  });
  if (!res.ok) throw new Error('Failed to update lead status');
  return res.json();
};

export const fetchQuotations = async (params: any = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.minComm) query.append('minComm', params.minComm.toString());
  if (params.maxComm) query.append('maxComm', params.maxComm.toString());
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.sortBy) query.append('sortBy', params.sortBy);

  const res = await fetch(`${API_URL}/quotations?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch quotations');
  return res.json();
};

export const createQuotation = async (quotationData: any) => {
  const res = await fetch(`${API_URL}/quotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quotationData)
  });
  if (!res.ok) throw new Error('Failed to create quotation');
  return res.json();
};

export const updateQuotationDetails = async (quotationId: string, data: any) => {
  const res = await fetch(`${API_URL}/quotations/${quotationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update quotation');
  return res.json();
};

export const updateQuotationStatus = async (quotationId: string, status: string) => {
  const res = await fetch(`${API_URL}/quotations/${quotationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Quotation_Status: status })
  });
  if (!res.ok) throw new Error('Failed to update quotation status');
  return res.json();
};

export const addQuotationFollowUp = async (quotationId: string, followUpData: any) => {
  const res = await fetch(`${API_URL}/quotations/${quotationId}/followup`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(followUpData)
  });
  if (!res.ok) throw new Error('Failed to add follow-up');
  return res.json();
};

export const convertLeadToQuotation = async (leadId: string, data: any) => {
  const res = await fetch(`${API_URL}/quotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Lead_ID: leadId,
      ...data
    })
  });
  if (!res.ok) throw new Error('Failed to convert lead');
  return res.json();
};

export const fetchProjects = async (params: any = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.search) query.append('search', params.search);
  if (params.phase) query.append('phase', params.phase);
  if (params.pipeline) query.append('pipeline', params.pipeline);
  if (params.person) query.append('person', params.person);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.sortBy) query.append('sortBy', params.sortBy);

  const res = await fetch(`${API_URL}/projects?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
};

export const fetchProjectById = async (projectId: string) => {
  const res = await fetch(`${API_URL}/projects/${projectId}`);
  if (!res.ok) throw new Error('Failed to fetch project details');
  return res.json();
};

export const createProject = async (projectData: any) => {
  const res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData)
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
};

export const convertQuotationToProject = async (quotationId: string, data: any) => {
  const res = await fetch(`${API_URL}/projects/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quotationId: quotationId,
      projectData: data
    })
  });
  if (!res.ok) throw new Error('Failed to convert quotation');
  return res.json();
};

export const updateProjectPhase = async (projectId: string, updateData: any) => {
  const res = await fetch(`${API_URL}/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
};

export const fetchTickets = async (params: any = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.priority) query.append('priority', params.priority);

  const res = await fetch(`${API_URL}/tickets?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch tickets');
  return res.json();
};

export const createTicket = async (ticketData: any) => {
  const res = await fetch(`${API_URL}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticketData)
  });
  if (!res.ok) throw new Error('Failed to create ticket');
  return res.json();
};

export const updateTicketDetails = async (ticketId: string, updateData: any) => {
  const res = await fetch(`${API_URL}/tickets/${ticketId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });
  if (!res.ok) throw new Error('Failed to update ticket');
  return res.json();
};

export const updateTicketStatus = async (ticketId: string, status: string) => {
  const res = await fetch(`${API_URL}/tickets/${ticketId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Status: status })
  });
  if (!res.ok) throw new Error('Failed to update ticket status');
  return res.json();
};

export const fetchOptions = async () => {
  const res = await fetch(`${API_URL}/options`);
  if (!res.ok) throw new Error('Failed to fetch options');
  return res.json();
};

export const fetchDashboardStats = async (fy?: string) => {
  const url = fy ? `${API_URL}/dashboard/stats?fy=${fy}` : `${API_URL}/dashboard/stats`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
};

export const fetchCancelledItems = async (params: any = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.search) query.append('search', params.search);
  if (params.type) query.append('type', params.type);
  if (params.sortBy) query.append('sortBy', params.sortBy);

  const res = await fetch(`${API_URL}/cancelled-items?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch cancelled items');
  return res.json();
};

export const cancelItem = async (type: string, id: string, reason: string = 'Cancelled by user') => {
  const res = await fetch(`${API_URL}/cancel/${type}/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) throw new Error(`Failed to cancel ${type}`);
  return res.json();
};

export const fetchClients = async (params: any = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.sortBy) query.append('sortBy', params.sortBy);

  const res = await fetch(`${API_URL}/clients?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch clients');
  return res.json();
};

export const createClient = async (data: any) => {
  const res = await fetch(`${API_URL}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to create client');
  return result;
};

export const updateClient = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to update client');
  return result;
};

export const deleteClient = async (id: string) => {
  const res = await fetch(`${API_URL}/clients/${id}`, { method: 'DELETE' });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to delete client');
  return result;
};

// ... existing lead sources ...

// Project Type Masters
export const fetchProjectTypes = async (params: any = {}) => {
  const query = new URLSearchParams();
  if (typeof params === 'boolean') {
      if (params) query.append('active', 'true');
  } else {
      if (params.active) query.append('active', 'true');
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
      if (params.search) query.append('search', params.search);
  }

  const res = await fetch(`${API_URL}/project-types?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch project types');
  return res.json();
};

export const createProjectType = async (data: any) => {
  const res = await fetch(`${API_URL}/project-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to create project type');
  return result;
};

export const updateProjectType = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/project-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to update project type');
  return result;
};

export const deleteProjectType = async (id: string) => {
  const res = await fetch(`${API_URL}/project-types/${id}`, {
    method: 'DELETE',
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to delete project type');
  return result;
};

// Product Masters
export const fetchProducts = async (params: any = {}) => {
  const query = new URLSearchParams();
  if (typeof params === 'boolean') {
      if (params) query.append('active', 'true');
  } else {
      if (params.active) query.append('active', 'true');
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
      if (params.search) query.append('search', params.search);
  }

  const res = await fetch(`${API_URL}/products?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
};

export const createProduct = async (data: any) => {
  const res = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to create product');
  return result;
};

export const updateProduct = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to update product');
  return result;
};

export const deleteProduct = async (id: string) => {
  const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to delete product');
  return result;
};

// User Masters
export const fetchUsers = async (params: any = {}) => {
  const query = new URLSearchParams();
  if (params.active) query.append('active', 'true');
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.search) query.append('search', params.search);

  const res = await fetch(`${API_URL}/users?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

// Lead Source Masters
export const fetchLeadSources = async (params: any = {}) => {
  const query = new URLSearchParams();
  if (typeof params === 'boolean') {
      if (params) query.append('active', 'true');
  } else {
      if (params.active) query.append('active', 'true');
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
      if (params.search) query.append('search', params.search);
  }

  const res = await fetch(`${API_URL}/lead-sources?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch lead sources');
  return res.json();
};

export const createLeadSource = async (data: any) => {
  const res = await fetch(`${API_URL}/lead-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to create lead source');
  return result;
};

export const updateLeadSource = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/lead-sources/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to update lead source');
  return result;
};

export const deleteLeadSource = async (id: string) => {
  const res = await fetch(`${API_URL}/lead-sources/${id}`, { method: 'DELETE' });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to delete lead source');
  return result;
};

// User & Role Management
export const fetchMe = async () => {
  const res = await fetch(`${API_URL}/auth/me`);
  if (!res.ok) throw new Error('Failed to fetch user data');
  return res.json();
};

export const fetchRoles = async (params: any = {}) => {
  const query = new URLSearchParams();
  if (typeof params === 'boolean') {
      if (params) query.append('active', 'true');
  } else {
      if (params.active) query.append('active', 'true');
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
      if (params.search) query.append('search', params.search);
  }

  const res = await fetch(`${API_URL}/roles?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch roles');
  return res.json();
};

export const createRole = async (data: any) => {
  const res = await fetch(`${API_URL}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to create role');
  }
  return res.json();
};

export const updateRole = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/roles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to update role');
  }
  return res.json();
};

export const deleteRole = async (id: string) => {
  const res = await fetch(`${API_URL}/roles/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete role');
  return res.json();
};

// User Management

export const createUser = async (data: any) => {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to create user');
  return result;
};

export const updateUser = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Failed to update user');
  return result;
};

export const deleteUser = async (id: string) => {
  const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete user');
  return res.json();
};

// Authentication
export const login = async (credentials: any) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Login failed');
  return result;
};

export const logout = async () => {
  const res = await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
  if (!res.ok) throw new Error('Logout failed');
  return res.json();
};

