export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE';

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  preferred_sim_slot: number;
  daily_call_target: number;
}

export interface SimAccount {
  slotIndex: number;
  subscriptionId: number;
  carrierName: string;
  displayName: string;
  iccId: string;
  isDefaultVoice: boolean;
  phoneAccountHandleId: string;
}

export type CallState =
  | 'IDLE'
  | 'DIALING'
  | 'RINGING'
  | 'ACTIVE'
  | 'HOLDING'
  | 'DISCONNECTING'
  | 'DISCONNECTED'
  | 'FAILED';

export interface AssignedContact {
  id: number;
  assignment_id: number;
  first_name: string;
  last_name?: string;
  phone: string;
  company?: string;
  location?: string;
  priority: number;
  tags?: string;
  notes?: string;
  campaign_id?: number;
  campaign_name?: string;
  last_call_at?: string;
  last_disposition?: string;
  status: string;
}

export interface CallDisposition {
  id: number;
  code: string;
  label: string;
  is_connected: boolean;
  requires_callback: boolean;
}

export interface EmployeeDashboardMetrics {
  daily_target: number;
  completed_calls: number;
  connected_calls: number;
  no_answer_calls: number;
  busy_calls: number;
  callbacks_due_today: number;
  remaining_calls: number;
  assigned_contacts_count: number;
  sync_status: 'SYNCED' | 'PENDING' | 'FAILED' | 'RETRYING' | 'CONFLICT';
}

export interface OfflineCallItem {
  client_event_id: string;
  contact_id: number;
  campaign_id?: number;
  phone_number_snapshot: string;
  sim_slot: number;
  started_at: string;
  answered_at?: string;
  ended_at?: string;
  duration_seconds: number;
  status: string;
  disposition_code?: string;
  notes?: string;
  callback_at?: string;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  retry_count: number;
}

export interface CallbackItem {
  id: number;
  contact_id: number;
  contact_name: string;
  contact_phone: string;
  scheduled_at: string;
  status: string;
  notes?: string;
}
