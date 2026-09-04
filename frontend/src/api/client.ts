import {
  Answer,
  AskRequest,
  UserPersona,
  DocumentItem,
  DocumentDetail,
  InvoiceItem,
  PurchaseOrderItem,
  IncidentItem,
  SystemItem,
  OverviewMetrics,
  SearchResult,
  AuditItem,
  UserPermissions,
} from '../types/api';

const API_BASE = '';

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public detail?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}, token?: string | null): Promise<Response> {
  let activeToken = token || sessionStorage.getItem('agent_token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${activeToken}`,
    ...((options.headers as Record<string, string>) || {}),
  };

  let res = await fetch(url, { ...options, headers });

  // Auto-heal on 401 by refreshing token
  if (res.status === 401) {
    const savedUser = sessionStorage.getItem('agent_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        const loginRes = await fetch(`${API_BASE}/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u.username, password: 'devpassword' }),
        });
        if (loginRes.ok) {
          const authData = await loginRes.json();
          activeToken = authData.access_token;
          sessionStorage.setItem('agent_token', activeToken);
          headers['Authorization'] = `Bearer ${activeToken}`;
          res = await fetch(url, { ...options, headers });
        }
      } catch {
        // proceed with res
      }
    }
  }

  return res;
}

export async function fetchPersonas(): Promise<UserPersona[]> {
  const res = await fetch(`${API_BASE}/auth/personas`);
  if (!res.ok) throw new ApiError(res.status, 'Failed to fetch identity personas');
  return res.json();
}

export async function registerUser(email: string, password: string, department?: string): Promise<{ access_token: string; user: UserPersona }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, department: department || 'General' }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Registration failed');
  }
  return res.json();
}

export async function loginUser(email: string, password: string): Promise<{ access_token: string; user: UserPersona }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Authentication failed');
  }
  return res.json();
}

export async function loginPersona(username: string): Promise<{ access_token: string; user: UserPersona }> {
  const res = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'devpassword' }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Authentication failed');
  }
  return res.json();
}

export async function askQuestion(req: AskRequest, token?: string | null): Promise<Answer> {
  const url = req.session_id
    ? `${API_BASE}/sessions/${encodeURIComponent(req.session_id)}/ask`
    : `${API_BASE}/ask`;

  const res = await fetchWithAuth(
    url,
    {
      method: 'POST',
      body: JSON.stringify({
        question: req.question,
        automation: req.automation || 'default',
        session_id: req.session_id,
        is_followup: req.is_followup,
      }),
    },
    token
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) throw new ApiError(401, 'Authentication failed or token expired', data.detail);
    if (res.status === 429) throw new ApiError(429, 'Rate limit reached (30 queries/min limit)', data.detail);
    if (res.status === 503) throw new ApiError(503, 'AI service is currently unavailable. Enterprise data remains available for direct exploration.', data.detail);
    throw new ApiError(res.status, data.detail || `Server error: HTTP ${res.status}`);
  }

  return res.json();
}

export async function fetchOverview(token?: string | null): Promise<OverviewMetrics> {
  const res = await fetchWithAuth(`${API_BASE}/api/overview`, {}, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Failed to fetch overview metrics');
  }
  return res.json();
}

export async function fetchDocuments(token?: string | null): Promise<DocumentItem[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/documents`, {}, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Failed to fetch documents');
  }
  return res.json();
}

export async function fetchDocumentDetail(docId: string, token?: string | null): Promise<DocumentDetail> {
  const res = await fetchWithAuth(`${API_BASE}/api/documents/${encodeURIComponent(docId)}`, {}, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Failed to load document content or access denied');
  }
  return res.json();
}

export async function executeDocumentAction(
  docId: string,
  action: 'summarize' | 'explain' | 'ask',
  token?: string | null,
  question?: string
): Promise<Answer> {
  const res = await fetchWithAuth(
    `${API_BASE}/api/ai/document-action`,
    {
      method: 'POST',
      body: JSON.stringify({ doc_id: docId, action, question }),
    },
    token
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Failed to execute document AI action');
  }
  return res.json();
}

export async function fetchInvoices(
  token?: string | null,
  params?: { supplier_id?: string; region?: string; limit?: number; offset?: number }
): Promise<{ items: InvoiceItem[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.supplier_id) query.set('supplier_id', params.supplier_id);
  if (params?.region) query.set('region', params.region);
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());

  const res = await fetchWithAuth(`${API_BASE}/api/data/invoices?${query.toString()}`, {}, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Failed to fetch invoices');
  }
  return res.json();
}

export async function fetchPurchaseOrders(
  token?: string | null,
  params?: { year?: number; region?: string; limit?: number; offset?: number }
): Promise<{ items: PurchaseOrderItem[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.year) query.set('year', params.year.toString());
  if (params?.region) query.set('region', params.region);
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());

  const res = await fetchWithAuth(`${API_BASE}/api/data/purchase-orders?${query.toString()}`, {}, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Failed to fetch purchase orders');
  }
  return res.json();
}

export async function fetchIncidents(
  token?: string | null,
  params?: { region?: string; limit?: number; offset?: number }
): Promise<{ items: IncidentItem[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.region) query.set('region', params.region);
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());

  const res = await fetchWithAuth(`${API_BASE}/api/data/incidents?${query.toString()}`, {}, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Failed to fetch incidents');
  }
  return res.json();
}

export async function fetchSystems(token?: string | null): Promise<SystemItem[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/systems`, {}, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Failed to fetch systems');
  }
  return res.json();
}

export async function searchEnterprise(q: string, token?: string | null): Promise<SearchResult> {
  const res = await fetchWithAuth(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`, {}, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Search query failed');
  }
  return res.json();
}

export async function fetchPermissions(token?: string | null): Promise<UserPermissions> {
  const res = await fetchWithAuth(`${API_BASE}/api/security/permissions`, {}, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Failed to fetch user permissions');
  }
  return res.json();
}

export async function fetchActivity(token?: string | null, limit: number = 50): Promise<AuditItem[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/security/activity?limit=${limit}`, {}, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Failed to fetch activity audit log');
  }
  return res.json();
}

export async function fetchDatabaseStatus(token?: string | null): Promise<DatabaseStatus> {
  const res = await fetchWithAuth(`${API_BASE}/api/database/status`, {}, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Failed to fetch database status');
  }
  return res.json();
}

export async function fetchTableRows(tableName: string, limit: number = 50, token?: string | null): Promise<DatabaseTableData> {
  const res = await fetchWithAuth(`${API_BASE}/api/database/tables/${encodeURIComponent(tableName)}?limit=${limit}`, {}, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || `Failed to fetch records from table ${tableName}`);
  }
  return res.json();
}

export async function seedDatabase(token?: string | null): Promise<{ status: string; message: string; db: DatabaseStatus }> {
  const res = await fetchWithAuth(`${API_BASE}/api/database/seed`, { method: 'POST' }, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail || 'Failed to seed database');
  }
  return res.json();
}

