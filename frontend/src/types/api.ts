export interface EvidenceRef {
  source: string;
  locator: string;
  retrieved_at: string;
  as_of?: string | null;
}

export interface Finding {
  claim: string;
  evidence: EvidenceRef[];
  confidence: 'high' | 'medium' | 'low';
}

export interface Answer {
  kind: 'answered' | 'partial' | 'declined';
  summary: string;
  findings: Finding[];
  considered_and_rejected: string[];
  scope_limits: string[];
  truncated_sources: string[];
  unanswered: string[];
  missing_sources: string[];
  rewritten_question?: string | null;
  is_followup: boolean;
}

export interface AskRequest {
  question: string;
  automation?: string;
  session_id?: string | null;
  is_followup?: boolean | null;
}

export interface UserPersona {
  username: string;
  roles: string[];
  regions: string[];
  department?: string;
}

export interface ChatMessage {
  id: string;
  turnNumber: number;
  question: string;
  caller: UserPersona;
  timestamp: string;
  answer?: Answer;
  isLoading?: boolean;
  error?: string;
}

export interface DocumentItem {
  doc_id: string;
  source: string;
  title: string;
  entitlements: string[];
  updated_at: string;
  trusted: boolean;
}

export interface DocumentDetail extends DocumentItem {
  content: string;
  chunks: Array<{
    locator: string;
    text: string;
    updated_at: string;
    trusted: boolean;
  }>;
}

export interface InvoiceItem {
  id: string;
  supplier_id: string;
  amount: number;
  currency: string;
  region: string;
  issued_at: string;
  state: string;
}

export interface PurchaseOrderItem {
  id: string;
  supplier_id: string;
  amount: number;
  currency: string;
  region: string;
  issued_at: string;
}

export interface IncidentItem {
  id: string;
  incident_number: string;
  title: string;
  region: string;
  severity: string;
  occurred_at: string;
  resolved_at?: string | null;
  details?: string | null;
}

export interface SystemItem {
  id: string;
  name: string;
  status: string;
  mode: string;
  capabilities: string[];
  required_roles: string[];
  regional_scope: string;
  safety_guarantee: string;
}

export interface OverviewMetrics {
  authorized_documents: number;
  available_regions: string[];
  roles: string[];
  department: string;
  invoice_records_accessible: number;
  purchase_orders_accessible: number;
  incidents_accessible: number;
  recent_queries_count: number;
  database_engine: string;
  read_only_mode: boolean;
}

export interface SearchResult {
  query: string;
  documents: Array<{
    type: string;
    id: string;
    title: string;
    snippet: string;
    source: string;
  }>;
  invoices: Array<{
    type: string;
    id: string;
    title: string;
    details: string;
  }>;
  incidents: Array<{
    type: string;
    id: string;
    title: string;
    details: string;
  }>;
  total_matches: number;
}

export interface AuditItem {
  id: string;
  event_type: string;
  subject: string;
  roles: string;
  question?: string | null;
  rewritten_question?: string | null;
  tools_called?: string | null;
  kind?: string | null;
  cost_usd: number;
  prompt_tokens: number;
  completion_tokens: number;
  timestamp: string;
}

export interface UserPermissions {
  subject: string;
  roles: string[];
  regions: string[];
  department: string;
  entitlements: string[];
  allowed_tools: Array<{
    name: string;
    description: string;
    row_limit: number;
    freshness: string;
  }>;
  denied_tools: Array<{
    name: string;
    description: string;
    required_claims: string[];
    reason: string;
  }>;
  token_verification: string;
}

export interface DatabaseStatus {
  engine: string;
  file_path: string;
  file_size_bytes: number;
  file_size_kb: number;
  tables: Record<string, number>;
  status: string;
}

export interface DatabaseTableData {
  table: string;
  rows: any[];
}

